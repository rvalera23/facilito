'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { APP_PALETTES as VENEZUELAN_PALETTES } from '../../constants/palettes';
import { PRODUCT_NICHES, SERVICE_NICHES } from '../../constants/nicheData';

// 🔥 Detectar si un color es claro (para elegir texto oscuro o claro en vivo)
function isColorLight(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substr(0, 2), 16) || 0;
    g = parseInt(clean.substr(2, 2), 16) || 0;
    b = parseInt(clean.substr(4, 2), 16) || 0;
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Formato no permitido. Utiliza PNG, SVG, JPG, WEBP o ICO.',
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      isValid: false,
      error: `El archivo pesa ${fileSizeMB.toFixed(1)} MB. El tamaño máximo es de ${MAX_FILE_SIZE_MB} MB.`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// COMPONENTE DE VISTA PREVIA - ESTILO STOREHERO (EXACTO)
// ============================================================================

const PreviewBanner = memo(({ 
  primaryColor, 
  secondaryColor, 
  backgroundColor, 
  logoUrl, 
  bannerUrl,
  name,
  slogan,
  description,
  niche,
  modelType,
  isLight,
  currencies = ['USD'],
  paymentMethods = ['Efectivo'],
  socialLinks = [],
  totalProducts = 0,
  isServiceStore = false,
}: any) => {
  const [bannerLoaded, setBannerLoaded] = useState(false);
  
  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-slate-300';
  const heroBgColor = backgroundColor || '#0f172a';
  const primary = primaryColor || '#06B6D4';
  
  // Calcular estado de la tienda (simulado para preview)
  const storeStatus = { isOpen: true, label: 'Abierto Ahora' };
  
  // Obtener el nombre del nicho
  const allNiches = [...PRODUCT_NICHES, ...SERVICE_NICHES];
  const nicheLabel = allNiches.find(n => n.value === niche)?.label || 'No especificado';
  
  // Badge style unificado
  const uniformBadgeStyle = isLight 
    ? 'bg-white/70 border-slate-200/60 text-slate-700' 
    : 'bg-black/40 border-white/10 text-slate-300';
  
  // 🔥 ICONOS DE REDES SOCIALES (simplificados para preview)
  const SOCIAL_ICONS_PREVIEW: Record<string, React.ReactNode> = {
    instagram: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>,
    facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
    tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/></svg>,
    x_twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    threads: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/></svg>,
    linkedin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>,
  };

  const getSocialIcon = (key: string) => SOCIAL_ICONS_PREVIEW[key as keyof typeof SOCIAL_ICONS_PREVIEW] || null;
  
  return (
    <div className="w-full rounded-2xl border relative overflow-hidden shadow-lg transition-all duration-500"
      style={{ 
        backgroundColor: heroBgColor,
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
      }}
    >
      {/* 🔥 BANNER DE FONDO (igual que StoreHero) */}
      {bannerUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={bannerUrl}
            alt="Banner de vista previa"
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            onLoad={() => setBannerLoaded(true)}
          />
          
          {/* Gradiente (igual que StoreHero) */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(to bottom, 
                ${heroBgColor}00 0%, 
                ${heroBgColor}30 50%, 
                ${heroBgColor} 100%
              )`,
            }}
          />
          
          {primary && (
            <div 
              className="absolute inset-0 w-full h-full opacity-[0.03]"
              style={{ backgroundColor: primary }} 
            />
          )}
        </div>
      )}

      {!bannerUrl && primary && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${primary}30 0%, ${primary}05 50%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 🔥 CONTENIDO - ESTRUCTURA IDÉNTICA A STOREHERO */}
      {/* ============================================================ */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-start p-6 sm:p-8 gap-4 lg:gap-5">
        
        {/* Columna Izquierda */}
        <div className="space-y-4 lg:col-span-8">
          
          {/* Badges (igual que StoreHero) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Estado */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
                {storeStatus.label}
              </span>
            </div>

            {/* Productos/Servicios */}
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}>
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: primary }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                {totalProducts > 0 ? `${totalProducts} ${isServiceStore ? 'servicios' : 'productos'}` : `Sin ${isServiceStore ? 'servicios' : 'productos'}`}
              </span>
            </div>

            {/* Valoración (placeholder) */}
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: i <= 4 ? '#facc15' : 'rgba(255,255,255,0.2)' }}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                (4.5)
              </span>
            </div>

            {/* Like (placeholder) */}
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}>
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                0
              </span>
            </div>
          </div>

          {/* Título (igual que StoreHero) */}
          <div>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-[900] tracking-tight ${textColor} leading-[1] drop-shadow-sm`}>
              {name || 'Mi Tienda'}
            </h2>
          </div>

          {/* Línea decorativa */}
          <div className="w-full max-w-xs h-[1px] bg-gradient-to-r from-white/50 via-white/20 to-transparent" />
          
          {/* Slogan y Descripción (igual que StoreHero) */}
          <div className="space-y-1.5">
            {slogan && (
              <p className={`text-sm sm:text-base font-light tracking-wide ${isLight ? 'text-slate-900' : mutedTextColor} drop-shadow-sm`}>
                {slogan}
              </p>
            )}
            {description && (
              <p className={`text-[11px] sm:text-xs font-normal ${isLight ? 'text-slate-900' : mutedTextColor} max-w-lg leading-relaxed ${isLight ? 'opacity-100' : 'opacity-90'}`}>
                {description}
              </p>
            )}
          </div>

          {/* Redes sociales (igual que StoreHero) */}
          {socialLinks && socialLinks.length > 0 && (
            <div className="pt-0.5 flex flex-wrap items-center gap-2">
              {socialLinks.map((net: any) => {
                const icon = getSocialIcon(net.key);
                if (!icon) return null;
                return (
                  <div
                    key={net.key}
                    className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center shadow-sm backdrop-blur-xl ${uniformBadgeStyle}`}
                  >
                    {icon}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha - Monedas y Pagos (igual que StoreHero) */}
        <div className="lg:col-span-4 flex justify-start lg:justify-end items-start h-full">
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
            
            {/* Divisas */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a3.5 3.5 0 00-7 0v5a3.5 3.5 0 007 0v-5zm-3-3v11" />
              </svg>
              <span className={`font-semibold ${textColor}`}>
                {currencies.length > 0 ? currencies.slice(0, 3).map((c: string) => c.split(' ')[0]).join(', ') : 'USD, VES'}
                {currencies.length > 3 && ` +${currencies.length - 3}`}
              </span>
            </div>

            <span className={`w-px h-4 ${isLight ? 'bg-slate-300/40' : 'bg-white/20'}`} />

            {/* Pagos */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              <span className={`font-semibold ${textColor}`}>
                {paymentMethods.slice(0, 3).join(', ')}
                {paymentMethods.length > 3 && ` +${paymentMethods.length - 3}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de vista previa (sutil) */}
      <div className="absolute bottom-2 right-3 text-[8px] font-bold uppercase tracking-wider opacity-20">
        Vista previa
      </div>
    </div>
  );
});

PreviewBanner.displayName = 'PreviewBanner';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface StepBrandingLogoProps {
  data: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    bannerUrl?: string;
    faviconUrl?: string;
    modelType?: string;
    name?: string;
    slogan?: string;
    niche?: string;
    description?: string;
    currencies?: string[];
    preferredCurrency?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    x_twitter?: string;
    threads?: string;
    linkedin?: string;
  };
  update: (fields: any) => void;
  next: () => void;
  back: () => void;
  isSubmitting?: boolean;
  /**
   * 🔥 Callback que el padre (OnboardingPage) usa para actualizar el
   * theme global cuando el usuario elige una paleta. Como el ThemeContext
   * da EMPTY_THEME al onboarding, necesitamos un override local.
   */
  onPaletteChange?: (palette: any) => void;
}

export default function StepBrandingLogo({ data, update, next, back, isSubmitting, onPaletteChange }: StepBrandingLogoProps) {
  const [selectedPalette, setSelectedPalette] = useState<string>(() => {
    if (data.primaryColor) {
      const matched = VENEZUELAN_PALETTES.find(p => p.primary.toLowerCase() === data.primaryColor?.toLowerCase());
      if (matched) return matched.id;
    }
    return VENEZUELAN_PALETTES[0].id;
  });

  // 🔥 isLight se DERIVA del data.backgroundColor en vivo (no del useEffect).
  // Esto refleja cambios al instante, igual que StepBuyerBranding.
  const currentBg = data.backgroundColor || (data as any).secondaryColor || '#0b0f19';
  const isLight = isColorLight(currentBg);

  const [showAllPalettes, setShowAllPalettes] = useState<boolean>(false);
  const [uploadErrors, setUploadErrors] = useState<{
    logo?: string;
    banner?: string;
    favicon?: string;
  }>({});

  // ✅ MEMOIZAR PALETTES VISIBLES
  const visiblePalettes = useMemo(() => {
    return showAllPalettes ? VENEZUELAN_PALETTES : VENEZUELAN_PALETTES.slice(0, 10);
  }, [showAllPalettes]);

  const hiddenPalettesCount = useMemo(() => {
    return VENEZUELAN_PALETTES.length - 10;
  }, []);

  // ✅ CONSTRUIR REDES SOCIALES PARA PREVIEW
  const socialLinks = useMemo(() => {
    const networks = [
      { key: 'instagram', user: data.instagram },
      { key: 'facebook', user: data.facebook },
      { key: 'tiktok', user: data.tiktok },
      { key: 'x_twitter', user: data.x_twitter },
      { key: 'threads', user: data.threads },
      { key: 'linkedin', user: data.linkedin },
    ];
    return networks.filter(net => net.user && net.user.trim() !== '');
  }, [data.instagram, data.facebook, data.tiktok, data.x_twitter, data.threads, data.linkedin]);

  // ✅ MONEDAS PARA PREVIEW
  const previewCurrencies = useMemo(() => {
    const defaultCurrencies = ['USD', 'VES'];
    const raw = data.currencies || defaultCurrencies;
    const currencyLabels: Record<string, string> = {
      USD: 'Dólares ($)',
      VES: 'Bolívares (Bs.)',
      EUR: 'Euros (€)',
      CRYPTO: 'Criptomonedas',
    };
    if (Array.isArray(raw)) {
      return raw.map(c => currencyLabels[c] || c);
    }
    return defaultCurrencies.map(c => currencyLabels[c] || c);
  }, [data.currencies]);

  // ✅ MÉTODOS DE PAGO PARA PREVIEW
  const previewPaymentMethods = useMemo(() => {
    const defaultMethods = ['Efectivo', 'Punto de Venta'];
    return defaultMethods;
  }, []);

  // 🔥 Eliminado: el useEffect con MutationObserver.
  // Ahora `isLight` se deriva directamente de `data.backgroundColor` en el render.

  const primaryColor = data.primaryColor || '#06B6D4';

  // 🔥 textColor se deriva de isLight (que ya se deriva de data.backgroundColor).
  // Ahora cambia en vivo.
  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-white/60';
  const labelColor = isLight ? 'text-slate-800' : 'text-white/80';
  const subCardBg = isLight ? 'bg-white' : 'bg-slate-900/40 backdrop-blur-md';

  const handleSelectPalette = useCallback((palette: typeof VENEZUELAN_PALETTES[0]) => {
    setSelectedPalette(palette.id);
    
    const bgValue = palette.bg || (palette as any).background || '#0f172a';
    
    document.documentElement.style.setProperty('--bg-color', bgValue);
    document.documentElement.style.setProperty('--accent-color', palette.primary);
    document.documentElement.style.setProperty('--secondary-color', palette.secondary);

    update({
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: bgValue,
    });

    // 🔥 Avisar al padre para que actualice el theme global del onboarding
    onPaletteChange?.({
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: bgValue,
      name: palette.name,
    });

    // 🔥 Avisar al Header (y a cualquier componente que escuche) que el tema cambió.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('themeChange'));
      window.dispatchEvent(new Event('paletteChange'));
      window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { detail: palette }));
    }
  }, [update, onPaletteChange]);

  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'bannerUrl' | 'faviconUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setUploadErrors((prev) => ({ ...prev, [field]: validation.error }));
      return;
    }

    setUploadErrors((prev) => ({ ...prev, [field]: undefined }));

    const fileFieldMap = {
      logoUrl: 'logoFile',
      bannerUrl: 'bannerFile',
      faviconUrl: 'faviconFile',
    };

    const targetFileField = fileFieldMap[field];

    const reader = new FileReader();
    reader.onload = () => {
      update({ 
        [field]: reader.result as string,
        [targetFileField]: file
      });
    };
    reader.readAsDataURL(file);
  }, [update]);

  const handleRemoveFile = useCallback((field: 'logoUrl' | 'bannerUrl' | 'faviconUrl') => {
    const fileFieldMap = {
      logoUrl: 'logoFile',
      bannerUrl: 'bannerFile',
      faviconUrl: 'faviconFile',
    };

    const targetFileField = fileFieldMap[field];

    update({ 
      [field]: '', 
      [targetFileField]: null 
    });

    setUploadErrors((prev) => ({ ...prev, [field === 'logoUrl' ? 'logo' : field === 'bannerUrl' ? 'banner' : 'favicon']: undefined }));
  }, [update]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    next();
  }, [next]);

  const togglePalettes = useCallback(() => {
    setShowAllPalettes(prev => !prev);
  }, []);

  const currentModelType = data.modelType || 'product';
  const modelLabel = currentModelType === 'product' ? 'Productos' : 'Servicios';

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 animate-fadeIn text-xs ${textColor} transition-colors duration-500`}>
      <div className="text-center space-y-0.5 mb-2">
        <h2 className={`text-xl font-extrabold tracking-tight ${textColor} transition-colors duration-500`}>
          Personalización y Branding
        </h2>
        <p className={`${mutedTextColor} text-[11px] transition-colors duration-500`}>
          Paso 5: Selecciona la paleta de colores de tu interfaz y recursos gráficos.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 🔥 VISTA PREVIA - ESTILO STOREHERO (EXACTO) */}
      {/* ============================================================ */}
      <PreviewBanner
        primaryColor={data.primaryColor}
        secondaryColor={data.secondaryColor}
        backgroundColor={data.backgroundColor}
        logoUrl={data.logoUrl}
        bannerUrl={data.bannerUrl}
        name={data.name}
        slogan={data.slogan}
        description={data.description}
        niche={data.niche}
        modelType={data.modelType}
        isLight={isLight}
        currencies={previewCurrencies}
        paymentMethods={previewPaymentMethods}
        socialLinks={socialLinks}
        totalProducts={0}
        isServiceStore={currentModelType === 'service'}
      />

      {/* ============================================================ */}
      {/* 🔥 PALETAS PREDEFINIDAS (OPTIMIZADO CON VER MÁS) */}
      {/* ============================================================ */}
      <div className="space-y-1.5">
        <label className={`block text-[11px] font-bold ${labelColor} transition-colors duration-500`}>
          Paletas Predefinidas
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {visiblePalettes.map((palette) => {
            const isSelected = selectedPalette === palette.id;
            const cardBgColor = palette.bg || (palette as any).background || '#0f172a';
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => handleSelectPalette(palette)}
                className={`p-2 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center space-y-1 w-full shadow-xs ${
                  isSelected ? 'ring-2' : 'hover:opacity-80'
                }`}
                style={
                  isSelected
                    ? { borderColor: palette.primary, backgroundColor: `${palette.primary}20`, '--tw-ring-color': palette.primary } as React.CSSProperties
                    : { backgroundColor: `${palette.primary}08`, borderColor: `${palette.primary}30` } as React.CSSProperties
                }
              >
                <div className="flex items-center -space-x-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm z-4"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm z-3"
                    style={{ backgroundColor: palette.secondary }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm z-2"
                    style={{ backgroundColor: palette.accent }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm z-1"
                    style={{ backgroundColor: cardBgColor }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${textColor} truncate w-full text-center transition-colors duration-500`}>
                  {palette.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* 🔥 VER MÁS / VER MENOS - SUTIL */}
        {hiddenPalettesCount > 0 && (
          <button
            type="button"
            onClick={togglePalettes}
            className={`w-full text-center text-[10px] font-medium py-1.5 rounded-lg transition-colors duration-200 ${
              isLight 
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {showAllPalettes ? (
              <span className="flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
                Ver menos
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                Ver {hiddenPalettesCount} paletas más
              </span>
            )}
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 🔥 SUBIDA DE ARCHIVOS GRÁFICOS */}
      {/* ============================================================ */}
      <div className={`space-y-2 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} transition-colors duration-500`}>
        <div className="flex items-center justify-between">
          <label className={`block text-[11px] font-bold ${labelColor} transition-colors duration-500`}>
            Recursos Gráficos
          </label>
          <span className={`text-[10px] ${mutedTextColor} font-medium transition-colors duration-500`}>
            PNG, SVG, JPG, WEBP • Max. 10 MB
          </span>
        </div>

        <div className="space-y-2">
          {/* Logo */}
          <div 
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors duration-500 shadow-xs ${subCardBg}`}
            style={{ 
              borderColor: primaryColor, 
              backgroundColor: isLight ? `${primaryColor}10` : `${primaryColor}15` 
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {data.logoUrl ? (
                <div className="relative group flex-shrink-0">
                  <img
                    src={data.logoUrl}
                    alt="Logo"
                    className="w-9 h-9 object-contain rounded-lg border border-slate-700/50 bg-black/30 p-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('logoUrl')}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md cursor-pointer"
                    title="Eliminar logo"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  className="w-9 h-9 rounded-lg border border-dashed flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${textColor} text-[11px] transition-colors duration-500`}>Logotipo Oficial</span>
                  <span
                    className={`cursor-help ${mutedTextColor} hover:${textColor} text-[10px]`}
                    title="Recomendado: Cuadrado de 512x512px en formato PNG transparente o SVG"
                  >
                    ⓘ
                  </span>
                </div>
                <p className={`text-[10px] ${mutedTextColor} truncate transition-colors duration-500`}>
                  {data.logoUrl ? '✓ Logo cargado correctamente' : 'Recomendado: 512x512px (PNG/SVG)'}
                </p>
                {uploadErrors.logo && <p className="text-[10px] text-red-500 font-bold">{uploadErrors.logo}</p>}
              </div>
            </div>

            <label 
              style={{ backgroundColor: primaryColor }}
              className="hover:opacity-90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex-shrink-0 shadow-xs"
            >
              {data.logoUrl ? 'Cambiar' : 'Subir'}
              <input type="file" accept="image/*,.svg,.ico" onChange={(e) => handleFileUpload(e, 'logoUrl')} className="hidden" />
            </label>
          </div>

          {/* Banner */}
          <div 
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors duration-500 shadow-xs ${subCardBg}`}
            style={{ 
              borderColor: primaryColor, 
              backgroundColor: isLight ? `${primaryColor}10` : `${primaryColor}15` 
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {data.bannerUrl ? (
                <div className="relative group flex-shrink-0">
                  <img
                    src={data.bannerUrl}
                    alt="Banner"
                    className="w-12 h-7 object-cover rounded-md border border-slate-700/50 bg-black/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('bannerUrl')}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md cursor-pointer"
                    title="Eliminar banner"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  className="w-12 h-7 rounded-md border border-dashed flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${textColor} text-[11px] transition-colors duration-500`}>Banner de Cabecera</span>
                  <span
                    className={`cursor-help ${mutedTextColor} hover:${textColor} text-[10px]`}
                    title="Recomendado: Horizontal de 1200x400px en WEBP, JPG o PNG"
                  >
                    ⓘ
                  </span>
                </div>
                <p className={`text-[10px] ${mutedTextColor} truncate transition-colors duration-500`}>
                  {data.bannerUrl ? '✓ Banner cargado correctamente' : 'Recomendado: 1200x400px'}
                </p>
                {uploadErrors.banner && <p className="text-[10px] text-red-500 font-bold">{uploadErrors.banner}</p>}
              </div>
            </div>

            <label 
              style={{ backgroundColor: primaryColor }}
              className="hover:opacity-90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex-shrink-0 shadow-xs"
            >
              {data.bannerUrl ? 'Cambiar' : 'Subir'}
              <input type="file" accept="image/*,.svg" onChange={(e) => handleFileUpload(e, 'bannerUrl')} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTONES */}
      {/* ============================================================ */}
      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={back}
          className={`w-1/3 ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold py-3 rounded-xl transition cursor-pointer text-xs shadow-xs`}
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-2/3 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-300 cursor-pointer text-xs disabled:opacity-50 flex items-center justify-center gap-3 group relative overflow-hidden"
          style={{ backgroundColor: primaryColor }}
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          {isSubmitting ? (
            <span className="relative z-10">Guardando...</span>
          ) : (
            <>
              <span className="relative z-10 tracking-wider font-bold text-sm">
                Crear mi Negocio
              </span>
              <svg 
                className="relative z-10 w-4 h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}