'use client';

import React from 'react';

interface PriceDisplayProps {
  ves: string;
  usd: string;
  primary?: string;
}

export default function PriceDisplay({ ves, usd, primary }: PriceDisplayProps) {
  return (
    <div>
      <div className={`font-extrabold ${primary ? 'text-emerald-500' : ''}`}>
        Bs. {ves}
      </div>
      <div className="text-[10px] opacity-60">
        $ {usd} USD
      </div>
    </div>
  );
}