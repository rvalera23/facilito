import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

// ============================================================
// 🔥 SCHEDULER: Auto-cierre de bookings viejos
// ============================================================
// Corre automáticamente cada hora. Detecta bookings que quedaron
// abiertos (pending, confirmed, in_progress) más de 24h después de
// su fin, y los marca como `no_show`.
//
// El endpoint manual `POST /bookings/admin/auto-close` sigue existiendo
// para disparar el barrido sin esperar a la próxima hora. Útil para
// testing o para un admin que quiera forzarlo.
@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(private readonly bookingsService: BookingsService) {}

  // 🔥 Corre cada hora en punto (00:00, 01:00, 02:00, ...)
  // Cron expression: segundo minuto hora día-del-mes mes día-de-semana
  @Cron(CronExpression.EVERY_HOUR, { name: 'autoCloseStaleBookings' })
  async handleAutoCloseStaleBookings() {
    this.logger.log('⏰ [BookingsScheduler] Ejecutando auto-cierre de bookings viejos...');

    try {
      const result = await this.bookingsService.autoCloseStaleBookings();
      this.logger.log(
        `✅ [BookingsScheduler] Auto-cierre completado. Cerrados: ${result.closed}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ [BookingsScheduler] Error en auto-cierre: ${error.message}`,
        error.stack,
      );
    }
  }
}