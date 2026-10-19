  'use client';

  import React, { useState, useCallback } from 'react';
  import { AlertCircle, Plus, Trash2, GripVertical, Info, AlertTriangle, Shield, Truck, Clock, Sparkles } from 'lucide-react';

  // ============================================================
  // 🔥 REGLAS DE LA TIENDA
  // ============================================================
  // Permite al admin configurar reglas/normativas específicas del
  // negocio que se muestran:
  //   1. Como barra arriba del header (texto corto)
  //   2. Como modal con la lista completa (al hacer click en "Ver reglas")
  //
  // Se guarda en `specificConfig.storePolicies` del tenant (via brandConfig).

  interface StorePoliciesTabProps {
    brandConfig: any;
    setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    tenantId?: string;
  }

  type BarColor =
    | 'primary'
    | 'neutral'
    | 'warning'
    | 'success'
    | 'info'
    | 'danger'
    | 'dark'
    | 'light'
    | 'purple';

  type BarAlignment = 'left' | 'center' | 'right';

  const DEFAULT_POLICIES = {
    enabled: false,
    barText: '',
    barColor: 'primary' as BarColor,
    barAlignment: 'left' as BarAlignment,
    icon: 'alert' as IconType,
    showButton: true,
    barDismissible: true,
    buttonText: 'Saber más',
    title: 'Información importante',
    rules: [] as string[],
    updatedAt: '',
  };

  const BAR_COLOR_OPTIONS: { id: BarColor; label: string; description: string; preview: string }[] = [
    { id: 'primary',  label: 'Primario',    description: 'Color de tu marca', preview: 'var(--preview-primary)' },
    { id: 'neutral',  label: 'Neutro',      description: 'Gris sobrio',       preview: '#94a3b8' },
    { id: 'warning',  label: 'Advertencia', description: 'Amarillo',          preview: '#f59e0b' },
    { id: 'success',  label: 'Éxito',       description: 'Verde',             preview: '#22c55e' },
    { id: 'info',     label: 'Informativo', description: 'Azul',              preview: '#3b82f6' },
    { id: 'danger',   label: 'Urgente',     description: 'Rojo',              preview: '#ef4444' },
    { id: 'dark',     label: 'Oscuro',      description: 'Elegante',          preview: '#0f172a' },
    { id: 'light',    label: 'Claro',       description: 'Minimalista',       preview: '#f1f5f9' },
    { id: 'purple',   label: 'Violeta',     description: 'Moderno',           preview: '#8b5cf6' },
  ];

  const BAR_ALIGNMENT_OPTIONS: { id: BarAlignment; label: string; description: string }[] = [
    { id: 'left',   label: 'Izquierda', description: 'Texto a la izquierda' },
    { id: 'center', label: 'Centro',    description: 'Texto centrado' },
    { id: 'right',  label: 'Derecha',   description: 'Texto a la derecha' },
  ];

  type IconType = 'alert' | 'info' | 'warning' | 'shield' | 'truck' | 'clock' | 'sparkles' | 'none';

  const ICON_OPTIONS: { id: IconType; label: string; Icon: any }[] = [
    { id: 'alert',    label: 'Alerta',      Icon: AlertTriangle },
    { id: 'info',     label: 'Info',        Icon: Info },
    { id: 'warning',  label: 'Advertencia', Icon: AlertCircle },
    { id: 'shield',   label: 'Seguridad',   Icon: Shield },
    { id: 'truck',    label: 'Envío',       Icon: Truck },
    { id: 'clock',    label: 'Horario',     Icon: Clock },
    { id: 'sparkles', label: 'Novedad',     Icon: Sparkles },
    { id: 'none',     label: 'Sin icono',   Icon: null },
  ];

  export default function StorePoliciesTab({
    brandConfig,
    setBrandConfig,
    primary,
    secondary,
    textColor,
    isDarkBg,
  }: StorePoliciesTabProps) {
    const cardBg = secondary || (isDarkBg
      ? 'rgba(15, 23, 42, 0.65)'
      : 'rgba(255, 255, 255, 0.7)');
    const cardBorder = isDarkBg
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.08)';
    const itemBg = isDarkBg
      ? 'rgba(0, 0, 0, 0.25)'
      : 'rgba(255, 255, 255, 0.6)';

    // 🔥 Extraer config actual (con defaults)
    const storePolicies = {
      ...DEFAULT_POLICIES,
      ...(brandConfig?.specific_config?.storePolicies || brandConfig?.specificConfig?.storePolicies || {}),
    };

    const [newRule, setNewRule] = useState('');

    // 🔥 Helper para actualizar las políticas
    const updatePolicies = useCallback((updates: Partial<typeof DEFAULT_POLICIES>) => {
      setBrandConfig((prev: any) => {
        const currentSpecific = prev.specific_config || prev.specificConfig || {};
        const currentPolicies = { ...DEFAULT_POLICIES, ...(currentSpecific.storePolicies || {}) };
        const newPolicies = { ...currentPolicies, ...updates, updatedAt: new Date().toISOString() };

        return {
          ...prev,
          specific_config: {
            ...currentSpecific,
            storePolicies: newPolicies,
          },
        };
      });
    }, [setBrandConfig]);

    // 🔥 Agregar regla
    const handleAddRule = useCallback(() => {
      const trimmed = newRule.trim();
      if (!trimmed) return;
      updatePolicies({ rules: [...storePolicies.rules, trimmed] });
      setNewRule('');
    }, [newRule, storePolicies.rules, updatePolicies]);

    // 🔥 Eliminar regla por índice
    const handleRemoveRule = useCallback((index: number) => {
      const newRules = storePolicies.rules.filter((_, i) => i !== index);
      updatePolicies({ rules: newRules });
    }, [storePolicies.rules, updatePolicies]);

    // 🔥 Editar regla existente
    const handleEditRule = useCallback((index: number, value: string) => {
      const newRules = [...storePolicies.rules];
      newRules[index] = value;
      updatePolicies({ rules: newRules });
    }, [storePolicies.rules, updatePolicies]);

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
                Información para el Cliente
              </h3>
              <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                Avisos, normas o información importante que verá el cliente
              </p>
            </div>
            <span
              className="text-[8px] font-mono px-2 py-1 rounded-lg opacity-40"
              style={{ color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              {storePolicies.enabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* TOGGLE ACTIVAR */}
          <button
            type="button"
            onClick={() => updatePolicies({ enabled: !storePolicies.enabled })}
            className="w-full flex items-center justify-between p-4 rounded-2xl border transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: storePolicies.enabled ? `${primary}15` : itemBg,
              borderColor: storePolicies.enabled ? primary : cardBorder,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: storePolicies.enabled ? `${primary}25` : 'rgba(100,116,139,0.15)',
                  color: storePolicies.enabled ? primary : textColor,
                }}
              >
                <Info className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-sm block" style={{ color: textColor }}>
                  {storePolicies.enabled ? 'Barra activada' : 'Barra desactivada'}
                </span>
                <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                  {storePolicies.enabled ? 'Se mostrará en tu tienda' : 'Actívala para mostrarla'}
                </span>
              </div>
            </div>
            <div
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ backgroundColor: storePolicies.enabled ? primary : 'rgba(100,116,139,0.3)' }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all"
                style={{ left: storePolicies.enabled ? '26px' : '2px' }}
              />
            </div>
          </button>

          {/* CONTENIDO — SOLO SI ESTÁ ACTIVO */}
          {storePolicies.enabled && (
            <div className="space-y-5 pt-2">

              {/* TEXTO DE LA BARRA */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Texto de la barra (arriba del header)
                </label>
                <input
                  type="text"
                  value={storePolicies.barText}
                  onChange={(e) => updatePolicies({ barText: e.target.value })}
                  placeholder="Ej: Envíos solo dentro de Caracas"
                  maxLength={100}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                  style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                />
                <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                  Texto corto que aparece en la barra. Máximo 100 caracteres.
                  {storePolicies.barText.length > 0 && (
                    <span className="ml-1 font-mono">
                      {storePolicies.barText.length}/100
                    </span>
                  )}
                </p>
              </div>

              {/* TEXTO DEL BOTÓN — solo si showButton */}
              {storePolicies.showButton && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Texto del botón
                </label>
                <input
                  type="text"
                  value={storePolicies.buttonText}
                  onChange={(e) => updatePolicies({ buttonText: e.target.value })}
                  placeholder="Ej: Saber más"
                  maxLength={30}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                  style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                />
                <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                  Aparece al lado del texto de la barra. Ej: "Ver reglas", "Saber más", "Clic aquí".
                </p>
              </div>
              )}

              {/* COLOR DE LA BARRA */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Color de la barra
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BAR_COLOR_OPTIONS.map((opt) => {
                    const isSelected = storePolicies.barColor === opt.id;
                    const swatchColor = opt.id === 'primary' ? primary : opt.preview;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updatePolicies({ barColor: opt.id })}
                        className="p-2.5 rounded-xl border text-left transition cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5"
                        style={{
                          backgroundColor: isSelected ? `${primary}10` : 'transparent',
                          borderColor: isSelected ? primary : cardBorder,
                        }}
                      >
                        <span
                          className="shrink-0 w-7 h-7 rounded-full border"
                          style={{
                            backgroundColor: swatchColor,
                            borderColor: isSelected ? primary : 'rgba(0,0,0,0.1)',
                            boxShadow: isSelected ? `0 0 0 2px ${primary}40` : 'none',
                          }}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[11px] block truncate" style={{ color: textColor }}>
                            {opt.label}
                          </span>
                          <span className="text-[9px] opacity-60 block truncate" style={{ color: textColor }}>
                            {opt.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

                            {/* ICONO DE LA BARRA */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Icono de la barra
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const isSelected = storePolicies.icon === opt.id;
                    const IconComp = opt.Icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updatePolicies({ icon: opt.id })}
                        className="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: isSelected ? `${primary}10` : 'transparent',
                          borderColor: isSelected ? primary : cardBorder,
                        }}
                        title={opt.label}
                      >
                        {IconComp ? (
                          <IconComp className="w-4 h-4" style={{ color: isSelected ? primary : textColor }} />
                        ) : (
                          <span className="text-[10px] font-mono opacity-40" style={{ color: textColor }}>—</span>
                        )}
                        <span className="text-[9px] font-semibold truncate w-full text-center" style={{ color: isSelected ? primary : textColor }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ALINEACIÓN DE LA BARRA */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Alineación del texto
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BAR_ALIGNMENT_OPTIONS.map((opt) => {
                    const isSelected = storePolicies.barAlignment === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updatePolicies({ barAlignment: opt.id })}
                        className="p-3 rounded-xl border text-center transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          backgroundColor: isSelected ? `${primary}10` : 'transparent',
                          borderColor: isSelected ? primary : cardBorder,
                        }}
                      >
                        <span className="font-semibold text-xs block" style={{ color: textColor }}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] opacity-60 block mt-0.5" style={{ color: textColor }}>
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MOSTRAR BOTÓN */}
              <label
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-90"
                style={{ borderColor: cardBorder, backgroundColor: itemBg }}
              >
                <input
                  type="checkbox"
                  checked={storePolicies.showButton}
                  onChange={(e) => updatePolicies({ showButton: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: primary }}
                />
                <div>
                  <span className="text-xs font-semibold block" style={{ color: textColor }}>
                    Mostrar botón "{storePolicies.buttonText || 'Saber más'}"
                  </span>
                  <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                    Desactívalo si no querés que abra el modal de información
                  </span>
                </div>
              </label>

              {/* CERRABLE */}
              <label
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-90"
                style={{ borderColor: cardBorder, backgroundColor: itemBg }}
              >
                <input
                  type="checkbox"
                  checked={storePolicies.barDismissible}
                  onChange={(e) => updatePolicies({ barDismissible: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: primary }}
                />
                <div>
                  <span className="text-xs font-semibold block" style={{ color: textColor }}>
                    El cliente puede cerrar la barra
                  </span>
                  <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                    Si lo desactivas, la barra siempre estará visible
                  </span>
                </div>
              </label>
              {/* TÍTULO DEL MODAL */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Título de la información
                </label>
                <input
                  type="text"
                  value={storePolicies.title}
                  onChange={(e) => updatePolicies({ title: e.target.value })}
                  placeholder="Ej: Información importante"
                  maxLength={60}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                  style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                />
                <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                  Aparece como título del modal. Ej: "Antes de comprar", "Cómo trabajamos", "Reglas de la tienda".
                </p>
              </div>

              {/* LISTA DE CONTENIDO */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold opacity-85" style={{ color: textColor }}>
                  Puntos de información ({storePolicies.rules.length})
                </label>

                {storePolicies.rules.length === 0 ? (
                  <div
                    className="p-6 rounded-xl border border-dashed text-center"
                    style={{ borderColor: cardBorder, backgroundColor: itemBg }}
                  >
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-40" style={{ color: textColor }} />
                    <span className="text-[11px] opacity-60" style={{ color: textColor }}>
                      No hay puntos todavía. Agregá el primero abajo.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {storePolicies.rules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-xl border"
                        style={{ borderColor: cardBorder, backgroundColor: itemBg }}
                      >
                        <GripVertical className="w-4 h-4 shrink-0 opacity-30" style={{ color: textColor }} />
                        <span className="text-[10px] font-mono w-5 text-center opacity-50" style={{ color: textColor }}>
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={rule}
                          onChange={(e) => handleEditRule(index, e.target.value)}
                          maxLength={150}
                          className="flex-1 bg-transparent text-xs outline-none border-none"
                          style={{ color: textColor }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition shrink-0 cursor-pointer"
                          title="Eliminar regla"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* AGREGAR NUEVA REGLA */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    placeholder="Nuevo punto de información..."
                                      maxLength={150}
                    className="flex-1 rounded-xl px-3.5 py-2.5 text-xs outline-none border"
                    style={{ backgroundColor: itemBg, borderColor: cardBorder, color: textColor }}
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={!newRule.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: newRule.trim() ? primary : 'rgba(100,116,139,0.3)',
                      color: newRule.trim() ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                </div>
                <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                  Tip: presioná Enter para agregar rápido.
                </p>
              </div>

              {/* PREVIEW */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: cardBorder }}>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Previsualización
                </span>
                {(() => {
                  const previewColor = (() => {
                    switch (storePolicies.barColor) {
                      case 'primary': return { bg: primary, fg: '#ffffff', border: 'transparent' };
                      case 'warning': return { bg: '#f59e0b', fg: '#1e293b', border: 'transparent' };
                      case 'success': return { bg: '#22c55e', fg: '#ffffff', border: 'transparent' };
                      case 'info':    return { bg: '#3b82f6', fg: '#ffffff', border: 'transparent' };
                      case 'danger':  return { bg: '#ef4444', fg: '#ffffff', border: 'transparent' };
                      case 'dark':    return { bg: '#0f172a', fg: '#ffffff', border: 'transparent' };
                      case 'light':   return { bg: '#f1f5f9', fg: '#0f172a', border: 'rgba(0,0,0,0.1)' };
                      case 'purple':  return { bg: '#8b5cf6', fg: '#ffffff', border: 'transparent' };
                      default:        return { bg: isDarkBg ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)', fg: textColor, border: cardBorder };
                    }
                  })();

                  const align = storePolicies.barAlignment || 'left';

                  const showButton = storePolicies.showButton !== false;

                  return (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: previewColor.bg,
                        color: previewColor.fg,
                        border: `1px solid ${previewColor.border}`,
                      }}
                    >
                      {align === 'center' ? (
                        /* CENTRO: contenido centrado en una sola fila */
                        <div className="px-4 py-2.5 flex items-center justify-center gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {storePolicies.icon !== 'none' && (() => {
                              const IconComp = ICON_OPTIONS.find(o => o.id === storePolicies.icon)?.Icon;
                              return IconComp ? <IconComp className="w-3.5 h-3.5 shrink-0" /> : null;
                            })()}
                                                        <span className="text-[11px] font-semibold truncate">
                              {storePolicies.barText || 'Texto de la barra'}
                            </span>
                          </div>
                          {(showButton || storePolicies.barDismissible) && (
                            <div className="flex items-center gap-2 shrink-0">
                              {showButton && (
                                <span className="text-[10px] font-bold underline cursor-pointer opacity-90">
                                  {storePolicies.buttonText || 'Saber más'}
                                </span>
                              )}
                              {storePolicies.barDismissible && (
                                <span className="opacity-70">✕</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* IZQUIERDA / DERECHA: justify-between + reverse si aplica */
                        <div
                          className={`px-4 py-2.5 flex items-center gap-3 justify-between ${
                            align === 'right' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {storePolicies.icon !== 'none' && (() => {
                              const IconComp = ICON_OPTIONS.find(o => o.id === storePolicies.icon)?.Icon;
                              return IconComp ? <IconComp className="w-3.5 h-3.5 shrink-0" /> : null;
                            })()}
                            <span className="text-[11px] font-semibold truncate">
                              {storePolicies.barText || 'Texto de la barra'}
                            </span>
                          </div>
                          {(showButton || storePolicies.barDismissible) && (
                            <div className="flex items-center gap-2 shrink-0">
                              {showButton && (
                                <span className="text-[10px] font-bold underline cursor-pointer opacity-90">
                                  {storePolicies.buttonText || 'Saber más'}
                                </span>
                              )}
                              {storePolicies.barDismissible && (
                                <span className="opacity-70">✕</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <p className="text-[10px] opacity-50" style={{ color: textColor }}>
                  Así se verá la barra arriba de tu tienda.
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  }