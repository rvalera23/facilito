// chat.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Request,
  Query,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createOrGetConversation(
    @Request() req,
    @Body() body: { tenantId: string; productId?: string }
  ) {
    const user = req.user;
    const userId = user?.id || user?.userId || user?.sub || user?._id;

    console.log('[ChatController] Usuario:', user);
    console.log('[ChatController] ID extraido:', userId);

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.chatService.getOrCreateConversation(
      userId,
      body.tenantId,
      body.productId
    );
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string
  ) {
    return await this.chatService.getMessages(conversationId);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() body: { content: string; isStoreMessage?: boolean; tenantId?: string }
  ) {
    const user = req.user;
    const userId = user?.id || user?.userId || user?.sub || user?._id;

    console.log('[ChatController] sendMessage - userId:', userId);
    console.log('[ChatController] sendMessage - isStoreMessage:', body.isStoreMessage);
    console.log('[ChatController] sendMessage - tenantId:', body.tenantId);

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.chatService.sendMessage(
      conversationId,
      userId,
      body.content,
      body.isStoreMessage || false,
      body.tenantId
    );
  }

  // ENDPOINT PARA ADMIN - Obtener conversaciones de un tenant
  @Get('tenant/:tenantId/conversations')
  async getTenantConversations(
    @Param('tenantId') tenantId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID es obligatorio');
    }
    return await this.chatService.getConversationsByTenant(tenantId);
  }

  // ENDPOINT PARA CLIENTE - Obtener conversaciones de un usuario
  @Get('user/:userId/conversations')
  async getUserConversations(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID es obligatorio');
    }
    return await this.chatService.getConversationsByUser(userId, tenantId);
  }

  // NUEVO ENDPOINT - Obtener conversación por orden
  @Get('order/:orderId/conversation')
  async getConversationByOrder(
    @Param('orderId') orderId: string,
    @Request() req,
    @Query('tenantId') tenantId: string,
    @Query('buyerId') buyerId: string
  ) {
    if (!orderId) {
      throw new BadRequestException('Order ID es obligatorio');
    }
    
    const user = req.user;
    const userId = user?.id || user?.userId || user?.sub || user?._id;
    
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    
    const conversation = await this.chatService.getConversationByOrder(
      orderId,
      tenantId,
      buyerId || userId
    );
    
    if (!conversation) {
      throw new NotFoundException('No se encontró conversación para esta orden');
    }
    
    return conversation;
  }
}