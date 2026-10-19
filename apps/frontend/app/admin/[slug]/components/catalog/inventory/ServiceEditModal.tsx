'use client';

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { 
  SERVICE_PRESET_CATEGORIES,
  SERVICE_NICHE_CATEGORIES_MAP 
} from '@/app/constants/nicheData';
import { SERVICE_TAG_CATEGORIES } from '@/app/constants/itemCategories';
// 🔥 IMPORTAR imageUtils
import { getFirstImage, getAllImages } from '@/lib/imageUtils';
// 🔥 IMPORTAR CONTEXTO DE TASAS
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
// 🔥 SECCIÓN DE OFERTA/DESCUENTO (adaptada para servicios)
import DiscountSection from '../item-form/DiscountSection';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
// ==========================================
// 🔥 HELPERS
// ==========================================

const getAdaptiveGreenColor = (textColorValue: string): string => {
  if (!textColorValue) return '#22c55e';

  const str = textColorValue.trim().toLowerCase();

  if (str.startsWith('#')) {
    let hex = str.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#4ade80' : '#15803d';
    }
  }

  if (str.startsWith('rgb')) {
    const matches = str.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = Number(matches[0]);
      const g = Number(matches[1]);
      const b = Number(matches[2]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#4ade80' : '#15803d';
    }
  }

  if (['black', '000', 'slate-900', 'gray-900', 'neutral-900'].some(k => str.includes(k))) {
    return '#15803d';
  }

  return '#4ade80';
};

const formatFriendlyText = (text: string) => {
  if (!text) return 'General';
  return text
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      const lowerWords = ['en', 'de', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'por', 'para', 'con', 'sin'];
      if (lowerWords.includes(word.toLowerCase()) && word.length <= 3) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// ==========================================
// 🔥 ICONOS SVG
// ==========================================

const SearchIcon = ({ color }: { color: string }) => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronIcon = ({ color, open }: { color: string; open: boolean }) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const DragHandleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

// ==========================================
// 🔥 CONSTANTES DE SERVICIOS
// ==========================================

const DURATION_OPTIONS = [
  { label: '5 minutos', value: 5 },
  { label: '10 minutos', value: 10 },
  { label: '15 minutos', value: 15 },
  { label: '20 minutos', value: 20 },
  { label: '25 minutos', value: 25 },
  { label: '30 minutos', value: 30 },
  { label: '35 minutos', value: 35 },
  { label: '40 minutos', value: 40 },
  { label: '45 minutos', value: 45 },
  { label: '50 minutos', value: 50 },
  { label: '55 minutos', value: 55 },
  { label: '60 minutos (1 hora)', value: 60 },
  { label: '75 minutos (1h 15m)', value: 75 },
  { label: '90 minutos (1h 30m)', value: 90 },
  { label: '105 minutos (1h 45m)', value: 105 },
  { label: '120 minutos (2 horas)', value: 120 },
  { label: '150 minutos (2h 30m)', value: 150 },
  { label: '180 minutos (3 horas)', value: 180 },
  { label: '210 minutos (3h 30m)', value: 210 },
  { label: '240 minutos (4 horas)', value: 240 },
  { label: '300 minutos (5 horas)', value: 300 },
  { label: '360 minutos (6 horas)', value: 360 },
  { label: '420 minutos (7 horas)', value: 420 },
  { label: '480 minutos (8 horas)', value: 480 },
  { label: 'Día completo (24 horas)', value: 1440 },
];

const CANCELLATION_POLICIES = [
  { label: 'Flexible (24h antes)', value: 'flexible' },
  { label: 'Estándar (48h antes)', value: 'estandar' },
  { label: 'Estricta (72h antes)', value: 'estricta' },
  { label: 'Muy Estricta (7 días antes)', value: 'muy_estricta' },
  { label: 'No Reembolsable', value: 'no_reembolsable' },
];

const COMMON_MATERIALS = [
  'Laptop', 'Tablet', 'Smartphone', 'Cámara', 'Micrófono',
  'Altavoces', 'Proyector', 'Pizarra Digital', 'Material Impreso',
  'Guías y Manuales', 'Equipo de Protección', 'Herramientas Especializadas',
  'Instrumentos Musicales', 'Equipo Deportivo', 'Material de Arte',
  'Equipo Médico', 'Software Especializado', 'Acceso a Plataforma',
  'Licencias de Software', 'Conexión a Internet', 'Equipo de Sonido',
  'Iluminación', 'Equipo de Filmación',
];

const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 27001', 'ISO 45001',
  'ISO 22000', 'ISO 50001', 'CE', 'RoHS', 'REACH', 'UL',
  'FDA', 'GMP', 'HACCP', 'IFS', 'BRC',
  'Orgánico', 'Vegan', 'Cruelty Free', 'Fair Trade', 'B-Corp',
  'LEED', 'WELL', 'BREEAM', 'SGS', 'TÜV', 'DEKRA',
  'Intertek', 'BV', 'DNV', 'PEFC', 'FSC',
  'Rainforest Alliance', 'UTZ', 'Kosher', 'Halal',
];

const CLIENT_REQUIREMENTS = [
  'Identificación Oficial', 'RIF / NIT', 'Certificado de Salud',
  'Certificado Médico', 'Equipo Personal', 'Ropa Cómoda',
  'Calzado Deportivo', 'Casco de Seguridad', 'Guantes',
  'Mascarilla / Tapabocas', 'Documentación Legal', 'Contrato Firmado',
  'Depósito / Garantía', 'Reserva Previa', 'Cita Confirmada',
  'Certificado de Vacunación',
];

const DAYS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const SERVICE_PRESET_COLORS = [
  { label: 'Único', value: 'Único', hex: 'linear-gradient(135deg, #cbd5e1 0%, #475569 100%)' },
  { label: 'Negro', value: 'Negro', hex: '#18181b' },
  { label: 'Blanco', value: 'Blanco', hex: '#f8fafc' },
  { label: 'Gris', value: 'Gris', hex: '#94a3b8' },
  { label: 'Rojo', value: 'Rojo', hex: '#ef4444' },
  { label: 'Azul', value: 'Azul', hex: '#3b82f6' },
  { label: 'Verde', value: 'Verde', hex: '#10b981' },
  { label: 'Amarillo', value: 'Amarillo', hex: '#f59e0b' },
  { label: 'Rosa', value: 'Rosa', hex: '#ec4899' },
  { label: 'Morado', value: 'Morado', hex: '#8b5cf6' },
  { label: 'Naranja', value: 'Naranja', hex: '#f97316' },
  { label: 'Turquesa', value: 'Turquesa', hex: '#0d9488' },
];

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const minStr = m === 0 ? '00' : String(m);
      const value = `${String(h).padStart(2, '0')}:${minStr}`;
      options.push(value);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const getTimeLabel = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  const minStr = String(minutes).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
};
// ==========================================
// 🔥 COMPONENTE: TagAccordion (acordeón reutilizable)
// ==========================================
const TagAccordion = ({
  categoryKey,
  cat,
  newItem,
  toggleTag,
  textColor,
  borderDynamic,
  primary,
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedCount = (newItem?.features || []).filter((t: string) => cat.tags.includes(t)).length;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer" style={{ color: textColor }}>
          {cat.label}
          <span className="ml-1.5 text-[9px] opacity-40">
            ({selectedCount}/{cat.tags.length})
          </span>
        </label>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: textColor }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          {cat.tags.map((tag: string) => {
            const isSelected = (newItem?.features || []).includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(categoryKey, tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? primary : undefined,
                  borderColor: isSelected ? 'transparent' : borderDynamic,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🔥 INTERFACE
// ==========================================

interface ServiceEditModalProps {
  product?: any;
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (updatedItem: any) => void;
  textColor: string;
  isDarkBg: boolean;
  primary: string;
  secondary?: string;
  rates?: Record<string, number>;
  tenantConfig?: any;
  existingItems?: any[];
}

interface UploadingFile {
  id: string;
  name: string;
  url: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  fileObject?: File;
}

// ==========================================
// 🔥 COMPONENTE: TimeSelect
// ==========================================

const TimeSelect = ({ value, onChange, className, borderDynamic, textColor, isDarkBg }: any) => (
  <div className="relative inline-block">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs rounded-xl border px-3 py-1.5 outline-none appearance-none bg-transparent ${className || 'w-28'}`}
      style={{ borderColor: borderDynamic, color: textColor }}
    >
      {TIME_OPTIONS.map((timeVal) => {
        const label = getTimeLabel(timeVal);
        return (
          <option 
            key={timeVal} 
            value={timeVal}
            style={{ backgroundColor: isDarkBg ? '#1e293b' : '#ffffff' }}
          >
            {label}
          </option>
        );
      })}
    </select>
    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" style={{ color: textColor }}>
      <ChevronDownIcon />
    </span>
  </div>
);

// ==========================================
// 🔥 COMPONENTE: DatePicker
// ==========================================

const DatePicker = ({ 
  value, 
  onChange, 
  borderDynamic, 
  textColor, 
  isDarkBg, 
  placeholder,
  className,
  primary
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<string>(value || '');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    onChange(dateStr);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const changeYear = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(newDate.getFullYear() + delta);
    setViewDate(newDate);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  const bgColor = isDarkBg ? '#1e293b' : '#ffffff';
  const selectedBg = primary || '#3b82f6';

  return (
    <div className={`relative ${className || ''}`}>
      <div
        ref={inputRef}
        className="border rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer flex items-center justify-between min-w-[140px]"
        style={{ 
          borderColor: borderDynamic, 
          color: textColor,
          backgroundColor: 'transparent'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ opacity: selectedDate ? 1 : 0.4 }}>
          {selectedDate ? formatDate(selectedDate) : placeholder || 'Seleccionar fecha'}
        </span>
        <span className="opacity-40" style={{ color: textColor }}>
          <CalendarIcon />
        </span>
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-1 rounded-xl border shadow-xl p-4 min-w-[280px]"
          style={{
            backgroundColor: bgColor,
            borderColor: borderDynamic,
            boxShadow: isDarkBg 
              ? '0 8px 32px rgba(0,0,0,0.5)' 
              : '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeYear(-1)}
                className="p-1 rounded hover:opacity-70 transition"
                style={{ color: textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                  <polyline points="19 18 13 12 19 6" />
                </svg>
              </button>
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 rounded hover:opacity-70 transition"
                style={{ color: textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
            
            <span className="text-xs font-bold" style={{ color: textColor }}>
              {months[month]} {year}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(1)}
                className="p-1 rounded hover:opacity-70 transition"
                style={{ color: textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                onClick={() => changeYear(1)}
                className="p-1 rounded hover:opacity-70 transition"
                style={{ color: textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                  <polyline points="5 18 11 12 5 6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[9px] font-bold opacity-50 py-1" style={{ color: textColor }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="text-center text-[10px] py-1" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`text-center text-xs py-1.5 rounded-lg transition cursor-pointer hover:opacity-80 ${
                    isSelected ? 'text-white font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? selectedBg : 'transparent',
                    color: isSelected ? '#ffffff' : textColor,
                    ...(isToday && !isSelected ? { 
                      border: `1px solid ${borderDynamic}`,
                      fontWeight: 'bold'
                    } : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <button
              onClick={() => {
                setSelectedDate('');
                onChange('');
                setIsOpen(false);
              }}
              className="text-[9px] opacity-50 hover:opacity-100 transition"
              style={{ color: textColor }}
            >
              Limpiar fecha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🔥 COMPONENTE: DayCard con drag & drop
// ==========================================

const DayCard = ({ 
  day, 
  dayLabel, 
  schedules, 
  onToggle, 
  onAddSchedule, 
  onRemoveSchedule, 
  onUpdateSchedule,
  isActive,
  isDragging,
  isOver,
  dragHandleProps,
  borderDynamic,
  textColor,
  isDarkBg,
  primary,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  index,
}: any) => {
  return (
    <div
      className={`border rounded-xl p-3 transition-all ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      } ${isOver ? 'ring-2 ring-offset-2' : ''}`}
      style={{ 
        borderColor: isDragging ? primary : borderDynamic,
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        ...(isOver ? { ringColor: primary } : {}),
      }}
      draggable={isActive}
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, index)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isActive && (
            <div 
              className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-white/5 transition opacity-40 hover:opacity-100"
              {...dragHandleProps}
              title="Arrastra para reordenar"
              style={{ color: textColor }}
            >
              <DragHandleIcon />
            </div>
          )}
          <button
            type="button"
            onClick={() => onToggle && onToggle(day)}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isActive 
                ? 'text-white border-transparent shadow-sm' 
                : `opacity-60 hover:opacity-100 ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
            }`}
            style={{
              backgroundColor: isActive ? primary : 'transparent',
              borderColor: isActive ? 'transparent' : borderDynamic,
              color: isActive ? '#ffffff' : textColor
            }}
          >
            {dayLabel}
            {isActive && <CheckIcon color="#ffffff" />}
          </button>
          <span className="text-[9px] opacity-40" style={{ color: textColor }}>
            {schedules?.length || 0} bloques
          </span>
        </div>
        {isActive && (
          <button
            type="button"
            onClick={() => onAddSchedule && onAddSchedule(day)}
            className="text-[9px] opacity-50 hover:opacity-100 transition font-medium px-2 py-0.5 rounded-lg hover:bg-white/5 flex items-center gap-0.5"
            style={{ color: primary }}
          >
            <PlusIcon />
            Agregar
          </button>
        )}
      </div>

      {isActive && schedules && schedules.length > 0 && (
        <div className="space-y-1.5 pl-1">
          {schedules.map((slot: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <TimeSelect
                value={slot.start || '09:00'}
                onChange={(val: string) => onUpdateSchedule && onUpdateSchedule(day, idx, 'start', val)}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                <ArrowRightIcon />
              </span>
              <TimeSelect
                value={slot.end || '18:00'}
                onChange={(val: string) => onUpdateSchedule && onUpdateSchedule(day, idx, 'end', val)}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
              />
              <button
                type="button"
                onClick={() => onRemoveSchedule && onRemoveSchedule(day, idx)}
                className="ml-auto opacity-30 hover:opacity-100 transition text-red-400 text-[10px] p-1"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {isActive && (!schedules || schedules.length === 0) && (
        <div className="text-[9px] opacity-30 italic pl-1" style={{ color: textColor }}>
          Sin horarios configurados
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🔥 COMPONENTE PRINCIPAL
// ==========================================

export default function ServiceEditModal({
  product = null,
  isOpen = true,
  onClose,
  onSave,
  textColor,
  isDarkBg,
  primary,
  secondary,
  rates = {},
  tenantConfig = {},
  existingItems = [],
}: ServiceEditModalProps) {
  
  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates: exchangeRates, loading: ratesLoading } = useExchangeRateContext();
  
  const { showToast } = useToast();

  const [newItem, setNewItem] = useState<any>({});
  const [images, setImages] = useState<UploadingFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🔥 ESTADO PARA PROFESIONALES
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);

  // Estados para menús desplegables
  const [showCertMenu, setShowCertMenu] = useState(false);
  const [showMaterialsMenu, setShowMaterialsMenu] = useState(false);
  const [showRequirementsMenu, setShowRequirementsMenu] = useState(false);
  const certContainerRef = useRef<HTMLDivElement>(null);
  const materialsContainerRef = useRef<HTMLDivElement>(null);
  const requirementsContainerRef = useRef<HTMLDivElement>(null);

  // Estados para disponibilidad
  const [exceptionDateStart, setExceptionDateStart] = useState('');
  const [exceptionDateEnd, setExceptionDateEnd] = useState('');
  const [exceptionStart, setExceptionStart] = useState('09:00');
  const [exceptionEnd, setExceptionEnd] = useState('18:00');
  const [closedDateStart, setClosedDateStart] = useState('');
  const [closedDateEnd, setClosedDateEnd] = useState('');
  const [quickStartTime, setQuickStartTime] = useState('09:00');
  const [quickEndTime, setQuickEndTime] = useState('18:00');

  // Estado para drag & drop
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Estado para el orden de los días
  const [dayOrder, setDayOrder] = useState<string[]>(() => {
    const savedOrder = product?.dayOrder;
    if (Array.isArray(savedOrder) && savedOrder.length === 7) {
      return savedOrder;
    }
    return DAYS.map(d => d.value);
  });

  // Referencia para imágenes
  const imagesLoadedRef = useRef(false);

  // ==========================================
  // ESTILOS DINÁMICOS
  // ==========================================

  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)';
  
  const dynamicSubCardStyle = {
    backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
    borderColor: borderDynamic,
    color: textColor
  };

  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const dropdownBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const dropdownItemHover = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const dropdownItemSelected = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all bg-transparent`;

  // ==========================================
  // CATEGORÍAS DE SERVICIOS
  // ==========================================

  const getAllAvailableCategories = useMemo(() => {
    const storeNicheStr = String(tenantConfig?.niche || tenantConfig?.category || tenantConfig?.businessType || '').toLowerCase().trim();
    const matchedKey = Object.keys(SERVICE_NICHE_CATEGORIES_MAP).find(key => storeNicheStr.includes(key));
    if (matchedKey) {
      const nicheCategories = SERVICE_NICHE_CATEGORIES_MAP[matchedKey] || [];
      const combined = [...new Set([...SERVICE_PRESET_CATEGORIES, ...nicheCategories])];
      return combined;
    }
    return SERVICE_PRESET_CATEGORIES;
  }, [tenantConfig]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return getAllAvailableCategories;
    const searchLower = categorySearch.toLowerCase().trim();
    return getAllAvailableCategories.filter(cat => 
      formatFriendlyText(cat).toLowerCase().includes(searchLower) ||
      cat.toLowerCase().includes(searchLower)
    );
  }, [getAllAvailableCategories, categorySearch]);

  // ==========================================
  // HELPERS
  // ==========================================

  const roundPrice = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  const getRateUSD = (): number => {
    const usd = Number(exchangeRates?.USD || rates?.USD || 0);
    return usd > 0 ? usd : 0;
  };

  const getRateEUR = (): number => {
  const eur = Number(exchangeRates?.EUR || rates?.EUR || 0);
  return eur > 0 ? eur : 0;
};

  const resolveServerImageUrl = (img: any) => {
    if (!img) return '';
    
    let imageUrl = typeof img === 'string' ? img : (img?.url || img?.path || '');
    if (!imageUrl) return '';
    
    if (imageUrl.startsWith('http') || imageUrl.startsWith('blob:')) return imageUrl;
    
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    if (imageUrl.startsWith('/')) {
      return `${base}${imageUrl}`;
    }
    
    if (imageUrl.includes('uploads/')) {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      return `${base}/${cleanPath}`;
    }
    
    return `${base}/uploads/${imageUrl}`;
  };

  // ==========================================
  // FUNCIONES DE ORDEN DE DÍAS
  // ==========================================

  const getOrderedDays = () => {
    const dayMap = Object.fromEntries(DAYS.map(d => [d.value, d]));
    return dayOrder
      .filter(day => dayMap[day])
      .map(day => ({
        ...dayMap[day],
        isActive: !!newItem?.availability?.[day]?.length,
        schedules: newItem?.availability?.[day] || [],
      }));
  };

  // ==========================================
  // HANDLERS DE DISPONIBILIDAD SEMANAL
  // ==========================================

  const toggleDayAvailability = (day: string) => {
    const current = newItem?.availability || {};
    
    if (current[day]) {
      const { [day]: _, ...rest } = current;
      setNewItem((prev: any) => ({
        ...prev,
        availability: rest,
        attributes: {
          ...(prev?.attributes || {}),
          availability: rest,
        }
      }));
    } else {
      const newAvailability = {
        ...current,
        [day]: [{ start: '09:00', end: '18:00' }],
      };
      setNewItem((prev: any) => ({
        ...prev,
        availability: newAvailability,
        attributes: {
          ...(prev?.attributes || {}),
          availability: newAvailability,
        }
      }));
    }
  };

  const updateDaySchedule = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const current = newItem?.availability || {};
    const daySchedules = current[day] || [];
    const updatedSchedules = [...daySchedules];
    updatedSchedules[index] = { ...updatedSchedules[index], [field]: value };
    
    const newAvailability = {
      ...current,
      [day]: updatedSchedules,
    };
    
    setNewItem((prev: any) => ({
      ...prev,
      availability: newAvailability,
      attributes: {
        ...(prev?.attributes || {}),
        availability: newAvailability,
      }
    }));
  };

  const addDaySchedule = (day: string) => {
    const current = newItem?.availability || {};
    const daySchedules = current[day] || [];
    
    const newAvailability = {
      ...current,
      [day]: [...daySchedules, { start: '09:00', end: '18:00' }],
    };
    
    setNewItem((prev: any) => ({
      ...prev,
      availability: newAvailability,
      attributes: {
        ...(prev?.attributes || {}),
        availability: newAvailability,
      }
    }));
  };

  const removeDaySchedule = (day: string, index: number) => {
    const current = newItem?.availability || {};
    const daySchedules = current[day] || [];
    const updatedSchedules = daySchedules.filter((_: any, i: number) => i !== index);
    
    let newAvailability;
    
    if (updatedSchedules.length === 0) {
      const { [day]: _, ...rest } = current;
      newAvailability = rest;
    } else {
      newAvailability = {
        ...current,
        [day]: updatedSchedules,
      };
    }
    
    setNewItem((prev: any) => ({
      ...prev,
      availability: newAvailability,
      attributes: {
        ...(prev?.attributes || {}),
        availability: newAvailability,
      }
    }));
  };

  // ==========================================
  // ATAJOS RÁPIDOS
  // ==========================================

  const applyScheduleToDays = (dayValues: string[], start: string, end: string) => {
    const current = newItem?.availability || {};
    const newAvailability = { ...current };

    dayValues.forEach(day => {
      newAvailability[day] = [{ start, end }];
    });

    setNewItem((prev: any) => ({
      ...prev,
      availability: newAvailability,
      attributes: {
        ...(prev?.attributes || {}),
        availability: newAvailability,
      }
    }));
  };

  const deactivateDays = (dayValues: string[]) => {
    const current = newItem?.availability || {};
    const newAvailability = { ...current };

    dayValues.forEach(day => {
      delete newAvailability[day];
    });

    setNewItem((prev: any) => ({
      ...prev,
      availability: newAvailability,
      attributes: {
        ...(prev?.attributes || {}),
        availability: newAvailability,
      }
    }));
  };

  const setAllDaysSchedule = (start: string, end: string) => {
    const allDays = DAYS.map(d => d.value);
    applyScheduleToDays(allDays, start, end);
  };

  const setWeekdaysSchedule = (start: string, end: string) => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    applyScheduleToDays(weekdays, start, end);
  };

  const setWeekendSchedule = (start: string, end: string) => {
    const weekend = ['saturday', 'sunday'];
    applyScheduleToDays(weekend, start, end);
  };

  const closeAllDays = () => {
    const allDays = DAYS.map(d => d.value);
    deactivateDays(allDays);
  };

  // ==========================================
  // HANDLERS DE FECHAS ESPECIALES (RANGO)
  // ==========================================

  const addExceptionRange = () => {
    if (!exceptionDateStart) {
      showToast({
        variant: 'warning',
        message: 'Por favor selecciona una fecha de inicio',
      });
      return;
    }

    const endDate = exceptionDateEnd || exceptionDateStart;
    
    if (endDate < exceptionDateStart) {
      showToast({
        variant: 'warning',
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
      });
      return;
    }

    const current = newItem?.availability || {};
    const exceptions = current.exceptions || {};
    
    const dates: string[] = [];
    let currentDate = new Date(exceptionDateStart);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!exceptions[dateStr]) {
        dates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (dates.length === 0) {
      showToast({
        variant: 'warning',
        message: 'Todas las fechas en el rango ya tienen una excepción configurada',
      });
      return;
    }

    const newExceptions = { ...exceptions };
    dates.forEach(date => {
      newExceptions[date] = [{ start: exceptionStart, end: exceptionEnd }];
    });

    setNewItem((prev: any) => ({
      ...prev,
      availability: {
        ...current,
        exceptions: newExceptions,
      },
      attributes: {
        ...(prev?.attributes || {}),
        availability: {
          ...current,
          exceptions: newExceptions,
        },
      }
    }));

    setExceptionDateStart('');
    setExceptionDateEnd('');
  };

  const removeExceptionDate = (date: string) => {
    const current = newItem?.availability || {};
    const exceptions = current.exceptions || {};
    const { [date]: _, ...rest } = exceptions;

    setNewItem((prev: any) => ({
      ...prev,
      availability: {
        ...current,
        exceptions: rest,
      },
      attributes: {
        ...(prev?.attributes || {}),
        availability: {
          ...current,
          exceptions: rest,
        },
      }
    }));
  };

  // ==========================================
  // HANDLERS DE DÍAS CERRADOS (RANGO)
  // ==========================================

  const addClosedRange = () => {
    if (!closedDateStart) {
      showToast({
        variant: 'warning',
        message: 'Por favor selecciona una fecha de inicio',
      });
      return;
    }

    const endDate = closedDateEnd || closedDateStart;
    
    if (endDate < closedDateStart) {
      showToast({
        variant: 'warning',
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
      });
      return;
    }

    const current = newItem?.availability || {};
    const closed = current.closed || [];
    
    const dates: string[] = [];
    let currentDate = new Date(closedDateStart);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!closed.includes(dateStr)) {
        dates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (dates.length === 0) {
      showToast({
        variant: 'warning',
        message: 'Todas las fechas en el rango ya están marcadas como cerradas',
      });
      return;
    }

    const newClosed = [...closed, ...dates];

    setNewItem((prev: any) => ({
      ...prev,
      availability: {
        ...current,
        closed: newClosed,
      },
      attributes: {
        ...(prev?.attributes || {}),
        availability: {
          ...current,
          closed: newClosed,
        },
      }
    }));

    setClosedDateStart('');
    setClosedDateEnd('');
  };

  const removeClosedDate = (date: string) => {
    const current = newItem?.availability || {};
    const closed = current.closed || [];
    const newClosed = closed.filter((d: string) => d !== date);

    setNewItem((prev: any) => ({
      ...prev,
      availability: {
        ...current,
        closed: newClosed,
      },
      attributes: {
        ...(prev?.attributes || {}),
        availability: {
          ...current,
          closed: newClosed,
        },
      }
    }));
  };

  // ==========================================
  // HANDLERS DE DRAG & DROP
  // ==========================================

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      (e.target as HTMLElement)?.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragIndex(null);
    setDropIndex(null);
    (e.target as HTMLElement)?.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    const newOrder = [...dayOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, removed);
    
    setDayOrder(newOrder);
    setDragIndex(null);
    setDropIndex(null);
    
    // Guardar el orden
    setNewItem((prev: any) => ({
      ...prev,
      dayOrder: newOrder,
    }));
  };

  // ==========================================
  // EFECTOS
  // ==========================================

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (certContainerRef.current && !certContainerRef.current.contains(event.target as Node)) {
        setShowCertMenu(false);
      }
      if (materialsContainerRef.current && !materialsContainerRef.current.contains(event.target as Node)) {
        setShowMaterialsMenu(false);
      }
      if (requirementsContainerRef.current && !requirementsContainerRef.current.contains(event.target as Node)) {
        setShowRequirementsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 CARGAR PROFESIONALES DEL TENANT
  useEffect(() => {
    const tenantId = newItem?.tenantId || product?.tenantId;
    if (!tenantId) {
      setProfessionals([]);
      return;
    }

    const fetchProfessionals = async () => {
      setLoadingProfessionals(true);
      try {
        const token = localStorage.getItem('token') || '';
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/tenant/${tenantId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfessionals(Array.isArray(data) ? data : []);
        } else {
          setProfessionals([]);
        }
      } catch (error) {
        console.error('Error al cargar profesionales:', error);
        setProfessionals([]);
      } finally {
        setLoadingProfessionals(false);
      }
    };

    fetchProfessionals();
  }, [newItem?.tenantId, product?.tenantId]);

  // ==========================================
  // 🔥 SINCRONIZAR DATOS DEL PRODUCTO - CON IMÁGENES CORREGIDAS
  // ==========================================

  useEffect(() => {
    if (!product) return;
    if (imagesLoadedRef.current) return; // ✅ GUARD: no re-sincronizar imágenes si ya se hizo

    console.log('📸 [ServiceEditModal] Sincronizando servicio:', product.name);

    const attrs = product?.attributes || {};

    const resolvedSku = product?.itemId || product?.sku || product?.code || attrs?.sku || attrs?.itemId || '';
    
// 🔥 PRIORIDAD 1: USD como ancla, VES se recalcula con la tasa ACTUAL
// Mismo patrón que ItemEditModal — arregla el bug del VES congelado.
const rawVes = roundPrice(Number(product?.prices?.VES ?? product?.price ?? 0));
const rawUsd = roundPrice(Number(product?.prices?.USD ?? product?.attributes?.prices?.USD ?? 0));
const rawEur = roundPrice(Number(product?.prices?.EUR ?? product?.attributes?.prices?.EUR ?? 0));
const rawCrypto = roundPrice(Number(product?.prices?.CRYPTO ?? product?.attributes?.prices?.CRYPTO ?? 0));

const rateUSD = getRateUSD();
const rateEUR = getRateEUR();

let finalVes = rawVes;
let finalUsd = rawUsd;
let finalEur = rawEur;
let finalCrypto = rawCrypto;

// 🔥 El USD es el ancla. Si hay USD, recalculamos VES con la tasa ACTUAL.
if (finalUsd > 0 && rateUSD > 0) {
  finalVes = roundPrice(finalUsd * rateUSD);
}
// 🔴 Fallback: si NO hay USD pero sí VES, derivamos USD desde el VES
else if (finalVes > 0 && rateUSD > 0) {
  finalUsd = roundPrice(finalVes / rateUSD);
}

// 🔥 EUR siempre se recalcula desde USD con la tasa actual
if (finalUsd > 0 && rateEUR > 0 && rateUSD > 0) {
  finalEur = roundPrice(finalUsd * (rateUSD / rateEUR));
}

// 🔥 CRYPTO = USD (USDT)
if (finalUsd > 0) {
  finalCrypto = finalUsd;
}

    // 🔥🔥🔥 EXTRAER IMÁGENES CORRECTAMENTE USANDO getAllImages 🔥🔥🔥
    const extractedImages = getAllImages(product);
    
    // 🔥 Normalizar para deduplicar por nombre de archivo
    const normalizeForDedupe = (url: string) => {
      if (!url) return '';
      return url.split('?')[0].split('#')[0].split('/').pop() || url;
    };

    const seenFilenames = new Set<string>();
    const finalImages = extractedImages
      .filter(Boolean)
      .filter((img) => typeof img === 'string' && img.trim() !== '')
      .filter((img) => {
        const key = normalizeForDedupe(img);
        if (seenFilenames.has(key)) return false;
        seenFilenames.add(key);
        return true;
      });

    console.log('📸 [ServiceEditModal] Imágenes FINALES extraídas:', finalImages);
    console.log('📸 [ServiceEditModal] Cantidad de imágenes:', finalImages.length);

    // Recuperar dayOrder si existe
    const savedOrder = product?.dayOrder || attrs?.dayOrder;
    if (Array.isArray(savedOrder) && savedOrder.length === 7) {
      setDayOrder(savedOrder);
    }

    setNewItem({ 
      ...product,
      itemId: resolvedSku,
      sku: resolvedSku,
      code: resolvedSku,
      name: product?.name || product?.title || '',
      category: product?.category || attrs?.category || '',
      status: product?.status || attrs?.status || 'published',
      price: finalVes,
      usdReference: finalUsd,
      prices: {
        VES: finalVes,
        USD: finalUsd,
        EUR: finalEur,
        CRYPTO: finalCrypto
      },
      description: product?.description || product?.details || attrs?.description || '',
      existingImages: finalImages,
      mediaUrls: finalImages,
      images: finalImages,
      durationMinutes: product?.durationMinutes || attrs?.durationMinutes || 60,
      stock: product?.stock ?? attrs?.stock ?? 0,
      maxCapacity: product?.maxCapacity ?? attrs?.maxCapacity ?? '',
      minAdvanceBooking: product?.minAdvanceBooking ?? attrs?.minAdvanceBooking ?? '',
      serviceModality: product?.serviceModality || attrs?.serviceModality || '',
      includes: product?.includes || attrs?.includes || '',
      notIncludes: product?.notIncludes || attrs?.notIncludes || '',
      certifications: product?.certifications || attrs?.certifications || [],
      materials: product?.materials || attrs?.materials || [],
      clientRequirements: product?.clientRequirements || attrs?.clientRequirements || [],
      cancellationPolicy: product?.cancellationPolicy || attrs?.cancellationPolicy || '',
      availability: product?.availability || attrs?.availability || {},
      color: product?.color || attrs?.color || '',
      colorHex: product?.colorHex || attrs?.colorHex || '',
      dayOrder: savedOrder || dayOrder,
      professionalIds: product?.professionals || attrs?.professionals || attrs?.professionalIds || [],
      attributes: {
        ...attrs,
        durationMinutes: product?.durationMinutes || attrs?.durationMinutes || 60,
        maxCapacity: product?.maxCapacity ?? attrs?.maxCapacity ?? '',
        minAdvanceBooking: product?.minAdvanceBooking ?? attrs?.minAdvanceBooking ?? '',
        serviceModality: product?.serviceModality || attrs?.serviceModality || '',
        includes: product?.includes || attrs?.includes || '',
        notIncludes: product?.notIncludes || attrs?.notIncludes || '',
        certifications: product?.certifications || attrs?.certifications || [],
        materials: product?.materials || attrs?.materials || [],
        clientRequirements: product?.clientRequirements || attrs?.clientRequirements || [],
        cancellationPolicy: product?.cancellationPolicy || attrs?.cancellationPolicy || '',
        availability: product?.availability || attrs?.availability || {},
        color: product?.color || attrs?.color || '',
        colorHex: product?.colorHex || attrs?.colorHex || '',
        description: product?.description || attrs?.description || '',
        images: finalImages,
        mediaUrls: finalImages,
        stock: product?.stock ?? attrs?.stock ?? 0,
        usdReference: finalUsd,
        prices: {
          VES: finalVes,
          USD: finalUsd,
          EUR: finalEur,
          CRYPTO: finalCrypto
        },
        dayOrder: savedOrder || dayOrder,
        professionals: product?.professionals || attrs?.professionals || attrs?.professionalIds || [],
      }
    });

    // 🔥 ACTUALIZAR IMÁGENES EN LA UI - SIN DUPLICADOS (por nombre de archivo)
    const getImageKey = (url: string): string => {
      if (!url) return '';
      // Normalizar: quitar query, hash, barra final, y quedarnos con el nombre del archivo
      let clean = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
      const filename = clean.split('/').pop() || clean;
      return filename.toLowerCase();
    };

    if (finalImages.length > 0) {
      // Deduplicar finalImages por nombre de archivo (por si acaso)
      const seenKeys = new Set<string>();
      const uniqueFinalImages = finalImages.filter((url) => {
        const key = getImageKey(url);
        if (!key || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Solo procesar las que NO estén ya en el estado `images`
      setImages(prev => {
        const existingKeys = new Set(prev.map(img => getImageKey(img.url)));
        const uniqueNew = uniqueFinalImages
          .filter((url) => {
            const key = getImageKey(url);
            return key && !existingKeys.has(key);
          })
          .map((url: string, idx: number) => ({
            id: `server-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            name: url.split('/').pop() || `Imagen ${idx + 1}`,
            url: resolveServerImageUrl(url),
            progress: 100,
            status: 'success' as const,
            fileObject: undefined,
          }));
        return [...prev, ...uniqueNew];
      });
    } else if (images.length === 0) {
      setImages([]);
    }

    imagesLoadedRef.current = true;
  }, [product, exchangeRates, rates]);



  // Autoajuste del textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [newItem?.description]);

  // ==========================================
  // FUNCIONES DE IMÁGENES
  // ==========================================

  const updateParentState = useCallback((currentImages: UploadingFile[]) => {
    const validSuccessFiles = currentImages.filter(i => i.status === 'success');
    const physicalFiles = validSuccessFiles.filter(i => i.fileObject).map(i => i.fileObject);
    
    const serverUrls = validSuccessFiles
      .filter(i => !i.fileObject)
      .map(i => i.url)
      .filter(Boolean)
      .filter(url => !url.startsWith('blob:'))
      .filter(url => !url.startsWith('data:'));

    const uniqueServerUrls = Array.from(new Set(serverUrls));
    
    setNewItem((prev: any) => ({ 
      ...prev, 
      files: physicalFiles,
      existingImages: uniqueServerUrls,
      mediaUrls: uniqueServerUrls,
      images: uniqueServerUrls,
      coverImage: uniqueServerUrls.length > 0 ? uniqueServerUrls[0] : prev?.coverImage || ''
    }));
  }, []);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const availableSlots = 7 - images.length;

    if (availableSlots <= 0) { 
      showToast({
        variant: 'warning',
        message: 'Has alcanzado el límite máximo de 7 imágenes permitidas.',
      });
      return; 
    }

    const filesToProcess = rawFiles.slice(0, availableSlots);
    const existingUrls = new Set(images.map(img => img.url));

    const newUploadingFiles: UploadingFile[] = filesToProcess
      .map(file => {
        const url = URL.createObjectURL(file);
        if (existingUrls.has(url)) {
          return null;
        }
        
        const MAX_SIZE_BYTES = 5 * 1024 * 1024;
        const isOverSize = file.size > MAX_SIZE_BYTES; 

        return {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          url: url,
          progress: 100,
          status: isOverSize ? 'error' : 'success',
          errorMessage: isOverSize ? `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(2)}MB y supera el límite de 5MB.` : undefined,
          fileObject: isOverSize ? undefined : file
        };
      })
      .filter((img): img is UploadingFile => img !== null);

    if (newUploadingFiles.length === 0) {
      showToast({
        variant: 'warning',
        message: 'Estas imágenes ya están cargadas o son duplicados.',
      });
      return;
    }
    
    const updated = [...images, ...newUploadingFiles];
    setImages(updated);
    updateParentState(updated);
  }, [images, updateParentState, showToast]);

  const removeImage = useCallback((id: string) => {
    const next = images.filter(i => i.id !== id);
    setImages(next);
    updateParentState(next);
  }, [images, updateParentState]);

  // ==========================================
  // FUNCIONES DEL FORMULARIO
  // ==========================================

  const generateNewSku = useCallback(() => {
    const category = newItem?.category || '';
    const serviceName = newItem?.name || '';
    const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'SRV';
    const namePrefix = serviceName ? serviceName.substring(0, 3).toUpperCase() : 'SVC';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newSku = `${catPrefix}-${namePrefix}-${randomNum}`;
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      itemId: newSku, 
      sku: newSku, 
      code: newSku, 
      manualSku: true 
    }));
  }, [newItem?.category, newItem?.name]);

  const handleStockChange = (delta: number) => {
    const currentStock = Number(newItem?.stock ?? 0);
    const nextVal = Math.max(0, currentStock + delta);
    setNewItem((prev: any) => ({ ...(prev || {}), stock: nextVal }));
  };

const handlePriceChange = (currency: string, value: string) => {
  const numValue = value === '' ? 0 : parseFloat(value) || 0;
  const roundedValue = roundPrice(numValue);
  
  const rateUSD = getRateUSD();
  const rateEUR = getRateEUR();

  if (rateUSD === 0) {
    showToast({
      variant: 'warning',
      message: '⚠️ No hay tasa USD disponible. No se pueden calcular precios.',
    });
    return;
  }

  setNewItem((prev: any) => {
    const currentPrices = prev?.prices || { VES: 0, USD: 0, EUR: 0, CRYPTO: 0 };
    let updatedPrices = { ...currentPrices };

    if (currency === 'VES') {
      updatedPrices.VES = roundedValue;
      updatedPrices.USD = roundPrice(roundedValue / rateUSD);
      updatedPrices.EUR = rateEUR > 0 ? roundPrice(updatedPrices.USD * (rateUSD / rateEUR)) : 0;
      updatedPrices.CRYPTO = updatedPrices.USD;
    } 
    else if (currency === 'USD') {
      updatedPrices.USD = roundedValue;
      updatedPrices.VES = roundPrice(roundedValue * rateUSD);
      updatedPrices.EUR = rateEUR > 0 ? roundPrice(roundedValue * (rateUSD / rateEUR)) : 0;
      updatedPrices.CRYPTO = roundedValue;
    }
    else if (currency === 'EUR') {
      updatedPrices.EUR = roundedValue;
      if (rateEUR > 0) {
        const usdValue = roundPrice(roundedValue * (rateEUR / rateUSD));
        updatedPrices.USD = usdValue;
        updatedPrices.VES = roundPrice(usdValue * rateUSD);
        updatedPrices.CRYPTO = usdValue;
      }
    }
    else if (currency === 'CRYPTO') {
      updatedPrices.CRYPTO = roundedValue;
      updatedPrices.USD = roundedValue;
      updatedPrices.VES = roundPrice(roundedValue * rateUSD);
      updatedPrices.EUR = rateEUR > 0 ? roundPrice(roundedValue * (rateUSD / rateEUR)) : 0;
    }

    return {
      ...prev,
      price: updatedPrices.VES,
      usdReference: updatedPrices.USD,
      prices: updatedPrices
    };
  });
};

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setNewItem((prev: any) => ({
      ...(prev || {}),
      durationMinutes: value ? Number(value) : ''
    }));
  };

  // ==========================================
  // HANDLERS DE SERVICIOS
  // ==========================================

  const toggleCertification = (cert: string) => {
    const current = newItem?.certifications || [];
    const updated = current.includes(cert) 
      ? current.filter((c: string) => c !== cert)
      : [...current, cert];
    setNewItem((prev: any) => ({ ...(prev || {}), certifications: updated }));
  };

  const toggleMaterial = (material: string) => {
    const current = newItem?.materials || [];
    const updated = current.includes(material) 
      ? current.filter((m: string) => m !== material)
      : [...current, material];
    setNewItem((prev: any) => ({ ...(prev || {}), materials: updated }));
  };

  const toggleRequirement = (req: string) => {
    const current = newItem?.clientRequirements || [];
    const updated = current.includes(req) 
      ? current.filter((r: string) => r !== req)
      : [...current, req];
    setNewItem((prev: any) => ({ ...(prev || {}), clientRequirements: updated }));
  };

  const handleCancellationChange = (value: string) => {
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      cancellationPolicy: prev?.cancellationPolicy === value ? '' : value 
    }));
  };

  const toggleTag = (catKey: string, tag: string) => {
    setNewItem((prev: any) => {
      const currentFeatures = prev?.features || [];
      const catConfig = SERVICE_TAG_CATEGORIES[catKey as keyof typeof SERVICE_TAG_CATEGORIES];
      if (!catConfig) return prev;
      
      const catTags = catConfig.tags;
      const isMulti = catConfig.multi;
      
      let nextFeatures = [...currentFeatures];

      if (!isMulti) {
        nextFeatures = nextFeatures.filter(t => !catTags.includes(t));
        nextFeatures.push(tag);
      } else {
        nextFeatures = nextFeatures.includes(tag) 
          ? nextFeatures.filter(t => t !== tag) 
          : [...nextFeatures, tag];
      }

      return { ...prev, features: nextFeatures };
    });
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (!isOpen) return null;

  const currentStock = Number(newItem?.stock ?? 0);
  const exceptions = newItem?.availability?.exceptions || {};
  const closedDates = newItem?.availability?.closed || [];
  const orderedDays = getOrderedDays();

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: overlayBg }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ 
          backgroundColor: cardBg,
          border: `1px solid ${borderDynamic}`,
          color: textColor
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div 
          className="px-6 py-4 border-b flex justify-between items-center shrink-0"
          style={{ borderColor: borderDynamic }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Editar Servicio</span>
              <h3 className="text-sm sm:text-base font-bold" style={{ color: textColor }}>
                {newItem?.name || 'Servicio'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95`}
            style={dynamicSubCardStyle}
          >
            <XIcon />
          </button>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Título / Nombre del Servicio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Consulta Especializada, Sesión de Coaching..."
              value={newItem?.name || ''}
              onChange={(e) => setNewItem((prev: any) => ({ ...(prev || {}), name: e.target.value }))}
              className={inputClass}
              style={{ borderColor: borderDynamic, color: textColor }}
            />
          </div>

          {/* 🔥 FASE K: Canales de Venta */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Canales de Venta
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Kiosco */}
              <button
                type="button"
                onClick={() => {
                  setNewItem((prev: any) => ({
                    ...(prev || {}),
                    availableKiosk: !(prev?.availableKiosk ?? true),
                  }));
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  (newItem?.availableKiosk ?? true)
                    ? 'border-2 shadow-md'
                    : 'opacity-60 hover:opacity-80'
                }`}
                style={{
                  borderColor: (newItem?.availableKiosk ?? true) ? primary : borderDynamic,
                  backgroundColor: (newItem?.availableKiosk ?? true) ? `${primary}15` : 'transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      borderColor: (newItem?.availableKiosk ?? true) ? primary : textColor,
                      backgroundColor: (newItem?.availableKiosk ?? true) ? primary : 'transparent',
                    }}
                  >
                    {(newItem?.availableKiosk ?? true) && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-bold" style={{ color: (newItem?.availableKiosk ?? true) ? primary : textColor }}>
                      Disponible en kiosco
                    </div>
                    <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                      Visible en el POS presencial
                    </div>
                  </div>
                </div>
              </button>

              {/* Tienda online */}
              <button
                type="button"
                onClick={() => {
                  setNewItem((prev: any) => ({
                    ...(prev || {}),
                    availableOnline: !(prev?.availableOnline ?? true),
                  }));
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  (newItem?.availableOnline ?? true)
                    ? 'border-2 shadow-md'
                    : 'opacity-60 hover:opacity-80'
                }`}
                style={{
                  borderColor: (newItem?.availableOnline ?? true) ? primary : borderDynamic,
                  backgroundColor: (newItem?.availableOnline ?? true) ? `${primary}15` : 'transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      borderColor: (newItem?.availableOnline ?? true) ? primary : textColor,
                      backgroundColor: (newItem?.availableOnline ?? true) ? primary : 'transparent',
                    }}
                  >
                    {(newItem?.availableOnline ?? true) && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-bold" style={{ color: (newItem?.availableOnline ?? true) ? primary : textColor }}>
                      Disponible en tienda online
                    </div>
                    <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                      Visible en el catálogo web
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Categoría * <span className="text-[9px] font-normal opacity-60">({filteredCategories.length} disponibles)</span>
            </label>
            
            <div className="relative">
              <div 
                className="w-full rounded-xl border text-xs outline-none transition cursor-text flex items-center justify-between px-3.5 py-2.5 bg-transparent"
                style={{ borderColor: borderDynamic, color: textColor }}
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              >
                <span className={newItem?.category ? '' : 'opacity-50'}>
                  {newItem?.category ? formatFriendlyText(newItem.category) : 'Buscar o seleccionar categoría...'}
                </span>
                <ChevronIcon color={textColor} open={isCategoryDropdownOpen} />
              </div>

              {isCategoryDropdownOpen && (
                <div 
                  className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl max-h-64 overflow-hidden flex flex-col"
                  style={{ 
                    backgroundColor: dropdownBg,
                    borderColor: dropdownBorder,
                  }}
                >
                  <div className="p-2 border-b" style={{ borderColor: dropdownBorder }}>
                    <div className="relative flex items-center gap-2">
                      <SearchIcon color={mutedText} />
                      <input
                        type="text"
                        placeholder="Filtrar categorías..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none border-none bg-transparent"
                        style={{ 
                          color: textColor,
                          backgroundColor: 'transparent',
                          boxShadow: 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {filteredCategories.length === 0 ? (
                      <div className="px-3.5 py-4 text-center text-xs opacity-60" style={{ color: textColor }}>
                        No se encontraron categorías
                      </div>
                    ) : (
                      filteredCategories.map((cat) => {
                        const isSelected = newItem?.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setNewItem((prev: any) => ({ ...(prev || {}), category: cat }));
                              setCategorySearch('');
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="w-full px-3.5 py-2.5 text-xs text-left transition flex items-center justify-between hover:opacity-80"
                            style={{ 
                              color: isSelected ? primary : textColor,
                              backgroundColor: isSelected ? dropdownItemSelected : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = dropdownItemHover;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span>{formatFriendlyText(cat)}</span>
                            {isSelected && <CheckIcon color={primary} />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3.5 py-1.5 border-t text-[9px] opacity-50" style={{ 
                    borderColor: dropdownBorder,
                    color: textColor 
                  }}>
                    {filteredCategories.length} categorías
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Duración del Servicio *
            </label>
            <SearchableDropdown
              value={String(newItem?.durationMinutes || '')}
              onChange={(val) => {
                const syntheticEvent = { target: { value: val } } as any;
                handleDurationChange(syntheticEvent);
              }}
              options={[
                { value: '', label: 'Seleccionar duración...' },
                ...DURATION_OPTIONS.map((opt) => ({
                  value: String(opt.value),
                  label: opt.label,
                })),
              ]}
              placeholder="Seleccionar duración..."
              searchable={true}
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderDynamic}
              footerLabel={(n) => `${n} duraciones`}
            />
          </div>

          {/* Precios */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Precios por Moneda
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>VES</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newItem?.prices?.VES ?? ''}
                  onChange={(e) => handlePriceChange('VES', e.target.value)}
                  className={inputClass}
                  style={{ borderColor: borderDynamic, color: textColor }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>USD</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newItem?.prices?.USD ?? ''}
                  onChange={(e) => handlePriceChange('USD', e.target.value)}
                  className={inputClass}
                  style={{ borderColor: borderDynamic, color: textColor }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>EUR</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newItem?.prices?.EUR ?? ''}
                  onChange={(e) => handlePriceChange('EUR', e.target.value)}
                  className={inputClass}
                  style={{ borderColor: borderDynamic, color: textColor }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>USDT</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newItem?.prices?.CRYPTO ?? ''}
                  onChange={(e) => handlePriceChange('CRYPTO', e.target.value)}
                  className={inputClass}
                  style={{ borderColor: borderDynamic, color: textColor }}
                />
              </div>
            </div>
          </div>

          {/* 🔥 SECCIÓN DE OFERTA Y DESCUENTO */}
          <div className="pt-3">
            <DiscountSection
              newItem={newItem}
              setNewItem={setNewItem}
              textColor={textColor}
              primary={primary}
              isDarkBg={isDarkBg}
              style={{
                borderColor: borderDynamic,
                color: textColor,
              }}
              isService={true}
            />
          </div>

          {/* 🔥 PROFESIONALES ASIGNADOS - REEMPLAZA IVA */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Profesionales Asignados
                <span className="text-[9px] font-normal opacity-50 ml-2">
                  (Selecciona quiénes ofrecen este servicio)
                </span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: borderDynamic, color: textColor }}>
                {(newItem?.professionalIds || []).length} seleccionados
              </span>
            </div>

            {loadingProfessionals ? (
              <div className="text-center py-6 text-xs opacity-50" style={{ color: textColor }}>
                <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
                Cargando profesionales...
              </div>
            ) : professionals.length === 0 ? (
              <div className="text-center py-6 text-xs opacity-50 border rounded-xl p-4" style={{ borderColor: borderDynamic }}>
                <p style={{ color: textColor }}>No hay profesionales registrados en esta tienda.</p>
                <button 
                  type="button"
                  className="mt-2 text-emerald-500 hover:underline font-medium"
                  onClick={() => {
                    const url = `/admin/${window.location.pathname.split('/')[2]}?tab=professionals`;
                    window.location.href = url;
                  }}
                >
                  Ir a gestionar profesionales →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {professionals.map((prof) => {
                  const isSelected = (newItem?.professionalIds || []).includes(prof.id);
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        const current = newItem?.professionalIds || [];
                        const updated = isSelected 
                          ? current.filter((id: string) => id !== prof.id)
                          : [...current, prof.id];
                        setNewItem((prev: any) => ({
                          ...prev,
                          professionalIds: updated,
                        }));
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${isSelected ? 'border-2 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                      style={{
                        borderColor: isSelected ? primary : borderDynamic,
                        backgroundColor: isSelected ? `${primary}10` : 'transparent'
                      }}
                    >
                      <div 
                        className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : ''}`} 
                        style={{ borderColor: isSelected ? 'transparent' : borderDynamic }}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: textColor }}>
                          {prof.name}
                        </div>
                        {prof.specialties && prof.specialties.length > 0 && (
                          <div className="text-[9px] opacity-50 truncate">
                            {prof.specialties.slice(0, 2).join(', ')}
                            {prof.specialties.length > 2 && ` +${prof.specialties.length - 2}`}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GRID: Capacidad, Código, Anticipación, Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                  Cupos Máximos *
                </label>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  newItem?.maxCapacity && newItem.maxCapacity > 10 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {newItem?.maxCapacity && newItem.maxCapacity > 10 ? 'Alta capacidad' : 'Cupos limitados'}
                </span>
              </div>
              <input
                type="number"
                step="1"
                min="0"
                required
                placeholder="Ej. 20 personas"
                value={newItem?.maxCapacity ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setNewItem((prev: any) => ({ ...(prev || {}), maxCapacity: val }));
                }}
                className={inputClass}
                style={{ borderColor: borderDynamic, color: textColor }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                ID / Código del Servicio
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ej. SRV-849201"
                  value={newItem?.itemId || newItem?.sku || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewItem((prev: any) => ({ 
                      ...(prev || {}), 
                      itemId: val, 
                      sku: val, 
                      code: val, 
                      manualSku: true 
                    }));
                  }}
                  className={`${inputClass} font-mono pr-10`}
                  style={{ borderColor: borderDynamic, color: textColor }}
                />
                <button
                  type="button"
                  onClick={generateNewSku}
                  title="Generar código automático"
                  className="absolute right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
                  style={{ color: primary }}
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Anticipación Mínima
              </label>
              <SearchableDropdown
                value={String(newItem?.minAdvanceBooking ?? '')}
                onChange={(val) => {
                  setNewItem((prev: any) => ({ ...(prev || {}), minAdvanceBooking: val ? Number(val) : '' }));
                }}
                options={[
                  { value: '', label: 'Sin anticipación mínima' },
                  { value: '0', label: 'Inmediato' },
                  { value: '15', label: '15 minutos' },
                  { value: '30', label: '30 minutos' },
                  { value: '60', label: '1 hora' },
                  { value: '120', label: '2 horas' },
                  { value: '240', label: '4 horas' },
                  { value: '480', label: '8 horas' },
                  { value: '720', label: '12 horas' },
                  { value: '1440', label: '24 horas (1 día)' },
                  { value: '2880', label: '48 horas (2 días)' },
                  { value: '4320', label: '72 horas (3 días)' },
                  { value: '10080', label: '1 semana' },
                ]}
                placeholder="Sin anticipación mínima"
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={borderDynamic}
                searchable={false}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Modalidad del Servicio
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Presencial', 'Online / Virtual', 'A Domicilio', 'Híbrido'].map((modality) => {
                  const isSelected = newItem?.serviceModality === modality;
                  return (
                    <button
                      key={modality}
                      type="button"
                      onClick={() => {
                        setNewItem((prev: any) => ({ 
                          ...(prev || {}), 
                          serviceModality: prev?.serviceModality === modality ? '' : modality 
                        }));
                      }}
                      className={`px-3 py-2 rounded-xl border text-[10px] font-medium transition cursor-pointer ${
                        isSelected 
                          ? 'border-transparent text-white shadow-sm' 
                          : `opacity-70 hover:opacity-100 ${isDarkBg ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
                      }`}
                      style={{
                        backgroundColor: isSelected ? primary : 'transparent',
                        borderColor: isSelected ? 'transparent' : borderDynamic,
                        color: isSelected ? '#ffffff' : textColor,
                      }}
                    >
                      {modality}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================
              DISPONIBILIDAD - ATAJOS RÁPIDOS
              ============================================================ */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Atajos Rápidos
              </label>
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                {orderedDays.filter(d => d.isActive).length} días activos
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TimeSelect
                value={quickStartTime}
                onChange={setQuickStartTime}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                className="w-24"
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                <ArrowRightIcon />
              </span>
              <TimeSelect
                value={quickEndTime}
                onChange={setQuickEndTime}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                className="w-24"
              />
              <span className="text-[9px] opacity-40 mx-1" style={{ color: textColor }}>|</span>
              
              <button
                type="button"
                onClick={() => setAllDaysSchedule(quickStartTime, quickEndTime)}
                className="px-3 py-1.5 rounded-xl text-[9px] font-bold transition hover:opacity-80 active:scale-[0.97] border"
                style={{ 
                  borderColor: borderDynamic, 
                  color: textColor,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                }}
              >
                Todos los días
              </button>
              
              <button
                type="button"
                onClick={() => setWeekdaysSchedule(quickStartTime, quickEndTime)}
                className="px-3 py-1.5 rounded-xl text-[9px] font-bold transition hover:opacity-80 active:scale-[0.97] border"
                style={{ 
                  borderColor: borderDynamic, 
                  color: textColor,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                }}
              >
                Lun-Vie
              </button>
              
              <button
                type="button"
                onClick={() => setWeekendSchedule(quickStartTime, quickEndTime)}
                className="px-3 py-1.5 rounded-xl text-[9px] font-bold transition hover:opacity-80 active:scale-[0.97] border"
                style={{ 
                  borderColor: borderDynamic, 
                  color: textColor,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                }}
              >
                Fin de semana
              </button>
              
              <button
                type="button"
                onClick={closeAllDays}
                className="px-3 py-1.5 rounded-xl text-[9px] font-bold transition hover:opacity-80 active:scale-[0.97] border border-red-500/30"
                style={{ 
                  color: '#ef4444',
                  backgroundColor: isDarkBg ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'
                }}
              >
                Cerrar todos
              </button>
            </div>
          </div>

          {/* DISPONIBILIDAD - DÍAS Y HORARIOS con Drag & Drop */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                  Horario Semanal
                </label>
                <span className="text-[9px] opacity-50 block mt-0.5" style={{ color: textColor }}>
                  Arrastra los días para reordenarlos
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {orderedDays.map((day, index) => (
                <DayCard
                  key={day.value}
                  day={day.value}
                  dayLabel={day.label}
                  schedules={day.schedules}
                  isActive={day.isActive}
                  isDragging={dragIndex === index}
                  isOver={dropIndex === index}
                  onToggle={toggleDayAvailability}
                  onAddSchedule={addDaySchedule}
                  onRemoveSchedule={removeDaySchedule}
                  onUpdateSchedule={updateDaySchedule}
                  borderDynamic={borderDynamic}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  primary={primary}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  dragHandleProps={{
                    onMouseDown: (e: React.MouseEvent) => {
                      if (!day.isActive) e.preventDefault();
                    },
                  }}
                />
              ))}
            </div>

            {orderedDays.filter(d => d.isActive).length === 0 && (
              <div 
                className="text-center py-6 border-2 border-dashed rounded-2xl"
                style={{ borderColor: borderDynamic }}
              >
                <span className="text-xs opacity-40" style={{ color: mutedText }}>
                  No hay días configurados. Activa un día o usa un atajo rápido.
                </span>
              </div>
            )}
          </div>

          {/* FECHAS ESPECÍFICAS (Excepciones) con RANGO */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Excepciones
                <span className="text-[9px] font-normal opacity-50 ml-2">
                  (Horario diferente para fechas puntuales)
                </span>
              </label>
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                {Object.keys(exceptions).length} fechas
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                value={exceptionDateStart}
                onChange={setExceptionDateStart}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                placeholder="Desde"
                primary={primary}
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                <ArrowRightIcon />
              </span>
              <DatePicker
                value={exceptionDateEnd}
                onChange={setExceptionDateEnd}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                placeholder="Hasta"
                primary={primary}
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>|</span>
              <TimeSelect
                value={exceptionStart}
                onChange={setExceptionStart}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                className="w-24"
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                <ArrowRightIcon />
              </span>
              <TimeSelect
                value={exceptionEnd}
                onChange={setExceptionEnd}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                className="w-24"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={addExceptionRange}
                icon={<PlusIcon />}
                primary={primary}
                borderColor={borderDynamic}
                textColor={textColor}
                cardBg={cardBg}
                isDarkBg={isDarkBg}
              >
                Agregar Rango
              </Button>
            </div>
            <span className="text-[8px] opacity-40 block" style={{ color: mutedText }}>
              * Si dejas "Hasta" vacío, se aplica solo a la fecha de inicio
            </span>

            {Object.keys(exceptions).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(exceptions).map(([date, slots]) => (
                  <div
                    key={date}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                    style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: textColor }}>
                      {date}:
                    </span>
                    {(slots as any[]).map((slot, idx) => (
                      <span key={idx} className="text-[9px] opacity-70" style={{ color: mutedText }}>
                        {getTimeLabel(slot.start)} → {getTimeLabel(slot.end)}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeExceptionDate(date)}
                      className="ml-1 text-red-400 hover:text-red-500 transition opacity-60 hover:opacity-100"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DÍAS CERRADOS con RANGO */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Días Cerrados
                <span className="text-[9px] font-normal opacity-50 ml-2">
                  (Fechas sin atención)
                </span>
              </label>
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                {closedDates.length} días
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                value={closedDateStart}
                onChange={setClosedDateStart}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                placeholder="Desde"
                primary={primary}
              />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                <ArrowRightIcon />
              </span>
              <DatePicker
                value={closedDateEnd}
                onChange={setClosedDateEnd}
                borderDynamic={borderDynamic}
                textColor={textColor}
                isDarkBg={isDarkBg}
                placeholder="Hasta"
                primary={primary}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={addClosedRange}
                icon={<PlusIcon />}
                primary={primary}
                borderColor={borderDynamic}
                textColor={textColor}
                cardBg={cardBg}
                isDarkBg={isDarkBg}
              >
                Marcar Rango Cerrado
              </Button>
            </div>
            <span className="text-[8px] opacity-40 block" style={{ color: mutedText }}>
              * Si dejas "Hasta" vacío, se aplica solo a la fecha de inicio
            </span>

            {closedDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {closedDates.map((date: string) => (
                  <div
                    key={date}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10"
                  >
                    <span className="text-[10px] font-medium text-red-400">
                      {date}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeClosedDate(date)}
                      className="ml-1 text-red-400 hover:text-red-500 transition opacity-60 hover:opacity-100"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLOR IDENTIFICADOR */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Color del Servicio
                <span className="text-[9px] font-normal opacity-50 ml-2">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-3 py-1 rounded-xl border font-medium" style={{ borderColor: borderDynamic, color: textColor }}>
                  {newItem?.color || 'Único'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {SERVICE_PRESET_COLORS.map((col) => {
                const isSelected = (newItem?.color || 'Único') === col.value;
                return (
                  <button
                    key={col.value}
                    type="button"
                    title={col.label}
                    onClick={() => {
                      setNewItem((prev: any) => ({ ...(prev || {}), color: col.value }));
                    }}
                    className={`w-8 h-8 rounded-full transition-all relative cursor-pointer shadow-sm ${
                      isSelected 
                        ? 'ring-2 ring-offset-2 scale-110 shadow-md' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      background: col.hex,
                      borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      borderWidth: '1px',
                    }}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-black mix-blend-difference">
                        <CheckIcon color="#000000" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incluye / No Incluye */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Incluye
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Materiales, herramientas, certificado..."
                value={newItem?.includes || ''}
                onChange={(e) => setNewItem((prev: any) => ({ ...(prev || {}), includes: e.target.value }))}
                className={`${inputClass} resize-none`}
                style={{ borderColor: borderDynamic, color: textColor }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                No Incluye
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Transporte, materiales adicionales..."
                value={newItem?.notIncludes || ''}
                onChange={(e) => setNewItem((prev: any) => ({ ...(prev || {}), notIncludes: e.target.value }))}
                className={`${inputClass} resize-none`}
                style={{ borderColor: borderDynamic, color: textColor }}
              />
            </div>
          </div>

          {/* Materiales / Equipamiento */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }} ref={materialsContainerRef}>
            <div className="flex items-center justify-between h-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Materiales / Equipamiento
              </label>
              <span className="text-[10px] opacity-60">
                {newItem?.materials?.length || 0} seleccionados
              </span>
            </div>

            <div className="relative">
              <div 
                className={`w-full rounded-xl border text-xs outline-none transition cursor-pointer flex items-center justify-between px-3.5 py-2.5 bg-transparent`}
                style={{ borderColor: borderDynamic, color: textColor }}
                onClick={() => setShowMaterialsMenu(!showMaterialsMenu)}
              >
                <span className={newItem?.materials?.length > 0 ? '' : 'opacity-50'}>
                  {newItem?.materials?.length > 0 
                    ? newItem.materials.slice(0, 3).join(', ') + (newItem.materials.length > 3 ? '...' : '')
                    : 'Seleccionar materiales o equipamiento...'}
                </span>
                <span className="text-[10px] opacity-60">▼</span>
              </div>

              {showMaterialsMenu && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
                  style={{ 
                    backgroundColor: dropdownBg,
                    borderColor: dropdownBorder,
                    color: textColor
                  }}
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 bg-black/5 dark:bg-black/20 sticky top-0 backdrop-blur-md flex justify-between items-center z-10" style={{ color: textColor }}>
                    <span>Materiales disponibles</span>
                    <span className="text-[9px] font-mono opacity-80">{COMMON_MATERIALS.length} opciones</span>
                  </div>

                  {COMMON_MATERIALS.map((material) => {
                    const isSelected = newItem?.materials?.includes(material);
                    return (
                      <button
                        key={material}
                        type="button"
                        onClick={() => toggleMaterial(material)}
                        className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-black/10 dark:bg-white/15 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                        style={{ color: textColor }}
                      >
                        <span>{material}</span>
                        {isSelected && <CheckIcon color={primary} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Certificaciones */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }} ref={certContainerRef}>
            <div className="flex items-center justify-between h-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Certificaciones / Acreditaciones
              </label>
              <span className="text-[10px] opacity-60">
                {newItem?.certifications?.length || 0} seleccionadas
              </span>
            </div>

            <div className="relative">
              <div 
                className={`w-full rounded-xl border text-xs outline-none transition cursor-pointer flex items-center justify-between px-3.5 py-2.5 bg-transparent`}
                style={{ borderColor: borderDynamic, color: textColor }}
                onClick={() => setShowCertMenu(!showCertMenu)}
              >
                <span className={newItem?.certifications?.length > 0 ? '' : 'opacity-50'}>
                  {newItem?.certifications?.length > 0 
                    ? newItem.certifications.slice(0, 3).join(', ') + (newItem.certifications.length > 3 ? '...' : '')
                    : 'Seleccionar certificaciones...'}
                </span>
                <span className="text-[10px] opacity-60">▼</span>
              </div>

              {showCertMenu && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
                  style={{ 
                    backgroundColor: dropdownBg,
                    borderColor: dropdownBorder,
                    color: textColor
                  }}
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 bg-black/5 dark:bg-black/20 sticky top-0 backdrop-blur-md flex justify-between items-center z-10" style={{ color: textColor }}>
                    <span>Certificaciones</span>
                    <span className="text-[9px] font-mono opacity-80">{CERTIFICATIONS.length} disponibles</span>
                  </div>

                  {CERTIFICATIONS.map((cert) => {
                    const isSelected = newItem?.certifications?.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => toggleCertification(cert)}
                        className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-black/10 dark:bg-white/15 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                        style={{ color: textColor }}
                      >
                        <span>{cert}</span>
                        {isSelected && <CheckIcon color={primary} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Requisitos del Cliente */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }} ref={requirementsContainerRef}>
            <div className="flex items-center justify-between h-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Requisitos del Cliente
              </label>
              <span className="text-[10px] opacity-60">
                {newItem?.clientRequirements?.length || 0} seleccionados
              </span>
            </div>

            <div className="relative">
              <div 
                className={`w-full rounded-xl border text-xs outline-none transition cursor-pointer flex items-center justify-between px-3.5 py-2.5 bg-transparent`}
                style={{ borderColor: borderDynamic, color: textColor }}
                onClick={() => setShowRequirementsMenu(!showRequirementsMenu)}
              >
                <span className={newItem?.clientRequirements?.length > 0 ? '' : 'opacity-50'}>
                  {newItem?.clientRequirements?.length > 0 
                    ? newItem.clientRequirements.slice(0, 3).join(', ') + (newItem.clientRequirements.length > 3 ? '...' : '')
                    : 'Seleccionar requisitos...'}
                </span>
                <span className="text-[10px] opacity-60">▼</span>
              </div>

              {showRequirementsMenu && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
                  style={{ 
                    backgroundColor: dropdownBg,
                    borderColor: dropdownBorder,
                    color: textColor
                  }}
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 bg-black/5 dark:bg-black/20 sticky top-0 backdrop-blur-md flex justify-between items-center z-10" style={{ color: textColor }}>
                    <span>Requisitos del cliente</span>
                    <span className="text-[9px] font-mono opacity-80">{CLIENT_REQUIREMENTS.length} disponibles</span>
                  </div>

                  {CLIENT_REQUIREMENTS.map((req) => {
                    const isSelected = newItem?.clientRequirements?.includes(req);
                    return (
                      <button
                        key={req}
                        type="button"
                        onClick={() => toggleRequirement(req)}
                        className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-black/10 dark:bg-white/15 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                        style={{ color: textColor }}
                      >
                        <span>{req}</span>
                        {isSelected && <CheckIcon color={primary} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Política de Cancelación */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Política de Cancelación
            </label>
            <div className="flex flex-wrap gap-2">
              {CANCELLATION_POLICIES.map((policy) => {
                const isSelected = newItem?.cancellationPolicy === policy.value;
                return (
                  <button
                    key={policy.value}
                    type="button"
                    onClick={() => handleCancellationChange(policy.value)}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-medium transition cursor-pointer ${isSelected ? 'border-transparent text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                    style={{
                      backgroundColor: isSelected ? primary : 'transparent',
                      borderColor: isSelected ? 'transparent' : borderDynamic
                    }}
                  >
                    {policy.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Descripción del Servicio
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="Detalles de la sesión, lo que incluye..."
              value={newItem?.description || ''}
              onChange={(e) => setNewItem((prev: any) => ({ ...prev, description: e.target.value }))}
              className={`${inputClass} resize-none`}
              style={{ borderColor: borderDynamic, color: textColor }}
            />
          </div>

          {/* Etiquetas de Servicio - CON ACORDEÓN (CONTRAÍDO POR DEFECTO) */}
          <div className="space-y-4 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: borderDynamic }}>
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Etiquetas / Características del Servicio
              </label>
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                {newItem?.features?.length || 0} seleccionadas
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(SERVICE_TAG_CATEGORIES).map(([key, cat]) => (
                <TagAccordion
                  key={key}
                  categoryKey={key}
                  cat={cat}
                  newItem={newItem}
                  toggleTag={toggleTag}
                  textColor={textColor}
                  borderDynamic={borderDynamic}
                  primary={primary}
                />
              ))}
            </div>
          </div>

          {/* Galería de Imágenes */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Galería Multimedia ({images.length}/7)
              </label>
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>Máx. 5MB por archivo</span>
            </div>
            
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(e.target.files);
                  e.target.value = '';
                }
              }} 
            />
            
            <div
              onClick={() => {
                if (images.length < 7) fileInputRef.current?.click();
                else showToast({
                  variant: 'warning',
                  message: 'Has alcanzado el límite máximo de 7 imágenes.',
                });
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
              }}
              className="border border-dashed rounded-2xl p-6 text-center cursor-pointer bg-zinc-500/5 hover:bg-zinc-500/10 transition flex flex-col items-center justify-center gap-2"
              style={{ borderColor: borderDynamic }}
            >
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: textColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-xs opacity-70" style={{ color: textColor }}>
                {images.length >= 7 ? 'Límite de 7 imágenes alcanzado' : 'Arrastra imágenes o haz clic para cargar'}
              </p>
            </div>

            {images.length > 0 && (
              <div className="space-y-2.5">
                {images.map((img) => (
                  <div 
                    key={img.id} 
                    className="flex items-center gap-3.5 p-3 rounded-xl border text-xs"
                    style={dynamicSubCardStyle}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        onClick={() => setPreviewImage(img.url)}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-85 transition" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('span');
                            fallback.className = 'text-[9px] opacity-40 w-full h-full flex items-center justify-center';
                            fallback.textContent = '📷';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <span className="truncate font-medium text-xs" style={{ color: textColor }}>{img.name}</span>
                      <span className="text-[9px] opacity-50" style={{ color: textColor }}>Lista</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="p-2 rounded-lg bg-zinc-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer shrink-0"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0" style={{ borderColor: borderDynamic }}>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            primary={primary}
            borderColor={borderDynamic}
            textColor={textColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          >
            Cancelar
          </Button>
          <button 
            type="button" 
            onClick={() => {
              if (onSave) {
                const formData = new FormData();

                const parsedMaxCapacity = Number(newItem?.maxCapacity);
                const maxCapacityVal = Number.isFinite(parsedMaxCapacity) ? parsedMaxCapacity : '';
                const skuVal = newItem?.itemId || newItem?.sku || newItem?.code || '';
                const parsedDuration = Number(newItem?.durationMinutes ?? 60);
                const durationVal = Number.isFinite(parsedDuration) ? parsedDuration : 60;

                formData.append('name', newItem?.name || '');
                formData.append('description', newItem?.description || '');
                formData.append('category', newItem?.category || '');
                formData.append('itemType', 'service');
                formData.append('status', newItem?.status || 'published');
                formData.append('isActive', String(newItem?.isActive ?? true));
                formData.append('itemId', skuVal);

                // 🔥 OFERTA Y DESCUENTO
                formData.append('onSale', String(newItem?.onSale || false));
                formData.append('discountPercentage', String(newItem?.discountPercentage || 0));
                if (newItem?.discountStartDate) {
                  formData.append('discountStartDate', newItem.discountStartDate);
                }
                if (newItem?.discountEndDate) {
                  formData.append('discountEndDate', newItem.discountEndDate);
                }
formData.append('durationMinutes', String(durationVal));
formData.append('stock', String(newItem?.stock ?? 0)); // 🔥 AGREGAR ESTO
if (maxCapacityVal !== '') {
  formData.append('maxCapacity', String(maxCapacityVal));
}
                
                // Campos adicionales de servicio
                if (newItem?.minAdvanceBooking !== undefined && newItem?.minAdvanceBooking !== '') {
                  formData.append('minAdvanceBooking', String(newItem.minAdvanceBooking));
                }
                if (newItem?.serviceModality) {
                  formData.append('serviceModality', newItem.serviceModality);
                }
                // 🔥 FASE K: canales de venta
                formData.append('availableKiosk', String(newItem?.availableKiosk ?? true));
                formData.append('availableOnline', String(newItem?.availableOnline ?? true));
                if (newItem?.includes) {
                  formData.append('includes', newItem.includes);
                }
                if (newItem?.notIncludes) {
                  formData.append('notIncludes', newItem.notIncludes);
                }
                if (newItem?.cancellationPolicy) {
                  formData.append('cancellationPolicy', newItem.cancellationPolicy);
                }
                if (newItem?.color) {
                  formData.append('color', newItem.color);
                }
                if (newItem?.colorHex) {
                  formData.append('colorHex', newItem.colorHex);
                }
                
// 🔥 COMENTAR TEMPORALMENTE para probar
// if (newItem?.availability) {
//   formData.append('availability', JSON.stringify(newItem.availability));
// }
                
                if (newItem?.tenantId) formData.append('tenantId', newItem.tenantId);

                // Guardar el orden de los días
                if (dayOrder && dayOrder.length === 7) {
                  formData.append('dayOrder', JSON.stringify(dayOrder));
                }

                // 🔥 GUARDAR PROFESIONALES ASIGNADOS
                if (Array.isArray(newItem?.professionalIds)) {
                  formData.append('professionals', JSON.stringify(newItem.professionalIds));
                }

                const vesVal = roundPrice(Number(newItem?.prices?.VES ?? 0));
                const usdVal = roundPrice(Number(newItem?.prices?.USD ?? 0));
                const eurVal = roundPrice(Number(newItem?.prices?.EUR ?? 0));
                const cryptoVal = roundPrice(Number(newItem?.prices?.CRYPTO ?? 0));

                const finalPrices = {
                  VES: vesVal,
                  USD: usdVal,
                  EUR: eurVal,
                  CRYPTO: cryptoVal
                };

                formData.append('price', String(vesVal));
                formData.append('prices', JSON.stringify(finalPrices));

                // 🔥 IMÁGENES - CORREGIDO (SIN DUPLICADOS)
                const imageUrls = images
                  .filter(i => i.status === 'success' && !i.fileObject)
                  .map(i => i.url)
                  .filter(Boolean)
                  .filter(url => !url.startsWith('blob:'))
                  .filter(url => !url.startsWith('data:'));
                  
                const newFiles = images
                  .filter(i => i.fileObject)
                  .map(i => i.fileObject)
                  .filter(Boolean);

                const currentAttributes = newItem?.attributes || {};
const finalAttributes = {
  ...currentAttributes,
  prices: finalPrices,
  usdReference: usdVal,
  sku: skuVal,
  itemId: skuVal,
  durationMinutes: durationVal,
  stock: Number(newItem?.stock ?? 0),
  maxCapacity: newItem?.maxCapacity || currentAttributes?.maxCapacity || '',
  minAdvanceBooking: newItem?.minAdvanceBooking || currentAttributes?.minAdvanceBooking || '',
  serviceModality: newItem?.serviceModality || currentAttributes?.serviceModality || '',
  includes: newItem?.includes || '',
  notIncludes: newItem?.notIncludes || '',
  certifications: newItem?.certifications || [],
  materials: newItem?.materials || [],
  clientRequirements: newItem?.clientRequirements || [],
  cancellationPolicy: newItem?.cancellationPolicy || '',
  availability: newItem?.availability || {},
  color: newItem?.color || currentAttributes?.color || '',
  colorHex: newItem?.colorHex || currentAttributes?.colorHex || '',
  description: newItem?.description || currentAttributes?.description || '',
  images: imageUrls,
  mediaUrls: imageUrls,
  existingImages: imageUrls,
  dayOrder: dayOrder || currentAttributes?.dayOrder || DAYS.map(d => d.value),
  professionals: newItem?.professionalIds || [],
  // 🔥 OFERTA Y DESCUENTO EN ATTRIBUTES
  onSale: newItem?.onSale || false,
  discountPercentage: Number(newItem?.discountPercentage || 0),
  discountStartDate: newItem?.discountStartDate || null,
  discountEndDate: newItem?.discountEndDate || null,
};

                formData.append('attributes', JSON.stringify(finalAttributes));

                if (Array.isArray(newItem?.features)) {
                  formData.append('features', JSON.stringify(newItem.features));
                }
                if (Array.isArray(newItem?.certifications)) {
                  formData.append('certifications', JSON.stringify(newItem.certifications));
                }
                if (Array.isArray(newItem?.materials)) {
                  formData.append('materials', JSON.stringify(newItem.materials));
                }
                if (Array.isArray(newItem?.clientRequirements)) {
                  formData.append('clientRequirements', JSON.stringify(newItem.clientRequirements));
                }

                if (imageUrls.length > 0) {
                  formData.append('existingImages', JSON.stringify(imageUrls));
                  formData.append('coverImage', imageUrls[0]);
                }

                newFiles.forEach((file) => {
                  if (file) {
                    formData.append('files', file);
                  }
                });

                onSave(formData);
                if (onClose) onClose();
              } else {
                onClose?.();
              }
            }} 
            className="px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer hover:opacity-90 active:scale-[0.98] text-white"
            style={{ backgroundColor: primary }}
          >
            Guardar Cambios
          </button>
        </div>

      </div>

      {/* Modal de previsualización de imagen */}
      {previewImage && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white text-xs font-bold px-3 py-1 rounded bg-white/20">Cerrar <XIcon /></button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" />
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}