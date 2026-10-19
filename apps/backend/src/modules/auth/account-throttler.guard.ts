import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Rate limiting por cuenta (independiente del por-IP de @nestjs/throttler).
 * Implementación en memoria. Si escalás a múltiples instancias,
 * cambiar el Map por Redis con TTL.
 */
@Injectable()
export class AccountThrottlerGuard {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  hit(scope: string, identifier: string, limit: number, windowMs: number): void {
    const key = `${scope}:${identifier}`;
    const now = Date.now();
    const b = this.buckets.get(key);

    if (!b || b.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (b.count >= limit) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      throw new HttpException(
        { message: 'Demasiados intentos. Probá más tarde.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    b.count++;
  }

  reset(scope: string, identifier: string): void {
    this.buckets.delete(`${scope}:${identifier}`);
  }
}
