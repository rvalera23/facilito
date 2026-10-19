'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import BrandingInfoColumn from './BrandingInfoColumn';
import { SuccessModal } from '@/components/ui/SuccessModal';

interface BrandingTabProps {
  brandConfig: any;
  setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
  handleSaveBranding: (e: React.FormEvent) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFaviconUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
}

// ============================================================
// 🚀 COMPONENTE PRINCIPAL CON MEMO
// ============================================================
const BrandingTab = memo(({
  brandConfig,
  setBrandConfig,
  handleSaveBranding,
  handleLogoUpload,
  handleBannerUpload,
  handleFaviconUpload,
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantId,
}: BrandingTabProps) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialConfigRef = useRef(JSON.stringify(brandConfig));
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ Memoizar estilos - MEJORADO PARA MODO CLARO
  const cardBorder = useMemo(() => 
    isDarkBg ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)',
    [isDarkBg]
  );

  const cardBg = useMemo(() => 
    secondary || (isDarkBg ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
    [secondary, isDarkBg]
  );

  // ✅ Memoizar inputClass - MEJORADO PARA MODO CLARO
  const inputClass = useMemo(() => 
    `w-full bg-black/5 dark:bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs outline-none transition duration-150 ${
      isDarkBg 
        ? 'border-white/15 focus:border-white/40' 
        : 'border-gray-300 focus:border-gray-500 placeholder:text-gray-400'
    }`,
    [isDarkBg]
  );

  // ✅ Detectar cambios con useMemo para evitar renders innecesarios
  useEffect(() => {
    const currentJson = JSON.stringify(brandConfig);
    setHasChanges(currentJson !== initialConfigRef.current);
  }, [brandConfig]);

  // ✅ Handle social change memoizado
  const handleSocialChange = useCallback((network: string, value: string) => {
    setBrandConfig((prev: any) => ({
      ...prev,
      socialLinks: {
        ...(prev?.socialLinks || {}),
        [network]: value,
      },
    }));
  }, [setBrandConfig]);
const onSubmitForm = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  if (!hasChanges) return;

  // 🔥 FUNCIÓN PARA NORMALIZAR TELÉFONO (SOLO UNA VEZ)
  const normalizePhone = (phone: string): string => {
    if (!phone) return phone;
    let clean = phone.replace(/[\s\-()]/g, '');
    const validOperators = ['412', '414', '416', '424', '426', '410', '418'];
    if (!clean.startsWith('0') && clean.length === 10) {
      const prefix = clean.substring(0, 3);
      if (validOperators.includes(prefix)) {
        clean = '0' + clean;
      }
    }
    return clean;
  };

  // 🔥 NORMALIZAR EL TELÉFONO (SOLO UNA VEZ)
  const normalizedPhone = normalizePhone(brandConfig.phone || '');
  const brandConfigWithNormalizedPhone = {
    ...brandConfig,
    phone: normalizedPhone,
  };

  setIsSaving(true);
  try {
    // ACTUALIZAR EL ESTADO LOCAL ANTES DE ENVIAR
    setBrandConfig(brandConfigWithNormalizedPhone);

    if (typeof handleSaveBranding === 'function') {
      await handleSaveBranding(e);
    }

    const updatedTenant = {
      ...(JSON.parse(localStorage.getItem('tenant') || '{}')),
      primaryColor: brandConfigWithNormalizedPhone.primaryColor,
      secondaryColor: brandConfigWithNormalizedPhone.secondaryColor,
      accentColor: brandConfigWithNormalizedPhone.accentColor,
      backgroundColor: brandConfigWithNormalizedPhone.backgroundColor,
      name: brandConfigWithNormalizedPhone.name,
      niche: brandConfigWithNormalizedPhone.niche,
      description: brandConfigWithNormalizedPhone.description,
      slogan: brandConfigWithNormalizedPhone.slogan,
      logoUrl: brandConfigWithNormalizedPhone.logoUrl || '',
      bannerUrl: brandConfigWithNormalizedPhone.bannerUrl || '',
      faviconUrl: brandConfigWithNormalizedPhone.faviconUrl || '',
      fontFamily: brandConfigWithNormalizedPhone.fontFamily || 'Quicksand',
      customFields: brandConfigWithNormalizedPhone.customFields || [],
      address: brandConfigWithNormalizedPhone.address || '',
      city: brandConfigWithNormalizedPhone.city || '',
      state: brandConfigWithNormalizedPhone.state || '',
      latitude: brandConfigWithNormalizedPhone.latitude || null,
      longitude: brandConfigWithNormalizedPhone.longitude || null,
      rif: brandConfigWithNormalizedPhone.rif || '',
      phone: normalizedPhone,
    };
    localStorage.setItem('tenant', JSON.stringify(updatedTenant));
    
    const themeColors = {
      primaryColor: brandConfigWithNormalizedPhone.primaryColor,
      secondaryColor: brandConfigWithNormalizedPhone.secondaryColor,
      accentColor: brandConfigWithNormalizedPhone.accentColor,
      backgroundColor: brandConfigWithNormalizedPhone.backgroundColor,
      name: brandConfigWithNormalizedPhone.name || 'Mi Tienda',
      niche: brandConfigWithNormalizedPhone.niche,
      description: brandConfigWithNormalizedPhone.description,
      slogan: brandConfigWithNormalizedPhone.slogan,
      logoUrl: brandConfigWithNormalizedPhone.logoUrl || '',
      bannerUrl: brandConfigWithNormalizedPhone.bannerUrl || '',
      faviconUrl: brandConfigWithNormalizedPhone.faviconUrl || '',
      fontFamily: brandConfigWithNormalizedPhone.fontFamily || 'Quicksand',
      customFields: brandConfigWithNormalizedPhone.customFields || [],
      address: brandConfigWithNormalizedPhone.address || '',
      city: brandConfigWithNormalizedPhone.city || '',
      state: brandConfigWithNormalizedPhone.state || '',
      latitude: brandConfigWithNormalizedPhone.latitude || null,
      longitude: brandConfigWithNormalizedPhone.longitude || null,
      rif: brandConfigWithNormalizedPhone.rif || '',
      phone: normalizedPhone,
    };
    localStorage.setItem('app_theme', JSON.stringify(themeColors));
    
    if (typeof window !== 'undefined') {
      const fontFamily = brandConfigWithNormalizedPhone.fontFamily || 'Quicksand';
      document.documentElement.style.setProperty('--font-sans', fontFamily);
      localStorage.setItem('selected_font', fontFamily);
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { 
        detail: {
          primaryColor: brandConfigWithNormalizedPhone.primaryColor,
          secondaryColor: brandConfigWithNormalizedPhone.secondaryColor,
          accentColor: brandConfigWithNormalizedPhone.accentColor,
          backgroundColor: brandConfigWithNormalizedPhone.backgroundColor,
          name: brandConfigWithNormalizedPhone.name || 'Mi Tienda',
          logoUrl: brandConfigWithNormalizedPhone.logoUrl || '',
          bannerUrl: brandConfigWithNormalizedPhone.bannerUrl || '',
          faviconUrl: brandConfigWithNormalizedPhone.faviconUrl || '',
          fontFamily: brandConfigWithNormalizedPhone.fontFamily || 'Quicksand',
          customFields: brandConfigWithNormalizedPhone.customFields || [],
          phone: normalizedPhone,
        }
      }));
      
      window.dispatchEvent(new CustomEvent('themeUpdated', { 
        detail: themeColors 
      }));
      
      window.dispatchEvent(new Event('storage'));
    }
    
    initialConfigRef.current = JSON.stringify(brandConfigWithNormalizedPhone);
    setHasChanges(false);
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error al guardar branding:', error);
  } finally {
    setIsSaving(false);
  }
}, [hasChanges, handleSaveBranding, brandConfig, setBrandConfig]);
  // ✅ Memoizar props para BrandingInfoColumn
  const infoColumnProps = useMemo(() => ({
    brandConfig,
    setBrandConfig,
    handleSocialChange,
    cardBg,
    cardBorder,
    textColor,
    inputClass,
    handleLogoUpload,
    handleBannerUpload,
    handleFaviconUpload,
    primary,
    isDarkBg,
  }), [
    brandConfig, 
    setBrandConfig, 
    handleSocialChange, 
    cardBg, 
    cardBorder, 
    textColor, 
    inputClass,
    handleLogoUpload,
    handleBannerUpload,
    handleFaviconUpload,
    primary,
    isDarkBg,
  ]);



  return (
    <div className="w-full mx-auto relative pb-12">
      {/* CONTENEDOR PRINCIPAL */}
      <div 
        className="w-full border rounded-3xl shadow-xl p-6 space-y-6"
        style={{ 
          backgroundColor: cardBg, 
          borderColor: cardBorder, 
          color: textColor 
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              Identidad de Marca
            </h3>
            <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
              Personaliza los colores, logotipos y la información de tu tienda.
            </p>
          </div>
          <div 
            className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" 
            style={{ borderColor: cardBorder, color: textColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={onSubmitForm} className="space-y-6">
          {/* COLUMNA DE INFORMACIÓN */}
          <BrandingInfoColumn {...infoColumnProps} />

          {/* Barra de Guardar */}
          <div 
            className="w-full border rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300"
            style={{ 
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderColor: cardBorder, 
              color: textColor 
            }}
          >
            <div>
              <h4 className="font-semibold text-sm tracking-tight" style={{ color: textColor }}>
                {hasChanges ? 'Guardar Cambios de Identidad' : 'Configuración al Día'}
              </h4>
              <p className="text-[10px] opacity-70 mt-0.5" style={{ color: textColor }}>
                {hasChanges 
                  ? 'Tienes modificaciones pendientes por aplicar en tu marca.' 
                  : 'No hay cambios pendientes por guardar en este momento.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:grayscale text-white"
              style={{ backgroundColor: hasChanges ? (primary || '#f97316') : '#64748b' }}
            >
              {isSaving ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* 🔥 Modal de Éxito (canónico) */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Cambios guardados!"
        message="La configuración de tu marca se ha actualizado correctamente en el sistema."
        primary={primary}
        borderColor={cardBorder}
        cardBg={cardBg}
        textColor={textColor}
        isDarkBg={isDarkBg}
        accentColor="#22c55e"
        autoCloseMs={0}
        closeLabel="Aceptar"
      />
    </div>
  );
});

BrandingTab.displayName = 'BrandingTab';

export default BrandingTab;