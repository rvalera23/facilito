'use client';

import React, { useState, useEffect } from 'react';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';

interface ActiveStoreProps {
  specificConfig: any;
  onChangeConfig: (newConfig: any) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isDarkBg?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Utilidad para convertir hora de formato 24h ("17:00") a formato 12h object ({ hour: '05', minute: '00', period: 'PM' })
const parseTime24To12 = (timeStr: string) => {
  if (!timeStr || !timeStr.includes(':')) return { hour: '08', minute: '00', period: 'AM' };
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const minute = mStr || '00';
  let period = 'AM';

  if (h >= 12) {
    period = 'PM';
    if (h > 12) h -= 12;
  }
  if (h === 0) h = 12;

  return {
    hour: h < 10 ? `0${h}` : `${h}`,
    minute: minute,
    period: period,
  };
};

// Utilidad para convertir de vuelta de 12h a formato 24h ("17:00") para el backend
const convert12To24 = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 8;

  if (period === 'PM' && h < 12) {
    h += 12;
  } else if (period === 'AM' && h === 12) {
    h = 0;
  }

  const hStr = h < 10 ? `0${h}` : `${h}`;
  return `${hStr}:${minute || '00'}`;
};

export default function ActiveStore({
  specificConfig = {},
  onChangeConfig,
  textColor,
  primary,
  inputClass,
  isDarkBg = false,
}: ActiveStoreProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const isManuallyClosed = specificConfig?.is_manually_closed === true;
  const schedule = specificConfig?.schedule || {};
  const globalSchedule = specificConfig?.globalSchedule || { open: '08:00', close: '17:00' };

  const [scheduleMode, setScheduleMode] = useState<'preset' | 'custom'>(
    specificConfig?.scheduleMode || 'preset'
  );
  const [currentPreset, setCurrentPreset] = useState<string>(
    specificConfig?.currentPreset || 'weekdays'
  );

  useEffect(() => {
    if (specificConfig?.scheduleMode) {
      setScheduleMode(specificConfig.scheduleMode);
    }
    if (specificConfig?.currentPreset) {
      setCurrentPreset(specificConfig.currentPreset);
    }
  }, [specificConfig?.scheduleMode, specificConfig?.currentPreset]);

  const updateSpecificConfig = (newValues: any) => {
    if (typeof onChangeConfig === 'function') {
      onChangeConfig({
        ...specificConfig,
        ...newValues,
      });
    }
  };

  const handleToggleManualClose = (checked: boolean) => {
    updateSpecificConfig({
      is_manually_closed: checked,
    });
  };

  const handleApplyPreset = (presetKey: string, customOpen?: string, customClose?: string) => {
    setCurrentPreset(presetKey);
    setScheduleMode('preset');

    const openTime = customOpen || globalSchedule.open || '08:00';
    const closeTime = customClose || globalSchedule.close || '17:00';

    let newSchedule: Record<string, any> = {};

    DAYS_OF_WEEK.forEach(({ key }) => {
      const isWeekend = key === 'saturday' || key === 'sunday';
      let closed = false;

      if (presetKey === 'weekdays') closed = isWeekend;
      if (presetKey === 'weekends') closed = !isWeekend;

      newSchedule[key] = {
        open: presetKey === '247' ? '00:00' : openTime,
        close: presetKey === '247' ? '23:59' : closeTime,
        closed: closed,
      };
    });

    updateSpecificConfig({
      scheduleMode: 'preset',
      currentPreset: presetKey,
      globalSchedule: { open: openTime, close: closeTime },
      schedule: newSchedule,
    });
  };

  const handleGlobalTimePartChange = (field: 'open' | 'close', part: 'hour' | 'minute' | 'period', value: string) => {
    const currentVal24 = globalSchedule[field] || (field === 'open' ? '08:00' : '17:00');
    const currentParsed = parseTime24To12(currentVal24);

    const updatedParsed = {
      ...currentParsed,
      [part]: value,
    };

    const newTime24 = convert12To24(updatedParsed.hour, updatedParsed.minute, updatedParsed.period);
    const updatedGlobal = { ...globalSchedule, [field]: newTime24 };

    handleApplyPreset(currentPreset, updatedGlobal.open, updatedGlobal.close);
  };

  const handleDayTimePartChange = (dayKey: string, field: 'open' | 'close', part: 'hour' | 'minute' | 'period', value: string) => {
    setScheduleMode('custom');
    const currentDayConfig = schedule[dayKey] || { open: '08:00', close: '17:00', closed: false };
    const currentVal24 = currentDayConfig[field] || (field === 'open' ? '08:00' : '17:00');
    const currentParsed = parseTime24To12(currentVal24);

    const updatedParsed = {
      ...currentParsed,
      [part]: value,
    };

    const newTime24 = convert12To24(updatedParsed.hour, updatedParsed.minute, updatedParsed.period);

    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...currentDayConfig,
        [field]: newTime24,
      },
    };

    updateSpecificConfig({
      scheduleMode: 'custom',
      schedule: updatedSchedule,
    });
  };

  const handleDayChange = (dayKey: string, field: string, value: any) => {
    setScheduleMode('custom');
    const currentDayConfig = schedule[dayKey] || { open: '08:00', close: '17:00', closed: false };
    
    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...currentDayConfig,
        [field]: value,
      },
    };

    updateSpecificConfig({
      scheduleMode: 'custom',
      schedule: updatedSchedule,
    });
  };

  // Renderizador reutilizable para el selector 12h (Hora, Minuto, AM/PM con estilos heredados)
  const renderTimeSelector = (
    timeVal24: string,
    onChangePart: (part: 'hour' | 'minute' | 'period', val: string) => void
  ) => {
    const parsed = parseTime24To12(timeVal24);

    return (
      <div className="flex items-center gap-1">
        {/* Selector de Hora */}
        <select
          value={parsed.hour}
          onChange={(e) => onChangePart('hour', e.target.value)}
          className={`${inputClass} px-2 py-1 text-xs cursor-pointer`}
          style={{ 
            color: textColor,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
          }}
        >
          {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((h) => (
<option key={h} value={h} style={optionStyle}>
                {h}
            </option>
          ))}
        </select>

        <span className="opacity-60 text-xs font-bold" style={{ color: textColor }}>:</span>

        {/* Selector de Minutos */}
        <select
          value={parsed.minute}
          onChange={(e) => onChangePart('minute', e.target.value)}
          className={`${inputClass} px-2 py-1 text-xs cursor-pointer`}
          style={{ 
            color: textColor,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
          }}
        >
          {['00', '15', '30', '45'].map((m) => (
<option key={m} value={m} style={optionStyle}>
                {m}
            </option>
          ))}
        </select>

        {/* Selector AM / PM */}
        <select
          value={parsed.period}
          onChange={(e) => onChangePart('period', e.target.value)}
          className={`${inputClass} px-2 py-1 text-xs font-bold cursor-pointer`}
          style={{ 
            color: textColor,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
          }}
        >
<option value="AM" style={optionStyle}>AM</option>
<option value="PM" style={optionStyle}>PM</option>
        </select>
      </div>
    );
  };

  return (
    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-6">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Estado y Horarios de Apertura
        </h4>
        <p className="text-[11px] opacity-70 mt-0.5" style={{ color: textColor }}>
          Controla si tu tienda acepta pedidos manualmente o define tus bloques de atención semanales.
        </p>
      </div>

      {/* CIERRE MANUAL DE EMERGENCIA */}
      <div className="p-4 rounded-2xl border transition flex items-center justify-between gap-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/15">
        <div>
          <div className="text-xs font-bold" style={{ color: isManuallyClosed ? '#ef4444' : textColor }}>
            {isManuallyClosed ? 'Tienda Cerrada Manualmente (Pausada)' : 'Tienda Abierta al Público'}
          </div>
          <div className="text-[11px] opacity-70 mt-0.5" style={{ color: textColor }}>
            Si activas esto, la tienda aparecerá cerrada sin importar el horario configurado.
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isManuallyClosed}
            onChange={(e) => handleToggleManualClose(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
        </label>
      </div>

      {/* CONFIGURACIÓN DE HORARIOS */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold opacity-80" style={{ color: textColor }}>
            Modo de Horarios
          </span>
          <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/15">
            <button
              type="button"
              onClick={() => handleApplyPreset('weekdays')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                currentPreset === 'weekdays' && scheduleMode === 'preset'
                  ? 'shadow-sm text-white'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: currentPreset === 'weekdays' && scheduleMode === 'preset' ? primary : 'transparent', color: currentPreset === 'weekdays' && scheduleMode === 'preset' ? '#ffffff' : textColor }}
            >
              Lunes a Viernes
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('247')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                currentPreset === '247' && scheduleMode === 'preset'
                  ? 'shadow-sm text-white'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: currentPreset === '247' && scheduleMode === 'preset' ? primary : 'transparent', color: currentPreset === '247' && scheduleMode === 'preset' ? '#ffffff' : textColor }}
            >
              24 / 7
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduleMode('custom');
                updateSpecificConfig({ scheduleMode: 'custom' });
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                scheduleMode === 'custom'
                  ? 'shadow-sm text-white'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: scheduleMode === 'custom' ? primary : 'transparent', color: scheduleMode === 'custom' ? '#ffffff' : textColor }}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* SI ES PRESET (Lunes a Viernes o 24/7) */}
        {scheduleMode === 'preset' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 text-[11px] opacity-80" style={{ color: textColor }}>
              {currentPreset === 'weekdays' ? (
                <span>Horario activo: <strong>Lunes a Viernes</strong>. Ajusta tu bloque de horas abajo (ej. 08:00 AM a 05:00 PM). Sábados y domingos cerrarán automáticamente.</span>
              ) : (
                <span>Horario activo: <strong>24 / 7</strong>. La tienda permanece abierta todos los días sin restricciones de hora.</span>
              )}
            </div>

            {/* Selector de horas generales con formato 12h (AM/PM) */}
            {currentPreset !== '247' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 opacity-75" style={{ color: textColor }}>Hora de Apertura</label>
                  {renderTimeSelector(globalSchedule.open, (part, val) => handleGlobalTimePartChange('open', part, val))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 opacity-75" style={{ color: textColor }}>Hora de Cierre</label>
                  {renderTimeSelector(globalSchedule.close, (part, val) => handleGlobalTimePartChange('close', part, val))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SI ES PERSONALIZADO, CONTROLES DETALLADOS POR DÍA CON AM/PM */
          <div className="space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15">
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 opacity-75" style={{ color: textColor }}>Hora de Apertura General</label>
                {renderTimeSelector(globalSchedule.open, (part, val) => handleGlobalTimePartChange('open', part, val))}
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 opacity-75" style={{ color: textColor }}>Hora de Cierre General</label>
                {renderTimeSelector(globalSchedule.close, (part, val) => handleGlobalTimePartChange('close', part, val))}
              </div>
            </div>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayConfig = schedule[key] || { open: '08:00', close: '17:00', closed: false };
                return (
                  <div 
                    key={key} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5"
                  >
                    <div className="w-28 font-semibold text-xs" style={{ color: textColor }}>
                      {label}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer opacity-80">
                        <input
                          type="checkbox"
                          checked={dayConfig.closed}
                          onChange={(e) => handleDayChange(key, 'closed', e.target.checked)}
                          className="rounded accent-rose-500"
                        />
                        <span style={{ color: textColor }}>Cerrado</span>
                      </label>

                      {!dayConfig.closed && (
                        <div className="flex items-center gap-2">
                          {renderTimeSelector(dayConfig.open || '08:00', (part, val) => handleDayTimePartChange(key, 'open', part, val))}
                          <span className="opacity-50 text-xs font-bold" style={{ color: textColor }}>-</span>
                          {renderTimeSelector(dayConfig.close || '17:00', (part, val) => handleDayTimePartChange(key, 'close', part, val))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}