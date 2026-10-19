'use client';

  import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
  import Image from 'next/image';
  import { createPortal } from 'react-dom';
  import { 
    Calendar, Clock, User, Phone, MapPin, FileText, X, Award, 
    Wrench, CheckCircle2, Users, Sparkles, 
    Star, ChevronLeft, ChevronRight, BadgeCheck, Loader2, Heart
  } from 'lucide-react';

  // ✅ IMPORTAR UTILIDAD CENTRAL DE IMÁGENES
  import { getImageUrl, getAllImages } from '@/lib/imageUtils';
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  import ItemReviewsSection from './ItemReviewsSection';

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const getServiceField = (service: any, field: string, fallback: any = undefined) => {
    const rootValue = service?.[field];
    if (rootValue !== undefined && rootValue !== null && rootValue !== '') return rootValue;
    const attributeValue = service?.attributes?.[field];
    return attributeValue !== undefined && attributeValue !== null && attributeValue !== ''
      ? attributeValue
      : fallback;
  };

  const parseServiceValue = <T,>(value: unknown, fallback: T): T => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  const validNumber = (value: unknown): number | null => {
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  interface ServiceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: any;
    tenant: any;
    isDarkBg?: boolean;
    isSecondaryLight: boolean;
    textMainClass: string;
    textMutedClass: string;
    cardBgClass: string;
    cardInnerBgClass: string;
    primary: string;
    secondary: string;
    isAuthenticated?: boolean;
    userId?: string;
    onReserve: (data: any) => void;
    professionals?: any[];
    isFavorite?: boolean;
    onToggleFavorite?: (serviceId: string, itemType: 'service') => void;
    /** 🔥 Bloqueo para repartidores */
    isUserDriver?: boolean;
    /** 🔥 Bloqueo para profesionales */
    isUserProfessional?: boolean;
  }

  // 🔥 HELPER: Formatear hora a AM/PM
  const formatTimeAMPM = (time: string): string => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // 🔥 HELPER: Verificar si una fecha es válida (no pasada)
  const isDateValid = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  // 🔥 HELPER: Verificar si una hora es válida (para hoy)
  const isTimeValid = (date: Date, time: string): boolean => {
    if (!date || !time) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      return selectedTime > now;
    }
    
    return true;
  };

  // 🔥 HELPER: Normalizar disponibilidad (convertir { open, close } → [{ start, end }])
  const normalizeAvailability = (availability: any): any => {
    if (!availability || typeof availability !== 'object') {
      return {};
    }

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

  // 🔥 HELPER: Obtener el horario para una fecha específica (prioriza excepciones)
  const getScheduleForDate = (availability: any, date: Date): any[] => {
    if (!availability) return [];

    const dateStr = date.toISOString().split('T')[0];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];

    if (availability.closed && availability.closed.includes(dateStr)) {
      return [];
    }

    if (availability.exceptions && availability.exceptions[dateStr]) {
      const exceptionSchedule = availability.exceptions[dateStr];
      if (Array.isArray(exceptionSchedule) && exceptionSchedule.length > 0) {
        return exceptionSchedule;
      }
    }

    return availability[dayName] || [];
  };

  // 🔥 HELPER: Obtener días disponibles en el mes actual (soporta mensual)
  const getAvailableDays = (availability: any, month: Date) => {
    const days: Date[] = [];
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const year = month.getFullYear();
    const monthNum = month.getMonth();
    const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
    
    const normalized = normalizeAvailability(availability);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthNum, i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!isDateValid(date)) continue;
      
      if (normalized.closed && normalized.closed.includes(dateStr)) {
        continue;
      }
      
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

  // 🔥 Helper para formatear precio
  const formatPrice = (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value) || value === 0) return '0,00';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 Helper para formatear duración
  const formatDuration = (minutes: number | string) => {
    const mins = Number(minutes) || 0;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // 🔥 Helper para renderizar estrellas
  const renderStars = (rating: number, primary: string) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('½');
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push('☆');
    }

    return stars.map((s, i) => (
      <span key={i} className={s === '☆' ? 'opacity-25' : ''} style={{ color: s === '☆' ? 'currentColor' : primary }}>
        {s}
      </span>
    ));
  };

  // 🔥 FUNCIÓN DE FILTRO REUTILIZABLE PARA HORAS PASADAS
  const filterPastTimes = (slots: string[], dateObj: Date): string[] => {
    if (!slots || !Array.isArray(slots) || slots.length === 0) return [];
    
    const now = new Date();
    const todayStr = new Date().toISOString().split('T')[0];
    const dateStr = dateObj.toISOString().split('T')[0];
    
    // Si NO es hoy, mostrar todas las horas
    if (dateStr !== todayStr) {
      return slots;
    }
    
    // Si es hoy, filtrar horas que ya pasaron (con margen de 2 minutos)
    return slots.filter((slot: string) => {
      if (!slot) return false;
      const [hours, minutes] = slot.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return false;
      
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      // Margen de 2 minutos para evitar problemas de redondeo
      return slotTime.getTime() > now.getTime() + 120000;
    });
  };

  // ============================================================
  // 🔥 COMPONENTE PRINCIPAL
  // ============================================================

  export default function ServiceDetailModal({
    isOpen,
    onClose,
    service,
    tenant,
    isSecondaryLight,
    textMainClass,
    textMutedClass,
    cardBgClass,
    cardInnerBgClass,
    primary,
    secondary,
    isAuthenticated = false,
    userId,
    onReserve,
    professionals = [],
    isFavorite = false,
    onToggleFavorite,
    isUserDriver = false,
    isUserProfessional = false,
  }: ServiceDetailModalProps) {
    // 🔥 1. TODOS LOS useState - SIEMPRE PRIMERO
    const [mounted, setMounted] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [isZoomedModalOpen, setIsZoomedModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loadedProfessionals, setLoadedProfessionals] = useState<any[]>([]);
    const { rates } = useExchangeRateContext();

    // 🔥 2. TODOS LOS useMemo - ANTES del return null
    const serviceProfessionalIds = useMemo(() => {
      const candidates = [
        service?.professionalIds,
        service?.professionals,
        service?.attributes?.professionalIds,
        service?.attributes?.professionals,
      ];
      const value = candidates.find(candidate => parseServiceValue<any[]>(candidate, []).length > 0);
      return parseServiceValue<any[]>(value, []);
    }, [service]);

    const assignedProfessionals = useMemo(() => {
      if (!serviceProfessionalIds.length) return [];
      const directProfessionals = serviceProfessionalIds.filter(id => typeof id === 'object' && id !== null);
      if (directProfessionals.length === serviceProfessionalIds.length) return directProfessionals;
      const availableProfessionals = professionals.length > 0 ? professionals : loadedProfessionals;
      return availableProfessionals.filter(p => serviceProfessionalIds.some(id => (typeof id === 'object' ? id.id : id) === p.id));
    }, [loadedProfessionals, professionals, serviceProfessionalIds]);

    const rawAvailability = useMemo(() => {
      const serviceAvailability = getServiceField(service, 'availability');
      if (serviceAvailability) return parseServiceValue(serviceAvailability, {});
      if (tenant?.specificConfig?.schedule) return tenant.specificConfig.schedule;
      if (tenant?.availability) return tenant.availability;
      return {};
    }, [tenant, service]);

    const availability = useMemo(() => {
      const normalized = normalizeAvailability(rawAvailability);
      return normalized;
    }, [rawAvailability]);

    const durationMinutes = useMemo(() => 
      getServiceField(service, 'durationMinutes', 60), 
      [service]
    );

    const maxCapacity = useMemo(() => 
      getServiceField(service, 'maxCapacity', 0), 
      [service]
    );

    const availableDays = useMemo(() => {
      const days = getAvailableDays(availability, currentMonth);
      return days;
    }, [availability, currentMonth]);
    // ✅ USAR getAllImages DIRECTAMENTE (igual que ItemPreviewModal)
    const allImages = useMemo(() => {
      if (!service) return [];
      const images = getAllImages(service);
      return Array.from(new Set(images)).slice(0, 10);
    }, [service]);

    // 🔥 3. TODOS LOS useCallback - ANTES del return null
    const getLocalAvailableSlots = useCallback((date: Date): string[] => {
      const slots: string[] = [];
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];
      
      if (availability.closed && availability.closed.includes(dateStr)) {
        return [];
      }
      
      let daySchedule: any[] = [];
      
      if (availability.exceptions && availability.exceptions[dateStr]) {
        daySchedule = availability.exceptions[dateStr];
      } else {
        daySchedule = availability[dayName] || [];
      }
      
      if (!Array.isArray(daySchedule) || daySchedule.length === 0) {
        for (let hour = 9; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(timeStr);
          }
        }
        return filterPastTimes(slots, date);
      }
      
      const duration = service?.durationMinutes || service?.attributes?.durationMinutes || 60;
      
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
      
      return filterPastTimes(slots, date);
    }, [availability, service]);

    const fetchAvailabilityFromBackend = useCallback(async (date: Date) => {
      // Caso 1: Sin tenant o sin service → usar disponibilidad local
      if (!tenant?.id || !service?.id) {
        const localSlots = getLocalAvailableSlots(date);
        setAvailableSlots(localSlots);
        return localSlots;
      }

      setLoadingSlots(true);
      setErrorMessage(null);
      
      try {
        const token = localStorage.getItem('token');
        const dateStr = date.toISOString().split('T')[0];
        
        const response = await fetch(
          `${API_BASE}/bookings/availability?tenantId=${tenant.id}&serviceId=${service.id}&date=${dateStr}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
          }
        );

        let slots: string[] = [];
        
        if (response.ok) {
          const data = await response.json();
          if (data.slots && Array.isArray(data.slots)) {
            slots = data.slots.map((s: any) => {
              if (typeof s === 'object' && s !== null && s.start) {
                return s.start;
              }
              if (typeof s === 'string') {
                return s;
              }
              return null;
            }).filter(Boolean);
          } else if (data.availableSlots && Array.isArray(data.availableSlots)) {
            slots = data.availableSlots;
          } else if (data.data && Array.isArray(data.data)) {
            slots = data.data;
          }
        }
        
        if (!slots || slots.length === 0) {
          slots = getLocalAvailableSlots(date);
        }
        
        const filteredSlots = filterPastTimes(slots, date);
        
        setAvailableSlots(filteredSlots);
        return filteredSlots;
        
      } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        const localSlots = getLocalAvailableSlots(date);
        setAvailableSlots(localSlots);
        return localSlots;
      } finally {
        setLoadingSlots(false);
      }
    }, [tenant?.id, service?.id, getLocalAvailableSlots]);

    // 🔥 4. TODOS LOS useEffect - ANTES del return null
    useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    useEffect(() => {
      setSelectedImageIndex(0);
    }, [service]);

    useEffect(() => {
      if (isOpen && availableDays.length > 0 && !selectedDate) {
        const firstDay = availableDays[0];
        setSelectedDate(firstDay);
        setSelectedTime('');
        setErrorMessage(null);
        fetchAvailabilityFromBackend(firstDay);
      }
    }, [isOpen, availableDays, selectedDate, fetchAvailabilityFromBackend]);

    useEffect(() => {
      setSelectedDate(null);
      setSelectedTime('');
      setCurrentMonth(new Date());
      setAvailableSlots([]);
      setErrorMessage(null);
    }, [service]);

    useEffect(() => {
      if (professionals.length > 0 || !tenant?.id) {
        setLoadedProfessionals([]);
        return;
      }

      const loadProfessionals = async () => {
        try {
          const response = await fetch(`${API_BASE}/professionals/tenant/${tenant.id}`);
          if (response.ok) {
            const data = await response.json();
            setLoadedProfessionals(Array.isArray(data) ? data : []);
          }
        } catch {
          setLoadedProfessionals([]);
        }
      };

      loadProfessionals();
    }, [professionals, tenant?.id]);

    useEffect(() => {
      const handleRefresh = () => {
        console.log('🔄 [ServiceDetailModal] Evento de refresco recibido');
        if (selectedDate) {
          fetchAvailabilityFromBackend(selectedDate);
        }
      };

      window.addEventListener('globalRefresh', handleRefresh);
      window.addEventListener('notificationUpdate', handleRefresh);

      return () => {
        window.removeEventListener('globalRefresh', handleRefresh);
        window.removeEventListener('notificationUpdate', handleRefresh);
      };
    }, [selectedDate, fetchAvailabilityFromBackend]);

    // 🔥 5. CONDICIÓN DE RENDERIZADO - DESPUÉS DE TODOS LOS HOOKS
    if (!isOpen || !mounted || !service) return null;

    const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
    const isDarkBg = !isSecondaryLight;
    
    const containerStyle = { 
      backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'), 
      borderColor: borderDynamic, 
    };
    
    const dynamicSubCardStyle = {
      backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
      borderColor: borderDynamic,
    };

    const currentImg = allImages[selectedImageIndex] || allImages[0] || null;

    // ============================================================
    // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
    // Los servicios siempre son `ivaType: 'exempt'` (sin IVA)
    // ============================================================
    let priceVes = 0;
    let priceUsd: number | null = null;
    let priceEur: number | null = null;
    let priceCrypto: number | null = null;

    // 🔥 Variables de descuento
    let discountInfo: {
      discountPercentage: number;
      originalPriceVES: number;
      originalPriceUSD: number;
      discountAmountVES: number;
      discountAmountUSD: number;
    } | null = null;

    if (service?._pricing && typeof service._pricing === 'object') {
      const p = service._pricing;
      priceVes = Number(p.totalPriceVES || 0);
      priceUsd = Number(p.totalPriceUSD || 0) || null;
      
      // 🔥 Extraer descuento del _pricing
      if (p.hasDiscount === true && Number(p.discountPercentage) > 0) {
        discountInfo = {
          discountPercentage: Number(p.discountPercentage || 0),
          originalPriceVES: Number(p.originalPriceVES || p.totalPriceVES || 0),
          originalPriceUSD: Number(p.originalPriceUSD || p.totalPriceUSD || 0),
          discountAmountVES: Number(p.discountAmountVES || 0),
          discountAmountUSD: Number(p.discountAmountUSD || 0),
        };
      }
    } else {
      // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
      const prices = {
        ...parseServiceValue<Record<string, unknown>>(service?.attributes?.prices, {}),
        ...parseServiceValue<Record<string, unknown>>(service?.prices, {}),
      };
      priceVes = validNumber(prices.VES) ?? validNumber(service?.price) ?? 0;
      priceUsd = validNumber(prices.USD);
      priceEur = validNumber(prices.EUR);
      priceCrypto = validNumber(prices.CRYPTO) ?? validNumber(prices.USDT);
    }

    // Convertir a EUR y CRYPTO si tenemos tasas
    const rateUSD = validNumber(rates.USD);
    const rateEUR = validNumber(rates.EUR);
    const displayedUsd = priceUsd ?? (priceVes > 0 && rateUSD ? priceVes / rateUSD : null);
    const displayedEur = priceEur ?? (displayedUsd && rateUSD && rateEUR ? displayedUsd * rateUSD / rateEUR : null);
    const rating = service?.rating || 0;
    const reviews = service?.reviewsCount || 0;
    
    const name = service?.name || 'Servicio sin nombre';
    const category = getServiceField(service, 'category', 'General');
    const description = getServiceField(service, 'description', '');
    const features = parseServiceValue<string[]>(getServiceField(service, 'features', []), []);
    const productCode = getServiceField(service, 'itemId', getServiceField(service, 'sku', getServiceField(service, 'code', getServiceField(service, 'codigo', getServiceField(service, 'inventoryId', '')))));
    
    const modality = getServiceField(service, 'serviceModality', 'Presencial');
    const duration = getServiceField(service, 'durationMinutes', 60);
    
    const includes = getServiceField(service, 'includes', '');
    const notIncludes = getServiceField(service, 'notIncludes', '');
    const certifications = parseServiceValue<string[]>(getServiceField(service, 'certifications', []), []);
    const materials = parseServiceValue<string[]>(getServiceField(service, 'materials', []), []);
    const clientRequirements = parseServiceValue<string[]>(getServiceField(service, 'clientRequirements', []), []);
    const cancellationPolicy = getServiceField(service, 'cancellationPolicy', '');
    const capacity = getServiceField(service, 'maxCapacity', getServiceField(service, 'stock', 0));
    
    const status = getServiceField(service, 'status', service?.isActive ? 'published' : 'draft');
    const isPublished = status === 'published';

    const formatDateForButton = (date: Date): string => {
      return date.toLocaleDateString('es-VE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
    };

    const isDateAvailable = (date: Date): boolean => {
      if (!isDateValid(date)) return false;
      return availableDays.some(d => 
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
      );
    };

    const handleDateSelect = (date: Date) => {
      if (!isDateValid(date)) {
        setErrorMessage('❌ No puedes seleccionar una fecha pasada. Elige una fecha futura.');
        return;
      }
      
      setSelectedDate(date);
      setSelectedTime('');
      setErrorMessage(null);
      fetchAvailabilityFromBackend(date);
    };

    const handleTimeSelect = (time: string) => {
      if (!selectedDate) return;
      setSelectedTime(time);
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

    const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

    const handleReserve = () => {
      // 🔥 BLOQUEO: Si no está logueado, no permitir reservar
      if (!isAuthenticated) {
        setErrorMessage('⚠️ Debes iniciar sesión para reservar este servicio.');
        return;
      }

      if (!selectedDate || !selectedTime) {
        setErrorMessage('⚠️ Por favor, selecciona una fecha y hora disponible para tu cita.');
        return;
      }
      
      setErrorMessage(null);
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      onReserve({
        ...service,
        appointmentDate: dateStr,
        appointmentTime: selectedTime
      });
    };

    const getDayBadge = (date: Date): React.ReactNode | null => {
      const dateStr = date.toISOString().split('T')[0];
      
      if (availability.closed && availability.closed.includes(dateStr)) {
        return (
          <span className="absolute -top-0.5 -right-0.5">
            <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </span>
        );
      }
      
      if (availability.exceptions && availability.exceptions[dateStr]) {
        return (
          <span className="absolute -top-0.5 -right-0.5">
            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
        );
      }
      
      return null;
    };

    const modalContent = (
      <>
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 animate-in fade-in overflow-y-auto">
                  <div 
            className={`w-full max-w-4xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden ${textMainClass}`}
                        style={containerStyle}
          >
            {/* HEADER */}
            <div 
              className="px-6 sm:px-8 py-4 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}20` }}>
                  <Sparkles className="w-5 h-5" style={{ color: primary }} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: primary }}>
                    {tenant?.name || 'Servicio'}
                  </span>
                  <h3 className={`text-sm sm:text-base font-bold truncate ${textMainClass}`}>
                    {name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(service?.id || service?._id, 'service')}
                    title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform cursor-pointer border hover:scale-105 active:scale-95 ${
                                            isFavorite
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                        : `${textMainClass} hover:bg-rose-500/10`
                    }`}
                    style={!isFavorite ? dynamicSubCardStyle : undefined}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isFavorite ? 'text-rose-500 fill-rose-500' : ''
                      }`}
                    />
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={onClose} 
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform cursor-pointer border hover:scale-105 active:scale-95 ${textMainClass}`}
                                    style={dynamicSubCardStyle}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CUERPO PRINCIPAL */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              <div className="space-y-6">
                
                {/* FILA SUPERIOR: Imagen + Resumen rápido */}
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Imagen */}
                  <div className="sm:w-48 md:w-56 shrink-0">
                    <div 
                      className="aspect-square rounded-2xl border overflow-hidden flex items-center justify-center relative group cursor-zoom-in shadow-md"
                      style={dynamicSubCardStyle}
                      onClick={() => currentImg && setIsZoomedModalOpen(true)}
                    >
                      {currentImg ? (
                        <>
                          <Image
                            src={currentImg}
                            alt={name}
                            fill
                            sizes="(max-width: 640px) 100vw, 224px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            quality={75}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Sin+Imagen';
                            }}
                          />
                          {discountInfo && (
                            <div className="absolute top-3 right-3 z-10">
                              <span 
                                className="px-2 py-1 rounded-lg text-[10px] font-black shadow-lg border"
                                                                style={{
                                  backgroundColor: primary,
                                  color: '#ffffff',
                                  borderColor: primary,
                                }}
                              >
                                -{discountInfo.discountPercentage}% OFF
                              </span>
                            </div>
                          )}


                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <span className="bg-black/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                              Ampliar
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <FileText className="w-8 h-8" />
                          <span className={`text-xs mt-1 ${textMutedClass}`}>Sin imagen</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Miniaturas */}
                    {allImages.length > 1 && (
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                        {allImages.map((imgUrl: string, idx: number) => {
                          const isSelected = idx === selectedImageIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`w-10 h-10 rounded-xl border overflow-hidden shrink-0 transition-transform relative group cursor-pointer ${isSelected ? 'ring-2 shadow-md scale-105' : 'opacity-60 hover:opacity-100'}`}
                                                            style={{ borderColor: isSelected ? primary : borderDynamic }}
                            >
                              <Image
                                src={imgUrl}
                                alt={`Miniatura ${idx + 1}`}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                quality={60}
                              />
                                                          </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Resumen del servicio */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${textMutedClass}`} style={dynamicSubCardStyle}>
                        {category}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border ${textMainClass}`} style={dynamicSubCardStyle}>
                        {formatDuration(duration)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border ${textMainClass}`} style={dynamicSubCardStyle}>
                        {modality}
                      </span>
                      {isPublished && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          <BadgeCheck className="w-3 h-3 inline mr-0.5" />
                          Activo
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <h1 className={`text-xl sm:text-2xl font-bold leading-tight ${textMainClass}`}>
                        {name}
                      </h1>
                      {(rating > 0 || reviews > 0) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-sm font-bold" style={{ color: primary }}>
                            {rating.toFixed(1)}
                          </span>
                          <span className="text-xs flex items-center gap-0.5">
                            {renderStars(rating, primary)}
                          </span>
                        </div>
                      )}
                    </div>
  {discountInfo ? (
    // 🔥 CON DESCUENTO: precio original tachado + precio final + badge + ahorro
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-sm line-through opacity-50 ${textMutedClass}`}>
          Bs. {formatPrice(discountInfo.originalPriceVES)}
        </span>
        <span className="text-2xl font-black tracking-tight" style={{ color: primary }}>
          Bs. {formatPrice(priceVes)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: primary, color: '#ffffff' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
            <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
            <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
          </svg>
          -{discountInfo.discountPercentage}% OFF
        </span>
      </div>
      
      {displayedUsd !== null && (
        <span className="text-xs font-bold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          (${displayedUsd.toFixed(2)} USD)
        </span>
      )}
      {displayedEur !== null && (
        <span className="text-xs font-bold ml-2" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          (€{displayedEur.toFixed(2)} EUR)
        </span>
      )}
      {priceCrypto !== null && (
        <span className="text-xs font-bold ml-2" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          ({priceCrypto.toFixed(2)} USDT)
        </span>
      )}
      
      <div className="text-[10px] text-emerald-500 font-medium">
        Ahorro: Bs. {formatPrice(discountInfo.discountAmountVES)}
      </div>
    </div>
  ) : (
    // 🔴 SIN DESCUENTO: precio normal
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-2xl font-black tracking-tight" style={{ color: primary }}>
        Bs. {formatPrice(priceVes)}
      </span>
      
      {displayedUsd !== null && (
        <span className="text-xs font-bold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          (${displayedUsd.toFixed(2)} USD)
        </span>
      )}
      {displayedEur !== null && (
        <span className="text-xs font-bold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          (€{displayedEur.toFixed(2)} EUR)
        </span>
      )}
      {priceCrypto !== null && (
        <span className="text-xs font-bold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
          ({priceCrypto.toFixed(2)} USDT)
        </span>
      )}
    </div>
  )}

                    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[10px] ${textMutedClass}`}>
                      {productCode && <span>Código: {productCode}</span>}
                      {Number(capacity) > 0 && <span>Cupos: {capacity}</span>}
                    </div>

                    {assignedProfessionals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold ${textMutedClass}`}>
                          <Users className="w-3.5 h-3.5 inline mr-1" />
                          Profesionales:
                        </span>
                        {assignedProfessionals.map((prof, idx) => (
                          <span 
                            key={prof.id} 
                            className={`text-[10px] px-2.5 py-0.5 rounded-lg border ${isSecondaryLight ? 'border-slate-200' : 'border-white/10'} flex items-center gap-1`}
                            style={{ 
                              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' 
                            }}
                          >
                            <User className="w-3 h-3" style={{ color: primary }} />
                            {prof.name}
                            {prof.specialties && prof.specialties.length > 0 && (
                              <span className={`text-[8px] opacity-50 ${textMutedClass}`}>
                                ({prof.specialties.slice(0, 2).join(', ')})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {description && (
                      <p className={`text-sm leading-relaxed line-clamp-3 ${textMutedClass}`}>
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {/* SEPARADOR */}
                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50 ${textMutedClass}`}>
                    Detalles del servicio
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
                </div>

                {/* GRID DE DETALLES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {features.length > 0 && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: primary }} />
                        Características
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {features.map((feat: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg border opacity-80" style={{ borderColor: borderDynamic }}>
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {certifications.length > 0 && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <Award className="w-3.5 h-3.5" style={{ color: primary }} />
                        Certificaciones
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {certifications.map((cert: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg border" style={{ borderColor: `${primary}40`, backgroundColor: `${primary}15`, color: primary }}>
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {materials.length > 0 && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <Wrench className="w-3.5 h-3.5" style={{ color: primary }} />
                        Materiales
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {materials.map((mat: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg border opacity-80" style={{ borderColor: borderDynamic }}>
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientRequirements.length > 0 && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <FileText className="w-3.5 h-3.5" style={{ color: primary }} />
                        Requisitos
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {clientRequirements.map((req: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg border opacity-80" style={{ borderColor: borderDynamic }}>
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {includes && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Incluye
                      </span>
                      <p className="text-xs mt-1 opacity-80">{includes}</p>
                    </div>
                  )}

                  {notIncludes && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <X className="w-3.5 h-3.5 text-rose-500" />
                        No Incluye
                      </span>
                      <p className="text-xs mt-1 opacity-80">{notIncludes}</p>
                    </div>
                  )}

                  {cancellationPolicy && (
                    <div className={`p-4 rounded-xl border ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <Calendar className="w-3.5 h-3.5" style={{ color: primary }} />
                        Política de Cancelación
                      </span>
                      <span className="text-xs mt-1 opacity-80 block">{cancellationPolicy}</span>
                    </div>
                  )}
                </div>

                {/* SEPARADOR: AGENDAR CITA */}
                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50 ${textMutedClass}`}>
                    <Calendar className="w-3 h-3 inline mr-1.5" />
                    Agenda tu cita
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
                </div>

                {/* CALENDARIO + HORARIOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Navegación de mes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={goToPrevMonth}
                        className={`p-1.5 rounded-lg border transition-opacity hover:opacity-70 ${textMainClass}`}
                        style={{ borderColor: borderDynamic }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className={`text-sm font-bold ${textMainClass}`}>
                        {currentMonth.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        className={`p-1.5 rounded-lg border transition-opacity hover:opacity-70 ${textMainClass}`}
                        style={{ borderColor: borderDynamic }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day, idx) => (
                        <div key={idx} className={`text-center text-[9px] font-bold ${textMutedClass} py-0.5`}>
                          {day}
                        </div>
                      ))}
                      
                      {Array.from({ length: 35 }, (_, i) => {
                        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                        const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - startOffset + 1);
                        const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                        const isAvailable = isCurrentMonth && isDateAvailable(date);
                        const isSelected = selectedDate && 
                          date.getDate() === selectedDate.getDate() &&
                          date.getMonth() === selectedDate.getMonth() &&
                          date.getFullYear() === selectedDate.getFullYear();
                        const isToday = date.getDate() === new Date().getDate() &&
                          date.getMonth() === new Date().getMonth() &&
                          date.getFullYear() === new Date().getFullYear();
                        
                        const badge = isCurrentMonth ? getDayBadge(date) : null;

                        if (i - startOffset + 1 < 1 || i - startOffset + 1 > new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) {
                          return <div key={i} className="aspect-square" />;
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => isAvailable && handleDateSelect(date)}
                            disabled={!isAvailable}
                            className={`aspect-square rounded-lg text-xs font-bold transition-transform cursor-pointer relative flex items-center justify-center ${
                                                            isSelected
                                ? 'text-white shadow-lg scale-105'
                                : isAvailable
                                ? `hover:scale-105 ${isSecondaryLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`
                                : 'opacity-20 cursor-not-allowed'
                            } ${isToday && !isSelected ? `border ${isSecondaryLight ? 'border-slate-300' : 'border-white/20'}` : ''}`}
                            style={{
                              backgroundColor: isSelected ? primary : 'transparent',
                              borderColor: isToday && !isSelected ? (isSecondaryLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)') : 'transparent',
                              color: isSelected ? '#ffffff' : (isAvailable ? textMainClass : textMutedClass)
                            }}
                          >
                            {date.getDate()}
                            {badge}
                            {isToday && !isSelected && (
                              <span className="block w-1 h-1 mx-auto rounded-full mt-0.5" style={{ backgroundColor: primary }} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`flex flex-wrap gap-2 text-[8px] opacity-60 ${textMutedClass}`}>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Horario especial
                      </span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Cerrado
                      </span>
                    </div>
                  </div>

                  {/* Horarios disponibles */}
                  <div className="md:col-span-2">
                    {selectedDate ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>
                            {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {loadingSlots && <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />}
                            {!loadingSlots && availableSlots.length > 0 && (
                              <span className="text-[9px] font-normal opacity-60 ml-1">({availableSlots.length} horarios)</span>
                            )}
                          </span>
                          {selectedDate && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(null);
                                setSelectedTime('');
                              }}
                              className="text-[9px] opacity-50 hover:opacity-100 transition"
                            >
                              Cambiar
                            </button>
                          )}
                        </div>

                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: primary }} />
                            <span className={`text-xs ml-2 ${textMutedClass}`}>Cargando horarios...</span>
                          </div>
                        ) : availableSlots.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                            {availableSlots.map((slot) => {
                              const isSelected = selectedTime === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => handleTimeSelect(slot)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-transform cursor-pointer ${
                                                                        isSelected
                                      ? 'text-white shadow-md border-transparent scale-105'
                                      : `hover:scale-105 ${isSecondaryLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? primary : 'transparent',
                                    borderColor: isSelected ? 'transparent' : borderDynamic,
                                    color: isSelected ? '#ffffff' : textMainClass
                                  }}
                                >
                                  {formatTimeAMPM(slot)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`p-4 rounded-xl border text-center ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                            <p className={`text-xs ${textMutedClass}`}>No hay horarios disponibles para esta fecha.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl border text-center h-full flex items-center justify-center ${isSecondaryLight ? 'bg-slate-50/50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                        <p className={`text-xs ${textMutedClass}`}>Selecciona una fecha en el calendario para ver los horarios disponibles.</p>
                      </div>
                    )}
                  </div>
                </div>

                              {/* 🔥 SECCIÓN DE RESEÑAS */}
                <ItemReviewsSection
                  tenantId={tenant?.id || tenant?._id || ''}
                  itemId={service?.id || service?._id || ''}
                  itemType="service"
                  primary={primary}
                  isSecondaryLight={isSecondaryLight}
                  isAuthenticated={isAuthenticated}
                  userId={userId}
                  inlineLimit={3}
                />

                {/* ERROR MESSAGE */}
                {errorMessage && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* BOTÓN DE RESERVA (o aviso si es driver/profesional) */}
                {isUserDriver || isUserProfessional ? (
                  <div className={`w-full py-3.5 px-5 rounded-2xl text-sm font-bold text-center border ${
                    isSecondaryLight
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}>
                    {isUserDriver
                      ? 'Los repartidores no pueden reservar servicios'
                      : 'Los profesionales no pueden reservar servicios'}
                  </div>
                ) : !isAuthenticated ? (
                  <div className={`w-full py-3.5 px-5 rounded-2xl text-sm font-bold text-center border ${
                    isSecondaryLight
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}>
                    Debes iniciar sesión para reservar este servicio
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={!selectedDate || !selectedTime || loadingSlots}
                    className={`w-full py-3.5 px-5 rounded-2xl text-white text-sm font-bold shadow-lg transition-transform cursor-pointer flex items-center justify-center gap-2 ${
                                            !selectedDate || !selectedTime || loadingSlots
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:opacity-90 active:scale-[0.98]'
                    }`}
                    style={{ backgroundColor: primary }}
                  >
                    <Calendar className="w-4 h-4" />
                    {!selectedDate || !selectedTime
                      ? 'Selecciona fecha y hora para reservar'
                      : `Reservar para ${formatDateForButton(selectedDate)} a las ${formatTimeAMPM(selectedTime)}`}
                  </button>
                )}

                {availableDays.length === 0 && (
                  <p className={`text-xs text-center ${textMutedClass} italic`}>
                    No hay disponibilidad en los próximos días. Contacta al comercio para más información.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE ZOOM */}
        {isZoomedModalOpen && currentImg && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 animate-in fade-in" onClick={() => setIsZoomedModalOpen(false)}>
                        <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsZoomedModalOpen(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                ✕
              </button>
              <Image
                src={currentImg}
                alt="Zoom Imagen Ampliada"
                width={1200}
                height={1200}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-3xl shadow-2xl border border-white/10"
                quality={90}
              />
                          </div>
          </div>
        )}
      </>
    );

    return createPortal(modalContent, document.body);
  }