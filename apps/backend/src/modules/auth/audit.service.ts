import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthEvent, AuthEventType } from './entities/auth-event.entity';
import type { Request } from 'express';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuthEvent) private readonly repo: Repository<AuthEvent>,
  ) {}

  async log(
    userId: string | null,
    eventType: AuthEventType,
    req?: Request,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.repo.insert({
        userId,
        eventType,
        ip: this.extractIp(req),
        userAgent: req?.headers?.['user-agent']?.toString() ?? null,
        metadata: metadata ?? null,
      });
    } catch (e) {
      this.logger.error(`Fallo al loguear evento ${eventType}`, e as any);
    }
  }

  private extractIp(req?: Request): string | null {
    if (!req) return null;
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    return req.ip ?? null;
  }
}
