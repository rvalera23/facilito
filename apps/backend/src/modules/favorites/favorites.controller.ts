import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getMyFavorites(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return await this.favoritesService.findAllByUser(userId);
  }

  /**
   * POST /favorites/:itemId?type=product|service
   * Toggle de favorito con tipo por query param.
   */
  @Post(':itemId')
  async toggleFavoriteParam(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Query('type') type: 'product' | 'service' = 'product',
  ) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return await this.favoritesService.toggleFavorite(userId, itemId, type);
  }

  /**
   * POST /favorites  { itemId, itemType }
   * Toggle alternativo por body.
   */
  @Post()
  async toggleFavoriteBody(
    @Req() req: any,
    @Body() bodyDto: CreateFavoriteDto,
  ) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return await this.favoritesService.toggleFavorite(
      userId,
      bodyDto.itemId,
      bodyDto.itemType || 'product',
    );
  }
}