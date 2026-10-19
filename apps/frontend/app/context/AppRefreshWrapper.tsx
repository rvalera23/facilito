'use client';

import React from 'react';

interface AppRefreshWrapperProps {
  children: React.ReactNode;
}

export default function AppRefreshWrapper({ children }: AppRefreshWrapperProps) {
  // 🔥 DESACTIVADO COMPLETAMENTE - RETORNA SOLO LOS CHILDREN
  return <>{children}</>;
}