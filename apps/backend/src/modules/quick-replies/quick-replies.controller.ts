// src/modules/quick-replies/quick-replies.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { User } from '../auth/entities/user.entity';

@Controller('quick-replies')
export class QuickRepliesController {
  constructor(
    private readonly quickRepliesService: QuickRepliesService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getTenantId(req: any): Promise<string> {
    const user = req.user;
    const userId = user?.id || user?.sub || user?.userId;

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const directTenantId = user?.tenantId || user?.tenant_id;
    if (directTenantId) {
      return directTenantId;
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!dbUser || !dbUser.tenantId) {
      throw new BadRequestException(
        'El usuario no tiene una tienda asociada',
      );
    }

    return dbUser.tenantId;
  }

  @Get()
  async findAll(@Request() req: any) {
    const tenantId = await this.getTenantId(req);
    return await this.quickRepliesService.findAll(tenantId);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateQuickReplyDto) {
    const tenantId = await this.getTenantId(req);
    return await this.quickRepliesService.create(tenantId, body);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateQuickReplyDto,
  ) {
    const tenantId = await this.getTenantId(req);
    return await this.quickRepliesService.update(tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = await this.getTenantId(req);
    return await this.quickRepliesService.remove(tenantId, id);
  }
}