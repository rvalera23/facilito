// ============================================================
// ARCHIVO: components/cards/DistanceBadge.tsx
// Badge de cercanía. Hereda colores del theme.
// ============================================================
'use client';

import React, { memo } from 'react';
import { MapPin } from 'lucide-react';

export interface ProximityInfo {
  distanceKm: number | null;
  distanceLabel: string;
  precision: 'exact' | 'street' | 'city' | 'region';
  zoneMatch: boolean;
}

interface DistanceBadgeProps {
  proximity: ProximityInfo;
  primaryColor: string;
}

export const DistanceBadge = memo(({ proximity, primaryColor }: DistanceBadgeProps) => {
  const label = proximity?.distanceLabel || '';
  if (!label) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[8px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-sm"
      style={{
        backgroundColor: `${primaryColor}15`,
        borderColor: `${primaryColor}40`,
        color: primaryColor,
      }}
      title={proximity.zoneMatch ? `En tu zona` : `A ${label}`}
    >
      <MapPin size={8} strokeWidth={2.5} />
      {label}
    </span>
  );
});

DistanceBadge.displayName = 'DistanceBadge';