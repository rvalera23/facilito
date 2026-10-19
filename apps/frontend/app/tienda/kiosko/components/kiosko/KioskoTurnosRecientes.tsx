'use client';

import React from 'react';
import { Clock, RefreshCw, UserRound } from 'lucide-react';
import { KioskTurno, useKioskRealtimeTurnos } from './hooks/useKioskRealtimeTurnos';

interface KioskoTurnosRecientesProps {
  tenantId: string;
  primary: string;
  isSecondaryLight: boolean;
}

const getStatus = (status: KioskTurno['timeStatus']) => ({
  now: { label: 'En curso', color: '#10b981' },
  soon: { label: 'Pronto', color: '#f59e0b' },
  waiting: { label: 'En espera', color: '#3b82f6' },
  late: { label: 'Atrasado', color: '#ef4444' },
  completed: { label: 'Completado', color: '#94a3b8' },
}[status]);

const formatTime = (minutes: number) => {
  if (minutes <= 0) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
};

export default function KioskoTurnosRecientes({ tenantId, primary, isSecondaryLight }: KioskoTurnosRecientesProps) {
  const { turnos, loading, error, activeCount, refresh } = useKioskRealtimeTurnos({
    tenantId,
    refreshInterval: 5,
    maxTurnos: 10,
  });
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
  const panelClass = isSecondaryLight ? 'bg-white/85 text-slate-900' : 'bg-black/35 text-white';
  const mutedClass = isSecondaryLight ? 'text-slate-600' : 'text-slate-300';

  return (
    <section className={`w-full rounded-2xl border p-5 sm:p-6 ${panelClass}`} style={{ borderColor }}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">Turnos recientes</h2>
          {activeCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${primary}20`, color: primary }}>
              {activeCount} activos
            </span>
          )}
        </div>
        <button type="button" onClick={refresh} className={`${mutedClass} hover:opacity-80 p-2 rounded-lg`} title="Actualizar turnos">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className={`text-center py-8 text-sm ${mutedClass}`}>
          <p>{error}</p>
          <button type="button" onClick={refresh} className="mt-2 underline" style={{ color: primary }}>Reintentar</button>
        </div>
      ) : loading && turnos.length === 0 ? (
        <div className={`text-center py-8 text-sm ${mutedClass}`}>Cargando turnos...</div>
      ) : turnos.length === 0 ? (
        <div className={`text-center py-8 text-sm ${mutedClass}`}>No hay turnos de kiosco activos</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {turnos.map((turno) => {
            const status = getStatus(turno.timeStatus);
            return (
              <article key={turno.id} className="rounded-xl border p-4" style={{ borderColor, backgroundColor: turno.timeStatus === 'now' ? 'rgba(16,185,129,0.08)' : undefined }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold break-words">{turno.customerName}</p>
                    <p className={`text-sm break-words ${mutedClass}`}>{turno.serviceName}</p>
                    <p className={`text-xs flex items-center gap-1 mt-2 ${mutedClass}`}>
                      <UserRound className="w-3 h-3" /> {turno.professionalName || 'Profesional por asignar'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md" style={{ backgroundColor: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40` }}>
                    {status.label}
                  </span>
                </div>
                <div className={`flex items-center justify-between gap-2 mt-4 text-xs ${mutedClass}`}>
                  <span>{turno.bookingDate ? new Date(`${turno.bookingDate}T00:00:00`).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : 'Fecha no disponible'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {turno.startTime} - {turno.endTime}</span>
                  {turno.remainingTime > 0 && <span style={{ color: status.color }}>{formatTime(turno.remainingTime)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
