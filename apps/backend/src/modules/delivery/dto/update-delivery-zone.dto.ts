// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/dto/update-delivery-zone.dto.ts
// Body para PATCH /delivery/zones/:tenantId/:zoneId
// ==========================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryZoneDto } from './create-delivery-zone.dto';

export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) {}