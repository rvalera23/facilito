// src/modules/quick-replies/quick-replies.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickReply } from './entities/quick-reply.entity';

// ============================================================
// 🔥 SEED DE DEFAULTS
// ============================================================
// Cuando un tenant entra por primera vez al panel de conversaciones
// y no tiene ninguna plantilla, se crean estas. Son editables y
// borrables. Ya incluyen variables dinámicas.
const DEFAULT_QUICK_REPLIES: Array<{
  label: string;
  text: string;
  category: string;
}> = [
  {
    label: 'Saludo',
    text: '¡Hola! Gracias por escribir a {{nombre_tienda}}. ¿En qué podemos ayudarte?',
    category: 'General',
  },
  {
    label: 'Horario',
    text: 'Nuestro horario de atención:\n{{horario}}',
    category: 'General',
  },
  {
    label: 'Ubicación',
    text: 'Estamos ubicados en:\n{{direccion}}\n\nHorario:\n{{horario}}',
    category: 'General',
  },
  {
    label: 'Envíos',
    text: 'Realizamos envíos a todo el país.\n\nTrabajamos con:\n{{envios}}',
    category: 'Ventas',
  },
  {
    label: 'Métodos de pago',
    text: 'Aceptamos Pago Móvil, transferencia, efectivo y Zelle. Cualquier duda, estamos atentos.',
    category: 'Pagos',
  },
  {
    label: 'Contacto',
    text: 'Podés contactarnos:\nWhatsApp: {{whatsapp}}\nCorreo: {{email}}',
    category: 'General',
  },
  {
    label: 'Gracias',
    text: '¡Gracias por tu compra! Cualquier cosa quedamos atentos. 🙌',
    category: 'General',
  },
];

@Injectable()
export class QuickRepliesService {
  constructor(
    @InjectRepository(QuickReply)
    private readonly quickReplyRepository: Repository<QuickReply>,
  ) {}

  // ============================================================
  // 🔥 LISTAR — con seed automático si está vacío
  // ============================================================
  async findAll(tenantId: string): Promise<QuickReply[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId es obligatorio');
    }

    let replies = await this.quickReplyRepository.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    // 🔥 Si es la primera vez, sembrar los defaults
    if (replies.length === 0) {
      replies = await this.seedDefaults(tenantId);
    }

    return replies;
  }

  // ============================================================
  // 🔥 CREAR
  // ============================================================
  async create(
    tenantId: string,
    data: { label: string; text: string; category?: string; sortOrder?: number },
  ): Promise<QuickReply> {
    if (!tenantId) {
      throw new BadRequestException('tenantId es obligatorio');
    }
    if (!data.label || !data.label.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (!data.text || !data.text.trim()) {
      throw new BadRequestException('El texto es obligatorio');
    }

    const reply = this.quickReplyRepository.create({
      tenantId,
      label: data.label.trim(),
      text: data.text.trim(),
      category: data.category?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      isDefault: false,
    });

    return await this.quickReplyRepository.save(reply);
  }

  // ============================================================
  // 🔥 ACTUALIZAR
  // ============================================================
  async update(
    tenantId: string,
    id: string,
    data: { label?: string; text?: string; category?: string; sortOrder?: number },
  ): Promise<QuickReply> {
    const reply = await this.quickReplyRepository.findOne({
      where: { id, tenantId },
    });

    if (!reply) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    if (data.label !== undefined) {
      if (!data.label.trim()) {
        throw new BadRequestException('El título no puede estar vacío');
      }
      reply.label = data.label.trim();
    }
    if (data.text !== undefined) {
      if (!data.text.trim()) {
        throw new BadRequestException('El texto no puede estar vacío');
      }
      reply.text = data.text.trim();
    }
    if (data.category !== undefined) {
      reply.category = data.category?.trim() || null;
    }
    if (data.sortOrder !== undefined) {
      reply.sortOrder = data.sortOrder;
    }

    return await this.quickReplyRepository.save(reply);
  }

  // ============================================================
  // 🔥 ELIMINAR
  // ============================================================
  async remove(tenantId: string, id: string): Promise<{ success: boolean }> {
    const reply = await this.quickReplyRepository.findOne({
      where: { id, tenantId },
    });

    if (!reply) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    await this.quickReplyRepository.delete(id);
    return { success: true };
  }

  // ============================================================
  // 🔥 SEED DE DEFAULTS
  // ============================================================
  private async seedDefaults(tenantId: string): Promise<QuickReply[]> {
    const toCreate = DEFAULT_QUICK_REPLIES.map((item, idx) =>
      this.quickReplyRepository.create({
        tenantId,
        label: item.label,
        text: item.text,
        category: item.category,
        sortOrder: idx,
        isDefault: true,
      }),
    );

    const saved = await this.quickReplyRepository.save(toCreate);
    return saved;
  }
}