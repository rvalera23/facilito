'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { APP_PALETTES } from '../../../constants/palettes';
import { User, Camera, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { loadFont, applyUserFont, AVAILABLE_FONTS } from '@/lib/fontLoader';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { Button } from '@/components/ui/Button';
interface AccountBrandingVisualProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onSavePalette?: (e: React.FormEvent) => Promise<void> | void;
  updating?: boolean;
  user?: any;
  onAvatarUpdate?: (avatarUrl: string | null) => void;
  /** 🔥 Si es true, las cards van con fondo transparente (onboarding). */
  transparentMode?: boolean;
  /** 🔥 Si es true, el picker de paletas/colores/fuentes se bloquea. */
  pickerDisabled?: boolean;
  /** 🔥 Mensaje que se muestra cuando pickerDisabled=true. */
  disabledMessage?: string;
  /** 🔥 URL del panel admin para el link "Ir al panel". */
  adminUrl?: string | null;
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
const PaletteCard = React.memo(({ palette, isSelected, onSelect, cardBorder, itemBg, textColor }: any) => {
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
        ringColor: isSelected ? palette.primary : 'transparent',
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

// ✅ FontOption
const FontOption = React.memo(({ font, isSelected, onSelect, cardBorder, textColor }: any) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(font.value)}
      className="w-full text-left px-4 py-2.5 text-xs transition border-b last:border-none cursor-pointer flex items-center justify-between"
      style={{
        color: isSelected ? '#f97316' : textColor,
        backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
        borderColor: cardBorder,
        fontFamily: font.value,
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
const ColorPicker = React.memo(({
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
                ringColor: isSuggestionSelected ? suggestionColor : 'transparent',
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

// ✅ FontSelector
const FontSelector = React.memo(({
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
    const cats = ['Sans Serif', 'Serif', 'Cursiva', 'Display', 'Mono'];
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
        <span className="text-[8px] font-mono px-2 py-1 rounded-lg opacity-40" style={{ color: textColor }}>
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

export default function AccountBrandingVisual({
  formData,
  setFormData,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onSavePalette,
  updating = false,
  user,
  onAvatarUpdate,
  transparentMode = false,
  pickerDisabled = false,
  disabledMessage,
  adminUrl,
}: AccountBrandingVisualProps) {
  // ✅ ESTADO PARA CONTROLAR VISIBILIDAD DE CADA SECCIÓN
  const [showPalettes, setShowPalettes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  
  // ✅ ESTADO PARA "VER MÁS" EN PALETAS
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  // ✅ ESTADOS DE AVATAR
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;
  // 🔥 Buscar avatar en múltiples lugares (backend, snake_case, localStorage)
  const currentAvatar =
    user?.avatarUrl ||
    user?.avatar_url ||
    user?.avatar ||
    user?.image ||
    user?.photo ||
    (typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}').avatarUrl || null
      : null);
  const displayAvatar = avatarPreview || currentAvatar;

  // ✅ PALETAS VISIBLES (primeras 10 o todas)
  const visiblePalettes = useMemo(() => {
    return showAllPalettes ? APP_PALETTES : APP_PALETTES.slice(0, 10);
  }, [showAllPalettes]);

  const hiddenPalettesCount = useMemo(() => {
    return APP_PALETTES.length - 10;
  }, []);

  // 🔥 Fondo condicional:
  // - transparentMode=true (onboarding): transparente, el padre ya aplica cardBgStyle.
  // - transparentMode=false (/mi-cuenta): fondo del theme, como antes.
  const cardBg = useMemo(() => {
    if (transparentMode) return 'transparent';
    return secondary || (isDarkBg ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.7)');
  }, [transparentMode, secondary, isDarkBg]);

  const cardBorder = useMemo(() => 
    isDarkBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    [isDarkBg]
  );

  const itemBg = useMemo(() => {
    if (transparentMode) return 'transparent';
    return isDarkBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.6)';
  }, [transparentMode, isDarkBg]);

  // 🔥 Inputs transparentes. Solo borde.
  const inputClass = useMemo(() => 
    `w-full bg-transparent border border-black/10 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-black/30 dark:focus:border-white/40 opacity-90 focus:opacity-100 transition duration-150`,
    []
  );

  const currentFont = formData?.fontFamily || 'Quicksand';

  // ✅ Función para detectar si un color es oscuro
  const isColorDark = (color: string) => {
    if (!color) return true;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  // ✅ Handlers memoizados para temas
  const handlePaletteSelect = useCallback((palette: typeof APP_PALETTES[0]) => {
    const bgColor = palette.background || palette.secondary;
    const isDark = isColorDark(bgColor);
    const textColorValue = isDark ? '#ffffff' : '#000000';

    setFormData((prev: any) => ({
      ...prev,
      palette: palette.id,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
      textColor: textColorValue,
      isDarkBg: isDark,
    }));

    if (typeof window !== 'undefined') {
localStorage.setItem('user_palette', palette.id);
    }
  }, [setFormData]);

  const handleColorChange = useCallback((key: string, value: string) => {
    let cleanValue = value.trim();
    
    if (!cleanValue) {
      setFormData((prev: any) => ({ ...prev, [key]: '' }));
      return;
    }
    
    if (!cleanValue.startsWith('#')) {
      cleanValue = '#' + cleanValue;
    }
    
    const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    if (hexRegex.test(cleanValue)) {
      setFormData((prev: any) => ({ ...prev, [key]: cleanValue }));
    } else {
      setFormData((prev: any) => ({ ...prev, [key]: cleanValue }));
    }
  }, [setFormData]);

  const handleFontChange = useCallback((fontValue: string) => {
    setFormData((prev: any) => ({ ...prev, fontFamily: fontValue }));
    
    if (typeof window !== 'undefined') {
      const container = document.querySelector('.mi-cuenta-container');
      if (container) {
        (container as HTMLElement).style.setProperty('--font-sans', loadFont(fontValue));
        (container as HTMLElement).style.setProperty('--font-family', fontValue);
      }
localStorage.setItem('user_font', fontValue);
    }
  }, [setFormData]);

  const handleResetDefaults = useCallback(() => {
    const defaults = {
      primaryColor: '#f97316',
      secondaryColor: '#0f172a',
      accentColor: '#3b82f6',
      backgroundColor: '#0b0f19',
      fontFamily: 'Quicksand',
    };
    
    setFormData((prev: any) => ({ ...prev, ...defaults }));
    
    if (typeof window !== 'undefined') {
      const container = document.querySelector('.mi-cuenta-container');
      if (container) {
        (container as HTMLElement).style.setProperty('--font-sans', loadFont('Quicksand'));
        (container as HTMLElement).style.setProperty('--font-family', 'Quicksand');
      }
localStorage.setItem('user_font', 'Quicksand');    }
  }, [setFormData]);

  // ✅ Toggles para secciones individuales
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

  const toggleShowAllPalettes = useCallback(() => {
    setShowAllPalettes(prev => !prev);
  }, []);

  // ✅ HANDLERS DE AVATAR
  const handleAvatarFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔥 VALIDAR EXTENSIÓN (debe matchear con el backend)
    const validExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (!validExtensions.test(file.name)) {
      setAvatarError('Solo se permiten imágenes JPG, JPEG, PNG, GIF o WEBP. Si tu foto es HEIC o AVIF, convertila primero.');
      setAvatarSuccess(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Solo se permiten imágenes');
      setAvatarSuccess(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('La imagen no debe superar los 2MB');
      setAvatarSuccess(null);
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadAvatar = useCallback(async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';

      const formDataUpload = new FormData();
      formDataUpload.append('file', avatarFile);   // 🔥 'file' no 'avatar'

      // 🔥 Si hay token (user ya registrado) → endpoint autenticado.
      // Si NO hay token (buyer en onboarding) → endpoint temporal.
      const endpoint = token
        ? `${API_BASE}/api/account/avatar`
        : `${API_BASE}/upload/temp`;

      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir la imagen');
      }

      const data = await response.json();
      
      const newAvatarUrl = data.avatarUrl || data.url || data.avatar || data.url;

      setAvatarPreview(newAvatarUrl);
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onAvatarUpdate) {
        onAvatarUpdate(newAvatarUrl);
      }

      setAvatarSuccess('Avatar actualizado correctamente');
      
      setTimeout(() => {
        setAvatarSuccess(null);
      }, 3000);

    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      setAvatarError(error.message || 'Error al subir la imagen');
    } finally {
      setUploadingAvatar(false);
    }
  }, [avatarFile, onAvatarUpdate]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    
    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';

      const response = await fetch(`${API_BASE}/api/account/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el avatar');
      }

      if (onAvatarUpdate) {
        onAvatarUpdate(null);
      }

      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setAvatarSuccess('Avatar eliminado correctamente');
      
      setTimeout(() => {
        setAvatarSuccess(null);
      }, 3000);

    } catch (error: any) {
      console.error('Error al eliminar avatar:', error);
      setAvatarError(error.message || 'Error al eliminar el avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }, [onAvatarUpdate]);

  // ✅ Submit form memoizado
  const handleSaveWithModal = useCallback(async (e: React.FormEvent) => {
    if (!onSavePalette) return;
    
    setIsSaving(true);
    try {
      await onSavePalette(e);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSavePalette]);

  // ✅ Obtener iniciales del usuario
  const getInitials = useCallback(() => {
    const name = user?.name || user?.fullName || '';
    if (!name) return '👤';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [user]);



  return (
    <div className="w-full mx-auto relative pb-12">
      {/* CONTENEDOR PRINCIPAL - LAYOUT DE DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        {/* COLUMNA IZQUIERDA - PERFIL */}
        <div 
          className="p-6 rounded-3xl border shadow-xl space-y-5 backdrop-blur-sm transition-all w-full"
          style={{ 
            backgroundColor: cardBg, 
            borderColor: cardBorder,
            color: textColor,
          }}
        >
          <div className="border-b pb-3 transition-all duration-200" style={{ borderColor: cardBorder }}>
            <h3 className="font-bold text-base tracking-tight transition-all duration-200" style={{ color: primary }}>
              Mi Perfil
            </h3>
            <p className="text-[11px] opacity-75 mt-0.5 transition-all duration-200" style={{ color: textColor }}>
              Gestiona tu foto de perfil. El resto de la información se edita en la pestaña "Perfil".
            </p>
          </div>

          {/* SECCIÓN DE AVATAR */}
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold opacity-85 transition-all duration-200" style={{ color: textColor }}>
              Foto de Perfil
            </label>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-md flex items-center justify-center transition-all duration-200" style={{ borderColor: primary }}>
                  {displayAvatar ? (
                    <img 
                      src={
                        displayAvatar.startsWith('data:') || displayAvatar.startsWith('blob:') || displayAvatar.startsWith('http')
                          ? displayAvatar
                          : `${API_BASE}${displayAvatar}`
                      }
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={() => setAvatarPreview(null)}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-3xl font-bold transition-all duration-200"
                      style={{ backgroundColor: `${primary}20`, color: primary }}
                    >
                      {getInitials()}
                    </div>
                  )}
                </div>
                
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    icon={<Camera className="w-3.5 h-3.5" />}
                    primary={primary}
                    borderColor={cardBorder}
                    textColor={textColor}
                    cardBg={itemBg}
                    isDarkBg={isDarkBg}
                  >
                    {displayAvatar ? 'Cambiar foto' : 'Subir foto'}
                  </Button>

                  {displayAvatar && (
                    <Button
                      variant="outline-danger"
                      size="md"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      icon={<X className="w-3.5 h-3.5" />}
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

                {avatarFile && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400">
                      {avatarFile.name} ({(avatarFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUploadAvatar}
                      disabled={uploadingAvatar}
                      loading={uploadingAvatar}
                      primary={primary}
                      borderColor={cardBorder}
                      textColor={textColor}
                      cardBg={itemBg}
                      isDarkBg={isDarkBg}
                    >
                      {uploadingAvatar ? 'Subiendo...' : 'Subir'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setAvatarError(null);
                        setAvatarSuccess(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[10px] opacity-50 hover:opacity-100 transition"
                      style={{ color: textColor }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {avatarSuccess && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">{avatarSuccess}</span>
                  </div>
                )}

                {avatarError && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-[11px] text-red-400">{avatarError}</span>
                  </div>
                )}
                
                <p className="text-[9px] opacity-50 transition-all duration-200" style={{ color: textColor }}>
                  Formatos: JPG, PNG, WEBP • Máx. 2MB
                </p>
              </div>
            </div>

            {/* INFORMACIÓN DEL USUARIO - SOLO VISUAL */}
            <div className="mt-4 space-y-3 pt-3 border-t" style={{ borderColor: cardBorder }}>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold opacity-70 mb-1" style={{ color: textColor }}>
                    Nombre completo
                  </label>
                  <div 
                    className={`${inputClass} cursor-not-allowed opacity-70`} 
                    style={{ 
                      color: textColor, 
                      backgroundColor: itemBg,
                      cursor: 'not-allowed',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {user?.name || user?.fullName || 'No especificado'}
                      <span className="text-[8px] opacity-30 ml-auto">🔒</span>
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold opacity-70 mb-1" style={{ color: textColor }}>
                    Correo electrónico
                  </label>
                  <div 
                    className={`${inputClass} cursor-not-allowed opacity-70`} 
                    style={{ 
                      color: textColor, 
                      backgroundColor: itemBg,
                      cursor: 'not-allowed',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {user?.email || 'No especificado'}
                      <span className="text-[8px] opacity-30 ml-auto">🔒</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[9px] opacity-60" style={{ color: textColor }}>
                  Esta información es de solo visualización. Edítala en la pestaña "Perfil".
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA - TEMAS */}
        <div 
          className="p-6 rounded-3xl border shadow-xl space-y-5 backdrop-blur-sm transition-all w-full relative"
          style={{ 
            backgroundColor: cardBg, 
            borderColor: cardBorder,
            color: textColor,
            opacity: pickerDisabled ? 0.4 : 1,
            pointerEvents: pickerDisabled ? 'none' : 'auto',
            filter: pickerDisabled ? 'grayscale(0.6)' : 'none',
          }}
          aria-disabled={pickerDisabled}
        >
          <div className="border-b pb-3 transition-all duration-200" style={{ borderColor: cardBorder }}>
            <h3 className="font-bold text-base tracking-tight transition-all duration-200" style={{ color: primary }}>
              Tema y Personalización
            </h3>
            <p className="text-[11px] opacity-75 mt-0.5 transition-all duration-200" style={{ color: textColor }}>
              Paletas, colores personalizados y fuente tipográfica.
            </p>
          </div>

          {/* ============================================================ */}
          {/* 🔥 SECCIÓN 1: PALETAS - CONTRAÍDA */}
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
                <div className="grid grid-cols-2 gap-2">
                  {visiblePalettes.map((palette) => {
                    const isSelected = 
                      formData?.primaryColor === palette.primary && 
                      formData?.secondaryColor === palette.secondary;
                    
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
          {/* 🔥 SECCIÓN 2: COLORES - CONTRAÍDA */}
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
                  <span className="text-[8px] font-mono px-2 py-1 rounded-lg opacity-40" style={{ color: textColor }}>
                    Visual + Texto
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COLOR_CONFIGS.map((item) => {
                    const currentColor = formData?.[item.id] || item.default;
                    
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
          {/* 🔥 SECCIÓN 3: FUENTES - CONTRAÍDA */}
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

          {/* RESTAURAR POR DEFECTO */}
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

          {/* BOTÓN DE GUARDAR (oculto si pickerDisabled) */}
          {onSavePalette && !pickerDisabled && (
            <div className="pt-3 border-t flex justify-end transition-all duration-200" style={{ borderColor: cardBorder }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveWithModal}
                disabled={updating || isSaving}
                loading={isSaving}
                primary={primary}
                borderColor={cardBorder}
                textColor={textColor}
                cardBg={cardBg}
                isDarkBg={isDarkBg}
              >
                {isSaving ? 'Guardando...' : 'Guardar tema'}
              </Button>
            </div>
          )}

          {/* 🔥 OVERLAY: mensaje de bloqueo cuando pickerDisabled=true */}
          {pickerDisabled && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-20" style={{ pointerEvents: 'auto' }}>
              <div
                className="max-w-xs p-4 rounded-2xl border-2 text-center space-y-2 shadow-2xl backdrop-blur-xl"
                style={{
                  borderColor: `${primary}60`,
                  backgroundColor: `${primary}15`,
                  pointerEvents: 'auto',
                }}
              >
                <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${primary}25` }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: primary }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <p className="text-[11px] font-bold leading-snug" style={{ color: textColor }}>
                  {disabledMessage || 'El control de tu paleta, colores y tipografía lo tiene tu tienda.'}
                </p>
                {adminUrl && (
                  <a
                    href={adminUrl}
                    className="inline-block mt-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: primary, color: '#ffffff' }}
                  >
                    Ir al panel de administración →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 MODAL DE ÉXITO (canónico) */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Cambios guardados!"
        message="La configuración de tu tema se ha actualizado correctamente en el sistema."
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
}