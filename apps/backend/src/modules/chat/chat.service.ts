// chat.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // ============================================================
  // CREAR O OBTENER CONVERSACIÓN EXISTENTE
  // ============================================================
  async getOrCreateConversation(buyerId: string, tenantId: string, productId?: string) {
    if (!buyerId) {
      throw new BadRequestException('No se pudo identificar al usuario autenticado.');
    }
    if (!tenantId) {
      throw new BadRequestException('El tenantId es obligatorio.');
    }

    const whereCondition: any = {
      buyer: { id: buyerId },
      tenant: { id: tenantId },
    };

    if (productId) {
      whereCondition.product = { id: productId };
    }

    let conversation = await this.conversationRepository.findOne({
      where: whereCondition,
      relations: {
        product: true,
        tenant: true,
        buyer: true,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        buyer: { id: buyerId } as any,
        tenant: { id: tenantId } as any,
        product: productId ? ({ id: productId } as any) : null,
        status: 'active', // 🔥 NUEVO: estado inicial
      });
      conversation = await this.conversationRepository.save(conversation);
    }

    return conversation;
  }

  // ============================================================
  // OBTENER MENSAJES DE UNA CONVERSACIÓN
  // ============================================================
  async getMessages(conversationId: string) {
    return await this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      relations: {
        sender: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================
  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string,
    isStoreMessage?: boolean,
    tenantId?: string
  ) {
    if (!senderId) {
      throw new BadRequestException('No se pudo identificar al remitente del mensaje.');
    }

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        tenant: true,
        buyer: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Si la conversación estaba archivada o cerrada, reactivar
    if (conversation.status !== 'active') {
      await this.conversationRepository.update(
        { id: conversationId },
        { 
          status: 'active',
          updatedAt: new Date(),
        }
      );
    }

    let finalSenderId = senderId;

    // SI ES MENSAJE DE LA TIENDA, BUSCAR EL ADMIN/OWNER
    if (isStoreMessage && tenantId) {
      try {
        // Buscar el usuario admin/owner de la tienda en user_tenants
        const adminResult = await this.conversationRepository.manager
          .createQueryBuilder()
          .select('user_tenants')
          .from('user_tenants', 'user_tenants')
          .where('user_tenants.tenant_id = :tenantId', { tenantId })
          .andWhere('user_tenants.role IN (:...roles)', { roles: ['admin', 'owner'] })
          .getRawOne();

        if (adminResult && adminResult.user_tenants_user_id) {
          finalSenderId = adminResult.user_tenants_user_id;
          console.log(`[ChatService] Mensaje de tienda, remitente cambiado a admin: ${finalSenderId}`);
        } else {
          // Si no hay admin, intentar obtener cualquier usuario de la tienda
          const anyUserResult = await this.conversationRepository.manager
            .createQueryBuilder()
            .select('user_tenants')
            .from('user_tenants', 'user_tenants')
            .where('user_tenants.tenant_id = :tenantId', { tenantId })
            .getRawOne();

          if (anyUserResult && anyUserResult.user_tenants_user_id) {
            finalSenderId = anyUserResult.user_tenants_user_id;
            console.log(`[ChatService] Mensaje de tienda, remitente cambiado a usuario de la tienda: ${finalSenderId}`);
          } else {
            console.warn(`[ChatService] No se encontró usuario para tenant ${tenantId}`);
          }
        }
      } catch (error) {
        console.error('[ChatService] Error al buscar admin de la tienda:', error);
      }
    }

    // 🔥 NUEVO: Crear mensaje con isRead = false
    const message = this.messageRepository.create({
      conversation: { id: conversationId } as any,
      sender: { id: finalSenderId } as any,
      content,
      isRead: false, // 🔥 NUEVO: el mensaje llega sin leer
    });

    // 🔥 NUEVO: Actualizar timestamp de último mensaje
    await this.conversationRepository.update(
      { id: conversationId },
      { 
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      }
    );

    return await this.messageRepository.save(message);
  }

  // ============================================================
  // OBTENER CONVERSACIÓN POR ORDEN
  // ============================================================
  async getConversationByOrder(orderId: string, tenantId: string, buyerId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: {
        tenant: { id: tenantId },
        buyer: { id: buyerId },
      },
      relations: {
        product: true,
        tenant: true,
        buyer: true,
        messages: true,
      },
    });
    
    if (!conversation) {
      return null;
    }
    
    const hasOrderMessage = conversation.messages?.some(msg => 
      msg.content.includes(orderId)
    );
    
    return hasOrderMessage ? conversation : null;
  }

  // ============================================================
  // OBTENER CONVERSACIONES DE UN TENANT (PARA EL ADMIN)
  // ============================================================
  async getConversationsByTenant(tenantId: string) {
    return await this.conversationRepository.find({
      where: { 
        tenant: { id: tenantId },
        status: Not('closed'), // 🔥 NUEVO: excluir conversaciones cerradas
      },
      relations: {
        buyer: true,
        product: true,
        messages: {
          sender: true,
        },
      },
      order: { updatedAt: 'DESC' }, // 🔥 NUEVO: ordenar por última actualización
    });
  }

  // ============================================================
  // OBTENER CONVERSACIONES DE UN USUARIO (PARA EL CLIENTE)
  // ============================================================
  async getConversationsByUser(userId: string, tenantId?: string) {
    const whereCondition: any = {
      buyer: { id: userId },
      status: Not('closed'), // 🔥 NUEVO: excluir conversaciones cerradas
    };

    if (tenantId) {
      whereCondition.tenant = { id: tenantId };
    }

    return await this.conversationRepository.find({
      where: whereCondition,
      relations: {
        tenant: true,
        product: true,
        messages: {
          sender: true,
        },
      },
      order: { updatedAt: 'DESC' }, // 🔥 NUEVO: ordenar por última actualización
    });
  }

  // ============================================================
  // 🔥 MARCAR MENSAJES COMO LEÍDOS EN UNA CONVERSACIÓN
  // ============================================================
  async markMessagesAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: { messages: { sender: true } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // 🔥 CORREGIDO: Usar isRead en lugar de read
    const messagesToUpdate = conversation.messages.filter(
      msg => msg.sender?.id !== userId && msg.isRead === false
    );

    if (messagesToUpdate.length === 0) {
      return { message: 'No hay mensajes sin leer', updated: 0 };
    }

    // 🔥 CORREGIDO: Usar isRead = true
    for (const msg of messagesToUpdate) {
      msg.isRead = true;
      await this.messageRepository.save(msg);
    }

    return { 
      message: `${messagesToUpdate.length} mensajes marcados como leídos`, 
      updated: messagesToUpdate.length 
    };
  }

  // ============================================================
  // 🔥 MARCAR MENSAJES COMO LEÍDOS (VERSIÓN OPTIMIZADA)
  // ============================================================
  async markMessagesAsReadOptimized(conversationId: string, userId: string) {
    // Versión optimizada usando update directo
    const result = await this.messageRepository.update(
      {
        conversation: { id: conversationId },
        sender: { id: Not(userId) },
        isRead: false,
      },
      {
        isRead: true,
      }
    );

    return { 
      message: `${result.affected || 0} mensajes marcados como leídos`, 
      updated: result.affected || 0 
    };
  }

  // ============================================================
  // 🔥 ARCHIVAR/DESARCHIVAR CONVERSACIÓN
  // ============================================================
  async archiveConversation(conversationId: string, archived: boolean) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // 🔥 CORREGIDO: Usar status correctamente
    conversation.status = archived ? 'archived' : 'active';
    conversation.updatedAt = new Date();
    
    return await this.conversationRepository.save(conversation);
  }

  // ============================================================
  // 🔥 CERRAR CONVERSACIÓN PERMANENTEMENTE
  // ============================================================
  async closeConversation(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    conversation.status = 'closed';
    conversation.updatedAt = new Date();
    
    return await this.conversationRepository.save(conversation);
  }

  // ============================================================
  // 🔥 OBTENER CONTADOR DE MENSAJES NO LEÍDOS
  // ============================================================
  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        sender: { id: Not(userId) },
        isRead: false,
      },
    });
  }

  // ============================================================
  // 🔥 OBTENER CONTADOR DE MENSAJES NO LEÍDOS POR TENANT
  // ============================================================
  async getUnreadCountByTenant(tenantId: string, userId: string): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.tenantId = :tenantId', { tenantId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.isRead = :isRead', { isRead: false })
      .getCount();
  }

  // ============================================================
  // 🔥 OBTENER CONVERSACIÓN POR ID CON MENSAJES
  // ============================================================
  async getConversationWithMessages(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        buyer: true,
        tenant: true,
        product: true,
        messages: {
          sender: true,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return conversation;
  }

  // ============================================================
  // 🔥 ELIMINAR MENSAJE (SOLO ADMIN)
  // ============================================================
  async deleteMessage(messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    await this.messageRepository.delete(messageId);
    return { message: 'Mensaje eliminado correctamente' };
  }

  // ============================================================
  // 🔥 ELIMINAR CONVERSACIÓN (SOLO ADMIN)
  // ============================================================
  async deleteConversation(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: { messages: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Eliminar todos los mensajes primero
    if (conversation.messages && conversation.messages.length > 0) {
      await this.messageRepository.delete(
        conversation.messages.map(msg => msg.id)
      );
    }

    await this.conversationRepository.delete(conversationId);
    return { message: 'Conversación eliminada correctamente' };
  }
}