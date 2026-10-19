'use client';

import { useEffect, useState } from 'react';
import ScrollToTopButton from './ScrollToTopButton';

export default function ScrollToTopButtonWrapper() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 🔥 Solo renderizar si NO estamos en modo kiosko (sin ?token=)
    const isKioskMode = window.location.search.includes('token');
    setShouldRender(!isKioskMode);
  }, []);

  if (!shouldRender) return null;

  return <ScrollToTopButton />;
}
