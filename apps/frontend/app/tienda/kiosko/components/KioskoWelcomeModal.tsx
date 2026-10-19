'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  ArrowRight,
  Globe,
  Calendar,
  LogOut,
  User as UserIcon,
  LogIn,
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { useKioskSession } from '../contexts/KioskSessionContext';

interface KioskoWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  tenant: any;
  logoSource?: string | null;
  bannerSource?: string | null;
  primary: string;
  secondary: string;
  isSecondaryLight: boolean;
  textColor: string;
  mutedTextColor: string;
  activePaymentMethods?: string[];
  socialNetworks?: Array<{ key: string; url: string }>;
  isService?: boolean;
}

const getSocialNetworkIcon = (key: string) => {
  switch (key) {
    case 'instagram':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
    case 'facebook':
      return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
    case 'tiktok':
      return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/></svg>;
    case 'x_twitter':
      return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'threads':
      return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/></svg>;
    case 'linkedin':
      return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>;
    default:
      return <Globe className="w-5 h-5" />;
  }
};

export default function KioskoWelcomeModal({
  isOpen,
  onClose,
  onReset,
  tenant,
  logoSource,
  bannerSource,
  primary,
  secondary,
  isSecondaryLight,
  textColor,
  mutedTextColor,
  activePaymentMethods = [],
  socialNetworks = [],
  isService = false,
}: KioskoWelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 🔥 Sesión del kiosco
  const { user, mode, login, continueAnonymous, logout, hasChosenMode } = useKioskSession();
  const isAuthenticated = mode === 'authenticated' && user;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // 🔥 Setear CSS variables para que el AuthModal detecte el tema de la tienda
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

  if (!isOpen) return null;

  const isLight = isSecondaryLight;

  const uniformBadgeStyle = isLight
    ? 'bg-white/70 border-slate-200/60 text-slate-700'
    : 'bg-black/40 border-white/10 text-slate-300';

  const handleClose = () => {
    if (onReset) onReset();
    onClose();
  };

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

  const getWelcomeTexts = () => {
    if (isService) {
      return {
        title: `¡${tenant?.name || 'Bienvenido'}!`,
        subtitle: 'Reserva tu cita de forma rápida y sencilla',
        action: 'Comenzar a Reservar',
        icon: <Calendar className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: primary }} strokeWidth={1.5} />,
        description: 'Elige tu servicio, selecciona fecha y hora, y confirma tu cita en minutos.',
      };
    }
    return {
      title: `¡${tenant?.name || 'Bienvenido'}!`,
      subtitle: 'Explora y compra tus productos favoritos',
      action: 'Comenzar a Comprar',
      icon: <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: primary }} strokeWidth={1.5} />,
      description: 'Navega por nuestro catálogo, agrega productos al carrito y paga de forma rápida.',
    };
  };

  const texts = getWelcomeTexts();

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundColor: secondary || (isSecondaryLight ? '#f1f5f9' : '#090d16'),
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {bannerSource && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: `url(${bannerSource})`, filter: 'blur(18px)' }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1]"
          style={{
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)',
          }}
        />

        <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-center">
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
            <div className="flex justify-center mb-4">
              <img
                src={logoSource}
                alt={tenant?.name || 'Tienda'}
                className="w-32 h-auto sm:w-40 md:w-48 object-contain"
                style={{ filter: isLight ? 'brightness(0.9)' : 'brightness(1.1)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl"
                style={{
                  backgroundColor: `${primary}20`,
                  border: `2px solid ${primary}40`,
                }}
              >
                {texts.icon}
              </div>
            </div>
          )}

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mt-2 tracking-tight"
            style={{ color: textColor }}
          >
            {texts.title}
          </h1>

          {tenant?.slogan && (
            <p
              className={`text-xs sm:text-sm font-light tracking-wide mt-1 ${
                isLight ? 'text-slate-900' : mutedTextColor
              }`}
            >
              {tenant.slogan}
            </p>
          )}

          {/* 🔥 Si NO ha elegido modo: muestra "¿Cómo deseas comenzar?" */}
          {!hasChosenMode ? (
            <>
              <p className="text-base sm:text-lg font-medium mt-2" style={{ color: mutedTextColor }}>
                <span className="shimmer-text">¿Cómo deseas comenzar?</span>
              </p>
              <p className="text-xs sm:text-sm mt-1" style={{ color: textColor }}>
                Inicia sesión para autocompletar tus datos o continúa como invitado.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl text-white font-bold text-base sm:text-lg transition flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 cursor-pointer shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar sesión</span>
                </button>

                <button
                  type="button"
                  onClick={continueAnonymous}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg transition flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 cursor-pointer shadow-lg border"
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
              {/* 🔥 Si YA eligió modo: muestra el botón "Comenzar" */}
              <p className="text-base sm:text-lg font-medium mt-2" style={{ color: mutedTextColor }}>
                <span className="shimmer-text">{texts.subtitle}</span>
              </p>
              <p className="text-xs sm:text-sm mt-1" style={{ color: textColor }}>
                {texts.description}
              </p>

              {/* Redes Sociales */}
              {socialNetworks.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {socialNetworks.map((net) => (
                    <a
                      key={net.key}
                      href={net.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Visitar ${net.key}`}
                      className={`p-2 rounded-xl border transition-all duration-300 hover:scale-110 flex items-center justify-center shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}
                    >
                      {getSocialNetworkIcon(net.key)}
                    </a>
                  ))}
                </div>
              )}

              {/* Métodos de Pago */}
              {activePaymentMethods.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${mutedTextColor}`}
                  >
                    Pago con:
                  </span>
                  {activePaymentMethods.map((method) => (
                    <span
                      key={method}
                      className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold border shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}
                    >
                      {method}
                    </span>
                  ))}
                </div>
              )}

              {/* Botón "Comenzar" */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleClose}
                  style={{ backgroundColor: primary }}
                  className="w-full max-w-sm sm:max-w-md py-3.5 sm:py-4 rounded-2xl text-white font-bold text-base sm:text-lg transition flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 cursor-pointer shadow-lg"
                >
                  <span>{texts.action}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: -200% center;
            }
            100% {
              background-position: 200% center;
            }
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

      {/* 🔥 AuthModal en portal (por encima de todo) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AuthModal
            isOpen={showAuthModal}
            initialIsLogin={true}
            onClose={() => setShowAuthModal(false)}
                        hideExtras={true}

            onSuccess={handleAuthSuccess}
            skipRedirect={true}
            zIndexClass="z-[200]"
            brandName={tenant?.name || 'Tienda'}
            brandLogoUrl={logoSource || null}
          />,
          document.body
        )}
    </>
  );
}
