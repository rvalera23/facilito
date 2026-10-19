// apps/backend/src/modules/delivery/professional-assignments.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  ProfessionalAssignmentEntity,
  AssignmentStatus,
} from './entities/professional-assignment.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ProfessionalEntity } from '../professionals/entities/professional.entity';
import { DeliveryGateway } from './delivery.gateway';
import { RedisService } from '../../common/redis/redis.service';
/**
 * Servicio paralelo a DeliveryDriversService, pero para bookings de servicios.
 *
 * Gestiona la asignación de un booking de servicio a un profesional,
 * el tracking en vivo (si el servicio es a domicilio) y los estados
 * (assigned → accepted → in_transit → in_service → completed).
 */
@Injectable()
export class ProfessionalAssignmentsService {
  private readonly logger = new Logger(ProfessionalAssignmentsService.name);

  constructor(
    @InjectRepository(ProfessionalAssignmentEntity)
    private readonly assignmentsRepository: Repository<ProfessionalAssignmentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(ProfessionalEntity)
    private readonly professionalsRepository: Repository<ProfessionalEntity>,
    private readonly dataSource: DataSource,
    private readonly gateway: DeliveryGateway,
    private readonly redis: RedisService,
  ) {}

  // ============================================================
  // ASIGNAR PROFESIONAL A BOOKING
  // ============================================================
  async assignProfessional(input: {
    bookingId: string;
    professionalId?: string | null;
    tenantId: string;
  }): Promise<ProfessionalAssignmentEntity> {
    const { bookingId, professionalId, tenantId } = input;

    // 1. Validar que el booking existe
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking no encontrado');
    }

    // 2. Si el booking ya está finalizado, no reasignar
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new BadRequestException(
        `El booking ya está "${booking.status}", no se puede reasignar`,
      );
    }

    // 3. Buscar si ya existe una assignment para este booking
    let assignment = await this.assignmentsRepository.findOne({
      where: { bookingId },
    });

    // 4. Elegir profesional (manual o auto-asignar)
    let chosenProfessional: ProfessionalEntity | null = null;

    if (professionalId) {
      // Override manual
      chosenProfessional = await this.professionalsRepository.findOne({
        where: { id: professionalId },
      });
      if (!chosenProfessional) {
        throw new NotFoundException('Profesional no encontrado');
      }
      if (
        chosenProfessional.status !== 'active' &&
        chosenProfessional.status !== 'online'
      ) {
        throw new BadRequestException(
          `El profesional está "${chosenProfessional.status}", no disponible`,
        );
      }
    } else {
      // Auto-asignar: buscar el primero activo del tenant
      chosenProfessional = await this.professionalsRepository.findOne({
        where: {
          tenantId,
          status: 'active',
        },
        order: { rating: 'DESC' },
      });
    }

    // 5. Crear o actualizar assignment
    if (!assignment) {
      assignment = this.assignmentsRepository.create({
        bookingId,
        professionalId: chosenProfessional?.id ?? null,
        status: chosenProfessional ? 'assigned' : 'pending',
        assignedAt: chosenProfessional ? new Date() : null,
      });
    } else {
      assignment.professionalId = chosenProfessional?.id ?? null;
      assignment.status = chosenProfessional ? 'assigned' : 'pending';
      assignment.assignedAt = chosenProfessional ? new Date() : null;
    }

    const saved = await this.assignmentsRepository.save(assignment);

    this.logger.log(
      `📋 Booking ${bookingId} asignado a profesional ${chosenProfessional?.id ?? 'ninguno'} (${saved.status})`,
    );

    return saved;
  }

  // ============================================================
  // LISTAR MIS ASIGNACIONES ACTIVAS
  // ============================================================
  async listMyActiveAssignments(
    professionalUserId: string,
  ): Promise<ProfessionalAssignmentEntity[]> {
    const professional = await this.professionalsRepository.findOne({
      where: { userId: professionalUserId },
    });
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
    }

    return this.assignmentsRepository.find({
      where: {
        professionalId: professional.id,
        status: In(['assigned', 'accepted', 'in_transit', 'in_service']),
      },
      relations: { booking: true, professional: { user: true } },
      order: { assignedAt: 'DESC' },
    });
  }

  // ============================================================
  // LISTAR MI HISTORIAL
  // ============================================================
  async listMyHistoryAssignments(
    professionalUserId: string,
  ): Promise<ProfessionalAssignmentEntity[]> {
    const professional = await this.professionalsRepository.findOne({
      where: { userId: professionalUserId },
    });
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
    }

    return this.assignmentsRepository.find({
      where: {
        professionalId: professional.id,
        status: In(['completed', 'cancelled', 'rejected']),
      },
      relations: { booking: true },
      order: { completedAt: 'DESC' },
      take: 50,
    });
  }

  // ============================================================
  // CAMBIAR ESTADO DE UNA ASIGNACIÓN
  // ============================================================
  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    notes?: string,
  ): Promise<ProfessionalAssignmentEntity> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: { booking: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    // Validar transiciones
    const validTransitions: Record<string, AssignmentStatus[]> = {
      pending: ['assigned', 'rejected', 'cancelled'],
      assigned: ['accepted', 'rejected', 'cancelled'],
      accepted: ['in_transit', 'in_service', 'cancelled'],
      in_transit: ['in_service', 'completed', 'cancelled'],
      in_service: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      rejected: [],
    };

    const allowed = validTransitions[assignment.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Transición inválida: "${assignment.status}" → "${status}". ` +
        `Permitidas: ${allowed.length > 0 ? allowed.join(', ') : 'ninguna'}`,
      );
    }

    assignment.status = status;
    if (notes !== undefined) assignment.notes = notes;

    const now = new Date();
    switch (status) {
      case 'accepted':
        assignment.acceptedAt = now;
        break;
      case 'in_transit':
        assignment.inTransitAt = now;
        break;
      case 'in_service':
        assignment.inServiceAt = now;
        break;
      case 'completed':
        assignment.completedAt = now;
        break;
      case 'cancelled':
        assignment.cancelledAt = now;
        break;
      default:
        break;
    }

    const saved = await this.assignmentsRepository.save(assignment);

    // Sincronizar status del booking
    try {
      const bookingStatusMap: Record<AssignmentStatus, string> = {
        pending: 'pending',
        assigned: 'confirmed',
        accepted: 'confirmed',
        in_transit: 'in_progress',
        in_service: 'in_progress',
        completed: 'completed',
        cancelled: 'cancelled',
        rejected: 'cancelled',
      };
      const newBookingStatus = bookingStatusMap[status];
      if (newBookingStatus && assignment.booking) {
        await this.bookingsRepository.update(assignment.bookingId, {
          status: newBookingStatus,
          statusUpdatedAt: now,
        });
        this.logger.log(
          `🔄 Booking ${assignment.bookingId} sincronizado a "${newBookingStatus}"`,
        );
      }
    } catch (err) {
      this.logger.warn(`⚠️ No se pudo sincronizar booking: ${err}`);
    }

    // Emitir evento WebSocket (reutilizando el gateway)
    try {
      this.gateway.emitProfessionalAssignmentUpdate({
        assignmentId: saved.id,
        bookingId: saved.bookingId,
        professionalId: saved.professionalId,
        status: saved.status,
        at: now.toISOString(),
      });
    } catch (err) {
      this.logger.warn(`⚠️ No se pudo emitir WebSocket: ${err}`);
    }

    return saved;
  }

  // ============================================================
  // TRACKING PÚBLICO PARA EL COMPRADOR
  // ============================================================
  async getPublicAssignmentByBooking(bookingId: string): Promise<any | null> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { bookingId },
      relations: { booking: true, professional: { user: true } },
    });
    if (!assignment) return null;

    // 🔥 Leer ubicación en vivo del profesional desde Redis
    let professionalLat: number | null = null;
    let professionalLng: number | null = null;
    if (assignment.professionalId) {
      try {
        const loc = await this.redis.getProfessionalLocation(
          assignment.professionalId,
        );
        if (loc) {
          professionalLat = loc.lat;
          professionalLng = loc.lng;
        }
      } catch (err) {
        this.logger.warn(`⚠️ No se pudo leer Redis loc: ${err}`);
      }
    }

    // Info pública del profesional (sin email/phone)
    const professionalPublic = assignment.professional
      ? {
          firstName:
            (assignment.professional.user?.name ||
              assignment.professional.name ||
              '').split(' ')[0] || 'Profesional',
          currentLat: professionalLat,
          currentLng: professionalLng,
        }
      : null;

    return {
      id: assignment.id,
      bookingId: assignment.bookingId,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      inTransitAt: assignment.inTransitAt,
      inServiceAt: assignment.inServiceAt,
      completedAt: assignment.completedAt,
      cancelledAt: assignment.cancelledAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      professional: professionalPublic,
    };
  }

  // ============================================================
  // CAMBIAR MI ESTADO (online/offline) CON BLOQUEO
  // ============================================================
  async setMyStatus(
    professionalUserId: string,
    newStatus: 'online' | 'offline',
  ): Promise<ProfessionalEntity> {
    const professional = await this.professionalsRepository.findOne({
      where: { userId: professionalUserId },
    });
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
    }

    // Bloquear offline si tiene asignaciones activas
    if (newStatus === 'offline') {
      const activeCount = await this.assignmentsRepository.count({
        where: {
          professionalId: professional.id,
          status: In(['assigned', 'accepted', 'in_transit', 'in_service']),
        },
      });
      if (activeCount > 0) {
        throw new BadRequestException(
          `No podés desconectarte: tenés ${activeCount} servicio(s) activo(s). ` +
          `Terminá o pedile al administrador que reasigne antes de ponerte offline.`,
        );
      }
    }

    professional.status = newStatus === 'online' ? 'active' : 'inactive';
    const saved = await this.professionalsRepository.save(professional);

    // 🔥 Sincronizar con Redis
    try {
      if (newStatus === 'online') {
        await this.redis.markProfessionalOnline(
          professional.id,
          professional.tenantId,
        );
      } else {
        await this.redis.markProfessionalOffline(
          professional.id,
          professional.tenantId,
        );
      }
    } catch (err) {
      this.logger.warn(`⚠️ No se pudo sincronizar Redis: ${err}`);
    }

    this.logger.log(
      `🔄 Profesional ${professional.id} cambió a "${saved.status}"`,
    );

    return saved;
  }

  // ============================================================
  // ACTUALIZAR UBICACIÓN EN VIVO (Redis + WebSocket)
  // ============================================================
  async updateMyLocation(
    professionalUserId: string,
    lat: number,
    lng: number,
  ): Promise<{ success: boolean; lat: number; lng: number }> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Coordenadas inválidas');
    }

    const professional = await this.professionalsRepository.findOne({
      where: { userId: professionalUserId },
    });
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
    }

    // 1. Cachear en Redis (TTL 30s)
    await this.redis.setProfessionalLocation(professional.id, lat, lng, 30);

    // 2. Emitir por WebSocket a todos los bookings activos
    const activeAssignments = await this.assignmentsRepository.find({
      where: {
        professionalId: professional.id,
        status: In(['accepted', 'in_transit', 'in_service']),
      },
      select: { id: true, bookingId: true },
    });
    const activeBookingIds = activeAssignments.map((a) => a.bookingId);

    this.gateway.emitProfessionalLocation(
      professional.id,
      { lat, lng },
      activeBookingIds,
    );

    this.logger.log(
      `📍 Profesional ${professional.id} actualizó ubicación: (${lat}, ${lng}) → ${activeBookingIds.length} booking(s) activo(s)`,
    );

    return { success: true, lat, lng };
  }
}
