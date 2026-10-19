// /opt/facilito/apps/backend/src/modules/currency/currency.module.ts

import { Module } from '@nestjs/common';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

@Module({
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService], // 🔥 AGREGAR ESTO
})
export class CurrencyModule {}