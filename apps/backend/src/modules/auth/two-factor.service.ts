import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { generateSecret as otpGenerateSecret, verify as otpVerify, generateURI as otpGenerateURI } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * Fase 4 — 2FA (TOTP)
 *
 * - Encripta/desencripta el `totpSecret` con AES-256-GCM usando ENCRYPTION_KEY.
 * - Genera QR con `otplib` + `qrcode`.
 * - Valida códigos TOTP.
 * - Genera y valida backup codes (10 por usuario, hasheados con SHA-256).
 */

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recomendado
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly encryptionKey: Buffer;

  constructor(private readonly cfg: ConfigService) {
    const keyHex = this.cfg.getOrThrow<string>('ENCRYPTION_KEY');

    // Acepta 32 bytes hex (64 chars). Si no, error claro.
    if (keyHex.length !== 64 || !/^[0-9a-f]+$/i.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes). Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');


  }

  // ============================================================
  // AES-256-GCM para el totpSecret
  // ============================================================
  encryptSecret(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:encrypted (todo hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptSecret(encoded: string): string {
    const parts = encoded.split(':');
    if (parts.length !== 3) {
      throw new Error('totpSecret tiene formato inválido');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(AES_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  // ============================================================
  // TOTP
  // ============================================================
  generateSecret(): string {
    return otpGenerateSecret();
  }

  generateOtpauthUrl(email: string, secret: string, issuer = 'facilito'): string {
    return otpGenerateURI({ secret, label: email, issuer });
  }

  async generateQrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: {
        dark: '#0b0f19',
        light: '#ffffff',
      },
    });
  }

  async verifyTotp(secret: string, code: string): Promise<boolean> {
    try {
      const result: any = await otpVerify({ secret, token: code });
      return result?.valid === true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Backup codes
  // ============================================================
  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // 4 grupos de 4 caracteres alfanuméricos, ej: A3F1-9K2B-XY45-PZ7Q
      const segments: string[] = [];
      for (let j = 0; j < 4; j++) {
        // Genera 4 chars alfanuméricos
        const chars = randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
        segments.push(chars);
      }
      codes.push(segments.join('-'));
    }
    return codes;
  }

  hashBackupCode(code: string): string {
    // Normaliza: uppercase y sin guiones, así "A3F1-9K2B" = "a3f19k2b"
    const normalized = code.replace(/-/g, '').toLowerCase();
    return createHash('sha256').update(normalized).digest('hex');
  }

  // ============================================================
  // Temp token para el paso 2 del login
  // ============================================================
  generateTempToken(): { token: string; expiresAt: Date } {
    // Token aleatorio (no JWT, simple string)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 min para completar el 2FA
    return { token, expiresAt };
  }
}
