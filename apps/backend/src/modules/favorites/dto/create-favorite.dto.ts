import { IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateFavoriteDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsIn(['product', 'service'])
  itemType?: 'product' | 'service' = 'product';
}