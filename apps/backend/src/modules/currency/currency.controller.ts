// apps/backend/src/modules/currency/currency.controller.ts

import { Controller, Get } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  getRates() {
    return this.currencyService.getRates();
  }

  // 🔥 NUEVO ENDPOINT (OPCIONAL): Obtener solo la tasa de IVA
  @Get('iva')
  getIvaRate() {
    return this.currencyService.getIvaRate();
  }
}