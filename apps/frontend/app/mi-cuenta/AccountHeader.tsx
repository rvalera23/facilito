'use client';

import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
interface AccountHeaderProps {
  user: any;
  activeTab: string;
  textColor: string;
  primary: string;
  secondary: string;
  isDarkBg: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AccountHeader({ 
  user, 
  activeTab, 
  textColor, 
  primary, 
  secondary, 
  isDarkBg 
}: AccountHeaderProps) {
  // 🔥 Resolución dinámica del avatar con URL completa
  const rawAvatar = user?.avatarUrl || user?.avatar || user?.image;
  const resolvedAvatar = rawAvatar 
    ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_BASE}${rawAvatar}`)
    : null;

  // Estado del usuario (Activo por defecto)
  const isUserActive = user?.isActive !== false;

  // ✅ Verificación de email — lee del AuthContext (fuente única, sincronizada).
  // El AuthContext refresca desde /auth/context y se entera de cambios en vivo.
  const { user: authUser } = useAuth();
  const isVerified = (authUser ?? user)?.emailVerified === true;

  // Formatear el nombre con la inicial en mayúscula y el resto en minúscula
  const rawUserName = user?.name || 'Mi Cuenta';
  const formattedUserName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase();

  // 🔥 TAB CONFIG - SINCRONIZADO CON AccountSidebar
  const tabConfig: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
    resumen: {
      title: 'Resumen General',
      subtitle: 'Visualiza la actividad reciente de tus pedidos, citas y estado de tu cuenta.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),  
    },
    compras: {
      title: 'Compras',
      subtitle: 'Revisa el estatus, los comercios y el detalle de tus pedidos realizados.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    envios: {
      title: 'Envíos',
      subtitle: 'Hazle seguimiento a tus pedidos con envío o delivery.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    reclamos: {
      title: 'Reclamos',
      subtitle: 'Seguimiento de los problemas reportados con tus encomiendas.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    citas: {
  

      
      title: 'Citas',
      subtitle: 'Gestiona tus citas agendadas, confirma o reprograma tus servicios.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    resenas: {
      title: 'Reseñas',
      subtitle: 'Consulta tus opiniones, editalas y ve las respuestas de los vendedores.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    favoritos: {
      title: 'Favoritos',
      subtitle: 'Accede rápido a tus productos y servicios guardados para más tarde.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    conversaciones: {
      title: 'Conversaciones',
      subtitle: 'Comunícate directamente con los comercios y coordina detalles de tus pedidos.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    notificaciones: {
      title: 'Notificaciones',
      subtitle: 'Mantente al día con todas las notificaciones de tus compras y citas.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    perfil: {
      title: 'Mi Perfil',
      subtitle: 'Actualiza tus datos personales, dirección de entrega y contraseña.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    seguridad: {
      title: 'Seguridad',
      subtitle: 'Gestiona tus dispositivos conectados y cerrá sesiones que no reconozcas.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    branding: {
      title: 'Personalización',
      subtitle: 'Adapta los colores y la identidad visual de tu experiencia en la plataforma.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.358l1.414-1.414M14 6l4 4" />
        </svg>
      ),
    },
    saldo: {
      title: 'Saldo a favor',
      subtitle: 'Consulta el saldo que tienes disponible en cada tienda para tu próxima compra.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  };

  const currentInfo = tabConfig[activeTab] || { 
    title: 'Mi Cuenta', 
    subtitle: 'Bienvenido a tu panel personal.',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <header 
      className="relative overflow-hidden border p-4 md:p-6 rounded-3xl shadow-xl transition-all duration-300"
      style={{ 
        backgroundColor: secondary, 
        borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        color: textColor
      }}
    >
      {/* Destello ambiental sutil basado en el color primario */}
      <div 
        className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: primary }}
      />

      {/* Layout: en mobile → avatar arriba a la derecha + info abajo.
          En desktop → info izquierda + avatar derecha centrado. */}
      <div className="relative z-10 flex flex-row md:items-center justify-between gap-3 md:gap-6">
        {/* Bloque info (nombre + estado + verificado + título + subtítulo) */}
        <div className="space-y-1 max-w-2xl min-w-0 flex-1 order-2 md:order-1">
          {/* Línea superior más pequeña (text-[11px]) */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="text-[11px] font-medium tracking-wide opacity-75" style={{ color: textColor }}>
              {formattedUserName}
            </span>

            <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">•</span>

            <span className={`text-[11px] font-medium tracking-wide ${isUserActive ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isUserActive ? 'Cuenta Activa' : 'Inactiva'}
            </span>

            {/* ✅ Badge Verificada */}
            {isVerified && (
              <>
                <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verificada
                </span>
              </>
            )}
          </div>

          {/* Título de sección */}
          <div className="space-y-0.5">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: textColor }}>
              <span className="inline-flex items-center justify-center opacity-90" style={{ color: primary }}>
                {currentInfo.icon}
              </span>
              {currentInfo.title}
            </h2>

            {/* Subtítulo descriptivo */}
            <p className="text-xs font-normal leading-relaxed opacity-70 pt-0.5" style={{ color: textColor }}>
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Avatar: en mobile arriba a la derecha, en desktop a la derecha centrado */}
        <div className="relative flex items-start md:items-center justify-end shrink-0 order-1 md:order-2">
          {resolvedAvatar ? (
            <img 
              src={resolvedAvatar} 
              alt={user?.name || 'Avatar del usuario'} 
              className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover border shadow-md transition-transform duration-300 hover:scale-105"
              style={{ borderColor: primary + '40' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = e.target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-lg';
                  fallback.style.backgroundColor = primary;
                  fallback.style.color = '#ffffff';
                  fallback.textContent = formattedUserName.charAt(0);
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div 
              className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-lg transition-transform duration-300 hover:scale-105"
              style={{ 
                backgroundColor: primary, 
                color: '#ffffff' 
              }}
            >
              {formattedUserName.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}