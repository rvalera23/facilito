// ==========================================
// ARCHIVO: components/Breadcrumbs.tsx
// ==========================================
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Ocultar en la página de inicio o en vistas de pantalla completa como el modo quiosco si lo deseas
  if (!pathname || pathname === '/' || pathname.includes('/kiosk')) return null;

  const segments = pathname.split('/').filter(Boolean);

  // Diccionario base para tus módulos principales
  const routeNames: Record<string, string> = {
    admin: 'Panel de Administración',
    'mi-cuenta': 'Mi Cuenta',
    tienda: 'Tienda',
    onboarding: 'Configuración Inicial',
  };

  let accumulatedPath = '';

  return (
    <div className="w-full px-4 sm:px-6 pt-2 pb-0">
      <nav aria-label="Breadcrumb" className="text-xs font-medium opacity-70 flex items-center space-x-2 overflow-x-auto whitespace-nowrap py-1">
        <Link href="/" className="hover:underline opacity-60">
          Inicio
        </Link>
        
        {segments.map((segment, index) => {
          accumulatedPath += `/${segment}`;
          const isLast = index === segments.length - 1;
          
          // Si es un slug de tienda o ID dinámico, lo estilizamos o usamos el diccionario
          const formattedName = routeNames[segment] || segment.replace(/-/g, ' ');

          return (
            <React.Fragment key={accumulatedPath}>
              <span className="opacity-40">/</span>
              {isLast ? (
                <span className="font-bold capitalize truncate max-w-[220px]" aria-current="page">
                  {formattedName}
                </span>
              ) : (
                <Link href={accumulatedPath} className="hover:underline opacity-70 capitalize truncate max-w-[150px]">
                  {formattedName}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}