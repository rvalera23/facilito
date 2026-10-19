import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';


// ============================================================
// 🔥 TRANSICIONES DE STATUS PERMITIDAS
// ============================================================
// Regla: el status de un booking solo puede cambiar siguiendo estas
// transiciones. Evita estados inválidos y da claridad al negocio.
//
// ⚠️ Para agregar un estado nuevo: sumarlo como key y agregar sus
// transiciones a las listas de los estados desde donde se puede llegar.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'no_show'],
  completed: ['in_progress'],
  cancelled: ['pending'],
  no_show: ['pending', 'in_progress'],
};

// Umbral para auto-cierre: si pasaron más de X horas desde el fin del turno
// y nadie lo cerró, el cron lo marca como `no_show`.
const STALE_BOOKING_HOURS = 24;

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, In } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { CurrencyService } from '../currency/currency.service';
import { PricingService } from '../pricing/pricing.service';
import { TurnNumberService } from './turn-number.service';
import { ProfessionalEntity } from '../professionals/entities/professional.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfessionalAssignmentsService } from '../delivery/professional-assignments.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProfessionalEntity)
    private readonly professionalRepository: Repository<ProfessionalEntity>,
    private readonly currencyService: CurrencyService,
    private readonly pricingService: PricingService,
    private readonly turnNumberService: TurnNumberService,
    private readonly notificationsService: NotificationsService,
    private readonly professionalAssignmentsService: ProfessionalAssignmentsService,
  ) {}

  private slugify(text: string): string {
    if (!text) return 'general';
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private normalizeUrl(url: string, tenantId: string = 'general'): string {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('http')) {
      try {
        clean = new URL(clean).pathname;
      } catch {}
    }
    clean = clean.replace(/\/uploads\/uploads\//g, '/uploads/');
    if (!clean.startsWith('/uploads/')) {
      if (clean.startsWith('uploads/')) {
        clean = `/${clean}`;
      } else {
        clean = clean.startsWith('/') ? clean : `/${clean}`;
        if (!clean.includes('/')) {
          clean = `/uploads/${tenantId}/bookings/general${clean}`;
        }
      }
    }
    return clean;
  }

  // 🔥 OBTENER DISPONIBILIDAD DEL TENANT - CON SOPORTE PARA FECHAS ESPECÍFICAS
  private async getTenantAvailability(tenantId: string, date?: string): Promise<any> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: {
        specificConfig: true,
      },
    });

    if (!tenant) {
      return null;
    }

    const config = tenant.specificConfig as Record<string, any>;
    const schedule = config?.schedule || config?.availability || {};

    // 🔥 Si hay una fecha específica, buscar disponibilidad para esa fecha
    if (date) {
      // 🔥 PRIORIDAD 1: Fecha específica en exceptions
      if (schedule.exceptions && schedule.exceptions[date]) {
        const exceptionSchedule = this.normalizeSchedule(schedule.exceptions[date]);
        return { exceptions: { [date]: exceptionSchedule } };
      }
      
      // 🔥 PRIORIDAD 2: Día cerrado
      if (schedule.closed && schedule.closed.includes(date)) {
        return { closed: [date] };
      }
      
      // 🔥 PRIORIDAD 3: Día de la semana (semanal)
      const dateObj = new Date(date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dateObj.getDay()];
      
      if (schedule[dayName]) {
        const daySchedule = this.normalizeSchedule(schedule[dayName]);
        return { [dayName]: daySchedule };
      }
      
      return null;
    }

    // 🔥 Si no hay fecha, devolver todo el schedule normalizado (para el admin)
    return this.normalizeFullSchedule(schedule);
  }

  // 🔥 NORMALIZAR UN HORARIO (convierte { open, close } → [{ start, end }])
  private normalizeSchedule(schedule: any): any[] {
    if (!schedule) return [];
    
    // Si ya es un array, verificar formato
    if (Array.isArray(schedule)) {
      return schedule;
    }
    
    // Si es { open, close }
    const slot = schedule as any;
    if (slot.open !== undefined && slot.close !== undefined) {
      if (slot.closed === true) {
        return [];
      }
      return [{ start: slot.open, end: slot.close }];
    }
    
    // Si es { start, end }
    if (slot.start !== undefined && slot.end !== undefined) {
      return [{ start: slot.start, end: slot.end }];
    }
    
    return [];
  }

  // 🔥 NORMALIZAR TODO EL SCHEDULE
  private normalizeFullSchedule(schedule: any): any {
    if (!schedule) return {};
    
    const normalized: any = {};
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Normalizar días de la semana
    for (const day of validDays) {
      if (schedule[day]) {
        normalized[day] = this.normalizeSchedule(schedule[day]);
      }
    }
    
    // Mantener excepciones
    if (schedule.exceptions) {
      normalized.exceptions = {};
      for (const [date, value] of Object.entries(schedule.exceptions)) {
        normalized.exceptions[date] = this.normalizeSchedule(value);
      }
    }
    
    // Mantener días cerrados
    if (schedule.closed) {
      normalized.closed = Array.isArray(schedule.closed) ? schedule.closed : [];
    }
    
    return normalized;
  }

  // 🔥 OBTENER EL HORARIO PARA UNA FECHA ESPECÍFICA
  private getScheduleForDate(availability: any, date: string): any[] {
    if (!availability) return [];

    // 🔥 PRIORIDAD 1: Fecha específica en exceptions
    if (availability.exceptions && availability.exceptions[date]) {
      return availability.exceptions[date];
    }

    // 🔥 PRIORIDAD 2: Disponibilidad por fecha directa
    if (availability[date]) {
      return availability[date];
    }

    // 🔥 PRIORIDAD 3: Día de la semana
    const dateObj = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dateObj.getDay()];
    
    return availability[dayName] || [];
  }

  // 🔥 OBTENER DURACIÓN DEL SERVICIO
  private async getServiceDuration(serviceId: string): Promise<number> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      select: {
        durationMinutes: true,
      },
    });

    if (!service) {
      return 60;
    }

    return service.durationMinutes || 60;
  }

  // 🔥 OBTENER CAPACIDAD MÁXIMA DEL SERVICIO
  private async getServiceMaxCapacity(serviceId: string): Promise<number> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      select: {
        maxCapacity: true,
      },
    });

    if (!service) {
      return 0;
    }

    return service.maxCapacity || 0;
  }

  // 🔥 OBTENER ANTICIPACIÓN MÍNIMA DEL SERVICIO
  private async getServiceMinAdvance(serviceId: string): Promise<number> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      select: {
        minAdvanceBooking: true,
      },
    });

    if (!service) {
      return 0;
    }

    return service.minAdvanceBooking || 0;
  }

  // 🔥 CALCULAR HORA DE FIN
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  // 🔥 CREAR BOOKING
  async create(createBookingDto: any, files?: Array<Express.Multer.File>): Promise<BookingEntity> {
    const tenantId = createBookingDto.tenantId;
    const serviceId = createBookingDto.serviceId;
    const bookingDate = createBookingDto.bookingDate;
    const startTime = createBookingDto.startTime;
    const durationMinutes = Number(createBookingDto.durationMinutes || 60);
    const bookingSlug = this.slugify(createBookingDto.customerName || 'sin-nombre');

    // 🔥 FASE K: detectar si viene del kiosco
    const isKiosk = createBookingDto.source === 'kiosk';

    if (!tenantId) {
      throw new BadRequestException('Tenant ID es requerido');
    }

    if (!serviceId) {
      throw new BadRequestException('Service ID es requerido');
    }

    if (!bookingDate) {
      throw new BadRequestException('La fecha de la reserva es requerida');
    }

    if (!startTime) {
      throw new BadRequestException('La hora de inicio es requerida');
    }

    // 🔥 OBTENER DISPONIBILIDAD CON LA FECHA ESPECÍFICA
    const availability = await this.getTenantAvailability(tenantId, bookingDate);
    
    if (!availability) {
      throw new BadRequestException('La tienda no tiene configurada su disponibilidad para esta fecha');
    }

    // 🔥 VERIFICAR SI LA FECHA ESTÁ CERRADA
    if (availability.closed && availability.closed.includes(bookingDate)) {
      throw new BadRequestException('La tienda no atiende en esta fecha (está marcada como cerrada)');
    }

    // 🔥 OBTENER EL HORARIO DEL DÍA
    let daySchedule = this.getScheduleForDate(availability, bookingDate);

    // 🔥 VALIDAR QUE daySchedule SEA UN ARRAY
    if (!Array.isArray(daySchedule) || daySchedule.length === 0) {
      const dateObj = new Date(bookingDate);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dateObj.getDay()];
      throw new BadRequestException(`La tienda no atiende los ${dayName}s o no tiene horarios configurados para esta fecha`);
    }

    // 🔥 VERIFICAR QUE LA HORA ESTÉ DENTRO DEL HORARIO
    const isWithinSchedule = daySchedule.some((slot: any) => {
      return startTime >= slot.start && startTime < slot.end;
    });

    if (!isWithinSchedule) {
      throw new BadRequestException('La hora seleccionada no está disponible en el horario de la tienda');
    }

    // 🔥 VALIDAR ANTICIPACIÓN MÍNIMA
    const minAdvance = await this.getServiceMinAdvance(serviceId);
    if (minAdvance > 0) {
      const now = new Date();
      const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
      const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < minAdvance) {
        throw new BadRequestException(`Se requiere al menos ${minAdvance} horas de anticipación para reservar`);
      }
    }

    // 🔥 CALCULAR HORA DE FIN
    const endTime = this.calculateEndTime(startTime, durationMinutes);
    
    // 🔥 VALIDAR SOLAPAMIENTO DE RESERVAS
    const overlappingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.serviceId = :serviceId', { serviceId })
      .andWhere('booking.bookingDate = :bookingDate', { bookingDate })
      .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('(booking.startTime < :endTime AND booking.endTime > :startTime)', {
        startTime: startTime,
        endTime: endTime,
      })
      .getCount();

    if (overlappingBooking > 0) {
      throw new BadRequestException('La hora seleccionada ya está ocupada');
    }

    // 🔥 VALIDAR CAPACIDAD MÁXIMA
    const maxCapacity = await this.getServiceMaxCapacity(serviceId);
    if (maxCapacity > 0) {
      const totalBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.tenantId = :tenantId', { tenantId })
        .andWhere('booking.serviceId = :serviceId', { serviceId })
        .andWhere('booking.bookingDate = :bookingDate', { bookingDate })
        .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
        .getCount();

      if (totalBookings >= maxCapacity) {
        throw new BadRequestException('Se ha alcanzado el límite de cupos para esta fecha');
      }
    }

    // 🔥 PROCESAR ARCHIVOS
    const mediaUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadDir = path.join('./public/uploads', tenantId, 'bookings', bookingSlug);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      files.forEach((file) => {
        mediaUrls.push(`/uploads/${tenantId}/bookings/${bookingSlug}/${file.filename}`);
      });
    }

    const incomingMedia = createBookingDto.mediaUrls || [];
    const normalizedMedia = Array.isArray(incomingMedia) 
      ? incomingMedia.map(u => this.normalizeUrl(u, tenantId)).filter(Boolean)
      : [];

    const finalMediaUrls = mediaUrls.length > 0 ? [...normalizedMedia, ...mediaUrls] : normalizedMedia;

    // 🔥 PROCESAR ATTRIBUTES
    let parsedAttributes: Record<string, any> = {};
    const rawMeta = createBookingDto.attributes || createBookingDto.metadata;
    if (rawMeta) {
      if (typeof rawMeta === 'string') {
        try { parsedAttributes = JSON.parse(rawMeta); } catch { parsedAttributes = {}; }
      } else if (typeof rawMeta === 'object') {
        parsedAttributes = { ...rawMeta };
      }
    }

    // ============================================================
    // 🔥 CALCULAR SNAPSHOT DE PRICING (Fase 5)
    // ============================================================
    // Congelamos el precio al momento de crear la reserva.
    // Si algo falla, seguimos sin snapshot (no bloquea la reserva).
    let pricingSnapshot: any = null;

    // 🔥 FASE K: validación de kiosk ANTES del try/catch del pricing
    // (el catch de abajo silencia errores, no queremos que silencie esta validación)
    if (isKiosk) {
      const serviceForKioskCheck = await this.serviceRepository.findOne({
        where: { id: serviceId },
        select: { id: true, name: true, serviceModality: true, availableKiosk: true },
      });
      if (serviceForKioskCheck && serviceForKioskCheck.availableKiosk === false) {
        throw new BadRequestException(
          `El servicio "${serviceForKioskCheck.name}" no está disponible para kiosco.`,
        );
      }
      if (
        serviceForKioskCheck &&
        (serviceForKioskCheck.serviceModality === 'A Domicilio' ||
         serviceForKioskCheck.serviceModality === 'Online / Virtual')
      ) {
        throw new BadRequestException(
          `El servicio "${serviceForKioskCheck.name}" (${serviceForKioskCheck.serviceModality}) no está disponible en kiosco.`,
        );
      }
    }

    try {
      const service = await this.serviceRepository.findOne({
        where: { id: serviceId },
      });

      if (service) {
        const ratesResult = await this.currencyService.getRates();

        if (ratesResult && ratesResult.success && ratesResult.rates) {
          const rates = {
            USD: Number(ratesResult.rates.USD),
            EUR: Number(ratesResult.rates.EUR) || 0,
            CRYPTO:
              Number(ratesResult.rates.CRYPTO || ratesResult.rates.USD) ||
              Number(ratesResult.rates.USD),
            IVA: Number(ratesResult.rates.IVA || 16),
          };

          const pricing = this.pricingService.computeServicePricing(
            service,
            1, // servicios siempre son 1 unidad
            rates,
            'BCV via DolarApi',
          );

          if (pricing) {
            pricingSnapshot = {
              basePriceUSD: pricing.basePriceUSD,
              basePriceVES: pricing.basePriceVES,
              totalPriceUSD: pricing.totalPriceUSD,
              totalPriceVES: pricing.totalPriceVES,
              taxAmountUSD: pricing.taxAmountUSD,
              taxAmountVES: pricing.taxAmountVES,
              ivaType: pricing.ivaType,
              ivaRate: pricing.ivaRate,
              durationMinutes: pricing.durationMinutes,
              exchangeRateUsed: pricing.exchangeRateUsed,
              exchangeRateSource: pricing.exchangeRateSource,
              calculatedAt: pricing.calculatedAt,
              // 🔥 NUEVOS CAMPOS DE DESCUENTO
              hasDiscount: pricing.hasDiscount ?? false,
              discountPercentage: pricing.discountPercentage ?? 0,
              discountAmountUSD: pricing.discountAmountUSD ?? 0,
              discountAmountVES: pricing.discountAmountVES ?? 0,
              originalPriceUSD: pricing.originalPriceUSD ?? pricing.totalPriceUSD ?? 0,
              originalPriceVES: pricing.originalPriceVES ?? pricing.totalPriceVES ?? 0,
            };

            console.log(
              `✅ [BookingsService] Snapshot calculado para reserva:`,
              pricingSnapshot,
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ [BookingsService] No se pudo calcular el snapshot de pricing:`,
        error,
      );
    }

    // ============================================================
    // 🔥 ASIGNAR TURN NUMBER CORRELATIVO
    // ============================================================
    // El turnNumber es por tenant por día. Se reinicia a las 00:00
    // hora local del tenant. El TurnNumberService garantiza atomicidad
    // con INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING.
    //
    // El turnNumber que pudiera venir en el DTO se IGNORA por seguridad:
    // el cliente no decide su turno, lo decide el servidor.
    // ============================================================
    const turnDate = String(bookingDate).split('T')[0]; // "YYYY-MM-DD"
    const turnNumber = await this.turnNumberService.assign(tenantId, turnDate);

    // Sacar cualquier turnNumber que venga del cliente para que no
    // pueda sobrescribir el asignado server-side.
    const { turnNumber: _ignoredClientTurnNumber, ...safeBookingDto } =
      createBookingDto;

    // ============================================================
    // 🔥 AUTO-ASIGNAR PROFESIONAL SI ES A DOMICILIO
    // ============================================================
    // Si el booking es a domicilio y no vino con professionalId,
    // elegimos el primer profesional activo del tenant.
    // Esto permite que el tracking funcione sin intervención manual.
    // ============================================================
    let resolvedProfessionalId: string | null =
      createBookingDto.professionalId || null;

    if (
      createBookingDto.serviceModality === 'domicilio' &&
      !resolvedProfessionalId
    ) {
      try {
        const firstActive = await this.professionalRepository.findOne({
          where: { tenantId, status: 'active' },
          order: { rating: 'DESC' },
        });
        if (firstActive) {
          resolvedProfessionalId = firstActive.id;
          console.log(
            `✅ [BookingsService] Auto-asignado profesional ${firstActive.id} a booking a domicilio`,
          );
        } else {
          console.warn(
            `⚠️ [BookingsService] No hay profesionales activos en tenant ${tenantId}`,
          );
        }
      } catch (err) {
        console.warn(
          `⚠️ [BookingsService] Error buscando profesional:`,
          err,
        );
      }
    }

    // 🔥 CREAR LA RESERVA
    const booking = this.bookingRepository.create({
      ...safeBookingDto,
      turnNumber,
      tenantId,
      durationMinutes,
      endTime,
      status: createBookingDto.status || 'pending',
      mediaUrls: finalMediaUrls,
      coverImage: finalMediaUrls.length > 0 ? finalMediaUrls[0] : null,
      attributes: parsedAttributes,
      pricingSnapshot,
      // 🔥 NUEVO: profesional auto-asignado si es domicilio
      professionalId: resolvedProfessionalId,
    } as DeepPartial<BookingEntity>);

    const savedBooking = await this.bookingRepository.save(booking);

    // 🔥 CREAR ASIGNACIÓN PROFESIONAL (si el servicio es a domicilio)
    // Reutiliza el sistema de tracking de profesionales.
    if (savedBooking.serviceModality === 'domicilio') {
      try {
        await this.professionalAssignmentsService.assignProfessional({
          bookingId: savedBooking.id,
          professionalId: savedBooking.professionalId || null,
          tenantId: savedBooking.tenantId,
        });
        console.log(
          `✅ [BookingsService] Asignación profesional creada para booking ${savedBooking.id} (domicilio)`,
        );
      } catch (err) {
        // No romper la creación del booking si falla la asignación
        console.warn(
          `⚠️ [BookingsService] No se pudo crear asignación profesional para booking ${savedBooking.id}:`,
          err,
        );
      }
    }

    // 🔥 Notificar al profesional si la reserva viene con professionalId
    if (savedBooking.professionalId) {
      await this.notifyProfessionalAssigned(savedBooking);
    }

    return savedBooking;
  }

  // 🔥 OBTENER SLOTS DISPONIBLES
  async getAvailability(
    tenantId: string,
    serviceId: string,
    date: string,
  ): Promise<{
    available: boolean;
    slots: { start: string; end: string }[];
    professionals: { id: string; name: string; available: boolean }[];
  }> {
    const slots: { start: string; end: string }[] = [];
    
    // 🔥 1. OBTENER EL SERVICIO
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId, tenantId },
      select: {
        attributes: true,
        durationMinutes: true,
      },
    });

    if (!service) {
      console.log('❌ [getAvailability] Servicio no encontrado:', serviceId);
      return { available: false, slots: [], professionals: [] };
    }

    // 🔥 2. EXTRAER DISPONIBILIDAD DEL SERVICIO (SOLO attributes.availability)
    let availability = service.attributes?.availability || {};

    console.log('📦 [getAvailability] Disponibilidad del servicio:', JSON.stringify(availability));

    // 🔥 3. SI EL SERVICIO NO TIENE DISPONIBILIDAD, USAR LA DEL TENANT (FALLBACK)
    if (!availability || Object.keys(availability).length === 0) {
      console.log('⚠️ [getAvailability] Servicio sin disponibilidad, usando tenant fallback');
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
        select: { specificConfig: true },
      });
      if (tenant) {
        const config = tenant.specificConfig as Record<string, any>;
        availability = config?.schedule || config?.availability || {};
        console.log('📦 [getAvailability] Disponibilidad del tenant:', JSON.stringify(availability));
      }
    }

    // 🔥 4. VERIFICAR SI LA FECHA ESTÁ CERRADA
    if (availability.closed && availability.closed.includes(date)) {
      console.log('🚫 [getAvailability] Fecha cerrada:', date);
      return { available: false, slots: [], professionals: [] };
    }

    // 🔥 5. OBTENER EL HORARIO DEL DÍA
    let daySchedule: any[] = [];
    
    // PRIORIDAD 1: Excepción del servicio
    if (availability.exceptions && availability.exceptions[date]) {
      const exception = availability.exceptions[date];
      if (Array.isArray(exception)) {
        daySchedule = exception;
      } else if (exception.open !== undefined && exception.close !== undefined) {
        daySchedule = [{ start: exception.open, end: exception.close }];
      } else if (exception.start !== undefined && exception.end !== undefined) {
        daySchedule = [{ start: exception.start, end: exception.end }];
      }
      console.log('⭐ [getAvailability] Excepción encontrada:', JSON.stringify(daySchedule));
    } 
    // PRIORIDAD 2: Día de la semana
    else {
      const dateObj = new Date(date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dateObj.getDay()];
      
      console.log('📅 [getAvailability] Día de la semana:', dayName);
      
      if (availability[dayName]) {
        const dayData = availability[dayName];
        if (Array.isArray(dayData)) {
          daySchedule = dayData;
        } else if (dayData.open !== undefined && dayData.close !== undefined) {
          daySchedule = [{ start: dayData.open, end: dayData.close }];
        } else if (dayData.start !== undefined && dayData.end !== undefined) {
          daySchedule = [{ start: dayData.start, end: dayData.end }];
        }
        console.log('✅ [getAvailability] Horario encontrado para', dayName, ':', JSON.stringify(daySchedule));
      }
    }

    // 🔥 6. Si no hay horario, devolver vacío
    if (!Array.isArray(daySchedule) || daySchedule.length === 0) {
      console.log('⚠️ [getAvailability] No hay horario configurado para esta fecha');
      return { available: false, slots: [], professionals: [] };
    }

    const duration = await this.getServiceDuration(serviceId);
    console.log('⏱️ [getAvailability] Duración:', duration);

    const existingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.serviceId = :serviceId', { serviceId })
      .andWhere('booking.bookingDate = :date', { date })
      .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
      .select(['booking.startTime', 'booking.endTime'])
      .getMany();

    console.log('📊 [getAvailability] Reservas existentes:', existingBookings.length);

    // 🔥 7. OBTENER HORA ACTUAL PARA FILTRAR SOLO HORAS PASADAS
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = date === todayStr;
    console.log('🕐 [getAvailability] isToday:', isToday, 'hora actual:', now.toLocaleTimeString());

    for (const slot of daySchedule) {
      const slotStart = slot.start || slot.open;
      const slotEnd = slot.end || slot.close;
      
      if (!slotStart || !slotEnd) {
        console.log('⚠️ [getAvailability] Slot sin start/end:', slot);
        continue;
      }
      
      console.log(`📋 [getAvailability] Procesando slot: ${slotStart} - ${slotEnd}`);
      
      let current = slotStart;
      while (current < slotEnd) {
        const endTime = this.calculateEndTime(current, duration);
        
        // 🔥 VERIFICAR SI ESTÁ OCUPADO
        const isOccupied = existingBookings.some((booking: any) => {
          return (current < booking.endTime && endTime > booking.startTime);
        });

        // 🔥 SOLO FILTRAR HORAS PASADAS SI ES HOY
        let isPastTime = false;
        if (isToday) {
          const [hours, minutes] = current.split(':').map(Number);
          const slotTime = new Date();
          slotTime.setHours(hours, minutes, 0, 0);
          isPastTime = slotTime.getTime() <= now.getTime() + 120000;
        }

        const shouldAdd = !isOccupied && !isPastTime;
        console.log(`⏰ [getAvailability] Hora: ${current}, ocupado: ${isOccupied}, pasado: ${isPastTime}, agregar: ${shouldAdd}`);

        if (shouldAdd) {
          slots.push({ start: current, end: endTime });
        }

        current = endTime;
      }
    }

    console.log('✅ [getAvailability] Total slots:', slots.length);
    console.log('📋 [getAvailability] Slots finales:', JSON.stringify(slots));

    return {
      available: slots.length > 0,
      slots,
      professionals: [],
    };
  }

  // 🔥 CONFIRMAR BOOKING
  async confirmBooking(
    id: string,
    tenantId: string,
    orderId: string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id);
    booking.status = 'confirmed';
    booking.orderId = orderId;
    return await this.bookingRepository.save(booking);
  }

  // 🔥 OBTENER TODAS LAS RESERVAS DE UN TENANT
  // 🔥 OBTENER TODAS LAS RESERVAS DE UN TENANT
  // Filtro opcional por `source` (guardado en `metadata.source`):
  //   - source === 'web'   → bookings SIN source o con source != 'kiosk'
  //   - source === 'kiosk' → bookings con metadata.source = 'kiosk'
  //   - source undefined   → todos los bookings (retrocompatible)
  async findAllByTenant(tenantId: string, source?: string): Promise<BookingEntity[]> {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.professional', 'professional')
      .where('booking.tenantId = :tenantId', { tenantId });

    if (source) {
      if (source === 'web') {
        // Web = sin source (viejos) o con cualquier source que no sea kiosk
        qb.andWhere(
          "(booking.metadata->>'source' IS NULL OR booking.metadata->>'source' != :kiosk)",
          { kiosk: 'kiosk' },
        );
      } else {
        // Filtro exacto para cualquier otro valor (kiosk, manual, etc.)
        qb.andWhere("booking.metadata->>'source' = :source", { source });
      }
    }

    qb.orderBy('booking.createdAt', 'DESC');
    const bookings = await qb.getMany();

    // 🔥 Traer el paymentMetadata de las órdenes asociadas (efectivo VES/USD)
    const orderIds = bookings
      .map((b) => b.orderId)
      .filter((id): id is string => !!id);

    if (orderIds.length > 0) {
      const orders = await this.orderRepository.find({
        where: { id: In(orderIds) },
        select: { id: true, paymentMetadata: true },
      });

      const ordersMap = new Map<string, any>();
      orders.forEach((o) => {
        ordersMap.set(o.id, o.paymentMetadata);
      });

      bookings.forEach((b) => {
        if (b.orderId && ordersMap.has(b.orderId)) {
          (b as any).paymentMetadata = ordersMap.get(b.orderId);
        }
      });
    }

    return bookings;
  }

  // 🔥 OBTENER UNA RESERVA POR ID
async findOne(id: string): Promise<BookingEntity> {
  const booking = await this.bookingRepository.findOne({
    where: { id },
    relations: {
      service: true,
      tenant: true,
      professional: true,   // 👈 AGREGAR
    },
  });
  if (!booking) {
    throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
  }
  return booking;
}

  // 🔥 BUSCAR GLOBAL
  async searchGlobal(query: string): Promise<BookingEntity[]> {
    return await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tenant', 'tenant')
      .where('booking.customerName ILIKE :query', { query: `%${query}%` })
      .orWhere('booking.customerPhone ILIKE :query', { query: `%${query}%` })
      .orWhere('booking.customerEmail ILIKE :query', { query: `%${query}%` })
      .orWhere('booking.turnNumber ILIKE :query', { query: `%${query}%` })
      .take(10)
      .getMany();
  }

  // 🔥 ACTUALIZAR RESERVA
  async update(id: string, updateBookingDto: any, files?: Array<Express.Multer.File>): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    const tenantId = updateBookingDto.tenantId || booking.tenantId || 'general';
    const bookingSlug = this.slugify(updateBookingDto.customerName || booking.customerName || 'sin-nombre');

    const { metadata, features, existingImages, files: fList, ...safeData } = updateBookingDto;

    const existingAttributes = booking.attributes || {};
    
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try { parsedMetadata = JSON.parse(metadata); } catch { parsedMetadata = {}; }
    }

    const incomingAttributes = safeData.attributes || {};

    let finalFeatures = features;
    if (typeof features === 'string') {
      try { finalFeatures = JSON.parse(features); } catch { finalFeatures = []; }
    }

    const finalAttributes = {
      ...existingAttributes,
      ...(parsedMetadata || {}),
      ...incomingAttributes,
    };

    let updatedMediaUrls: string[] = [];
    const rawExisting = existingImages || updateBookingDto['existingImages[]'];
    
    if (rawExisting !== undefined && rawExisting !== null) {
      const existingArray = Array.isArray(rawExisting) ? rawExisting : [rawExisting];
      updatedMediaUrls = existingArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else if (updateBookingDto.mediaUrls !== undefined && updateBookingDto.mediaUrls !== null) {
      const rawImages = updateBookingDto.mediaUrls;
      const rawArray = Array.isArray(rawImages) ? rawImages : [rawImages];
      updatedMediaUrls = rawArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else {
      updatedMediaUrls = booking.mediaUrls || [];
    }

    if (files && files.length > 0) {
      const uploadDir = path.join('./public/uploads', tenantId, 'bookings', bookingSlug);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const newFilePaths = files.map(file => `/uploads/${tenantId}/bookings/${bookingSlug}/${file.filename}`);
      updatedMediaUrls = [...updatedMediaUrls, ...newFilePaths];
    }
    const previousProfessionalId = booking.professionalId;

    const dataToSave = {
      ...safeData,
      status: safeData.status || booking.status,
      attributes: finalAttributes,
      mediaUrls: updatedMediaUrls.length > 0 ? updatedMediaUrls : null,
      coverImage: updatedMediaUrls.length > 0 ? updatedMediaUrls[0] : null,
    };

    Object.assign(booking, dataToSave);

    delete (booking as any).metadata;

    const savedBooking = await this.bookingRepository.save(booking);

    // 🔥 Si cambió el professionalId, notificar al nuevo profesional
    if (
      savedBooking.professionalId &&
      savedBooking.professionalId !== previousProfessionalId
    ) {
      await this.notifyProfessionalAssigned(savedBooking);
    }

    return savedBooking;
  }

  // 🔥 ELIMINAR RESERVA
  async remove(id: string, tenantId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({ where: { id, tenantId } });
    if (!booking) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }
    await this.bookingRepository.remove(booking);
  }

  
  // ============================================================
  // 🔥 CAMBIO DE STATUS CON VALIDACIÓN DE TRANSICIONES
  // ============================================================
  // Endpoint dedicado para cambiar el status de un booking.
  // Valida que la transición sea válida según STATUS_TRANSITIONS.
  // Actualiza statusUpdatedAt.
  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: string,
    options?: { skipTransitionValidation?: boolean },
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id);

    if (tenantId && booking.tenantId !== tenantId) {
      throw new BadRequestException('La reserva no pertenece a este tenant');
    }

    const currentStatus = booking.status || 'pending';

    // Si no cambia nada, no hacemos nada
    if (currentStatus === newStatus) {
      return booking;
    }

    // Validar transición (a menos que se salte explícitamente)
    if (!options?.skipTransitionValidation) {
      const allowed = STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new BadRequestException(
          `Transición inválida: "${currentStatus}" → "${newStatus}". ` +
          `Transiciones permitidas: ${allowed.length > 0 ? allowed.join(', ') : 'ninguna'}`,
        );
      }
    }

    booking.status = newStatus;
    booking.statusUpdatedAt = new Date();

    console.log(
      `🔄 [BookingsService] Status actualizado: ${currentStatus} → ${newStatus} (booking ${id})`,
    );

    const savedBooking = await this.bookingRepository.save(booking);

    // 🔥 SINCRONIZAR CON ASSIGNMENT PROFESIONAL
    // Solo aplica si el booking tiene una asignación profesional (domicilio).
    try {
      const assignment = await this.professionalAssignmentsService['assignmentsRepository'].findOne({
        where: { bookingId: savedBooking.id },
      });

      if (assignment) {
        // Mapear el status del booking al status del assignment.
        const statusMap: Record<string, string> = {
          pending: 'pending',
          confirmed: 'assigned',
          in_progress: 'in_service',
          completed: 'completed',
          cancelled: 'cancelled',
          no_show: 'cancelled',
        };

        const newAssignmentStatus = statusMap[newStatus];
        if (newAssignmentStatus && assignment.status !== newAssignmentStatus) {
          await this.professionalAssignmentsService.updateAssignmentStatus(
            assignment.id,
            newAssignmentStatus as any,
          );
          console.log(
            `✅ [BookingsService] Assignment ${assignment.id} sincronizado a "${newAssignmentStatus}"`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `⚠️ [BookingsService] No se pudo sincronizar assignment para booking ${savedBooking.id}:`,
        err,
      );
    }

    return savedBooking;
  }

  // ============================================================
  // 🔥 AUTO-CIERRE DE BOOKINGS VIEJOS
  // ============================================================
  // Corre desde el cron cada hora. Marca como `no_show` los bookings
  // que:
  //   - Están en estado abierto (pending, confirmed, in_progress).
  //   - Ya pasaron más de STALE_BOOKING_HOURS horas desde su fin.
  //
  // Si nadie del negocio cerró el turno, se cierra administrativamente.
  async autoCloseStaleBookings(): Promise<{ closed: number; ids: string[] }> {
    const now = new Date();
    const closedIds: string[] = [];

    // Traer candidatos: todos los bookings con status abierto
    const candidates = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status IN (:...statuses)', {
        statuses: ['pending', 'confirmed', 'in_progress'],
      })
      .getMany();

    for (const booking of candidates) {
      // Calcular el fin del turno (fecha + hora inicio + duración)
      const [year, month, day] = String(booking.bookingDate)
        .split('-')
        .map(Number);
      const [hours, minutes] = String(booking.startTime)
        .split(':')
        .map(Number);

      const bookingStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const bookingEnd = new Date(
        bookingStart.getTime() + (booking.durationMinutes || 60) * 60_000,
      );

      const hoursSinceEnd =
        (now.getTime() - bookingEnd.getTime()) / 3_600_000;

      if (hoursSinceEnd >= STALE_BOOKING_HOURS) {
        booking.status = 'no_show';
        booking.statusUpdatedAt = now;
        await this.bookingRepository.save(booking);
        closedIds.push(booking.id);
      }
    }

    if (closedIds.length > 0) {
      console.log(
        `🧹 [BookingsService] Auto-cierre: ${closedIds.length} bookings marcados como no_show`,
      );
    } else {
      console.log('🧹 [BookingsService] Auto-cierre: sin bookings para cerrar');
    }

    return { closed: closedIds.length, ids: closedIds };
  }

  // ============================================================
  // 🔥 NOTIFICAR AL PROFESIONAL CUANDO LE ASIGNAN UNA CITA
  // ============================================================
  private async notifyProfessionalAssigned(booking: BookingEntity): Promise<void> {
    if (!booking.professionalId) return;

    try {
      const professional = await this.professionalRepository.findOne({
        where: { id: booking.professionalId },
        relations: { user: true },
      });

      if (!professional?.userId) {
        // Profesional sin user (legacy). No hay a quién notificar.
        return;
      }

      // Formatear fecha legible
      const dateObj = new Date(`${booking.bookingDate}T00:00:00`);
      const formattedDate = dateObj.toLocaleDateString('es-VE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const formattedStart = (booking.startTime || '').slice(0, 5);

      await this.notificationsService.create({
        userId: professional.userId,
        tenantId: booking.tenantId,
        bookingId: booking.id,
        type: 'booking_assigned',
        title: 'Nueva cita asignada',
        message: `${booking.customerName || 'Un cliente'} reservó para el ${formattedDate} a las ${formattedStart}`,
        metadata: {
          isService: true,
          orderType: 'service',
          bookingId: booking.id,
          customerName: booking.customerName,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
        },
      });

      console.log(
        `✅ [BookingsService] Notificación enviada al profesional ${professional.userId} por booking ${booking.id}`,
      );
    } catch (error) {
      // No queremos que un fallo de notificación rompa la creación/edición del booking
      console.warn(
        `⚠️ [BookingsService] No se pudo notificar al profesional del booking ${booking.id}:`,
        error,
      );
    }
  }
}