import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenService } from './token.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>,
    private readonly tokens: TokenService,
  ) {}

  async issue(userId: string, ip?: string | null, userAgent?: string | null, replacedId?: string) {
        const { token, expiresAt } = this.tokens.signRefresh(userId);
    const entity = this.repo.create({
      userId,
      tokenHash: this.tokens.sha256(token),
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      lastUsedAt: new Date(),
    });
    await this.repo.save(entity);

    if (replacedId) {
      await this.repo.update(replacedId, {
        revokedAt: new Date(),
        replacedByTokenId: entity.id,
      });
    }
    return { token, entity };
  }

  async validate(rawToken: string): Promise<RefreshToken> {
    const payload = this.tokens.verifyRefresh(rawToken);
    const hash = this.tokens.sha256(rawToken);

    const row = await this.repo.findOne({ where: { tokenHash: hash } });
    if (!row) throw new UnauthorizedException('Refresh token desconocido');

    if (row.revokedAt) {
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException('Refresh token revocado (posible robo)');
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }
    if (row.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token inconsistente');
    }

    // Actualizar lastUsedAt
    row.lastUsedAt = new Date();
    await this.repo.update(row.id, { lastUsedAt: row.lastUsedAt });

    return row;
  }

  async revoke(id: string) {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string) {
    await this.repo.update(
      { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      { revokedAt: new Date() },
    );
  }
}
