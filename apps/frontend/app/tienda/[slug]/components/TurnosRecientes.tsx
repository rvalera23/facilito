'use client';

import React from 'react';
import { Clock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRealtimeTurnos } from '../hooks/useRealtimeTurnos';

interface TurnosRecientesProps {
  tenantId: string;
  primary: string;
  textMainClass: string;
  textMutedClass: string;
  isSecondaryLight: boolean;
  cardBgClass: string;
  onTurnoClick?: (turno: any) => void;
  professionals?: any[];
}

// 🔥 Formatea un número de minutos a texto legible.
//   - Positivo: "45 min" o "2h 15min"
//   - Cero: "Ahora"
//   - Negativo: se maneja en el render (con contexto de "hace" / "atrasado")
const formatMinutes = (minutes: number): string => {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 1) return 'menos de 1 min';
  if (abs < 60) return `${abs} min`;
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

// 🔥 Devuelve el texto completo según el timeStatus y el remainingTime.
//   - waiting   → "Faltan 45 min"
//   - soon      → "Faltan 10 min"
//   - now       → "Quedan 25 min"
//   - in_progress → "En curso · +5min"
//   - late      → "Atrasado 45 min"
//   - expired   → "Vencido hace 3h"
//   - otros     → sin texto
const getTimeDisplay = (timeStatus: string, remainingTime: number): string => {
  const absText = formatMinutes(remainingTime);

  switch (timeStatus) {
    case 'waiting':
    case 'soon':
      return `Faltan ${absText}`;
    case 'now':
      return `Quedan ${absText}`;
    case 'in_progress':
      return `En curso · +${absText}`;
    case 'late':
      return `Atrasado ${absText}`;
    case 'expired':
      return `Vencido hace ${absText}`;
    default:
      return '';
  }
};
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'waiting':     return '#3b82f6'; // azul
    case 'soon':        return '#f59e0b'; // ámbar
    case 'now':         return '#10b981'; // verde
    case 'in_progress': return '#059669'; // verde oscuro
    case 'late':        return '#ef4444'; // rojo
    case 'expired':     return '#ea580c'; // naranja oscuro (marca)
    case 'completed':   return '#64748b'; // gris
    case 'cancelled':   return '#94a3b8'; // gris claro
    case 'no_show':     return '#7f1d1d'; // rojo oscuro
    default:            return '#94a3b8';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'waiting':     return 'En espera';
    case 'soon':        return 'Pronto';
    case 'now':         return 'En curso';
    case 'in_progress': return 'En curso';
    case 'late':        return 'Atrasado';
    case 'expired':     return 'Vencido';
    case 'completed':   return 'Completado';
    case 'cancelled':   return 'Cancelado';
    case 'no_show':     return 'No asistió';
    default:            return 'En espera';
  }
};

// 🔥 FUNCIÓN PARA CONVERTIR HORA 24H A 12H (AM/PM)
const formatTimeToAMPM = (time: string): string => {
  if (!time) return '--:--';
  
  // Si ya está en formato AM/PM, devolverlo tal cual
  if (time.includes('AM') || time.includes('PM')) return time;
  
  try {
    // Limpiar: eliminar segundos si existen (HH:MM:SS → HH:MM)
    let cleanTime = time;
    if (cleanTime.split(':').length > 2) {
      const parts = cleanTime.split(':');
      cleanTime = `${parts[0]}:${parts[1]}`;
    }
    
    const [hours, minutes] = cleanTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
};

export default function TurnosRecientes({
  tenantId,
  primary,
  textMainClass,
  textMutedClass,
  isSecondaryLight,
  cardBgClass,
  onTurnoClick,
  professionals = [],
}: TurnosRecientesProps) {
  const { turnos, loading, error, activeCount, refresh } = useRealtimeTurnos({
    tenantId,
    refreshInterval: 15,
    maxTurnos: 10,
  });

  const borderDynamic = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  if (!tenantId) {
    return (
      <div className={`sticky top-6 rounded-2xl border p-4 space-y-3 ${cardBgClass}`} style={{ borderColor: borderDynamic }}>
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-black uppercase tracking-wider ${textMainClass}`}>
            Turnos Recientes
          </h4>
        </div>
        <div className={`text-center py-6 text-xs ${textMutedClass}`}>
          No hay tienda configurada
        </div>
      </div>
    );
  }

  if (loading && turnos.length === 0) {
    return (
      <div className={`sticky top-6 rounded-2xl border p-4 space-y-3 ${cardBgClass}`} style={{ borderColor: borderDynamic }}>
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-black uppercase tracking-wider ${textMainClass}`}>
            Turnos Recientes
          </h4>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: primary }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`sticky top-6 rounded-2xl border p-4 space-y-3 ${cardBgClass}`} style={{ borderColor: borderDynamic }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className={`text-xs font-black uppercase tracking-wider ${textMainClass}`}>
            Turnos Recientes
          </h4>
          {activeCount > 0 && (
            <span 
              className="text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              {activeCount} activos
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className={`text-[9px] ${textMutedClass} hover:opacity-80 transition cursor-pointer`}
        >
          ↻ Actualizar
        </button>
      </div>

      {error ? (
        <div className={`text-center py-6 text-xs ${textMutedClass}`}>
          {error}
          <button
            onClick={refresh}
            className="block mx-auto mt-2 text-[10px] underline"
            style={{ color: primary }}
          >
            Reintentar
          </button>
        </div>
      ) : turnos.length === 0 ? (
        <div className={`text-center py-8 text-xs ${textMutedClass}`}>
          No hay turnos activos
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {turnos.map((turno) => {
            const statusColor = getStatusColor(turno.timeStatus || 'waiting');
            const statusLabel = getStatusLabel(turno.timeStatus || 'waiting');
            const isNow = turno.timeStatus === 'now';
            const isSoon = turno.timeStatus === 'soon';

            // ✅ BUSCAR PROFESIONAL POR ID
            const professionalId = turno.professionalId || turno.professional?.id;
            const professional = professionals.find(p => p.id === professionalId);
            const professionalName = professional?.name || turno.professionalName || null;

            return (
              <div
                key={turno.id}
                onClick={() => onTurnoClick?.(turno)}
                className={`p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
                  isNow ? 'ring-1 ring-green-500/50' : ''
                }`}
                style={{ 
                  borderColor: borderDynamic,
                  backgroundColor: isNow 
                    ? 'rgba(16,185,129,0.08)' 
                    : isSecondaryLight 
                      ? 'bg-white/50' 
                      : 'bg-black/30'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold truncate ${textMainClass}`}>
                        {turno.customerName}
                      </p>
                      {turno.turnNumber && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-black/10" style={{ color: primary }}>
                          #{turno.turnNumber}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate ${textMutedClass}`}>
                      {turno.serviceName}
                    </p>
                    {professionalName && (
                      <p className={`text-[9px] flex items-center gap-1 ${textMutedClass}`}>
                        <User className="w-2.5 h-2.5" />
                        <span className="font-medium opacity-60">Profesional:</span>
                        <span>{professionalName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span
                      className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                        isNow ? 'animate-pulse' : ''
                      }`}
                      style={{ 
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                        border: `1px solid ${statusColor}30`
                      }}
                    >
{isNow && (
  <span 
    className="inline-block w-1.5 h-1.5 rounded-full animate-pulse mr-0.5" 
    style={{ backgroundColor: statusColor }}
  />
)}
{statusLabel}
                    </span>
                    {(() => {
                      const timeText = getTimeDisplay(turno.timeStatus, turno.remainingTime);
                      if (!timeText) return null;
                      return (
                        <span
                          className={`text-[9px] font-mono ${
                            turno.timeStatus === 'now' ? 'animate-pulse' : ''
                          }`}
                          style={{ color: statusColor }}
                        >
                          {timeText}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className={`text-[9px] flex items-center gap-2 mt-1 ${textMutedClass}`}>
<span>{turno.bookingDate ? (() => {
  try {
    const parts = turno.bookingDate.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  } catch {
    return turno.bookingDate;
  }
})() : 'Fecha no disponible'}</span>                  <span>•</span>
                  <span>{formatTimeToAMPM(turno.startTime)} - {formatTimeToAMPM(turno.endTime)}</span>
                  {turno.durationMinutes && (
                    <span>• {turno.durationMinutes} min</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {turnos.length > 0 && (
        <button
          type="button"
          className={`w-full py-2 rounded-xl text-[10px] font-bold transition cursor-pointer hover:opacity-80 ${
            isSecondaryLight
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          Ver todos los turnos →
        </button>
      )}
    </div>
  );
}