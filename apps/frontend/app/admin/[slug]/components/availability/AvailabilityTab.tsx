'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Edit2, Plus, Trash2, AlertCircle, CalendarDays, Clock, Ban, Star } from 'lucide-react';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { LoaderFullPage } from '@/components/ui/Loader';

interface AvailabilityTabProps {
  tenant: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onSave?: (data: any) => Promise<void>;
  existingServices?: any[];
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hourStr = String(h).padStart(2, '0');
      const minStr = String(m).padStart(2, '0');
      options.push(`${hourStr}:${minStr}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const formatTimeDisplay = (time: string) => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'p.m.' : 'a.m.';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const getDayLabel = (dayKey: string) => {
  const day = DAYS.find(d => d.key === dayKey);
  return day ? day.label : dayKey;
};

// 🔥 Helper para formatear fecha legible
const formatDateReadable = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// 🔥 Helper para obtener el resumen de disponibilidad
const getAvailabilitySummary = (availability: any) => {
  if (!availability || typeof availability !== 'object') {
    return { weekDays: 0, exceptions: 0, closedDays: 0 };
  }

  // 🔥 SOLO contar días válidos (nombres de días de la semana)
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekDays = Object.keys(availability).filter(
    key => validDays.includes(key) && availability[key]?.length > 0
  );

  const exceptions = availability.exceptions ? Object.keys(availability.exceptions).length : 0;
  const closedDays = availability.closed ? availability.closed.length : 0;

  return { weekDays: weekDays.length, exceptions, closedDays };
};

export default function AvailabilityTab({
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onSave,
  existingServices = [],
}: AvailabilityTabProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { registerComponent, unregisterComponent } = useAppRefreshContext();

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  // 🔥 Cargar servicios desde existingServices
  const loadServices = () => {
    if (existingServices.length > 0) {
      setServices(existingServices);
    }
    setLoading(false);
  };

  // 🔥 Cargar datos iniciales
  useEffect(() => {
    loadServices();
  }, [existingServices]);

  // 🔥 REGISTRAR COMPONENTE PARA REFRESCO GLOBAL
  useEffect(() => {
    const componentId = 'availability-tab-admin';
    
    const refreshServices = async () => {
      console.log('🔄 [AvailabilityTab] Refrescando servicios...');
      loadServices();
      if (onSave) {
        await onSave({ refreshed: true });
      }
    };

    registerComponent(componentId, refreshServices);
    
    return () => {
      unregisterComponent(componentId);
    };
  }, [existingServices]);

  // 🔥 Escuchar eventos globales
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔔 [AvailabilityTab] Evento globalRefresh recibido');
      loadServices();
    };

    const handleNotificationUpdate = () => {
      console.log('🔔 [AvailabilityTab] Evento notificationUpdate recibido');
      loadServices();
    };

    window.addEventListener('globalRefresh', handleRefresh);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    return () => {
      window.removeEventListener('globalRefresh', handleRefresh);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
    };
  }, [existingServices]);

  if (loading) {
    return (
      <div
        className="p-6 rounded-3xl border shadow-xl"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor
        }}
      >
        <LoaderFullPage
          message="Cargando servicios..."
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div 
        className="p-6 rounded-3xl border shadow-xl flex flex-col items-center justify-center h-64 text-center"
        style={{ 
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor
        }}
      >
        <Calendar className="w-12 h-12 opacity-20" />
        <p className="text-sm opacity-60 mt-4">No hay servicios creados.</p>
        <p className="text-xs opacity-40 mt-1">Crea un servicio desde el Catalogo para configurar su disponibilidad.</p>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: textColor,
      }}
    >
      {/* HEADER */}
      <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: cardBorder }}>
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Disponibilidad por Servicio
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            Horarios de atención configurados para cada servicio, incluyendo fechas especiales y días cerrados.
          </p>
        </div>
        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl" style={{ borderColor: cardBorder }}>
          <span className="text-[10px] opacity-70" style={{ color: textColor }}>
            Servicios: {services.length}
          </span>
        </div>
      </div>

      {/* LISTA DE SERVICIOS */}
      <div className="space-y-4">
        {services.map((service) => {
          const availability = service.attributes?.availability || service.availability || {};
          const duration = service.attributes?.durationMinutes || service.durationMinutes || 60;
          const serviceName = service.name || service.title || 'Servicio sin nombre';
          
          // 🔥 Obtener resumen de disponibilidad
          const summary = getAvailabilitySummary(availability);
          
          // 🔥 Obtener días de la semana configurados - SOLO nombres válidos
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const weekDays = Object.keys(availability).filter(
            key => validDays.includes(key) && availability[key]?.length > 0
          );

          // 🔥 Obtener excepciones (fechas específicas)
          const exceptions = availability.exceptions || {};
          const exceptionDates = Object.keys(exceptions);

          // 🔥 Obtener días cerrados
          const closedDates = availability.closed || [];

          return (
            <div
              key={service.id}
              className="border rounded-2xl p-4 transition-all hover:shadow-md"
              style={{ 
                borderColor: cardBorder,
              }}
            >
              {/* HEADER DEL SERVICIO */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-sm" style={{ color: textColor }}>
                    {serviceName}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Duración: {duration} min
                    </span>
                    <span className="text-[10px] opacity-60 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Días configurados: {summary.weekDays}
                    </span>
                    {summary.exceptions > 0 && (
                      <span className="text-[10px] opacity-60 flex items-center gap-1" style={{ color: primary }}>
                        <Star className="w-3 h-3" />
                        Fechas especiales: {summary.exceptions}
                      </span>
                    )}
                    {summary.closedDays > 0 && (
                      <span className="text-[10px] opacity-60 flex items-center gap-1 text-red-400">
                        <Ban className="w-3 h-3" />
                        Días cerrados: {summary.closedDays}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {summary.weekDays > 0 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Activo
                    </span>
                  )}
                </div>
              </div>

              {/* ============================================================
                  DISPONIBILIDAD SEMANAL - Días de la semana
                  ============================================================ */}
              {weekDays.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 opacity-50" style={{ color: textColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                      Horario Semanal
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => {
                      const slots = availability[day] || [];
                      // 🔥 ASEGURAR QUE slots SEA SIEMPRE UN ARRAY
                      const slotsArray = Array.isArray(slots) ? slots : [];
                      const dayLabel = getDayLabel(day);
                      return (
                        <div
                          key={day}
                          className="px-3 py-1.5 rounded-xl border text-[10px] flex items-center gap-1.5"
                          style={{ 
                            borderColor: cardBorder,
                            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                          }}
                        >
                          <span className="font-bold" style={{ color: primary }}>
                            {dayLabel}:
                          </span>
                          {slotsArray.length > 0 ? (
                            slotsArray.map((slot: any, idx: number) => (
                              <span key={idx} className="font-medium">
                                {formatTimeDisplay(slot.start)} - {formatTimeDisplay(slot.end)}
                                {idx < slotsArray.length - 1 && <span className="opacity-40 mx-0.5">|</span>}
                              </span>
                            ))
                          ) : (
                            <span className="opacity-40">Sin horario</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs opacity-40 italic flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Sin horarios semanales configurados
                </p>
              )}

              {/* ============================================================
                  EXCEPCIONES - Fechas específicas con horario diferente
                  ============================================================ */}
              {exceptionDates.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: cardBorder }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5" style={{ color: primary }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                      Fechas Especiales (Excepciones)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {exceptionDates.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exceptionDates.map(date => {
                      const slots = exceptions[date] || [];
                      // 🔥 ASEGURAR QUE slots SEA SIEMPRE UN ARRAY
                      const slotsArray = Array.isArray(slots) ? slots : [];
                      return (
                        <div
                          key={date}
                          className="px-3 py-1.5 rounded-xl border text-[10px]"
                          style={{ 
                            borderColor: `${primary}40`,
                            backgroundColor: `${primary}15`
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold" style={{ color: primary }}>
                              {formatDateReadable(date)}:
                            </span>
                            {slotsArray.length > 0 ? (
                              slotsArray.map((slot: any, idx: number) => (
                                <span key={idx} className="font-medium">
                                  {formatTimeDisplay(slot.start)} - {formatTimeDisplay(slot.end)}
                                  {idx < slotsArray.length - 1 && <span className="opacity-40 mx-0.5">|</span>}
                                </span>
                              ))
                            ) : (
                              <span className="opacity-40">Sin horario</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================================
                  DÍAS CERRADOS
                  ============================================================ */}
              {closedDates.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: cardBorder }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                      Días Cerrados
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                      {closedDates.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {closedDates.map(date => (
                      <div
                        key={date}
                        className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-[10px]"
                      >
                        <span className="font-medium text-red-400">
                          {formatDateReadable(date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================
                  SIN CONFIGURACIÓN
                  ============================================================ */}
              {weekDays.length === 0 && exceptionDates.length === 0 && closedDates.length === 0 && (
                <div className="mt-2 p-3 rounded-xl border border-dashed text-center" style={{ borderColor: cardBorder }}>
                  <p className="text-xs opacity-40 italic">Este servicio no tiene configuración de disponibilidad.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: cardBorder }}>
        <span className="text-[9px] opacity-40" style={{ color: textColor }}>
          La disponibilidad se configura desde la edición de cada servicio en el Catálogo.
        </span>
        <span className="text-[9px] opacity-40" style={{ color: textColor }}>
          {services.filter(s => {
            const availability = s.attributes?.availability || s.availability || {};
            return Object.keys(availability).length > 0;
          }).length} servicios con disponibilidad
        </span>
      </div>
    </div>
  );
}