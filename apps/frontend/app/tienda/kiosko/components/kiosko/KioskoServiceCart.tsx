'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Clock, User, Phone, MapPin, FileText, X, CreditCard, 
  CheckCircle2, ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react';
import { useKioskContext } from './KioskStoreLayout';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// ❌ ELIMINADO: import KioskoServiceConfirmModal
// ❌ ELIMINADO: import KioskoServiceSuccessModal
// ✅ El flujo de pago lo maneja KioskoServicePay en KioskoPage

interface KioskoServiceCartProps {
  selectedService: any;
  onClearService: () => void;
  onProceedToPay: () => void;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress?: string;
  setCustomerAddress?: (address: string) => void;
  customerReference?: string;
  setCustomerReference?: (ref: string) => void;
  totalVes: number;
  totalUsd: number;
  tenantId?: string;
  tenantConfig?: any;
  professionals?: any[];
  selectedProfessionalId?: string;
  setSelectedProfessionalId?: (professionalId: string) => void;
  // 🔥 NUEVO: control externo del modal (opcional, retrocompatible).
  // Si no se pasa, el componente usa su propio estado interno.
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatTimeAMPM = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

// 🔥 Helper: devuelve YYYY-MM-DD usando HORA LOCAL, no UTC.
// El bug original era `new Date().toISOString().split('T')[0]` que da
// la fecha en UTC. En Venezuela (UTC-4), después de las 20:00 locales,
// `toISOString()` ya devuelve el día siguiente, y todo el filtro de
// "hoy" se rompe.
const getLocalDateStr = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 🔥 KIOSCO: solo se puede reservar para HOY.
// El tótem es de autoservicio y la cita se atiende en el momento.
const isDateValid = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  return selectedDate.getTime() === today.getTime();
};

const normalizeAvailability = (availability: any): any => {
  if (!availability || typeof availability !== 'object') return {};
  const normalized: any = {};
  const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of validDays) {
    if (availability[day]) {
      const slot = availability[day];
      if (Array.isArray(slot)) {
        normalized[day] = slot;
      } else if (slot && typeof slot === 'object' && slot.open !== undefined && slot.close !== undefined) {
        if (slot.closed !== true) {
          normalized[day] = [{ start: slot.open, end: slot.close }];
        } else {
          normalized[day] = [];
        }
      } else {
        normalized[day] = [];
      }
    }
  }
  if (availability.exceptions) {
    normalized.exceptions = {};
    for (const [date, value] of Object.entries(availability.exceptions)) {
      const slot = value as any;
      if (Array.isArray(slot)) {
        normalized.exceptions[date] = slot;
      } else if (slot && typeof slot === 'object' && slot.open !== undefined && slot.close !== undefined) {
        if (slot.closed !== true) {
          normalized.exceptions[date] = [{ start: slot.open, end: slot.close }];
        } else {
          normalized.exceptions[date] = [];
        }
      } else {
        normalized.exceptions[date] = [];
      }
    }
  }
  if (availability.closed) {
    normalized.closed = Array.isArray(availability.closed) ? availability.closed : [];
  }
  return normalized;
};

const getAvailableDays = (availability: any, month: Date): Date[] => {
  const days: Date[] = [];
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const year = month.getFullYear();
  const monthNum = month.getMonth();
  const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
  const normalized = normalizeAvailability(availability);
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, monthNum, i);
    const dateStr = getLocalDateStr(date);
    if (!isDateValid(date)) continue;
    if (normalized.closed && normalized.closed.includes(dateStr)) continue;
    if (normalized.exceptions && normalized.exceptions[dateStr]) {
      const exceptionSchedule = normalized.exceptions[dateStr];
      if (Array.isArray(exceptionSchedule) && exceptionSchedule.length > 0) {
        days.push(date);
        continue;
      }
    }
    const dayName = dayNames[date.getDay()];
    const daySchedule = normalized[dayName] || [];
    if (Array.isArray(daySchedule) && daySchedule.length > 0) {
      days.push(date);
    }
  }
  return days;
};

const getAvailableSlots = (availability: any, date: Date, durationMinutes: number): string[] => {
  const slots: string[] = [];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const dateStr = getLocalDateStr(date);
  const normalized = normalizeAvailability(availability);
  if (normalized.closed && normalized.closed.includes(dateStr)) return [];
  let daySchedule: any[] = [];
  if (normalized.exceptions && normalized.exceptions[dateStr]) {
    daySchedule = normalized.exceptions[dateStr];
  } else {
    daySchedule = normalized[dayName] || [];
  }
  if (!Array.isArray(daySchedule) || daySchedule.length === 0) {
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  }
  const duration = durationMinutes || 60;
  for (const slot of daySchedule) {
    if (!slot.start || !slot.end) continue;
    let current = slot.start;
    while (current < slot.end) {
      slots.push(current);
      const [hours, minutes] = current.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      current = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    }
  }
  const todayStr = getLocalDateStr();
  const now = new Date();
  return slots.filter((slot: string) => {
    if (dateStr === todayStr) {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      return slotTime > now;
    }
    return true;
  });
};

export default function KioskoServiceCart({
  selectedService,
  onClearService,
  onProceedToPay,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress = '',
  setCustomerAddress = () => {},
  customerReference = '',
  setCustomerReference = () => {},
  totalVes,
  totalUsd,
  tenantId,
  tenantConfig,
  professionals = [],
  selectedProfessionalId = '',
  setSelectedProfessionalId = () => {},
  isOpen: isOpenProp,
  setIsOpen: setIsOpenProp,
}: KioskoServiceCartProps) {
  const { primary, secondary, isSecondaryLight, tenant } = useKioskContext();

  const safePrimary = primary || '#F59E0B';
  
  const textColor = isSecondaryLight ? 'text-slate-900' : 'text-white';
  const mutedText = isSecondaryLight ? 'text-slate-600' : 'text-slate-300';
  const borderColor = isSecondaryLight ? 'border-slate-200/60' : 'border-white/10';
  const bgCard = isSecondaryLight 
    ? 'bg-white/90 border-slate-200/70 shadow-xl backdrop-blur-md' 
    : 'bg-black/40 border-white/10 shadow-2xl backdrop-blur-md';
  const bgInner = isSecondaryLight 
    ? 'bg-white/50 border-slate-200/60' 
    : 'bg-black/30 border-white/10';
  const bgModal = isSecondaryLight 
    ? 'bg-white/95 backdrop-blur-md' 
    : 'bg-black/90 backdrop-blur-md';

  // 🔥 El modal puede ser controlado externamente (por page.tsx) o internamente.
  // Si se pasan isOpenProp/setIsOpenProp, se usan. Si no, se usa el estado interno.
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const setIsOpen = setIsOpenProp || setIsOpenInternal;

  const [isCleaning, setIsCleaning] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasService = !!selectedService;

  const getServicePrices = useCallback((service: any) => {
    if (!service) return { VES: 0, USD: 0 };
    let pricesObj = service?.prices;
    if (typeof pricesObj === 'string') {
      try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
    }
    const vesVal = Number(pricesObj?.VES ?? pricesObj?.ves ?? service?.price ?? service?.precio ?? service?.price_ves ?? 0);
    let usdVal = Number(pricesObj?.USD ?? pricesObj?.usd ?? service?.priceUsd ?? service?.price_usd ?? service?.usd ?? service?.attributes?.prices?.USD ?? 0);
    if (usdVal === 0 && vesVal > 0) {
      const rateUSD = 784.66;
      usdVal = vesVal / rateUSD;
    }
    return { VES: !isNaN(vesVal) ? vesVal : 0, USD: !isNaN(usdVal) ? usdVal : 0 };
  }, []);

  const localPrices = useMemo(() => {
    if (!selectedService) return { ves: 0, usd: 0 };
    const prices = getServicePrices(selectedService);
    return { ves: prices.VES, usd: prices.USD };
  }, [selectedService, getServicePrices]);

  const displayVes = useMemo(() => totalVes > 0 ? totalVes : localPrices.ves, [totalVes, localPrices.ves]);
  const displayUsd = useMemo(() => totalUsd > 0 ? totalUsd : localPrices.usd, [totalUsd, localPrices.usd]);

  const rawAvailability = useMemo(() => {
    if (selectedService?.availability) return selectedService.availability;
    if (selectedService?.attributes?.availability) return selectedService.attributes.availability;
    if (tenantConfig?.schedule) return tenantConfig.schedule;
    if (tenant?.specificConfig?.schedule) return tenant.specificConfig.schedule;
    return {};
  }, [selectedService, tenantConfig, tenant]);

  const availability = useMemo(() => normalizeAvailability(rawAvailability), [rawAvailability]);
  const durationMinutes = useMemo(() => selectedService?.durationMinutes || selectedService?.duration || 60, [selectedService]);
  const availableDays = useMemo(() => getAvailableDays(availability, currentMonth), [availability, currentMonth]);

  useEffect(() => {
    let cancelled = false;

    if (appointmentDate && selectedService) {
      const dateParts = appointmentDate.split('-').map(Number);
      const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const localSlots = getAvailableSlots(availability, dateObj, durationMinutes);
      setSelectedDateObj(dateObj);
      setAvailableSlots(localSlots);
      setLoadingSlots(true);

      const tenantIdValue = tenant?.id || tenant?._id;
      const serviceIdValue = selectedService.id || selectedService._id;
      if (!tenantIdValue || !serviceIdValue) {
        setLoadingSlots(false);
        return () => { cancelled = true; };
      }

      fetch(`${API_BASE}/bookings/availability?tenantId=${encodeURIComponent(tenantIdValue)}&serviceId=${encodeURIComponent(serviceIdValue)}&date=${encodeURIComponent(appointmentDate)}`, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('No se pudo consultar disponibilidad');
          return response.json();
        })
        .then((data) => {
          if (cancelled) return;
          const serverSlots = Array.isArray(data?.slots)
            ? data.slots.map((slot: any) => typeof slot === 'string' ? slot : slot.start).filter(Boolean)
            : [];
          setAvailableSlots(serverSlots);
        })
        .catch(() => {
          // Conserva los slots locales si el servidor no responde.
        })
        .finally(() => {
          if (!cancelled) setLoadingSlots(false);
        });
    } else {
      setAvailableSlots([]);
      setSelectedDateObj(null);
      setLoadingSlots(false);
    }

    return () => { cancelled = true; };
  }, [appointmentDate, selectedService, availability, durationMinutes, tenant]);

  const handleDateSelect = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    setAppointmentDate(dateStr);
    setAppointmentTime('');
    setErrorMessage(null);
    const slots = getAvailableSlots(availability, date, durationMinutes);
    setAvailableSlots(slots);
    setSelectedDateObj(date);
  };

  // 🔥 KIOSCO: auto-seleccionar HOY al abrir el modal por primera vez.
  // No hay calendario para elegir, así que forzamos la fecha.
  React.useEffect(() => {
    if (!isOpen) return;
    if (!hasService) return;
    if (appointmentDate) return; // ya hay una fecha elegida, respetarla

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = getLocalDateStr(today);
    setAppointmentDate(dateStr);
    setSelectedDateObj(today);
  }, [isOpen, hasService, appointmentDate, setAppointmentDate]);

  const handleTimeSelect = (time: string) => {
    if (!appointmentDate) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(appointmentDate);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate.getTime() === today.getTime()) {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      if (slotTime <= new Date()) {
        setErrorMessage('❌ La hora seleccionada ya pasó. Elige una hora futura.');
        return;
      }
    }
    setAppointmentTime(time);
    setErrorMessage(null);
  };

  const goToPrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const handleClear = () => {
    setIsCleaning(true);
    setTimeout(() => {
      onClearService();
      setAppointmentDate('');
      setAppointmentTime('');
      setAvailableSlots([]);
      setSelectedDateObj(null);
      setIsCleaning(false);
    }, 300);
  };

  const isFormValid = useMemo(() => {
    return hasService && appointmentDate && appointmentTime && customerName && customerPhone;
  }, [hasService, appointmentDate, appointmentTime, customerName, customerPhone]);

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <>
      {/* ============================================================
          🔥 MODAL - Con disponibilidad
          ============================================================ */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div 
              className={`w-screen max-w-md border-l shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${bgModal} ${borderColor} ${textColor}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: safePrimary }} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black tracking-tight ${textColor}`}>
                      Detalles de tu Cita
                    </h2>
                    <p className={`text-xs font-medium ${mutedText}`}>
                      Selecciona fecha, hora y datos del cliente
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 ${borderColor} ${textColor}`}
                  style={{ backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Servicio Seleccionado */}
                <div className="space-y-2.5">
                  {!hasService ? (
                    <div className={`rounded-2xl p-6 text-center text-xs italic backdrop-blur-md border ${bgInner} ${mutedText}`}>
                      Aún no has seleccionado ningún servicio. Explora el catálogo y elige uno.
                    </div>
                  ) : (
                    <div className={`flex justify-between items-center p-3.5 rounded-2xl text-xs border backdrop-blur-md transition-all ${bgInner}`}>
                      <div className="space-y-0.5 pr-2">
                        <span className={`font-bold block line-clamp-1 ${textColor}`}>{selectedService.name}</span>
                        <span className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {durationMinutes} min duración
                        </span>
                      </div>
                      <button
                        onClick={handleClear}
                        className="p-1.5 rounded-xl hover:bg-rose-500/10 transition shrink-0 text-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 🔥 KIOSCO: la cita es para HOY. No hay calendario. */}
                {hasService && (
                  <div className={`space-y-3 pt-3 border-t ${borderColor}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                      Fecha de tu cita
                    </h4>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-2xl border ${bgInner}`}
                      style={{ borderColor: `${safePrimary}40` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${safePrimary}20` }}
                      >
                        <Calendar className="w-6 h-6" style={{ color: safePrimary }} />
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${mutedText}`}>
                          Hoy
                        </span>
                        <span className={`text-base font-black block ${textColor}`}>
                          {new Date().toLocaleDateString('es-VE', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 HORARIOS DISPONIBLES */}
                {hasService && appointmentDate && (
                  <div className={`space-y-2 pt-2 ${borderColor}`}>
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                        Horarios disponibles
                      </h4>
                      {appointmentDate && (
                        <span className={`text-[9px] ${mutedText}`}>
                          {new Date(appointmentDate).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: safePrimary }} />
                        <span className={`text-xs ml-2 ${mutedText}`}>Cargando horarios...</span>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                        {availableSlots.map((slot) => {
                          const isSelected = appointmentTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => handleTimeSelect(slot)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${(
                                isSelected
                                  ? 'text-white shadow-md border-transparent scale-105'
                                  : `hover:scale-105 ${isSecondaryLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`
                              )}`}
                              style={{
                                backgroundColor: isSelected ? safePrimary : 'transparent',
                                borderColor: isSelected ? 'transparent' : (isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
                                color: isSelected ? '#ffffff' : textColor
                              }}
                            >

                            {hasService && professionals.length > 0 && (
                              <div className={`space-y-2 pt-3 border-t ${borderColor}`}>
                                <label htmlFor="kiosk-professional" className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                                  Profesional (opcional)
                                </label>
                                <SearchableDropdown
                                  value={selectedProfessionalId}
                                  onChange={setSelectedProfessionalId}
                                  options={[
                                    { value: '', label: 'Cualquier profesional disponible' },
                                    ...professionals.map((professional: any) => {
                                      const professionalId = professional.id || professional._id;
                                      return {
                                        value: professionalId,
                                        label: professional.name || professional.fullName || professional.nombre || 'Profesional',
                                      };
                                    }),
                                  ]}
                                  placeholder="Cualquier profesional disponible"
                                  searchPlaceholder="Buscar profesional..."
                                  emptyMessage="No hay profesionales"
                                  primary={safePrimary}
                                  textColor={isSecondaryLight ? '#0f172a' : '#ffffff'}
                                  isDarkBg={!isSecondaryLight}
                                  borderColor={isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}
                                  searchable={true}
                                  footerLabel={(n) => `${n} profesionales`}
                                />
                              </div>
                            )}
                              {formatTimeAMPM(slot)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl border text-center ${bgInner}`}>
                        <p className={`text-xs ${mutedText}`}>No hay horarios disponibles para esta fecha.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* 🔥 TOTAL CON displayVes */}
                {hasService && (
                  <div className={`flex justify-between items-center pt-3.5 border-t ${borderColor} text-sm font-black ${textColor}`}>
                    <span>Total Inversión:</span>
                    <span className="text-lg" style={{ color: safePrimary }}>
                      Bs. {formatPrice(displayVes)}
                    </span>
                  </div>
                )}

                {/* Datos del Cliente */}
                <div className={`space-y-3.5 pt-3.5 border-t ${borderColor}`}>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>Datos del Cliente</h4>

                  <div>
                    <label className={`block text-[11px] font-bold ${mutedText} mb-1.5`}>Nombre y Apellido *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Ej. Carlos Mendoza"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-3 text-sm outline-none rounded-2xl border transition-all ${bgInner} ${textColor} placeholder:${mutedText} focus:ring-2 focus:ring-opacity-20`}
                        style={{
                          ['--tw-ring-color' as any]: `${safePrimary}33`,
                          borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold ${mutedText} mb-1.5`}>Teléfono / WhatsApp *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Ej. 04121234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-3 text-sm outline-none rounded-2xl border transition-all ${bgInner} ${textColor} placeholder:${mutedText} focus:ring-2 focus:ring-opacity-20`}
                        style={{
                          ['--tw-ring-color' as any]: `${safePrimary}33`,
                          borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>



                  <div>
                    <label className={`block text-[11px] font-bold ${mutedText} mb-1.5`}>Notas (Opcional)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Requerimientos específicos..."
                        value={customerReference}
                        onChange={(e) => setCustomerReference(e.target.value)}
                        className={`w-full pl-9 pr-3.5 py-3 text-sm outline-none rounded-2xl border transition-all ${bgInner} ${textColor} placeholder:${mutedText} focus:ring-2 focus:ring-opacity-20`}
                             style={{
                          ['--tw-ring-color' as any]: `${safePrimary}33`,
                          borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Botón Confirmar - SIN MODAL INTERNO */}
              <div className={`p-6 border-t ${borderColor}`}>
                <button
                  style={{ backgroundColor: safePrimary }}
                  className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl transition shadow-xl uppercase text-sm tracking-wider cursor-pointer hover:opacity-90 active:scale-[0.98] ${
                    isSecondaryLight ? 'text-slate-950 font-black' : 'text-white'
                  } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (isFormValid) {
                      console.log('🔘 [KioskoServiceCart] Formulario válido, abriendo KioskoServicePay');
                      setIsOpen(false);
                      onProceedToPay(); // ✅ SOLO ESTO - SIN MODAL INTERNO
                    }
                  }}
                  disabled={!isFormValid}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Cita y Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          🔥 FOOTER - Barra fija estilo kiosko (SOLO MOBILE/TABLET)
          ============================================================ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-8 py-4 pointer-events-none select-none">
        <div
          className={`w-full rounded-[2.5rem] px-6 sm:px-10 py-4 border shadow-2xl flex items-center justify-between pointer-events-auto transition-all backdrop-blur-md hover:shadow-3xl ${
            isCleaning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          } ${bgCard} ${textColor}`}
          style={{
            transition: 'all 0.5s ease',
            backgroundColor: secondary 
              ? (isSecondaryLight ? `${secondary}CC` : `${secondary}88`) 
              : (isSecondaryLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)')
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-4 text-left group cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-black shadow-inner border shrink-0 group-hover:scale-105 transition"
              style={{
                backgroundColor: `${safePrimary}25`,
                color: safePrimary,
                borderColor: `${safePrimary}30`
              }}
            >
              <Calendar className="w-7 h-7" style={{ color: safePrimary }} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${textColor}`}>
                  {hasService ? selectedService.name : 'Seleccionar Servicio'}
                </span>
              </div>
              {hasService ? (
                <p className={`text-xs opacity-70 font-medium mt-0.5 ${mutedText}`}>
                  {durationMinutes} min • {selectedService.serviceModality || 'Presencial'}
                  {appointmentDate && appointmentTime && (
                    <> • {new Date(appointmentDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })} {formatTimeAMPM(appointmentTime)}</>
                  )}
                </p>
              ) : (
                <p className={`text-xs opacity-70 font-medium mt-0.5 ${mutedText}`}>
                  Toca aquí para revisar tu cita
                </p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-4">
            {hasService && (
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black block leading-tight" style={{ color: safePrimary }}>
                  Bs. {formatPrice(displayVes)}
                </span>
                <span className={`text-xs opacity-70 font-medium block ${mutedText}`}>
                  (${displayUsd.toFixed(2)})
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!hasService) {
                  setIsOpen(true);
                  return;
                }
                if (isFormValid) {
                  console.log('✅ [KioskoServiceCart] Formulario válido, procediendo a pago desde footer');
                  onProceedToPay(); // ✅ SOLO ESTO
                } else {
                  setIsOpen(true);
                }
              }}
              disabled={!hasService}
              className={`px-8 py-4 rounded-2xl text-base font-black uppercase tracking-wider transition flex items-center gap-2 shadow-xl ${(
                !hasService
                  ? 'opacity-50 cursor-not-allowed border'
                  : 'hover:opacity-90 active:scale-95 cursor-pointer'
              )}`}
              style={{
                backgroundColor: !hasService ? 'rgba(100,116,139,0.3)' : safePrimary,
                color: !hasService ? '#94a3b8' : (isSecondaryLight ? '#0f172a' : '#ffffff'),
                borderColor: !hasService ? 'rgba(255,255,255,0.08)' : 'transparent'
              }}
            >
              <span>{hasService ? 'Pagar Cita' : 'Elegir Servicio'}</span>
              <CreditCard className="w-5 h-5" style={{ 
                color: !hasService ? '#94a3b8' : (isSecondaryLight ? '#0f172a' : '#ffffff') 
              }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}