'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/useToast';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface ServiceInventorySectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  isDarkBg: boolean;
  inputBgClass: string;
  primary: string;
  secondary?: string;
  style?: React.CSSProperties;
  tenantId?: string;
}

// COLORES para servicios
const SERVICE_PRESET_COLORS = [
  { label: 'Unico', value: 'Unico', hex: 'linear-gradient(135deg, #cbd5e1 0%, #475569 100%)' },
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

// DIAS DE LA SEMANA (orden inicial)
const DEFAULT_DAYS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miercoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sabado' },
  { value: 'sunday', label: 'Domingo' },
];

// GENERAR OPCIONES DE HORA (formato 12h con AM/PM)
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const minStr = m === 0 ? '00' : String(m);
      const value = `${String(h).padStart(2, '0')}:${minStr}`;
      const label = `${hour12}:${minStr} ${period}`;
      options.push(value);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Helper para obtener el label de una hora (formato 12h con AM/PM)
const getTimeLabel = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  const minStr = String(minutes).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
};

// ICONOS SVG
const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
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

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
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

// COMPONENTE: TimeSelect con estilo consistente
const TimeSelect = ({ value, onChange, className, borderDynamic, textColor, isDarkBg }: any) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs rounded-xl border px-3 py-1.5 outline-none appearance-none bg-transparent w-28 ${className || ''}`}
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

// COMPONENTE: DatePicker personalizado (reemplaza el input type="date")
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

  // Cerrar al hacer clic fuera
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
  const hoverBg = isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
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
          {/* Header con navegación */}
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

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[9px] font-bold opacity-50 py-1" style={{ color: textColor }}>
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
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

          {/* Botón para limpiar */}
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

// COMPONENTE: DayCard con drag & drop
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
            {isActive && <CheckIcon />}
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

export default function ServiceInventorySection({
  newItem = {},
  setNewItem,
  textColor,
  isDarkBg,
  inputBgClass,
  primary,
  secondary = '#ffffff',
  style,
  tenantId,
}: ServiceInventorySectionProps) {
  const { showToast } = useToast();

  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  
  // Estados para fechas especificas - RANGO
  const [exceptionDateStart, setExceptionDateStart] = useState('');
  const [exceptionDateEnd, setExceptionDateEnd] = useState('');
  const [exceptionStart, setExceptionStart] = useState('09:00');
  const [exceptionEnd, setExceptionEnd] = useState('18:00');
  
  // Estados para días cerrados - RANGO
  const [closedDateStart, setClosedDateStart] = useState('');
  const [closedDateEnd, setClosedDateEnd] = useState('');

  // 🔥 ESTADO PARA PROFESIONALES
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);

  // Estado para el orden de los dias (con persistencia en el servicio)
  const [dayOrder, setDayOrder] = useState<string[]>(() => {
    const savedOrder = newItem?.dayOrder;
    if (Array.isArray(savedOrder) && savedOrder.length === 7) {
      return savedOrder;
    }
    return DEFAULT_DAYS.map(d => d.value);
  });

  // Guardar el orden cuando cambie
  useEffect(() => {
    if (typeof setNewItem === 'function') {
      setNewItem((prev: any) => ({
        ...(prev || {}),
        dayOrder: dayOrder,
      }));
    }
  }, [dayOrder, setNewItem]);

  // 🔥 CARGAR PROFESIONALES DEL TENANT
  useEffect(() => {
    const tenantIdValue = tenantId || newItem?.tenantId;
    if (!tenantIdValue) {
      setProfessionals([]);
      return;
    }

    const fetchProfessionals = async () => {
      setLoadingProfessionals(true);
      try {
        const token = localStorage.getItem('token') || '';
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/tenant/${tenantIdValue}`, {
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
  }, [tenantId, newItem?.tenantId]);

  const category = newItem?.category || '';
  const serviceName = newItem?.name || '';
  const currentCode = newItem?.itemId || newItem?.sku || newItem?.code || '';

  // ESTILOS DINAMICOS - consistentes con el modal
  const borderDynamic = style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');
  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';
  
  const cardStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    borderColor: borderDynamic,
  };

  const generateNewServiceCode = useCallback(() => {
    if (typeof setNewItem !== 'function') return;
    const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'SRV';
    const namePrefix = serviceName ? serviceName.substring(0, 3).toUpperCase() : 'SVC';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${catPrefix}-${namePrefix}-${randomNum}`;
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      itemId: newCode, 
      sku: newCode, 
      code: newCode, 
      manualSku: true 
    }));
  }, [category, serviceName, setNewItem]);

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  // ============================================================
  // HANDLERS PARA DISPONIBILIDAD SEMANAL
  // ============================================================

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

  // ============================================================
  // NUEVOS HANDLERS PARA ACCIONES MASIVAS (ATAJOS)
  // ============================================================

  // Aplicar horario a múltiples días
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

  // Desactivar días específicos
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

  // ATAJO: Todos los días
  const setAllDaysSchedule = (start: string, end: string) => {
    const allDays = DEFAULT_DAYS.map(d => d.value);
    applyScheduleToDays(allDays, start, end);
  };

  // ATAJO: Días laborales (Lunes a Viernes)
  const setWeekdaysSchedule = (start: string, end: string) => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    applyScheduleToDays(weekdays, start, end);
  };

  // ATAJO: Fin de semana
  const setWeekendSchedule = (start: string, end: string) => {
    const weekend = ['saturday', 'sunday'];
    applyScheduleToDays(weekend, start, end);
  };

  // ATAJO: Cerrar todos los días
  const closeAllDays = () => {
    const allDays = DEFAULT_DAYS.map(d => d.value);
    deactivateDays(allDays);
  };

  // ============================================================
  // HANDLERS PARA FECHAS ESPECIFICAS CON RANGO
  // ============================================================

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
    
    // Generar todas las fechas en el rango
    const dates: string[] = [];
    let currentDate = new Date(exceptionDateStart);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      // Verificar que no exista ya una excepción para esta fecha
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

  // ============================================================
  // HANDLERS PARA DIAS CERRADOS CON RANGO
  // ============================================================

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
    
    // Generar todas las fechas en el rango
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

  // HANDLERS PARA DRAG & DROP de dias
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
  };

  // Obtener dias en el orden actual
  const getOrderedDays = () => {
    const dayMap = Object.fromEntries(DEFAULT_DAYS.map(d => [d.value, d]));
    return dayOrder
      .filter(day => dayMap[day])
      .map(day => ({
        ...dayMap[day],
        isActive: !!newItem?.availability?.[day]?.length,
        schedules: newItem?.availability?.[day] || [],
      }));
  };

  // Obtener excepciones y dias cerrados del servicio
  const exceptions = newItem?.availability?.exceptions || {};
  const closedDates = newItem?.availability?.closed || [];
  const orderedDays = getOrderedDays();

  // Estado para los atajos de horario
  const [quickStartTime, setQuickStartTime] = useState('09:00');
  const [quickEndTime, setQuickEndTime] = useState('18:00');

  return (
    <div 
      className="space-y-6 p-6 rounded-3xl border transition-all bg-transparent" 
      style={{
        borderColor: borderDynamic,
        boxShadow: style?.boxShadow || (isDarkBg 
          ? '0 4px 24px rgba(0,0,0,0.3)' 
          : '0 4px 24px rgba(0,0,0,0.06)'
        ),
        backgroundColor: 'transparent',
      }}
    >
      {/* ============================================================
          TITULO DE LA SECCION
          ============================================================ */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50`} style={{ color: mutedText }}>
          Configuracion del Servicio
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
      </div>

      {/* ============================================================
          GRID PRINCIPAL - 2 columnas (sin Modalidad)
          ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* CAPACIDAD MAXIMA (Cupos) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
              Cupos Maximos *
            </label>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
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
              if (typeof setNewItem === 'function') {
                setNewItem((prev: any) => ({ ...(prev || {}), maxCapacity: val }));
              }
            }}
            className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition bg-transparent`}
            style={{ borderColor: borderDynamic, color: textColor }}
          />
        </div>

        {/* ID / Codigo */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            ID / Codigo del Servicio
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ej. SRV-849201"
              value={currentCode}
              onChange={(e) => {
                const val = e.target.value;
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({ 
                    ...(prev || {}), 
                    itemId: val, 
                    sku: val, 
                    code: val, 
                    manualSku: true 
                  }));
                }
              }}
              className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition font-mono pr-10 bg-transparent`}
              style={{ borderColor: borderDynamic, color: textColor }}
            />
            <button
              type="button"
              onClick={generateNewServiceCode}
              title="Generar codigo automatico"
              className="absolute right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
              style={{ color: primary }}
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* ANTICIPACION MINIMA PARA RESERVAR */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            Anticipacion Minima
          </label>
          <SearchableDropdown
            value={String(newItem?.minAdvanceBooking ?? '')}
            onChange={(val) => {
              if (typeof setNewItem === 'function') {
                setNewItem((prev: any) => ({ ...(prev || {}), minAdvanceBooking: val ? Number(val) : '' }));
              }
            }}
            options={[
              { value: '', label: 'Sin anticipacion minima' },
              { value: '0', label: 'Inmediato' },
              { value: '15', label: '15 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '60', label: '1 hora' },
              { value: '120', label: '2 horas' },
              { value: '240', label: '4 horas' },
              { value: '480', label: '8 horas' },
              { value: '720', label: '12 horas' },
              { value: '1440', label: '24 horas (1 dia)' },
              { value: '2880', label: '48 horas (2 dias)' },
              { value: '4320', label: '72 horas (3 dias)' },
              { value: '10080', label: '1 semana' },
            ]}
            placeholder="Sin anticipacion minima"
            primary={primary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            borderColor={borderDynamic}
            searchable={false}
          />
        </div>

        {/* Espacio vacío para mantener el grid de 2 columnas y no romper el diseño */}
        <div className="hidden sm:block" />
      </div>

      {/* ============================================================
          SEPARADOR: DISPONIBILIDAD
          ============================================================ */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50`} style={{ color: mutedText }}>
          Disponibilidad
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
      </div>

      {/* ============================================================
          PROFESIONALES ASIGNADOS
          ============================================================ */}
      <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
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
          <div className="text-center py-4 text-xs opacity-50" style={{ color: textColor }}>
            <div className="w-4 h-4 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
            Cargando profesionales...
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-4 text-xs opacity-50 border rounded-xl p-3" style={{ borderColor: borderDynamic }}>
            <p style={{ color: textColor }}>No hay profesionales registrados en esta tienda.</p>
            <button 
              type="button"
              className="mt-1 text-emerald-500 hover:underline font-medium"
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
                    if (typeof setNewItem === 'function') {
                      setNewItem((prev: any) => ({
                        ...prev,
                        professionalIds: updated,
                      }));
                    }
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${isSelected ? 'border-2 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
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

      {/* ============================================================
          ATAJOS RAPIDOS PARA DISPONIBILIDAD
          ============================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            Atajos rapidos
          </span>
          <span className="text-[9px] opacity-50" style={{ color: mutedText }}>
            {orderedDays.filter(d => d.isActive).length} dias activos
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
          <span className="text-[9px] opacity-40" style={{ color: mutedText }}>
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
          <span className="text-[9px] opacity-40 mx-1" style={{ color: mutedText }}>|</span>
          
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
            Todos los dias
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

      {/* DISPONIBILIDAD - DIAS Y HORARIOS (Semanal) con Drag & Drop */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
              Horario Semanal
            </label>
            <span className="text-[9px] opacity-50 block mt-0.5" style={{ color: mutedText }}>
              Arrastra los dias para reordenarlos
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
              No hay dias configurados. Activa un dia o usa un atajo rapido.
            </span>
          </div>
        )}
      </div>

      {/* ============================================================
          SEPARADOR: FECHAS ESPECIALES
          ============================================================ */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50`} style={{ color: mutedText }}>
          Fechas Especiales
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
      </div>

      {/* ============================================================
          FECHAS ESPECIFICAS (Excepciones) CON RANGO
          ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            Excepciones
            <span className="text-[9px] font-normal opacity-50 ml-2">
              (Horario diferente para fechas puntuales)
            </span>
          </label>
          <span className="text-[9px] opacity-50" style={{ color: mutedText }}>
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
          <span className="text-[9px] opacity-40" style={{ color: mutedText }}>
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
          <span className="text-[9px] opacity-40" style={{ color: mutedText }}>|</span>
          <TimeSelect
            value={exceptionStart}
            onChange={setExceptionStart}
            borderDynamic={borderDynamic}
            textColor={textColor}
            isDarkBg={isDarkBg}
            className="w-24"
          />
          <span className="text-[9px] opacity-40" style={{ color: mutedText }}>
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
          <button
            type="button"
            onClick={addExceptionRange}
            className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-white transition hover:opacity-90 active:scale-[0.98] flex items-center gap-1"
            style={{ backgroundColor: primary }}
          >
            <PlusIcon />
            Agregar Rango
          </button>
        </div>
        <span className="text-[8px] opacity-40 block" style={{ color: mutedText }}>
          * Si dejas "Hasta" vacio, se aplica solo a la fecha de inicio
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

      {/* ============================================================
          DIAS CERRADOS CON RANGO
          ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            Dias Cerrados
            <span className="text-[9px] font-normal opacity-50 ml-2">
              (Fechas sin atencion)
            </span>
          </label>
          <span className="text-[9px] opacity-50" style={{ color: mutedText }}>
            {closedDates.length} dias
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
          <span className="text-[9px] opacity-40" style={{ color: mutedText }}>
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
          <button
            type="button"
            onClick={addClosedRange}
            className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-white transition hover:opacity-90 active:scale-[0.98] flex items-center gap-1"
            style={{ backgroundColor: primary }}
          >
            <PlusIcon />
            Marcar Rango Cerrado
          </button>
        </div>
        <span className="text-[8px] opacity-40 block" style={{ color: mutedText }}>
          * Si dejas "Hasta" vacio, se aplica solo a la fecha de inicio
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

      {/* ============================================================
          SEPARADOR: COLOR IDENTIFICADOR
          ============================================================ */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold opacity-50`} style={{ color: mutedText }}>
          Identificador Visual
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: borderDynamic }} />
      </div>

      {/* COLOR IDENTIFICADOR (Opcional) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: mutedText }}>
            Color del Servicio
            <span className="text-[9px] font-normal opacity-50 ml-2">(Opcional)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-3 py-1 rounded-xl border font-medium" style={{ borderColor: borderDynamic, color: textColor }}>
              {newItem?.color || 'Unico'}
            </span>
            <button
              type="button"
              onClick={() => setShowCustomColorInput(!showCustomColorInput)}
              className="text-[10px] underline opacity-60 hover:opacity-100 transition cursor-pointer"
              style={{ color: primary }}
            >
              {showCustomColorInput ? 'Usar presets' : 'Personalizado'}
            </button>
          </div>
        </div>

        {showCustomColorInput ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={newItem?.colorHex || '#3b82f6'}
              onChange={(e) => {
                const hexVal = e.target.value;
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({ ...(prev || {}), color: hexVal, colorHex: hexVal }));
                }
              }}
              className="w-12 h-12 rounded-xl bg-transparent border cursor-pointer p-1"
              style={{ borderColor: borderDynamic }}
            />
            <input
              type="text"
              placeholder="Nombre del color (Ej. Azul Oceano)"
              value={newItem?.colorCustomName || ''}
              onChange={(e) => {
                const nameVal = e.target.value;
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({ ...(prev || {}), color: nameVal }));
                }
              }}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-xs outline-none transition bg-transparent`}
              style={{ borderColor: borderDynamic, color: textColor }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 items-center">
            {SERVICE_PRESET_COLORS.map((col) => {
              const isSelected = (newItem?.color || 'Unico') === col.value;
              return (
                <button
                  key={col.value}
                  type="button"
                  title={col.label}
                  onClick={() => {
                    if (typeof setNewItem === 'function') {
                      setNewItem((prev: any) => ({ ...(prev || {}), color: col.value }));
                    }
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
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}