import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { Terminal } from './entities/terminal.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { PaymentMethod } from '../tenants/entities/payment-method.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { CreateKioskOrderDto } from './dto/create-kiosk-order.dto';

// ============================================================
// TIPOS DE RESPUESTA DE LA COLA
// ============================================================
// El contrato que consume la cartelera del kiosko.
// Sin nombres de clientes. Solo turnNumber y metadata operativa.
// ============================================================

export interface QueueNowItem {
  turnNumber: string;
  serviceName: string;
  professionalName: string | null;
  startTime: string;
  endTime: string;
  remainingMinutes: number;
}

export interface QueueNextItem {
  turnNumber: string;
  serviceName: string;
  startTime: string;
  durationMinutes: number;
}

export interface QueueUpcomingItem {
  time: string;
  name: string;
  turnNumber: string;
}

export interface QueueUpcomingDay {
  date: string;
  items: QueueUpcomingItem[];
}

export interface QueueResponse {
  now: QueueNowItem[];
  next: QueueNextItem[];
  waiting: {
    count: number;
    estimatedMinutes: number;
  };
  upcoming: QueueUpcomingDay[];
  updatedAt: string;
}

@Injectable()
export class TerminalsService {
  private readonly logger = new Logger(TerminalsService.name);

  constructor(
    @InjectRepository(Terminal)
    private readonly terminalRepository: Repository<Terminal>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
  ) {}

  // ============================================================
  // CONFIG DEL KIOSKO POR TOKEN
  // ============================================================
  async getKioskConfigByToken(token: string) {
    const terminal = await this.terminalRepository.findOne({
      where: { token, isActive: true },
      relations: { tenant: true },
    });

    if (!terminal) {
      throw new NotFoundException('Kiosco no encontrado o inactivo.');
    }

    const tenant = terminal.tenant;

    const paymentMethods = await this.paymentMethodRepo.find({
      where: { tenantId: tenant.id, isActive: true } as any,
      select: { id: true, type: true, bankName: true, phone: true, ciRif: true },
    });

    return {
      terminalId: terminal.id,
      terminalName: terminal.name,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        slogan: tenant.slogan,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        logoUrl: tenant.logoUrl,
        bannerUrl: tenant.bannerUrl,
        specificConfig: tenant.specificConfig,
      },
      paymentMethods,

      // ============================================================
      // 🔥 KIOSK SETTINGS
      // ============================================================
      // Configuración operativa del kiosko.
      // - queue: la cartelera de turnos. Activada por default.
      // - printer: impresora térmica. Desactivada hasta tener hardware.
      // - notifications: WhatsApp/SMS. Desactivadas hasta tener proveedor.
      // - turnNumber: formato del correlativo. T-001, reset diario.
      //
      // Todo desactivado por default excepto `queue`, que es la
      // feature central. Cuando se active la impresora o las
      // notificaciones, es solo cambiar el flag en la DB/config.
      // ============================================================
      kioskSettings: {
        queue: {
          enabled: true,
          refreshIntervalSeconds: 5,
        },
        printer: {
          enabled: false,
        },
        notifications: {
          whatsapp: { enabled: false },
          sms: { enabled: false },
        },
        turnNumber: {
          prefix: 'T',
          padding: 3,
          resetDaily: true,
        },
      },
    };
  }

  // ============================================================
  // CREAR ORDEN DESDE KIOSKO (productos)
  // ============================================================
  async createOrderFromKiosk(token: string, dto: CreateKioskOrderDto) {
    const terminal = await this.getKioskConfigByToken(token);
    const tenantId = terminal.tenant.id;

    const newOrder = this.orderRepo.create({
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      totalAmount: dto.totalAmount,
      subtotal: dto.subtotal || dto.totalAmount,
      tax: dto.tax || 0,
      discount: dto.discount || 0,
      items: dto.items,
      tenant: { id: tenantId } as TenantEntity,
      status: 'PENDING',
      paymentMethodUsed: dto.paymentMethodUsed,
      paymentReference: dto.paymentReference,
      bankSource: dto.bankSource,
      paymentMetadata: {
        bankSource: dto.bankSource,
        paymentReference: dto.paymentReference,
        clientIdType: dto.clientIdType,
        clientIdNumber: dto.clientIdNumber,
        clientPhone: dto.clientPhone,
      },
    });

    const savedOrder = await this.orderRepo.save(newOrder);
    const orderObj = Array.isArray(savedOrder) ? savedOrder[0] : savedOrder;

    return {
      success: true,
      orderId: orderObj.id,
      message: 'Orden creada exitosamente desde el kiosco',
    };
  }

  // ============================================================
  // 🔥 COLA DEL KIOSKO
  // ============================================================
  // Devuelve los turnos de HOY agrupados en `now`, `next`, `waiting`.
  //
  // Reglas:
  //   - Solo bookings con turnNumber != null (los viejos sin turno no van).
  //   - Solo status en ('pending', 'confirmed', 'in_progress').
  //   - Solo del tenant correspondiente al token.
  //   - Sin filtro por `source`: la cola es del negocio entero.
  //   - `now`: turnos cuyo rango [startTime, endTime] contiene la hora actual.
  //   - `next`: los próximos N (default 3) turnos con startTime > ahora.
  //   - `waiting`: todo lo demás (startTime > ahora pero no en `next`, + pendientes).
  //
  // Sin nombres de clientes. Solo turnNumber y metadata operativa.
  // ============================================================
  async getQueueByToken(token: string): Promise<QueueResponse> {
    // Reusar getKioskConfigByToken para validar el token y obtener el tenantId.
    const terminal = await this.getKioskConfigByToken(token);
    const tenantId = terminal.tenant.id;

    const now = new Date();
    const today = this.formatDateLocal(now);

    // ============================================================
    // COLA DE HOY (solo bookings generados en el kiosko)
    // ============================================================
    // Filtramos por `metadata.source = 'kiosk'` para excluir
    // reservas creadas desde admin, web, WhatsApp, etc.
    // La cartelera del kiosko es la ventana pública del kiosko,
    // no del negocio entero. Solo muestra lo que el kiosko generó.
    //
    // También exigimos `turnNumber IS NOT NULL`: los bookings
    // creados antes de la feature de turnos no aparecen.
    // ============================================================
    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.professional', 'professional')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.bookingDate = :today', { today })
      .andWhere('booking.turnNumber IS NOT NULL')
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['pending', 'confirmed', 'in_progress'],
      })
      .andWhere("booking.metadata->>'source' = :source", { source: 'kiosk' })
      .orderBy('booking.startTime', 'ASC')
      .getMany();

    const openBookings = bookings.filter((b) =>
      ['pending', 'confirmed', 'in_progress'].includes(b.status),
    );

    // Si hay bookings hoy, necesitamos los serviceName.
    const serviceIds = openBookings.length > 0
      ? [...new Set(openBookings.map((b) => b.serviceId))]
      : [];
    const serviceNameMap = new Map<string, string>();
    if (serviceIds.length > 0) {
      const services = await this.serviceRepo
        .createQueryBuilder('service')
        .where('service.id IN (:...ids)', { ids: serviceIds })
        .select(['service.id', 'service.name'])
        .getMany();
      for (const s of services) serviceNameMap.set(s.id, s.name);
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const nowItems: QueueNowItem[] = [];
    const futureItems: BookingEntity[] = [];
    let waitingCount = 0;
    let waitingMinutes = 0;

    for (const b of openBookings) {
      const startMin = this.timeToMinutes(b.startTime);
      const endMin = this.timeToMinutes(b.endTime);

      if (startMin <= nowMinutes && nowMinutes < endMin) {
        nowItems.push({
          turnNumber: b.turnNumber!,
          serviceName: serviceNameMap.get(b.serviceId) || 'Servicio',
          professionalName: b.professional?.name || null,
          startTime: this.cleanTime(b.startTime),
          endTime: this.cleanTime(b.endTime),
          remainingMinutes: endMin - nowMinutes,
        });
      } else if (startMin > nowMinutes) {
        futureItems.push(b);
      } else {
        waitingCount++;
        waitingMinutes += b.durationMinutes || 60;
      }
    }

    const nextItems: QueueNextItem[] = futureItems.slice(0, 3).map((b) => ({
      turnNumber: b.turnNumber!,
      serviceName: serviceNameMap.get(b.serviceId) || 'Servicio',
      startTime: this.cleanTime(b.startTime),
      durationMinutes: b.durationMinutes || 60,
    }));

    const remainingFuture = futureItems.slice(3);
    waitingCount += remainingFuture.length;
    for (const b of remainingFuture) {
      waitingMinutes += b.durationMinutes || 60;
    }

    const nowRemaining = nowItems.reduce(
      (sum, item) => sum + item.remainingMinutes,
      0,
    );
    const estimatedMinutes = nowRemaining + waitingMinutes;

    // ============================================================
    // PRÓXIMOS DÍAS (ventana de 7 días)
    // ============================================================
    const upcoming = await this.getUpcomingByTenant(tenantId, now);

    this.logger.log(
      `🎫 [getQueueByToken] tenant=${tenantId} today=${today} ` +
        `now=${nowItems.length} next=${nextItems.length} waiting=${waitingCount} ` +
        `upcomingDays=${upcoming.length} estimated=${estimatedMinutes}min`,
    );

    return {
      now: nowItems,
      next: nextItems,
      waiting: {
        count: waitingCount,
        estimatedMinutes: Math.max(0, Math.round(estimatedMinutes)),
      },
      upcoming,
      updatedAt: now.toISOString(),
    };
  }

  // ============================================================
  // PRÓXIMOS DÍAS — Helper privado
  // ============================================================
  private async getUpcomingByTenant(
    tenantId: string,
    now: Date,
  ): Promise<QueueUpcomingDay[]> {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fromDate = this.formatDateLocal(tomorrow);

    // Ventana de 14 días. Cubre reservas hasta 2 semanas vista.
    const inTwoWeeks = new Date(now);
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    const toDate = this.formatDateLocal(inTwoWeeks);

    const upcomingBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.bookingDate BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .andWhere('booking.turnNumber IS NOT NULL')
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['pending', 'confirmed', 'in_progress'],
      })
      .andWhere("booking.metadata->>'source' = :source", { source: 'kiosk' })
      .orderBy('booking.bookingDate', 'ASC')
      .addOrderBy('booking.startTime', 'ASC')
      .getMany();

    if (upcomingBookings.length === 0) return [];

    const byDate = new Map<string, QueueUpcomingItem[]>();
    for (const b of upcomingBookings) {
// `bookingDate` viene de TypeORM como un Date en medianoche UTC.
// Si usamos `getFullYear/getMonth/getDate`, obtenemos la fecha local
// del servidor (que puede estar detrás de UTC) y el día queda un día atrás.
// Usamos `toISOString()` y cortamos para obtener la fecha "tal cual está
// guardada en la DB", sin conversión de zona horaria.
const dateKey = String(
  b.bookingDate instanceof Date
    ? b.bookingDate.toISOString().slice(0, 10)
    : String(b.bookingDate).slice(0, 10),
);
      const list = byDate.get(dateKey) || [];
      if (list.length >= 5) continue;
      list.push({
        time: this.cleanTime(b.startTime),
        name: this.formatPublicName(b.customerName),
        turnNumber: b.turnNumber!,
      });
      byDate.set(dateKey, list);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .slice(0, 7)
            .map(([date, items]) => ({ date, items }));
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private formatDateLocal(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = String(time).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

    // "16:00:00" → "16:00"
  private cleanTime(t: string): string {
    return String(t).slice(0, 5);
  }

  // "Roberto Jose" → "Roberto J." | "Roberto" → "Roberto"
  private formatPublicName(fullName: string): string {
    if (!fullName) return 'Cliente';
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Cliente';
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : first;
  }

  // ============================================================
  // RUTAS PRIVADAS (Dashboard del tenant)
  // ============================================================
  async create(tenantId: string, dto: CreateTerminalDto) {
    const terminal = this.terminalRepository.create({
      ...dto,
      tenantId,
      token: Math.random().toString(36).substring(2) + Date.now().toString(36),
    });
    return await this.terminalRepository.save(terminal);
  }

  async findAllByTenant(tenantId: string) {
    return await this.terminalRepository.find({
      where: { tenantId },
    });
  }

  async remove(tenantId: string, id: string) {
    const terminal = await this.terminalRepository.findOne({
      where: { id, tenantId },
    });
    if (!terminal) {
      throw new NotFoundException('Terminal no encontrado.');
    }
    await this.terminalRepository.remove(terminal);
    return { success: true };
  }
}