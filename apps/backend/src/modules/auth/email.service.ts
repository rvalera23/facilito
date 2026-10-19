import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fase 2 — Servicio de emails transaccionales.
 *
 * Usa Resend si RESEND_API_KEY está configurado. Si no, los emails
 * se loguean a la consola con formato visible para desarrollo.
 *
 * Para activar Resend:
 *   1. Crear cuenta en https://resend.com
 *   2. Verificar dominio o usar sandbox
 *   3. Poner RESEND_API_KEY en .env
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;
  private readonly enabled: boolean;
  private resend: any = null;

  constructor(private readonly cfg: ConfigService) {
    this.apiKey = this.cfg.get<string>('RESEND_API_KEY') || undefined;
    this.fromEmail = this.cfg.get<string>('RESEND_FROM_EMAIL') || 'no-reply@tudominio.com';
    this.enabled = !!this.apiKey;

    if (this.enabled) {
      // Carga dinámica para evitar error si el paquete no está instalado en dev
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Resend } = require('resend');
        this.resend = new Resend(this.apiKey);
        this.logger.log('EmailService: Resend habilitado');
      } catch (e) {
        this.logger.warn('EmailService: Resend no disponible, usando fallback a logs');
        this.enabled = false;
      }
    } else {
      this.logger.log('EmailService: RESEND_API_KEY no seteado → los emails se loguean a consola');
    }
  }

  private async send(params: SendEmailParams): Promise<void> {
    if (!this.enabled || !this.resend) {
      this.logEmailToConsole(params);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      this.logger.log(`Email enviado a ${params.to}: ${params.subject}`);
    } catch (e) {
      this.logger.error(`Fallo al enviar email a ${params.to}`, e as any);
      // Fallback: si Resend falla, loguear para no perder el link
      this.logEmailToConsole(params);
    }
  }

  private logEmailToConsole(params: SendEmailParams): void {
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log(`📧 EMAIL (modo dev) → ${params.to}`);
    this.logger.log(`📋 Subject: ${params.subject}`);
    this.logger.log('───────────────────────────────────────────────────────');
    // Extraer el link del HTML para que sea copiable fácil
    const linkMatch = params.html.match(/href="([^"]+)"/);
    if (linkMatch) {
      this.logger.log(`🔗 LINK: ${linkMatch[1]}`);
    } else if (params.text) {
      this.logger.log(`📝 ${params.text}`);
    }
    this.logger.log('═══════════════════════════════════════════════════════');
  }

  // ============================================================
  // EMAILS
  // ============================================================

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0b0f19; color: #fff; padding: 32px; border-radius: 16px;">
        <h1 style="color: #ea580c; margin: 0 0 8px 0; font-size: 24px;">facilito</h1>
        <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 14px;">Recuperación de contraseña</p>

        <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Hacé clic en el botón de abajo para crear una nueva.
        </p>

        <a href="${resetUrl}"
           style="display: inline-block; background: #ea580c; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 24px 0;">
          Restablecer contraseña
        </a>

        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
          Este link expira en <strong>15 minutos</strong>. Si no pediste este cambio, ignorá este email.
        </p>

        <p style="color: #475569; font-size: 12px; margin-top: 32px; word-break: break-all;">
          O copiá este link en tu navegador:<br/>
          <span style="color: #ea580c;">${resetUrl}</span>
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: 'Restablecer contraseña — facilito',
      html,
      text: `Recuperación de contraseña: ${resetUrl}`,
    });
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0b0f19; color: #fff; padding: 32px; border-radius: 16px;">
        <h1 style="color: #ea580c; margin: 0 0 8px 0; font-size: 24px;">facilito</h1>
        <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 14px;">Verificación de email</p>

        <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">
          Confirmá tu dirección de correo para activar todas las funciones de tu cuenta.
        </p>

        <a href="${verifyUrl}"
           style="display: inline-block; background: #ea580c; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 24px 0;">
          Verificar email
        </a>

        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
          Este link expira en <strong>24 horas</strong>.
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: 'Verificá tu email — facilito',
      html,
      text: `Verificación de email: ${verifyUrl}`,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0b0f19; color: #fff; padding: 32px; border-radius: 16px;">
        <h1 style="color: #ea580c; margin: 0 0 8px 0; font-size: 24px;">facilito</h1>
        <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">
          ¡Bienvenido/a, ${name}! Tu cuenta está lista.
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: '¡Bienvenido/a a facilito!',
      html,
      text: `¡Bienvenido/a, ${name}!`,
    });
  }
}
