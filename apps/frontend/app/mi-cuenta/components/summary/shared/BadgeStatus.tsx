'use client';

import React from 'react';
import { getFriendlyStatusLabel, getBadgeConfig } from '../../../utils';

interface BadgeStatusProps {
  status: string;
  isDarkBg: boolean;
}

export default function BadgeStatus({ status, isDarkBg }: BadgeStatusProps) {
  const config = getBadgeConfig(status, isDarkBg);
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${config.style}`}>
      {getFriendlyStatusLabel(status)}
    </span>
  );
}