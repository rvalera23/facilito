// ============================================================
// ARCHIVO: backend/src/modules/orders/dto/payment-breakdown.dto.ts
// ============================================================
// DTOs para los endpoints de pagos mixtos.
//
// IMPORTANTE:
//   - El cliente NO manda totals, change ni status.
//     El backend los calcula (snapshot-first).
//   - El cliente NO manda exchangeRate. Si lo manda, se ignora
//     y se usa la tasa del CurrencyService (server-side).
//   - Cada método tiene required fields según
//     REQUIRED_FIELDS_BY_METHOD. Se validan con
//     `validateMethodEntries()` llamada desde el service.
// ============================================================

import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ChangeResolution,
  PaymentCurrency,
  PaymentMethodEntry,
  PaymentMethodType,
} from '../types/payment-breakdown.type';
import { REQUIRED_FIELDS_BY_METHOD } from '../types/payment-breakdown.type';

// ------------------------------------------------------------
// RUNTIME ENUMS PARA CLASS-VALIDATOR
// ------------------------------------------------------------
// class-validator necesita valores en runtime, no tipos.
// Estos arrays deben mantenerse sincronizados con los tipos.
// Si se agrega un método al enum, sumarlo aquí también.
// ------------------------------------------------------------

const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'cash',
  'pago_movil',
  'zelle',
  'pos',
  'biopago',
  'binance',
  'paypal',
  'crypto_wallet',
  'zimli',
];

const PAYMENT_CURRENCIES: PaymentCurrency[] = ['VES', 'USD'];

const CHANGE_RESOLUTIONS: ChangeResolution[] = [
  'pending',
  'delivered',
  'credit',
  'rounded',
  'cancelled',
];

const ID_TYPES = ['V', 'E', 'J', 'G', 'P'] as const;

// ------------------------------------------------------------
// ENTRADA DE MÉTODO
// ------------------------------------------------------------

export class PaymentMethodEntryDto {
  /**
   * FK lógica a `payment_methods.id`. Null o ausente para 'cash'.
   * El service valida que el id pertenezca al tenant.
   */
  @IsOptional()
  @IsString()
  methodId?: string;

  @IsEnum(PAYMENT_METHOD_TYPES)
  methodType!: PaymentMethodType;

  /**
   * Label congelado al momento del pago. Si no se manda, el
   * service lo construye con buildMethodLabelSnapshot().
   */
  @IsOptional()
  @IsString()
  methodLabelSnapshot?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsEnum(PAYMENT_CURRENCIES)
  currency!: PaymentCurrency;

  // --- Datos del checkout (todos opcionales a nivel tipo) ---
  // El service valida los required por método.

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  clientIdNumber?: string;

  @IsOptional()
  @IsIn(ID_TYPES as unknown as string[])
  clientIdType?: 'V' | 'E' | 'J' | 'G' | 'P';

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientAccountType?: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ------------------------------------------------------------
// CREAR BREAKDOWN
// ------------------------------------------------------------

// ------------------------------------------------------------
// PREFERENCIA DE ENTREGA DEL VUELTO (del comprador)
// ------------------------------------------------------------

export class ChangeDeliveryPagoMovilPreferenceDto {
  @IsString()
  @IsNotEmpty()
  bank!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(ID_TYPES as unknown as string[])
  clientIdType!: 'V' | 'E' | 'J' | 'G' | 'P';

  @IsString()
  @IsNotEmpty()
  clientIdNumber!: string;
}

export class ChangeDeliveryPreferenceDto {
  @IsIn(['cash_ves', 'cash_usd', 'pago_movil', 'other'])
  method!: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';

  @IsOptional()
  @ValidateNested()
  @Type(() => ChangeDeliveryPagoMovilPreferenceDto)
  pagoMovilData?: ChangeDeliveryPagoMovilPreferenceDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentBreakdownDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodEntryDto)
  methods!: PaymentMethodEntryDto[];

  @IsOptional()
  @IsIn(CHANGE_RESOLUTIONS)
  changeResolution?: ChangeResolution;

  @IsOptional()
  @IsString()
  changeResolutionNotes?: string;

  /**
   * Preferencia de entrega del vuelto (opcional).
   * El comprador la deja cuando paga con efectivo y hay vuelto.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ChangeDeliveryPreferenceDto)
  changeDeliveryPreference?: ChangeDeliveryPreferenceDto;
}

// ------------------------------------------------------------
// RESOLVER VUELTO
// ------------------------------------------------------------

export class ChangeDeliveryPagoMovilDataDto {
  @IsString()
  @IsNotEmpty()
  bank!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(ID_TYPES as unknown as string[])
  clientIdType!: 'V' | 'E' | 'J' | 'G' | 'P';

  @IsString()
  @IsNotEmpty()
  clientIdNumber!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class ResolveChangeDto {
  @IsIn(CHANGE_RESOLUTIONS)
  resolution!: ChangeResolution;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Cómo se le entregó el vuelto al cliente.
   * Solo aplica cuando resolution === 'delivered'.
   */
  @IsOptional()
  @IsIn(['cash_ves', 'cash_usd', 'pago_movil', 'other'])
  deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';

  /**
   * Datos del cliente para entregarle el vuelto por Pago Móvil.
   * Solo requerido cuando deliveryMethod === 'pago_movil'.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ChangeDeliveryPagoMovilDataDto)
  deliveryPagoMovilData?: ChangeDeliveryPagoMovilDataDto;
}

// ------------------------------------------------------------
// VALIDADOR CUSTOM: required fields por método
// ------------------------------------------------------------
// Se llama desde el service porque depende del methodType
// de cada entrada. El DTO no puede hacer esta validación
// porque es condicional al valor runtime de cada item.
// ------------------------------------------------------------

export interface MethodValidationError {
  index: number;
  methodType: PaymentMethodType;
  missing: string[];
}

/**
 * Valida que cada entrada tenga los required fields de su método.
 * Devuelve lista de errores (vacía si todo OK).
 */
export function validateMethodEntries(
  methods: PaymentMethodEntryDto[],
): MethodValidationError[] {
  const errors: MethodValidationError[] = [];

  methods.forEach((m, index) => {
    const required = REQUIRED_FIELDS_BY_METHOD[m.methodType] ?? [];
    const missing: string[] = [];

    for (const field of required) {
      const value = (m as unknown as Record<string, unknown>)[String(field)];
      const isEmptyString = typeof value === 'string' && value.trim() === '';
      const isNullish = value === null || value === undefined;
      if (isNullish || isEmptyString) {
        missing.push(String(field));
      }
    }

    if (missing.length > 0) {
      errors.push({ index, methodType: m.methodType, missing });
    }
  });

  return errors;
}

/**
 * Helper tipado: convierte un DTO validado a PaymentMethodEntry.
 * El service llama esto para construir el snapshot antes de
 * calcular totales.
 */
export function dtoToMethodEntry(
  dto: PaymentMethodEntryDto,
  labelSnapshot: string,
): PaymentMethodEntry {
  return {
    methodId: dto.methodId ?? null,
    methodType: dto.methodType,
    methodLabelSnapshot: labelSnapshot,
    amount: Number(dto.amount) || 0,
    currency: dto.currency,
    reference: dto.reference,
    bank: dto.bank,
    clientIdNumber: dto.clientIdNumber,
    clientIdType: dto.clientIdType,
    clientPhone: dto.clientPhone,
    clientAccountType: dto.clientAccountType,
    senderEmail: dto.senderEmail,
    proofUrl: dto.proofUrl,
    notes: dto.notes,
  };
}