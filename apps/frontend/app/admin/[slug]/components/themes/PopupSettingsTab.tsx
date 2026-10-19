'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, AlertCircle, MousePointer, Timer, ArrowDown } from 'lucide-react';
// ============================================================
// 🔥 CONFIGURACIÓN DEL POPUP PROMOCIONAL
// ============================================================
// Permite al admin subir una imagen que aparecerá como popup en la
// tienda pública. Con trigger configurable (al cargar, con delay,
// o al hacer scroll) y frecuencia (siempre, una vez por sesión, etc.).
//
// Guarda la config en `specificConfig.popup` del tenant (via brandConfig).

interface PopupSettingsTabProps {
  brandConfig: any;
  setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
}

const DEFAULT_POPUP = {
  enabled: false,
  imageUrl: '',
  trigger: 'onLoad' as 'onLoad' | 'afterDelay' | 'onScroll',
  delaySeconds: 3,
  scrollPercent: 50,
  frequency: 'once_session' as 'always' | 'once_session' | 'once_day' | 'once_ever',
  showCloseButton: true,
  imageAlt: '',
  // 🔥 NUEVOS: enlace opcional con nueva pestaña
  linkUrl: '',
  linkText: '',
  openInNewTab: false,
  updatedAt: '',
};

const TRIGGER_OPTIONS = [
  { id: 'onLoad', label: 'Al cargar la página', icon: MousePointer, description: 'Aparece inmediatamente' },
  { id: 'afterDelay', label: 'Después de X segundos', icon: Timer, description: 'Aparece tras esperar' },
  { id: 'onScroll', label: 'Al hacer scroll', icon: ArrowDown, description: 'Aparece tras bajar' },
];

const FREQUENCY_OPTIONS = [
  { id: 'always', label: 'Siempre', description: 'En cada visita' },
  { id: 'once_session', label: 'Una vez por sesión', description: 'Recomendado' },
  { id: 'once_day', label: 'Una vez al día', description: 'Menos intrusivo' },
  { id: 'once_ever', label: 'Una vez por usuario', description: 'Máxima discreción' },
];

export default function PopupSettingsTab({
  brandConfig,
  setBrandConfig,
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantId,
}: PopupSettingsTabProps) {
  const cardBg = secondary || (isDarkBg
    ? 'rgba(15, 23, 42, 0.65)'
    : 'rgba(255, 255, 255, 0.7)');
  const cardBorder = isDarkBg
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.08)';
  const itemBg = isDarkBg
    ? 'rgba(0, 0, 0, 0.25)'
    : 'rgba(255, 255, 255, 0.6)';

  // 🔥 Extraer config actual del brandConfig (con defaults)
  const popup = { ...DEFAULT_POPUP, ...(brandConfig?.specific_config?.popup || brandConfig?.specificConfig?.popup || {}) };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Helper para actualizar el popup en brandConfig
  const updatePopup = useCallback((updates: Partial<typeof DEFAULT_POPUP>) => {
    setBrandConfig((prev: any) => {
      const currentSpecific = prev.specific_config || prev.specificConfig || {};
      const currentPopup = { ...DEFAULT_POPUP, ...(currentSpecific.popup || {}) };
      const newPopup = { ...currentPopup, ...updates, updatedAt: new Date().toISOString() };

      return {
        ...prev,
        specific_config: {
          ...currentSpecific,
          popup: newPopup,
        },
      };
    });
  }, [setBrandConfig]);

  // 🔥 Upload de imagen
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!tenantId) {
      setUploadError('No hay tenant ID para subir la imagen');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Reusamos el endpoint existente con category='popup'
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 
        (typeof window !== 'undefined' 
          ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' 
          : 'http://localhost:3000');

      const res = await fetch(`${apiBase}/tenants/${tenantId}/upload/popup`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error al subir la imagen');
      }

      const data = await res.json();
      const fileUrl = data.url || data.filePath || data.path;

      if (!fileUrl) {
        throw new Error('El servidor no devolvió una URL válida');
      }

      updatePopup({ imageUrl: fileUrl });
    } catch (err: any) {
      console.error('❌ [PopupSettingsTab] Error subiendo imagen:', err);
      setUploadError(err.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [tenantId, updatePopup]);

  const handleRemoveImage = useCallback(() => {
    updatePopup({ imageUrl: '' });
  }, [updatePopup]);

  return (
    <div className="w-full">
      <div
        className="w-full border rounded-3xl shadow-xl p-6 space-y-6"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              Pop-up Promocional
            </h3>
            <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
              Muestra un aviso o publicidad al entrar a tu tienda
            </p>
          </div>
          <span
            className="text-[8px] font-mono px-2 py-1 rounded-lg opacity-40"
            style={{ color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            {popup.enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* TOGGLE ACTIVAR/DESACTIVAR */}
        <button
          type="button"
          onClick={() => updatePopup({ enabled: !popup.enabled })}
          className="w-full flex items-center justify-between p-4 rounded-2xl border transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          style={{
            backgroundColor: popup.enabled ? `${primary}15` : itemBg,
            borderColor: popup.enabled ? primary : cardBorder,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: popup.enabled ? `${primary}25` : 'rgba(100,116,139,0.15)',
                color: popup.enabled ? primary : textColor,
              }}
            >
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm block" style={{ color: textColor }}>
                {popup.enabled ? 'Pop-up activado' : 'Pop-up desactivado'}
              </span>
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                {popup.enabled ? 'Aparecerá en la tienda pública' : 'Actívalo para mostrarlo'}
              </span>
            </div>
          </div>
          <div
            className="w-12 h-6 rounded-full transition-all relative"
            style={{ backgroundColor: popup.enabled ? primary : 'rgba(100,116,139,0.3)' }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all"
              style={{ left: popup.enabled ? '26px' : '2px' }}
            />
          </div>
        </button>

        {/* CONTENIDO — SOLO SI ESTÁ ACTIVO */}
        {popup.enabled && (
          <div className="space-y-5 pt-2">

            {/* IMAGEN */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                Imagen del pop-up
              </label>

              {popup.imageUrl ? (
                <div
                  className="relative rounded-2xl border overflow-hidden group"
                  style={{ borderColor: cardBorder, backgroundColor: itemBg }}
                >
                  <img
                    src={popup.imageUrl}
                    alt="Preview pop-up"
                    className="w-full max-h-64 object-contain mx-auto"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer backdrop-blur-sm"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 transition cursor-pointer hover:opacity-80"
                  style={{ borderColor: cardBorder, backgroundColor: itemBg }}
                >
                  <Upload className="w-6 h-6 opacity-40" style={{ color: textColor }} />
                  <span className="text-xs font-semibold" style={{ color: textColor }}>
                    {isUploading ? 'Subiendo...' : 'Subir imagen'}
                  </span>
                  <span className="text-[10px] opacity-50" style={{ color: textColor }}>
                    PNG, JPG, WEBP · Máx 10 MB
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>



            {/* TRIGGER */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                ¿Cuándo aparece?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {TRIGGER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = popup.trigger === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updatePopup({ trigger: opt.id as any })}
                      className="flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        backgroundColor: isSelected ? `${primary}10` : 'transparent',
                        borderColor: isSelected ? primary : cardBorder,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? primary : 'rgba(100,116,139,0.3)' }}
                      />
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isSelected ? primary : textColor }} />
                      <div className="flex-1 text-left">
                        <span className="font-semibold text-xs block" style={{ color: textColor }}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {popup.trigger === 'afterDelay' && (
                <div className="flex items-center gap-2 pt-2">
                  <label className="text-[11px] font-medium" style={{ color: textColor }}>
                    Esperar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={popup.delaySeconds}
                    onChange={(e) => updatePopup({ delaySeconds: Math.max(1, Math.min(60, Number(e.target.value) || 3)) })}
                    className="w-20 rounded-xl px-3 py-1.5 text-xs outline-none border text-center"
                    style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                  />
                  <label className="text-[11px] font-medium" style={{ color: textColor }}>
                    segundos
                  </label>
                </div>
              )}

              {popup.trigger === 'onScroll' && (
                <div className="flex items-center gap-2 pt-2">
                  <label className="text-[11px] font-medium" style={{ color: textColor }}>
                    Al bajar
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={popup.scrollPercent}
                    onChange={(e) => updatePopup({ scrollPercent: Math.max(10, Math.min(100, Number(e.target.value) || 50)) })}
                    className="w-20 rounded-xl px-3 py-1.5 text-xs outline-none border text-center"
                    style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                  />
                  <label className="text-[11px] font-medium" style={{ color: textColor }}>
                    % de la página
                  </label>
                </div>
              )}
            </div>

            {/* FRECUENCIA */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                ¿Cada cuánto aparece?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const isSelected = popup.frequency === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updatePopup({ frequency: opt.id as any })}
                      className="p-3 rounded-xl border text-left transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        backgroundColor: isSelected ? `${primary}10` : 'transparent',
                        borderColor: isSelected ? primary : cardBorder,
                      }}
                    >
                      <span className="font-semibold text-xs block" style={{ color: textColor }}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTÓN DE CERRAR */}
            <label
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-90"
              style={{ borderColor: cardBorder, backgroundColor: itemBg }}
            >
              <input
                type="checkbox"
                checked={popup.showCloseButton}
                onChange={(e) => updatePopup({ showCloseButton: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: primary }}
              />
              <div>
                <span className="text-xs font-semibold block" style={{ color: textColor }}>
                  Mostrar botón de cerrar (X)
                </span>
                <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                  El cliente puede cerrar el pop-up manualmente
                </span>
              </div>
            </label>

            {/* ALT TEXT (ACCESIBILIDAD) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                Texto alternativo (accesibilidad)
              </label>
              <input
                type="text"
                value={popup.imageAlt || ''}
                onChange={(e) => updatePopup({ imageAlt: e.target.value })}
                placeholder="Ej: Promoción de descuentos de verano"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
              />
            </div>

            {/* 🔥 ENLACE (opcional) — hace la imagen clickable */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                Enlace (opcional)
              </label>
              <input
                type="url"
                value={popup.linkUrl || ''}
                onChange={(e) => updatePopup({ linkUrl: e.target.value })}
                placeholder="https://ejemplo.com/promo"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
              />
              <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                Si lo completás, la imagen del pop-up se vuelve clickable.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}