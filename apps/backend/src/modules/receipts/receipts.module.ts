import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptEntity } from './entities/receipt.entity';
import { ReceiptNumberService } from './receipt-number.service';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReceiptEntity])],
  controllers: [ReceiptsController],
  providers: [ReceiptNumberService, ReceiptsService],
  exports: [ReceiptsService, ReceiptNumberService],
})
export class ReceiptsModule {}