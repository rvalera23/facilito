// ==========================================
// ARCHIVO: components/AuthModal.tsx
// ==========================================
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordModal from './ForgotPasswordModal';
import { getTenantConfig, _loadFontAsset } from '@/lib/fontLoader';

interface AuthModalProps {
  isOpen: boolean;
  initialIsLogin?: boolean;
  onClose: () => void;
  onSuccess: (data: any, isRegister: boolean) => void;
  skipRedirect?: boolean;
  zIndexClass?: string;
  brandName?: string;
  brandLogoUrl?: string | null;
  // 🔥 Paleta explícita (opcional). Si se pasa, se prioriza sobre la detección automática.
  primaryColorProp?: string;
  secondaryColorProp?: string;
  backgroundColorProp?: string;
  isLightProp?: boolean;
  // 🔥 NUEVO: ocultar registro, forgot password y remember me (para kiosco)
  hideExtras?: boolean;
}
export default function AuthModal({
  isOpen,
  initialIsLogin = false,
  onClose,
  onSuccess,
  skipRedirect = false,
  zIndexClass = 'z-50',
  brandName = 'facilito',
  brandLogoUrl = null,
  primaryColorProp,
  secondaryColorProp,
  backgroundColorProp,
  isLightProp,
  hideExtras = false,
}: AuthModalProps) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [showForgot, setShowForgot] = useState(false);
  const [isLight, setIsLight] = useState<boolean>(isLightProp ?? false);
  const [primaryColor, setPrimaryColor] = useState<string>(primaryColorProp || '#F59E0B');
  const [bgColor, setBgColor] = useState<string>(backgroundColorProp || '#09090B');
  const [secondaryColor, setSecondaryColor] = useState<string>(secondaryColorProp || '#0f172a');
  const [fontFamily, setFontFamily] = useState<string>('Quicksand');
  const modalRef = useRef<HTMLDivElement>(null);

  // 🔥 Si llegan props nuevas, sincronizarlas (por si cambian después)
  useEffect(() => {
    if (isLightProp !== undefined) setIsLight(isLightProp);
  }, [isLightProp]);

  useEffect(() => {
    if (primaryColorProp) setPrimaryColor(primaryColorProp);
  }, [primaryColorProp]);

  useEffect(() => {
    if (backgroundColorProp) setBgColor(backgroundColorProp);
  }, [backgroundColorProp]);

  useEffect(() => {
    if (secondaryColorProp) setSecondaryColor(secondaryColorProp);
  }, [secondaryColorProp]);

  useEffect(() => {
    // 🔥 Si ya nos pasaron la paleta completa por props, no hacemos detección
    // (evita conflictos y colores cacheados).
    if (
      primaryColorProp !== undefined &&
      backgroundColorProp !== undefined &&
      isLightProp !== undefined
    ) {
      console.log('🔒 [AuthModal] Paleta provista por props, saltando detección automática');
      return;
    }

    const detectPalette = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        setBgColor(bgColor);
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setIsLight(brightness > 140);
        }
      } else {
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        if (bodyBg) {
          const rgb = bodyBg.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            setIsLight(brightness > 140);
          }
        }
      }

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
      if (accent) setPrimaryColor(accent);

      const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
      if (secondary) setSecondaryColor(secondary);
    };

    detectPalette();

    const observer = new MutationObserver(detectPalette);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    window.addEventListener('themeChange', detectPalette);
    window.addEventListener('paletteChange', detectPalette);
    window.addEventListener('tenantThemeUpdated', detectPalette);

    return () => {
      observer.disconnect();
      window.removeEventListener('themeChange', detectPalette);
      window.removeEventListener('paletteChange', detectPalette);
      window.removeEventListener('tenantThemeUpdated', detectPalette);
    };
  }, []);

  // 🔥 Cargar la fuente de la tienda activa
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isOpen) return;

    // Detectar el slug desde el pathname
    const path = window.location.pathname;
    const match = path.match(/\/tienda\/([^\/]+)/);
    const slug = match?.[1];

    // 🔥 El slug puede no encontrarse si estamos en el kiosco
    // (pathname === '/tienda/kiosko') — en ese caso usar el tenant del localStorage
    let finalSlug = slug;
    if (!finalSlug || finalSlug === 'kiosko') {
      try {
        const tenantStr = localStorage.getItem('tenant');
        if (tenantStr) {
          const tenant = JSON.parse(tenantStr);
          finalSlug = tenant.slug;
        }
      } catch {}
    }

    if (!finalSlug) {
      console.log('🔤 [AuthModal] No se pudo detectar slug para la fuente, usando Quicksand');
      return;
    }

    const config = getTenantConfig(finalSlug);
    const family = config?.fontFamily || 'Quicksand';
    setFontFamily(family);

    _loadFontAsset(family);

    // Aplicar directamente al contenedor del modal
    if (modalRef.current) {
      modalRef.current.style.fontFamily = `'${family}', 'Quicksand', system-ui, sans-serif`;
    }

    console.log(`🔤 [AuthModal] Fuente aplicada: ${family} (slug: ${finalSlug})`);
  }, [isOpen]);

  useEffect(() => {
    setIsLogin(initialIsLogin);
  }, [initialIsLogin, isOpen]);

  if (!isOpen) return null;

  const textColorClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColorClass = isLight ? 'text-slate-600' : 'text-slate-400';
  const labelColorClass = isLight ? 'text-slate-800' : 'text-slate-300';
  const inputBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.25)';
  const inputBorder = isLight ? 'border-slate-900/20' : 'border-white/15';
  const modalBorder = isLight ? 'border-slate-900/15' : 'border-white/10';

  const handleAuthSuccess = (data: any, isRegisterFlow: boolean) => {
    const token =
      data.access_token ||
      data.accessToken ||
      data.token ||
      data.jwt ||
      data.user?.token ||
      data.user?.access_token ||
      data.user?.accessToken;

    const userInfo = data.user || data;
    const realId = userInfo.id || userInfo._id || userInfo.sub || userInfo.userId || data.id || data.userId;

    if (!realId) {
      alert('Error crítico de autenticación: El servidor no devolvió un ID de usuario.');
      return;
    }

    const normalizedUser = {
      ...userInfo,
      id: realId,
      userId: realId,
      role: (userInfo.role || data.role || '').toLowerCase(),
    };

    // 🔥 Si skipRedirect=true (kiosco): NO tocar localStorage global
    if (!skipRedirect) {
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);
        // Fase 1: guardar refresh_token si el backend lo devolvió
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      }
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      const userName = userInfo.name || userInfo.firstName || userInfo.fullName || data.name || 'Usuario';
      localStorage.setItem('userName', userName);

      const tenantData = data.tenant || data.user?.tenant;
      if (tenantData) {
        localStorage.setItem('tenant', JSON.stringify(tenantData));
      } else {
        localStorage.removeItem('tenant');
      }

      // 🔥 GUARDAR user_theme del user que se loguea (colores del backend).
      // Si el backend no devuelve colores, se usa el default de facilito.
      // Esto SOBREESCRIBE cualquier user_theme viejo que haya quedado.
      try {
        const themeFromBackend = {
          primaryColor:
            tenantData?.primary_color || tenantData?.primaryColor ||
            userInfo.primary_color || userInfo.primaryColor || '#ea580c',
          secondaryColor:
            tenantData?.secondary_color || tenantData?.secondaryColor ||
            userInfo.secondary_color || userInfo.secondaryColor || '#0f172a',
          backgroundColor:
            tenantData?.background_color || tenantData?.backgroundColor ||
            userInfo.background_color || userInfo.backgroundColor || '#0b0f19',
          accentColor:
            tenantData?.accent_color || tenantData?.accentColor ||
            userInfo.accent_color || userInfo.accentColor || '#fbbf24',
          fontFamily:
            tenantData?.font_family || tenantData?.fontFamily ||
            userInfo.font_family || userInfo.fontFamily || 'Quicksand',
          name: userName,
        };
        localStorage.setItem('user_theme', JSON.stringify(themeFromBackend));
        console.log('✅ [AuthModal] user_theme restaurado del backend:', themeFromBackend);
      } catch (e) {
        console.warn('⚠️ [AuthModal] Error guardando user_theme:', e);
      }

      window.dispatchEvent(new Event('authChange'));
    } else {
      console.log('🔒 [AuthModal] skipRedirect=true → no toca localStorage global');
    }

    onSuccess(data, isRegisterFlow);
    onClose();

    if (skipRedirect) {
      console.log('🔒 [AuthModal] skipRedirect=true → no navegando');
      return;
    }

    if (isRegisterFlow) {
      router.push('/onboarding?new=true');
      router.refresh();
      return;
    }

    const userRole = normalizedUser.role;
    const tenantData = data.tenant || data.user?.tenant;
    const tenantSlug = tenantData?.slug || data.slug;
    const hasTenant = Boolean(tenantSlug);

// 🔥 Repartidor: siempre va a /repartidor, sin importar tenant
if (role === 'repartidor') {
  router.push('/repartidor');
  return;
}

// 🔥 Profesional: siempre va a /profesional, sin importar tenant
if (role === 'profesional') {
  router.push('/profesional');
  return;
}

    if (hasTenant || userRole === 'seller' || userRole === 'vendedor') {
      if (tenantSlug) {
        router.push(`/admin/${tenantSlug}`);
      } else {
        router.push('/admin/dashboard');
      }
      router.refresh();
      return;
    }

    if (userRole === 'buyer' || userRole === 'comprador') {
      router.push('/mi-cuenta');
      router.refresh();
      return;
    }

    router.refresh();
  };

  return (
    <>
      <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn`}>
        <div
          ref={modalRef}
          className={`relative w-full max-w-md rounded-3xl shadow-2xl p-8 border ${modalBorder} transition-colors duration-300`}
          style={{
            backgroundColor: bgColor,
            fontFamily: `'${fontFamily}', 'Quicksand', system-ui, sans-serif`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-5 right-5 ${mutedTextColorClass} hover:${textColorClass} cursor-pointer transition-colors`}
          >
            ✕
          </button>

          {isLogin ? (
            <LoginForm
              onSuccess={(data) => handleAuthSuccess(data, false)}
              onOpenForgotPassword={() => setShowForgot(true)}
              textColorClass={textColorClass}
              mutedTextColorClass={mutedTextColorClass}
              labelColorClass={labelColorClass}
              inputBg={inputBg}
              inputBorder={inputBorder}
              primaryColor={primaryColor}
              backgroundColor={bgColor}
              isLight={isLight}
              secondaryColor={secondaryColor}
              brandName={brandName}
              brandLogoUrl={brandLogoUrl}
              hideExtras={hideExtras}
            />
          ) : (
            <RegisterForm
              onSuccess={(data) => handleAuthSuccess(data, true)}
            />
          )}
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />
    </>
  );
}
