// app/onboarding/components/StepBuyerBranding.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { APP_PALETTES } from '../../constants/palettes';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

// Importamos el componente existente de Branding reutilizado
import AccountBrandingVisual from '../../mi-cuenta/components/branding/AccountBrandingVisual';

interface StepBuyerBrandingProps {
  data: {
    userId?: string;
    fullName?: string;
    name?: string;
    email?: string;
    role?: 'buyer' | 'seller';
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  };
  update: (fields: any) => void;
  next: () => void;
  prev?: () => void;
  isSubmitting?: boolean;
  user?: any;
  // ✅ NUEVAS PROPS PARA HEREDAR EL FONDO
  activePalette?: any;
  isLight?: boolean;
  textColorClass?: string;
  mutedTextColorClass?: string;
  cardBgStyle?: string;
  /**
   * 🔥 Callback que el padre (OnboardingPage) usa para actualizar el
   * theme global cuando el usuario cambia la paleta. Como el ThemeContext
   * da EMPTY_THEME al onboarding, necesitamos un override local.
   */
  onPaletteChange?: (palette: any) => void;
}

export default function StepBuyerBranding({
  data,
  update,
  next,
  prev,
  isSubmitting = false,
  user,
  activePalette,
  isLight = false,
  textColorClass = 'text-white',
  mutedTextColorClass = 'text-gray-400',
  cardBgStyle,
  onPaletteChange,
}: StepBuyerBrandingProps) {
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [localData, setLocalData] = useState(data);

  // 🔥 Sincronizar SOLO al montar (no en cada cambio del padre).
  // Si sincronizamos en cada cambio, pisamos los cambios locales
  // cuando el user elige una paleta (race condition).
  useEffect(() => {
    setLocalData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 Detectar cambios de color en localData y propagarlos al padre
  // para que el fondo global del onboarding cambie en vivo.
  useEffect(() => {
    if (!onPaletteChange) return;
    // Solo propagar si hay colores reales (no los defaults hardcodeados)
    if (
      localData.primaryColor ||
      localData.secondaryColor ||
      localData.accentColor ||
      localData.backgroundColor
    ) {
      const palette = {
        primary: localData.primaryColor || '#f97316',
        secondary: localData.secondaryColor || '#0f172a',
        accent: localData.accentColor || '#fbbf24',
        background: localData.backgroundColor || localData.secondaryColor || '#0b0f19',
        name: localData.name || 'Mi Perfil',
      };

      onPaletteChange(palette);

      // 🔥 Setear las CSS vars directamente también (por si el padre tarda en re-renderizar).
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        if (palette.primary) root.style.setProperty('--accent-color', palette.primary);
        if (palette.secondary) root.style.setProperty('--secondary-color', palette.secondary);
        if (palette.accent) root.style.setProperty('--accent-glow', palette.accent);
        if (palette.background) {
          root.style.setProperty('--bg-color', palette.background);
          document.body.style.backgroundColor = palette.background;
        }

        window.dispatchEvent(new Event('themeChange'));
        window.dispatchEvent(new Event('paletteChange'));
        window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { detail: palette }));
      }
    }
  }, [
    localData.primaryColor,
    localData.secondaryColor,
    localData.accentColor,
    localData.backgroundColor,
    onPaletteChange,
  ]);

  // 🔥 Wrapper que maneja functional updates correctamente.
  // 🔥 IMPORTANTE: el `update` se hace FUERA del updater.
  const handleLocalUpdate = useCallback((fields: any) => {
    // 1. Actualizar el estado LOCAL del StepBuyerBranding
    setLocalData((prev: any) => {
      const next = typeof fields === 'function'
        ? fields(prev)
        : { ...prev, ...fields };
      return next;
    });

    // 2. Propagar al PADRE con el mismo cálculo, sin depender del updater.
    //    Como los `fields` ya son un objeto o función de `prev`,
    //    usamos la forma "objeto" para que sea compatible con `updateFormData`.
    if (typeof fields === 'function') {
      // Si es función, no podemos saber el resultado sin el prev del padre.
      // Usamos el `data` actual como base (que es el formData del padre).
      const next = fields(data);
      update(next);
    } else {
      update(fields);
    }
  }, [update, data]);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitting = isSubmitting || localSubmitting;

  // 🔥 Derivar TODO de localData para que reaccione en vivo
  const primary = localData.primaryColor || '#f97316';
  const secondary = localData.secondaryColor || '#0f172a';
  const backgroundColor = localData.backgroundColor || secondary;

  // 🔥 Detectar luminosidad del fondo real (en vivo)
  const isBgLight = isColorLight(backgroundColor);
  const isDarkBg = !isBgLight;
  const textColor = isDarkBg ? '#ffffff' : '#0f172a';

  const handleAvatarFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Solo se permiten imágenes');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('La imagen no debe superar los 2MB');
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setAvatarPreview(url);
      update({ avatarUrl: url });
    };
    reader.readAsDataURL(file);
  }, [update]);

  const handleUploadAvatar = useCallback(async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';

      const formDataUpload = new FormData();
      formDataUpload.append('file', avatarFile);   // 🔥 'file' para /upload/temp

      // 🔥 Si hay token → endpoint autenticado. Si NO → temporal.
      const endpoint = token
        ? `${API_URL}/api/account/avatar`
        : `${API_URL}/upload/temp`;

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

      const result = await response.json();
      const newAvatarUrl = result.avatarUrl || result.url || result.avatar;

      setAvatarPreview(newAvatarUrl);
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      update({ avatarUrl: newAvatarUrl });
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
  }, [avatarFile, update]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarSuccess('Avatar eliminado');
    update({ avatarUrl: null });
    setTimeout(() => setAvatarSuccess(null), 3000);
  }, [update]);

  // ✅ SIMPLIFICADO: Solo sube avatar y llama a next()
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSubmitting(true);

    try {
      // Si hay un archivo pendiente de subir, lo subimos primero
      if (avatarFile) {
        await handleUploadAvatar();
      }

      // ✅ Avanzamos al siguiente paso (handleFinishBuyer)
      next();

    } catch (error: any) {
      console.error('Error en StepBuyerBranding:', error);
      alert(error.message || 'Error al guardar el perfil');
    } finally {
      setLocalSubmitting(false);
    }
  }, [avatarFile, handleUploadAvatar, next]);

  return (
    <div 
      className="w-full"
      // 🔥 SIN fondo. El padre (OnboardingPage) ya aplica `cardBgStyle`.
      // Si ponemos fondo acá, se duplica y se ve azul oscuro estático.
    >
      <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
        <div className="text-center space-y-1 mb-4">
          <h2 
            className="text-xl font-extrabold tracking-tight"
            style={{ color: textColor }}
          >
            Personaliza tu Perfil
          </h2>
          <p 
            className="text-xs"
            style={{ color: textColor, opacity: 0.6 }}
          >
            Paso final: Añade tu avatar y personaliza los colores de tu experiencia
          </p>
        </div>

        <div className="relative">
          <AccountBrandingVisual
            formData={localData}
            setFormData={handleLocalUpdate}
            primary={primary}
            secondary={secondary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            user={user}
            transparentMode={true}
            onAvatarUpdate={(url: string | null) => {
              handleLocalUpdate({ avatarUrl: url });
              setAvatarPreview(url);
            }}
          />
        </div>

        <div 
          className="flex space-x-3 pt-4"
          style={{ borderTop: `1px solid ${textColor}1a` }}
        >
          {prev && (
            <button
              type="button"
              onClick={prev}
              disabled={submitting}
              style={{
                color: textColor,
                backgroundColor: `${textColor}1a`,
                borderColor: `${textColor}1a`,
              }}
              className="w-1/3 hover:opacity-80 font-bold py-3.5 rounded-2xl transition cursor-pointer text-xs border flex items-center justify-center"
            >
              ← Atrás
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: primary,
              boxShadow: `0 10px 25px -5px ${primary}50`
            }}
            className={`${prev ? 'w-2/3' : 'w-full'} hover:opacity-90 text-white font-bold py-3.5 rounded-2xl shadow-lg transition cursor-pointer text-xs disabled:opacity-50 flex items-center justify-center gap-1.5`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>¡Completar Registro!</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}