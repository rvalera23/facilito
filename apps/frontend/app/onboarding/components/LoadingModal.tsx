// ==========================================
// ARCHIVO: components/LoadingModal.tsx
// ==========================================
'use client';

import React from 'react';
import { 
  Sparkles, 
  Database, 
  Palette, 
  CheckCircle2, 
  Store,
  LayoutDashboard,
  ShoppingBag
} from 'lucide-react';

import { DEFAULT_THEME } from '@/lib/branding';

interface LoadingModalProps {
  isOpen: boolean;
  step: number;
  userType?: 'buyer' | 'seller' | 'admin';
  primaryColor?: string;
  secondaryColor?: string;
  isLight?: boolean;
}

export default function LoadingModal({ 
  isOpen, 
  step, 
  userType = 'seller',
primaryColor = DEFAULT_THEME.primaryColor,
  secondaryColor = '#0f172a',
  isLight = false
}: LoadingModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      title: userType === 'buyer' ? 'Preparando tu perfil...' : 'Preparando tu tienda...',
      description: userType === 'buyer' 
        ? 'Configurando tu experiencia de compra.' 
        : 'Verificando datos y configuraciones iniciales.',
      icon: userType === 'buyer' ? LayoutDashboard : Store,
      progress: 25
    },
    {
      title: userType === 'buyer' ? 'Sincronizando datos...' : 'Configurando base de datos...',
      description: userType === 'buyer'
        ? 'Vinculando tu cuenta con la plataforma.'
        : 'Estableciendo esquemas y estructuras en la plataforma.',
      icon: userType === 'buyer' ? ShoppingBag : Database,
      progress: 50
    },
    {
      title: userType === 'buyer' ? 'Personalizando experiencia...' : 'Aplicando tu identidad visual...',
      description: userType === 'buyer'
        ? 'Cargando tus preferencias y configuración.'
        : 'Cargando colores, logos y estilos de tu marca.',
      icon: userType === 'buyer' ? Sparkles : Palette,
      progress: 85
    },
    {
      title: '¡Proceso completado con éxito!',
      description: userType === 'buyer' 
        ? 'Tu cuenta está lista para empezar a comprar.' 
        : 'Tu negocio está listo para vender.',
      icon: CheckCircle2,
      progress: 100
    }
  ];

  const currentStep = steps[Math.min(step - 1, steps.length - 1)] || steps[0];
  const Icon = currentStep.icon;
  const progress = currentStep.progress;

  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const cardBg = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';
  const textColor = isLight ? '#0f172a' : '#f1f5f9';
  const mutedColor = isLight ? '#64748b' : '#94a3b8';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500"
      style={{ 
        backgroundColor: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(11,15,25,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Glow de fondo */}
      <div 
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />
      <div 
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Card principal */}
      <div 
        className="relative w-full max-w-md border rounded-3xl shadow-2xl p-8 space-y-6 backdrop-blur-xl transition-all duration-500 animate-fadeIn"
        style={{
          backgroundColor: cardBg,
          borderColor: borderColor,
          boxShadow: `0 25px 50px -12px ${primaryColor}30`
        }}
      >
        {/* Anillo de progreso */}
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={primaryColor}
              strokeWidth="8"
              strokeLinecap="round"
              style={{
                strokeDasharray: `${(progress / 100) * 264} 264`,
                strokeDashoffset: '0',
                transition: 'stroke-dasharray 0.8s ease-out'
              }}
            />
          </svg>

          {/* Icono central */}
          <div className="absolute inset-0 flex items-center justify-center">
            {step === 4 ? (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center animate-bounce-in"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: primaryColor }} strokeWidth={2.5} />
              </div>
            ) : (
              <div className="relative">
                <Icon 
                  className="w-8 h-8 transition-all duration-500"
                  style={{ color: primaryColor }}
                  strokeWidth={1.8}
                />
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black tracking-tight" style={{ color: textColor }}>
            {currentStep.title}
          </h3>
          <p className="text-xs font-medium" style={{ color: mutedColor }}>
            {currentStep.description}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div 
            className="w-full h-2 rounded-full overflow-hidden p-0.5 border"
            style={{ 
              backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              borderColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
            }}
          >
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                backgroundColor: primaryColor,
                width: `${progress}%`,
                boxShadow: `0 0 20px ${primaryColor}50`
              }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-medium" style={{ color: mutedColor }}>
              {step === 4 ? 'Completado' : 'Procesando...'}
            </span>
            <span className="text-[10px] font-bold" style={{ color: primaryColor }}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Indicadores de paso */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-500"
              style={{
                backgroundColor: s <= step ? primaryColor : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                width: s === step ? '24px' : '8px',
                height: '8px',
                opacity: s <= step ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Mensaje de pie */}
        <p 
          className={`text-[9px] font-medium text-center transition-colors duration-500 ${step === 4 ? 'opacity-100' : 'opacity-60'}`}
          style={{ color: mutedColor }}
        >
          {step === 4 
            ? 'Redirigiendo al panel de control...' 
            : 'Este proceso tomará solo unos segundos. No cierres esta ventana.'
          }
        </p>
      </div>
    </div>
  );
}