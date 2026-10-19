import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  /**
   * 🔥 Limpia archivos temporales del onboarding (>24h).
   * Corre todos los días a las 3 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp');

    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    let deleted = 0;
    let freedBytes = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch (e) {
        // ignorar archivos que no se pueden leer
      }
    }

    if (deleted > 0) {
      const freedMB = (freedBytes / 1024 / 1024).toFixed(2);
      this.logger.log(`🗑️ [Cleanup] ${deleted} archivos temporales eliminados (${freedMB} MB liberados)`);
    } else {
      this.logger.debug('✅ [Cleanup] No hay archivos temporales para limpiar');
    }
  }
    /**
   * 🔥 Método público para test manual (no se ejecuta por cron).
   */
  async runCleanupManually() {
    this.logger.log('🧪 [Cleanup] Ejecución manual iniciada');
    await this.cleanupTempFiles();
    this.logger.log('🧪 [Cleanup] Ejecución manual finalizada');
  }
}