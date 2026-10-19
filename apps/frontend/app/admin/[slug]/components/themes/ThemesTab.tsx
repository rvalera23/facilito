'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { APP_PALETTES } from '../../../../constants/palettes';

// ✅ IMPORTAR getImageUrl DESDE imageUtils
import { getImageUrl } from '@/lib/imageUtils';
import { loadFont, applyUserFont, setTenantFont, applyFontToContainer, getCurrentSlug, AVAILABLE_FONTS } from '@/lib/fontLoader';
import LayoutSettingsTab from './LayoutSettingsTab';
import PopupSettingsTab from './PopupSettingsTab';
import StorePoliciesTab from './StorePoliciesTab';
import StickersTab from './StickersTab';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { Button } from '@/components/ui/Button';

interface ThemesTabProps {
  brandConfig: any;
  setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
  handleSaveBranding?: (e: React.FormEvent) => void;
  getImageUrl?: (item: any) => string | null;
}

// ============================================================
// 🔥 CONSTANTES - FUERA DEL COMPONENTE
// ============================================================

// ✅ AVAILABLE_FONTS ahora viene importado desde '@/lib/fontLoader'

const COLOR_CONFIGS = [
  { label: 'Primario', id: 'primaryColor', default: '#f97316', icon: '●', description: 'Color principal de la marca' },
  { label: 'Secundario', id: 'secondaryColor', default: '#0f172a', icon: '■', description: 'Color de fondo de elementos' },
  { label: 'Acento', id: 'accentColor', default: '#3b82f6', icon: '▲', description: 'Color para resaltar acciones' },
  { label: 'Fondo', id: 'backgroundColor', default: '#0b0f19', icon: '◆', description: 'Color de fondo general' },
];

// ✅ COLORES NEUTROS (negros, grises, blancos) - para secundario y fondo
const NEUTRAL_COLORS = {
  secondary: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#0c0a09', '#1a1a2e', '#262626', '#f1f5f9', '#e2e8f0', '#f8fafc', '#ffffff'],
  background: ['#0b0f19', '#0a0a0a', '#0c0c0c', '#111827', '#1a1a2e', '#1e1e2f', '#0d1117', '#080808', '#f8fafc', '#f1f5f9', '#ffffff', '#e2e8f0'],
};

// ✅ COLORES PRIMARIO Y ACENTO (más variados)
const COLOR_SUGGESTIONS = {
  primary: ['#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f472b6'],
  accent: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#14b8a6', '#f472b6'],
  secondary: NEUTRAL_COLORS.secondary,
  background: NEUTRAL_COLORS.background,
};

// ============================================================
// 🔥 SUBCOMPONENTES MEMOIZADOS
// ============================================================

// ✅ PaletteCard
const PaletteCard = memo(({ palette, isSelected, onSelect, cardBorder, itemBg, textColor }: any) => {
  const colors = [palette.primary, palette.secondary, palette.accent, palette.background];
  
  return (
    <button
      type="button"
      onClick={() => onSelect(palette)}
      className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition hover:scale-[1.01] active:scale-95 cursor-pointer ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{ 
        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : itemBg, 
        borderColor: isSelected ? palette.primary : cardBorder,
      }}
    >
      <span className="text-[11px] font-medium truncate mr-2" style={{ color: textColor }}>
        {palette.name}
      </span>
      <div className="flex space-x-1 shrink-0">
        {colors.map((color: string, idx: number) => (
          <span 
            key={idx}
            className="w-3 h-3 rounded-full border border-black/20 shadow-sm" 
            style={{ backgroundColor: color }} 
          />
        ))}
      </div>
    </button>
  );
});
PaletteCard.displayName = 'PaletteCard';

const FontOption = memo(({ font, isSelected, onSelect, cardBorder, textColor }: any) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(font.value, font.defaultWeight || 400)}
      className="w-full text-left px-4 py-2.5 text-xs transition border-b last:border-none cursor-pointer flex items-center justify-between"
      style={{
        color: isSelected ? '#f97316' : textColor,
        backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
        borderColor: cardBorder,
        fontFamily: font.value,
        fontWeight: font.defaultWeight || 400,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span className="text-[11px]">{font.label}</span>
      <span className="text-[9px] opacity-40">
        {font.category} · {font.defaultWeight || 400}
      </span>
      {isSelected && (
        <svg className="w-4 h-4 text-orange-500 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      )}
    </button>
  );
});
FontOption.displayName = 'FontOption';

// ✅ ColorPicker (con throttle)
const ColorPicker = memo(({
  label,
  colorId,
  defaultColor,
  icon,
  description,
  currentColor,
  onColorChange,
  cardBorder,
  itemBg,
  textColor,
  inputClass
}: any) => {
  const [isActive, setIsActive] = useState(false);
  const [localColor, setLocalColor] = useState(currentColor);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const isValid = useMemo(() => /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(currentColor), [currentColor]);

  const suggestions = useMemo(() => {
    if (colorId.includes('primary')) return COLOR_SUGGESTIONS.primary;
    if (colorId.includes('secondary')) return COLOR_SUGGESTIONS.secondary;
    if (colorId.includes('accent')) return COLOR_SUGGESTIONS.accent;
    if (colorId.includes('background')) return COLOR_SUGGESTIONS.background;
    return COLOR_SUGGESTIONS.primary;
  }, [colorId]);

  const handlePickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onColorChange(colorId, newColor);
      timeoutRef.current = null;
    }, 150);
  }, [colorId, onColorChange]);

  useEffect(() => {
    if (!timeoutRef.current) {
      setLocalColor(currentColor);
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setLocalColor(currentColor);
    }
  }, [currentColor]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hexOnly = e.target.value.replace(/[^a-fA-F0-9]/g, '');
    const newColor = `#${hexOnly}`;
    setLocalColor(newColor);
    onColorChange(colorId, newColor);
  }, [colorId, onColorChange]);

  const handleSuggestionClick = useCallback((suggestionColor: string) => {
    setLocalColor(suggestionColor);
    onColorChange(colorId, suggestionColor);
  }, [colorId, onColorChange]);

  const handleReset = useCallback(() => {
    setLocalColor(defaultColor);
    onColorChange(colorId, defaultColor);
  }, [colorId, defaultColor, onColorChange]);

  const displayColor = isValid ? localColor : '#000000';

  return (
    <div 
      className="group relative p-3 rounded-2xl border transition-all duration-300 hover:shadow-lg"
      style={{ 
        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.08)' : itemBg,
        borderColor: isActive ? 'rgba(59, 130, 246, 0.3)' : cardBorder,
      }}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold opacity-60" style={{ color: textColor }}>{icon}</span>
          <span className="text-[10px] font-bold" style={{ color: textColor }}>{label}</span>
        </div>
        <span 
          className={`text-[8px] font-mono px-2 py-0.5 rounded transition-opacity group-hover:opacity-70 ${isValid ? 'opacity-40' : 'opacity-20'}`}
          style={{ color: textColor, backgroundColor: isValid ? `${currentColor}22` : 'transparent' }}
        >
          {currentColor.toUpperCase() || 'INVÁLIDO'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={displayColor}
            onChange={handlePickerChange}
            className="w-12 h-12 rounded-2xl cursor-pointer p-1 border-2 transition-all duration-300 hover:scale-105"
            style={{ 
              borderColor: isValid ? currentColor : cardBorder,
              backgroundColor: 'transparent',
              boxShadow: isValid ? `0 0 20px ${currentColor}33` : 'none',
            }}
          />
          <div 
            className="absolute -inset-1 rounded-2xl opacity-20 blur-md transition-opacity group-hover:opacity-40"
            style={{ backgroundColor: isValid ? currentColor : 'transparent' }}
          />
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono opacity-30" style={{ color: textColor }}>#</span>
            <input
              type="text"
              value={localColor.replace('#', '')}
              onChange={handleHexChange}
              className={`${inputClass} pl-6 text-[10px] font-mono py-1.5 px-2 ${isValid ? '' : 'border-red-500/50 focus:border-red-500'}`}
              style={{ color: textColor }}
              placeholder={defaultColor.replace('#', '')}
              maxLength={6}
              spellCheck={false}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[8px] opacity-40" style={{ color: textColor }}>
              {isValid ? description : '⚠️ Código hexadecimal inválido'}
            </p>
            {!isValid && currentColor && currentColor !== '#' && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[8px] font-bold text-red-500 hover:text-red-400 transition"
              >
                Restaurar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-2 flex gap-1.5 flex-wrap transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
        {suggestions.map((suggestionColor: string, idx: number) => {
          const isSuggestionSelected = currentColor.toLowerCase() === suggestionColor.toLowerCase();
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(suggestionColor)}
              className={`w-6 h-6 rounded-lg border transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                isSuggestionSelected ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{ 
                backgroundColor: suggestionColor,
                borderColor: isSuggestionSelected ? suggestionColor : cardBorder,
              }}
              title={suggestionColor}
            />
          );
        })}
        <button
          type="button"
          className="w-6 h-6 rounded-lg border border-dashed flex items-center justify-center text-[8px] opacity-40 hover:opacity-80 transition hover:scale-110"
          style={{ borderColor: cardBorder, color: textColor }}
          onClick={handleReset}
        >
          ↺
        </button>
      </div>
    </div>
  );
});
ColorPicker.displayName = 'ColorPicker';

// ✅ FileUpload - CON getImageUrl
const FileUpload = memo(({
  label,
  fileKey,
  handler,
  brandConfig,
  onRemove,
  cardBorder,
  itemBg,
  textColor,
  primary,
  isDarkBg,
  getImageUrl: getImageUrlProp,
}: any) => {
  const hasImage = !!brandConfig?.[fileKey];

  const processedImage = useMemo(() => {
    const imageUrl = brandConfig?.[fileKey];
    if (!imageUrl) return null;
    
    if (getImageUrlProp) {
      return getImageUrlProp(imageUrl);
    }
    try {
      return getImageUrl(imageUrl);
    } catch {
      return imageUrl;
    }
  }, [brandConfig, fileKey, getImageUrlProp]);

  const handleRemove = useCallback(() => {
    onRemove(fileKey);
  }, [fileKey, onRemove]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (handler) handler(e);
  }, [handler]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
          {label}
        </label>
        {hasImage && (
          <Button
            variant="outline-danger"
            size="xs"
            onClick={handleRemove}
            icon={
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
            primary={primary}
            borderColor={cardBorder}
            textColor={textColor}
            cardBg={itemBg}
            isDarkBg={isDarkBg}
          >
            Eliminar
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-4 p-3 rounded-2xl border" style={{ backgroundColor: itemBg, borderColor: cardBorder }}>
        {hasImage && processedImage ? (
          <img 
            src={processedImage} 
            alt="Preview" 
            className="w-10 h-10 object-contain rounded-lg border bg-black/10 dark:bg-white/10 p-1"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg border flex items-center justify-center text-[9px] opacity-50" style={{ borderColor: cardBorder, color: textColor }}>
            No
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          data-key={fileKey}
          onChange={handleFileChange}
          className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-black/10 dark:file:bg-white/10 file:cursor-pointer hover:file:opacity-80 w-full"
          style={{ color: textColor }}
        />
      </div>
    </div>
  );
});
FileUpload.displayName = 'FileUpload';

// ✅ FontSelector (optimizado)
const FontSelector = memo(({
  currentFont,
  onFontChange,
  cardBg,
  cardBorder,
  itemBg,
  textColor,
  inputClass
}: any) => {
  const [isOpen, setIsOpen] = useState(false);

const categories = useMemo(() => {
  const cats = ['Sans Serif', 'Serif', 'Cursiva', 'Display'];
    return cats.map(category => ({
    category,
    fonts: AVAILABLE_FONTS.filter(f => f.category === category)
  })).filter(group => group.fonts.length > 0);
}, []);

  const previewText = useMemo(() => ({
    spanish: 'Digitaliza tu negocio en minutos con facilitó.',
    english: 'Digitaliza tu negocio en minutos con facilitó.'
  }), []);

  return (
    <div className="pt-3 border-t" style={{ borderColor: cardBorder }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
            Fuente Tipográfica
          </label>
          <p className="text-[9px] opacity-50 mt-0.5" style={{ color: textColor }}>
            Selecciona la fuente que se usará en toda la aplicación
          </p>
        </div>
        <span className="text-[8px] font-mono px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 opacity-40" style={{ color: textColor }}>
          {currentFont}
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${inputClass} w-full cursor-pointer flex items-center justify-between text-left`}
          style={{ color: textColor, fontFamily: currentFont }}
        >
          <span className="truncate">{currentFont}</span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {isOpen && (
          <div 
            className="absolute z-50 mt-1 w-full rounded-2xl shadow-2xl overflow-hidden max-h-72 flex flex-col"
            style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, color: textColor }}
          >
            <div className="overflow-y-auto flex-1 py-1">
              {categories.map(({ category, fonts }) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[9px] font-bold opacity-30 uppercase tracking-wider" style={{ color: textColor }}>
                    {category}
                  </div>
                  {fonts.map((font) => (
                    <FontOption
                      key={font.value}
                      font={font}
                      isSelected={currentFont === font.value}
                      onSelect={onFontChange}
                      cardBorder={cardBorder}
                      textColor={textColor}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="p-2" style={{ borderTop: `1px solid ${cardBorder}`, backgroundColor: cardBg }}>
              <span className="text-[10px] opacity-50" style={{ color: textColor }}>
                {AVAILABLE_FONTS.length} fuentes disponibles
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 p-2 rounded-xl border" style={{ borderColor: cardBorder, backgroundColor: itemBg }}>
        <p className="text-[11px] opacity-40" style={{ color: textColor }}>Previsualización:</p>
        <p className="text-base font-medium mt-0.5 transition-all duration-300" style={{ color: textColor, fontFamily: currentFont }}>
          {previewText.spanish}
        </p>
        <p className="text-[10px] opacity-30 mt-0.5 transition-all duration-300" style={{ color: textColor, fontFamily: currentFont }}>
          {previewText.english}
        </p>
      </div>
    </div>
  );
});
FontSelector.displayName = 'FontSelector';

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
const ThemesTab = memo(({
  brandConfig,
  setBrandConfig,
  handleLogoUpload,
  handleBannerUpload,
  primary,
  secondary: secondaryProp,
  textColor,
  isDarkBg,
  tenantId,
  handleSaveBranding: handleSaveBrandingProp,
  getImageUrl: getImageUrlProp,
}: ThemesTabProps) => {
  // ✅ ESTADO PARA CONTROLAR VISIBILIDAD DE CADA SECCIÓN
  // ✅ ESTADO PARA CONTROLAR VISIBILIDAD DE CADA SECCIÓN
  const [showPalettes, setShowPalettes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showStickers, setShowStickers] = useState(false);  
  // ✅ ESTADO PARA "VER MÁS" EN PALETAS
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  // ✅ PALETAS VISIBLES (primeras 10 o todas)
  const visiblePalettes = useMemo(() => {
    return showAllPalettes ? APP_PALETTES : APP_PALETTES.slice(0, 10);
  }, [showAllPalettes]);

  const hiddenPalettesCount = useMemo(() => {
    return APP_PALETTES.length - 10;
  }, []);

  // ✅ Memoizar estilos
  const cardBg = useMemo(() => 
    secondaryProp || (isDarkBg ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.7)'),
    [secondaryProp, isDarkBg]
  );

  const cardBorder = useMemo(() => 
    isDarkBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    [isDarkBg]
  );

  const itemBg = useMemo(() => 
    isDarkBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.6)',
    [isDarkBg]
  );

  const inputClass = useMemo(() => 
    `w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-black/30 dark:focus:border-white/40 opacity-90 focus:opacity-100 transition duration-150`,
    []
  );

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialConfigRef = useRef(JSON.stringify(brandConfig));
  const [hasChanges, setHasChanges] = useState(false);

  const storeName = useMemo(() => brandConfig?.name || 'Mi Tienda', [brandConfig?.name]);

  const colors = useMemo(() => ({
    primary: brandConfig?.primaryColor || '#f97316',
    secondary: brandConfig?.secondaryColor || '#0f172a',
    accent: brandConfig?.accentColor || '#3b82f6',
    background: brandConfig?.backgroundColor || '#0b0f19',
  }), [brandConfig?.primaryColor, brandConfig?.secondaryColor, brandConfig?.accentColor, brandConfig?.backgroundColor]);

  // ✅ Detectar cambios
  useEffect(() => {
    const currentJson = JSON.stringify(brandConfig);
    setHasChanges(currentJson !== initialConfigRef.current);
  }, [brandConfig]);

  // ✅ Disparar evento de tema
  const dispatchThemeEvent = useCallback((colorsData: any) => {
    if (typeof window === 'undefined') return;
    
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { 
        detail: colorsData 
      }));
      window.dispatchEvent(new Event('storage'));
    });
  }, []);

  // ✅ Handlers memoizados
  const handlePaletteSelect = useCallback((palette: typeof APP_PALETTES[0]) => {
    setBrandConfig((prev: any) => ({
      ...prev,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
    }));
    
    if (typeof window !== 'undefined') {
localStorage.setItem('tenant_palette', palette.id);      
      dispatchThemeEvent({
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        backgroundColor: palette.background,
        name: storeName,
      });
    }
  }, [setBrandConfig, storeName, dispatchThemeEvent]);

  const handleColorChange = useCallback((key: string, value: string) => {
    let cleanValue = value.trim();
    
    if (!cleanValue) {
      setBrandConfig((prev: any) => ({ ...prev, [key]: '' }));
      return;
    }
    
    if (!cleanValue.startsWith('#')) {
      cleanValue = '#' + cleanValue;
    }
    
    const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    if (hexRegex.test(cleanValue)) {
      setBrandConfig((prev: any) => ({ ...prev, [key]: cleanValue }));
      
      const updatedColors = {
        primaryColor: key === 'primaryColor' ? cleanValue : colors.primary,
        secondaryColor: key === 'secondaryColor' ? cleanValue : colors.secondary,
        accentColor: key === 'accentColor' ? cleanValue : colors.accent,
        backgroundColor: key === 'backgroundColor' ? cleanValue : colors.background,
        name: storeName,
      };
      
      dispatchThemeEvent(updatedColors);
    } else {
      setBrandConfig((prev: any) => ({ ...prev, [key]: cleanValue }));
    }
  }, [setBrandConfig, colors, storeName, dispatchThemeEvent]);

const handleFontChange = useCallback((fontValue: string, weight: number = 400) => {
  // 1️⃣ Guardar en estado local
  setBrandConfig((prev: any) => ({ 
    ...prev, 
    fontFamily: fontValue,
    fontWeight: weight,
  }));
  
  if (typeof window !== 'undefined') {
    // 2️⃣ Obtener el slug de forma robusta
    const slug = getCurrentSlug();
    if (!slug) return;
    
    // 3️⃣ Guardar en localStorage CON SLUG usando setTenantFont
    setTenantFont(fontValue, weight, slug);
    
    // 4️⃣ Aplicar SOLO al admin-container
    const adminContainer = document.querySelector('.admin-container') as HTMLElement;
    if (adminContainer) {
      applyFontToContainer(adminContainer, fontValue, weight);
    }
    
    // 5️⃣ Aplicar al store-container si existe
    const storeContainer = document.querySelector('.store-container') as HTMLElement;
    if (storeContainer) {
      applyFontToContainer(storeContainer, fontValue, weight);
    }
    
    // 6️⃣ DISPARAR EVENTO PARA QUE UserFontLoader LO CAPTE
    window.dispatchEvent(new CustomEvent('tenantFontChanged', { 
      detail: { font: fontValue, weight, slug } 
    }));
    
    console.log(`🔤 [ThemesTab] Fuente cambiada para "${slug}":`, fontValue, weight);
  }
}, [setBrandConfig]);

  // ✅ HANDLE REMOVE IMAGE
  const handleRemoveImage = useCallback((key: string) => {
    setBrandConfig((prev: any) => ({ ...prev, [key]: '' }));
    const input = document.querySelector(`input[data-key="${key}"]`) as HTMLInputElement;
    if (input) input.value = '';
  }, [setBrandConfig]);

const handleResetDefaults = useCallback(() => {
  const defaults = {
    primaryColor: '#f97316',
    secondaryColor: '#0f172a',
    accentColor: '#3b82f6',
    backgroundColor: '#0b0f19',
    fontFamily: 'Quicksand',
    fontWeight: 400,
  };
  
  setBrandConfig((prev: any) => ({ ...prev, ...defaults }));
  
  if (typeof window !== 'undefined') {
    const slug = getCurrentSlug();
    
    if (slug) {
      // Guardar con slug
      setTenantFont('Quicksand', 400, slug);
    }
    
    // Aplicar al admin-container
    const container = document.querySelector('.admin-container') as HTMLElement;
    if (container) {
      applyFontToContainer(container, 'Quicksand', 400);
    }
    
    // Aplicar al store-container
    const storeContainer = document.querySelector('.store-container') as HTMLElement;
    if (storeContainer) {
      applyFontToContainer(storeContainer, 'Quicksand', 400);
    }
    
    // Disparar evento
    if (slug) {
      window.dispatchEvent(new CustomEvent('tenantFontChanged', { 
        detail: { font: 'Quicksand', weight: 400, slug } 
      }));
    }
    
    dispatchThemeEvent({ 
      ...defaults, 
      name: storeName,
      fontFamily: 'Quicksand',
      fontWeight: 400,
    });
  }
}, [setBrandConfig, storeName, dispatchThemeEvent]);

  const currentFont = brandConfig?.fontFamily || 'Quicksand';

  // ✅ Toggle para secciones individuales
  const togglePalettes = useCallback(() => {
    setShowPalettes(prev => !prev);
    if (!showPalettes) {
      setShowAllPalettes(false);
    }
  }, [showPalettes]);

  const toggleColors = useCallback(() => {
    setShowColors(prev => !prev);
  }, []);

  const toggleFonts = useCallback(() => {
    setShowFonts(prev => !prev);
  }, []);

  const toggleLayout = useCallback(() => {
    setShowLayout(prev => !prev);
  }, []);

  const togglePopup = useCallback(() => {
    setShowPopup(prev => !prev);
  }, []);

  const togglePolicies = useCallback(() => {
    setShowPolicies(prev => !prev);
  }, []);

  const toggleStickers = useCallback(() => {
    setShowStickers(prev => !prev);
  }, []);

  const toggleShowAllPalettes = useCallback(() => {
    setShowAllPalettes(prev => !prev);
  }, []);

  // ✅ Submit form memoizado
  const onSubmitForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      if (typeof handleSaveBrandingProp === 'function') {
        await handleSaveBrandingProp(e);
      }
      
      const updatedTenant = {
        ...(JSON.parse(localStorage.getItem('tenant') || '{}')),
        primaryColor: brandConfig.primaryColor,
        secondaryColor: brandConfig.secondaryColor,
        accentColor: brandConfig.accentColor,
        backgroundColor: brandConfig.backgroundColor,
        name: brandConfig.name,
        niche: brandConfig.niche,
        description: brandConfig.description,
        slogan: brandConfig.slogan,
        logoUrl: brandConfig.logoUrl || '',
        bannerUrl: brandConfig.bannerUrl || '',
        fontFamily: brandConfig.fontFamily || 'Quicksand',
          fontWeight: brandConfig.fontWeight || 400,  // ✅ AGREGAR ESTO

      };
      localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      
const themeColors = {
  primaryColor: brandConfig.primaryColor,
  secondaryColor: brandConfig.secondaryColor,
  accentColor: brandConfig.accentColor,
  backgroundColor: brandConfig.backgroundColor,
  name: brandConfig.name || 'Mi Tienda',
  niche: brandConfig.niche,
  description: brandConfig.description,
  slogan: brandConfig.slogan,
  logoUrl: brandConfig.logoUrl || '',
  bannerUrl: brandConfig.bannerUrl || '',
  // ❌ ELIMINAR fontFamily DE tenant_theme
};
localStorage.setItem('tenant_theme', JSON.stringify(themeColors));

// ✅ Guardar fuente por separado
const slug = window.location.pathname.split('/').pop() || '';
localStorage.setItem(`tenant_font_${slug}`, brandConfig.fontFamily || 'Quicksand');
localStorage.setItem(`tenant_font_weight_${slug}`, String(brandConfig.fontWeight || 400));     
      if (typeof window !== 'undefined') {
        const fontFamily = brandConfig.fontFamily || 'Quicksand';
        const fontWeight = brandConfig.fontWeight || 400;
        document.documentElement.style.setProperty('--font-sans', fontFamily);

        // ✅ GUARDAR EN LA CLAVE CANÓNICA (tenant_config_${slug}) usando setTenantFont
        const slug = getCurrentSlug();
        if (slug) {
          setTenantFont(fontFamily, fontWeight, slug);
          localStorage.setItem(`tenant_font_${slug}`, fontFamily);
          localStorage.setItem(`tenant_font_weight_${slug}`, String(fontWeight));
        }
      }
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { 
          detail: {
            primaryColor: brandConfig.primaryColor,
            secondaryColor: brandConfig.secondaryColor,
            accentColor: brandConfig.accentColor,
            backgroundColor: brandConfig.backgroundColor,
            name: brandConfig.name || 'Mi Tienda',
            logoUrl: brandConfig.logoUrl || '',
            bannerUrl: brandConfig.bannerUrl || '',
            fontFamily: brandConfig.fontFamily || 'Quicksand',
              fontWeight: brandConfig.fontWeight || 400,  // ✅ AGREGAR ESTO

          }
        }));
        
        window.dispatchEvent(new CustomEvent('themeUpdated', { 
          detail: themeColors 
        }));
        
        window.dispatchEvent(new Event('storage'));
      }
      
      initialConfigRef.current = JSON.stringify(brandConfig);
      setHasChanges(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error al guardar branding:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, handleSaveBrandingProp, brandConfig]);



  // ✅ Memoizar fileInputs
  const fileInputs = useMemo(() => [
    { label: 'Logotipo', fileKey: 'logoUrl', handler: handleLogoUpload },
    { label: 'Banner Promocional', fileKey: 'bannerUrl', handler: handleBannerUpload },
  ], [handleLogoUpload, handleBannerUpload]);

  return (
    <div className="w-full mx-auto relative pb-12">
      <form onSubmit={onSubmitForm} className="space-y-6 w-full">
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
                Diseño Visual y Multimedia
              </h3>
              <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                Imágenes de marca, paletas, fuentes y colores personalizados.
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

          {/* SUBIDAS DE ARCHIVOS - SIEMPRE VISIBLE */}
          <div className="space-y-4">
            {fileInputs.map((fileInput) => (
              <FileUpload
                key={fileInput.fileKey}
                label={fileInput.label}
                fileKey={fileInput.fileKey}
                handler={fileInput.handler}
                brandConfig={brandConfig}
                onRemove={handleRemoveImage}
                cardBorder={cardBorder}
                itemBg={itemBg}
                textColor={textColor}
                primary={primary}
                isDarkBg={isDarkBg}
                getImageUrl={getImageUrlProp}
              />
            ))}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 1: PALETAS - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={togglePalettes}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{ 
                borderColor: cardBorder,
                backgroundColor: showPalettes ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor
              }}
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showPalettes ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showPalettes ? 'Ocultar' : 'Mostrar'} Paletas de Colores
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showPalettes ? '▼' : '▶'} {APP_PALETTES.length} paletas disponibles
              </span>
            </button>

            {/* PALETAS - SOLO RENDERIZADAS SI showPalettes ES TRUE */}
            {showPalettes && (
              <div className="space-y-2 pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {visiblePalettes.map((palette) => {
                    const isSelected = 
                      brandConfig?.primaryColor === palette.primary && 
                      brandConfig?.secondaryColor === palette.secondary;
                    
                    return (
                      <PaletteCard
                        key={palette.id}
                        palette={palette}
                        isSelected={isSelected}
                        onSelect={handlePaletteSelect}
                        cardBorder={cardBorder}
                        itemBg={itemBg}
                        textColor={textColor}
                      />
                    );
                  })}
                </div>

                {/* VER MÁS / VER MENOS - SUTIL */}
                {hiddenPalettesCount > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    fullWidth
                    onClick={toggleShowAllPalettes}
                    icon={
                      showAllPalettes ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      )
                    }
                    primary={primary}
                    borderColor={cardBorder}
                    textColor={textColor}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                  >
                    {showAllPalettes ? 'Ver menos' : `Ver ${hiddenPalettesCount} paletas más`}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 2: COLORES - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={toggleColors}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{ 
                borderColor: cardBorder,
                backgroundColor: showColors ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor
              }}
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showColors ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showColors ? 'Ocultar' : 'Mostrar'} Selector de Colores
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showColors ? '▼' : '▶'} Personalización avanzada
              </span>
            </button>

            {/* SELECTORES DE COLOR - SOLO RENDERIZADOS SI showColors ES TRUE */}
            {showColors && (
              <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                      Personalización Avanzada
                    </label>
                    <p className="text-[9px] opacity-50 mt-0.5" style={{ color: textColor }}>
                      Arrastra en el selector visual o escribe el código hexadecimal
                    </p>
                  </div>
                  <span className="text-[8px] font-mono px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 opacity-40" style={{ color: textColor }}>
                    Visual + Texto
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COLOR_CONFIGS.map((item) => {
                    const currentColor = brandConfig?.[item.id] || item.default;
                    
                    return (
                      <ColorPicker
                        key={item.id}
                        label={item.label}
                        colorId={item.id}
                        defaultColor={item.default}
                        icon={item.icon}
                        description={item.description}
                        currentColor={currentColor}
                        onColorChange={handleColorChange}
                        cardBorder={cardBorder}
                        itemBg={itemBg}
                        textColor={textColor}
                        inputClass={inputClass}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 3: FUENTES - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={toggleFonts}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{ 
                borderColor: cardBorder,
                backgroundColor: showFonts ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor
              }}
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showFonts ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showFonts ? 'Ocultar' : 'Mostrar'} Fuentes Tipográficas
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showFonts ? '▼' : '▶'} {AVAILABLE_FONTS.length} fuentes disponibles
              </span>
            </button>

            {/* SELECTOR DE FUENTES - SOLO RENDERIZADO SI showFonts ES TRUE */}
            {showFonts && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <FontSelector
                  currentFont={currentFont}
                  onFontChange={handleFontChange}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  itemBg={itemBg}
                  textColor={textColor}
                  inputClass={inputClass}
                />
              </div>
            )}
          </div>

                    {/* ============================================================ */}
          {/* 🔥 SECCIÓN 4: LAYOUT DEL HERO - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={toggleLayout}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{ 
                borderColor: cardBorder,
                backgroundColor: showLayout ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor
              }}
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showLayout ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showLayout ? 'Ocultar' : 'Mostrar'} Diseño del Hero
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showLayout ? '▼' : '▶'} {brandConfig?.heroLayout === 'centered' ? 'Centrado' : 'Clásico'}
              </span>
            </button>

            {showLayout && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <LayoutSettingsTab
                  brandConfig={brandConfig}
                  setBrandConfig={setBrandConfig}
                  primary={primary}
                  secondary={secondaryProp}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 5: POP-UP PROMOCIONAL - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={togglePopup}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{
                borderColor: cardBorder,
                backgroundColor: showPopup ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor,
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${showPopup ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showPopup ? 'Ocultar' : 'Mostrar'} Pop-up Promocional
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showPopup ? '▼' : '▶'} Publicidad en tu tienda
              </span>
            </button>

            {showPopup && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <PopupSettingsTab
                  brandConfig={brandConfig}
                  setBrandConfig={setBrandConfig}
                  primary={primary}
                  secondary={secondaryProp}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantId={tenantId}
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 6: REGLAS DE LA TIENDA - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={togglePolicies}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{
                borderColor: cardBorder,
                backgroundColor: showPolicies ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor,
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${showPolicies ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showPolicies ? 'Ocultar' : 'Mostrar'} Información de la Tienda
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showPolicies ? '▼' : '▶'} Avisos, normas e información
              </span>
            </button>

            {showPolicies && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <StorePoliciesTab
                  brandConfig={brandConfig}
                  setBrandConfig={setBrandConfig}
                  primary={primary}
                  secondary={secondaryProp}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantId={tenantId}
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 7: STICKERS IMPRIMIBLES - INDEPENDIENTE */}
          {/* ============================================================ */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <button
              type="button"
              onClick={toggleStickers}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] hover:opacity-80 cursor-pointer"
              style={{
                borderColor: cardBorder,
                backgroundColor: showStickers ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: textColor,
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${showStickers ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs font-semibold">
                  {showStickers ? 'Ocultar' : 'Mostrar'} Stickers Imprimibles
                </span>
              </div>
              <span className="text-[10px] opacity-50">
                {showStickers ? '▼' : '▶'} 8 plantillas · PNG y PDF A4
              </span>
            </button>

            {showStickers && (
              <div className="pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <StickersTab
                  brandConfig={brandConfig}
                  primary={primary}
                  secondary={secondaryProp}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantId={tenantId}
                />
              </div>
            )}
          </div>

          {/* RESTAURAR POR DEFECTO - SIEMPRE VISIBLE */}
          <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: cardBorder }}>
            <p className="text-[8px] opacity-30" style={{ color: textColor }}>
              Usa el selector visual para explorar colores o escribe el código hexadecimal exacto
            </p>
            <Button
              variant="outline"
              size="xs"
              onClick={handleResetDefaults}
              primary={primary}
              borderColor={cardBorder}
              textColor={textColor}
              cardBg={itemBg}
              isDarkBg={isDarkBg}
            >
              Restaurar por defecto
            </Button>
          </div>
        </div>

        {/* BARRA DE GUARDAR */}
        <div 
          className="w-full border rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-[background-color,border-color,box-shadow,color] duration-300"
          style={{ 
            backgroundColor: cardBg, 
            borderColor: cardBorder, 
            color: textColor 
          }}
        >
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              {hasChanges ? 'Guardar Cambios de Identidad Visual' : 'Configuración al Día'}
            </h3>
            <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
              {hasChanges 
                ? 'Tienes modificaciones pendientes por aplicar en tu identidad visual.' 
                : 'No hay cambios pendientes por guardar en este momento.'}
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSaving || !hasChanges}
            loading={isSaving}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            }
            primary={primary || '#f97316'}
            borderColor={cardBorder}
            textColor={textColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          >
            {isSaving ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
          </Button>
        </div>
      </form>

      {/* 🔥 MODAL DE ÉXITO (canónico) */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Cambios guardados!"
        message="La configuración de tu identidad visual se ha actualizado correctamente en el sistema."
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

ThemesTab.displayName = 'ThemesTab';

export default ThemesTab;