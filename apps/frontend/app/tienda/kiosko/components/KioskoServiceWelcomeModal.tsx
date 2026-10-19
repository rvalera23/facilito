'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Calendar, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { useKioskSession } from '../contexts/KioskSessionContext';

interface KioskoServiceWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  logoSource?: string | null;
  bannerSource?: string | null;
  primary: string;
  secondary: string;
  isSecondaryLight: boolean;
  textColor: string;
  mutedTextColor: string;
}

export default function KioskoServiceWelcomeModal({
  isOpen,
  onClose,
  tenant,
  logoSource,
  bannerSource,
  primary,
  secondary,
  isSecondaryLight,
  textColor,
  mutedTextColor,
}: KioskoServiceWelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 🔥 Sesión del kiosco
  const { user, mode, login, continueAnonymous, logout, hasChosenMode } = useKioskSession();
  const isAuthenticated = mode === 'authenticated' && user;

  const isLight = isSecondaryLight;
  const mutedColor = isLight ? '#475569' : mutedTextColor;

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  // 🔥 Setear CSS vars para el AuthModal (paleta de la tienda)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const prevBg = root.style.getPropertyValue('--bg-color');
    const prevAccent = root.style.getPropertyValue('--accent-color');
    const prevSecondary = root.style.getPropertyValue('--secondary-color');

    root.style.setProperty('--bg-color', secondary || '#09090B');
    root.style.setProperty('--accent-color', primary || '#F59E0B');
    root.style.setProperty('--secondary-color', secondary || '#0f172a');

    return () => {
      if (prevBg) root.style.setProperty('--bg-color', prevBg);
      else root.style.removeProperty('--bg-color');
      if (prevAccent) root.style.setProperty('--accent-color', prevAccent);
      else root.style.removeProperty('--accent-color');
      if (prevSecondary) root.style.setProperty('--secondary-color', prevSecondary);
      else root.style.removeProperty('--secondary-color');
    };
  }, [primary, secondary]);

  const handleAuthSuccess = (data: any, _isRegister: boolean) => {
    const token =
      data.access_token ||
      data.accessToken ||
      data.token ||
      data.jwt ||
      data.user?.token ||
      data.user?.access_token ||
      data.user?.accessToken;

    login(data, token || '');
    setShowAuthModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
           <div
        className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
          backgroundColor: secondary || (isLight ? '#f1f5f9' : '#090d16'),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {bannerSource && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: `url(${bannerSource})`,
              filter: 'blur(18px)',
            }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1]"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)',
          }}
        />

        <div className="relative z-10 w-full max-w-2xl text-center">
          {/* 🔥 BANNER DE USUARIO LOGUEADO */}
          {isAuthenticated && (
            <div
              className="mx-auto mb-5 flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl border shadow-lg max-w-md"
              style={{
                backgroundColor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
                borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: `${primary}20`, color: primary }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold truncate" style={{ color: textColor }}>
                  Hola, {user.name}
                </p>
                {user.email && (
                  <p className="text-[10px] truncate" style={{ color: mutedTextColor }}>
                    {user.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 p-2 rounded-xl transition hover:opacity-70 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                  color: textColor,
                }}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* LOGO */}
          {logoSource ? (
            <div className="flex justify-center mb-5">
              <img
                src={logoSource}
                alt={tenant?.name || 'Tienda'}
                className="w-32 sm:w-40 md:w-48 max-h-28 object-contain"
                style={{ filter: isLight ? 'brightness(0.9)' : 'brightness(1.1)' }}
              />
            </div>
          ) : (
            <div className="flex justify-center mb-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primary}20`, border: `2px solid ${primary}40` }}
              >
                <Calendar className="w-10 h-10" style={{ color: primary }} strokeWidth={1.5} />
              </div>
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: textColor }}>
            ¡{tenant?.name || 'Bienvenido'}!
          </h1>

          {tenant?.slogan && (
            <p
              className={`text-xs sm:text-sm font-light tracking-wide mt-1 ${isLight ? 'text-slate-900' : mutedTextColor}`}
            >
              {tenant.slogan}
            </p>
          )}

          {/* 🔥 Si NO ha elegido modo: elección login/anonimo */}
          {!hasChosenMode ? (
            <>
              <p className="text-base sm:text-lg font-medium mt-3" style={{ color: mutedTextColor }}>
                <span className="shimmer-text">¿Cómo deseas comenzar?</span>
              </p>
              <p className="text-xs sm:text-sm mt-2" style={{ color: textColor }}>
                Inicia sesión para autocompletar tus datos o continúa como invitado.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl text-white font-bold text-base sm:text-lg transition flex items-center justify-center gap-3 shadow-lg hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: primary }}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar sesión</span>
                </button>

                <button
                  type="button"
                  onClick={continueAnonymous}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg transition flex items-center justify-center gap-3 shadow-lg border hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{
                    borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)',
                    color: textColor,
                    backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Continuar como anónimo</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 🔥 Ya eligió modo: "Comenzar a Reservar" */}
              <p className="text-base sm:text-lg font-medium mt-3" style={{ color: primary }}>
                <span className="shimmer-text">Reserva tu cita de forma rápida y sencilla</span>
              </p>
              <p className="text-xs sm:text-sm mt-2" style={{ color: mutedColor }}>
                Elige tu servicio, selecciona fecha y hora, y confirma tu cita en minutos.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-md mt-7 py-4 rounded-2xl text-base sm:text-lg font-bold text-white flex items-center justify-center gap-3 mx-auto transition hover:opacity-90 active:scale-95 cursor-pointer"
                style={{ backgroundColor: primary }}
              >
                <span>Comenzar a Reservar</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .shimmer-text {
            background: linear-gradient(90deg, ${primary}, ${primary}80, ${primary});
            background-size: 200% auto;
            animation: shimmer 3s linear infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        `}</style>
      </div>

      {/* 🔥 AuthModal en portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AuthModal
            isOpen={showAuthModal}
            initialIsLogin={true}
            onClose={() => setShowAuthModal(false)}
                        hideExtras={true}

            onSuccess={handleAuthSuccess}
            skipRedirect={true}
            zIndexClass="z-[300]"
            brandName={tenant?.name || 'Tienda'}
            brandLogoUrl={logoSource || null}
          />,
          document.body
        )}
    </>
  );
}
