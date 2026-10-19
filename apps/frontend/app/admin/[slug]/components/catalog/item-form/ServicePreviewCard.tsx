'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SERVICE_TAG_CATEGORIES } from '@/app/constants/itemCategories';

interface ServicePreviewCardProps {
  newItem: any;
  setNewItem?: React.Dispatch<React.SetStateAction<any>>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

// Helper para determinar la tonalidad de verde según el brillo del tema
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

// 🔥 Días de la semana en español
const DAYS_MAP: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom'
};

// 🔥 Formatear hora con AM/PM
const formatTimeWithAMPM = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  const minStr = String(minutes).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
};

// 🔥 Helper para formatear duración
const formatDuration = (minutes: number) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
};

// 🔥 Helper para formatear precio
const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔥 Helper para obtener color de nombre
const getColorFromName = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'Negro': '#18181b',
    'Blanco': '#f8fafc',
    'Gris': '#94a3b8',
    'Plata': '#94a3b8',
    'Rojo': '#ef4444',
    'Azul': '#3b82f6',
    'Verde': '#10b981',
    'Amarillo': '#f59e0b',
    'Rosa': '#ec4899',
    'Morado': '#8b5cf6',
    'Naranja': '#f97316',
    'Marrón': '#92400e',
    'Beige': '#f5e6d3',
    'Dorado': '#f59e0b',
    'Plateado': '#94a3b8',
    'Único de Fábrica': '#cbd5e1',
  };
  
  const lowerName = colorName.toLowerCase();
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return '#94a3b8';
};

// 🔥 Iconos
const SvgClock = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m-4-8a8 8 0 110 16 8 8 0 010-16z" />
  </svg>
);

const SvgCalendar = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SvgCheckCircle = ({ className = "w-3 h-3", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SvgMapPin = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SvgUsers = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SvgBuilding2 = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const SvgSparkles = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.75 12l-1.5 2.25" />
  </svg>
);

export default function ServicePreviewCard({
  newItem = {},
  setNewItem,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ServicePreviewCardProps) {
  const name = newItem?.name || 'Nombre del servicio';
  const category = newItem?.category || 'Categoria';
  const brand = newItem?.brand || '';
  const description = newItem?.description || 'Aquí aparecerá la descripción detallada del servicio que estás publicando en tu tienda...';
  const duration = newItem?.durationMinutes || 60;
  const maxCapacity = newItem?.maxCapacity || 0;
  const modality = newItem?.serviceModality || newItem?.attributes?.serviceModality || 'Presencial';
  const availability = newItem?.availability || newItem?.attributes?.availability || {};

  // 🔥 OBTENER COLORES DEL SERVICIO (soporte para múltiples colores)
  const serviceColors: string[] = useMemo(() => {
    if (Array.isArray(newItem?.colors) && newItem.colors.length > 0) {
      return newItem.colors;
    }
    if (newItem?.color && typeof newItem.color === 'string' && newItem.color.trim()) {
      return [newItem.color];
    }
    return [];
  }, [newItem?.colors, newItem?.color]);

  // 🔥 PRECIOS
  const priceVes = newItem?.prices?.VES !== undefined && newItem?.prices?.VES !== '' 
    ? Number(newItem.prices.VES) 
    : 0;
  const priceUsd = newItem?.prices?.USD !== undefined && newItem?.prices?.USD !== '' 
    ? Number(newItem.prices.USD) 
    : 0;
  const stock = newItem?.stock ?? '0';

  const adaptiveGreen = getAdaptiveGreenColor(textColor);
  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';

  // 🔥 OBTENER IMÁGENES
  const validImages: string[] = useMemo(() => {
    const allImages: string[] = [];

    if (Array.isArray(newItem?.existingImages)) {
      newItem.existingImages.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) {
          allImages.push(img);
        }
      });
    }

    if (Array.isArray(newItem?.mediaUrls)) {
      newItem.mediaUrls.forEach((url: any) => {
        if (typeof url === 'string' && url.trim()) {
          if (!allImages.includes(url)) {
            allImages.push(url);
          }
        }
      });
    }

    if (Array.isArray(newItem?.images)) {
      newItem.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) {
          if (!allImages.includes(img)) {
            allImages.push(img);
          }
        } else if (img?.url && typeof img.url === 'string') {
          if (!allImages.includes(img.url)) {
            allImages.push(img.url);
          }
        }
      });
    }

    if (newItem?.coverImage && typeof newItem.coverImage === 'string' && newItem.coverImage.trim()) {
      const coverExists = allImages.some(img => img === newItem.coverImage);
      if (!coverExists) {
        allImages.unshift(newItem.coverImage);
      }
    }

    if (allImages.length === 0 && Array.isArray(newItem?.files)) {
      newItem.files.forEach((f: any) => {
        if (f instanceof File) {
          const url = URL.createObjectURL(f);
          allImages.push(url);
        } else if (f?.url && typeof f.url === 'string') {
          if (!allImages.includes(f.url)) {
            allImages.push(f.url);
          }
        } else if (typeof f === 'string') {
          if (!allImages.includes(f)) {
            allImages.push(f);
          }
        }
      });
    }

    return Array.from(new Set(allImages.filter(Boolean))).slice(0, 7);
  }, [newItem?.existingImages, newItem?.mediaUrls, newItem?.images, newItem?.coverImage, newItem?.files]);

  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    if (validImages.length === 0) {
      setSelectedImage('');
      return;
    }

    if (newItem?.coverImage && typeof newItem.coverImage === 'string' && validImages.includes(newItem.coverImage)) {
      setSelectedImage(newItem.coverImage);
      return;
    }

    if (selectedImage && validImages.includes(selectedImage)) {
      return;
    }

    setSelectedImage(validImages[0]);
  }, [validImages, newItem?.coverImage]);

  const [modalImg, setModalImg] = useState<string | null>(null);

  // 🔥 AGRUPAR TAGS DE SERVICIO POR CATEGORÍA
  const groupedTags = useMemo(() => {
    if (!newItem?.features) return {};
    
    const features = Array.isArray(newItem.features) 
      ? newItem.features 
      : (typeof newItem.features === 'string' ? JSON.parse(newItem.features) : []);
    
    if (!Array.isArray(features) || features.length === 0) return {};
    
    const categories = SERVICE_TAG_CATEGORIES;
    const result: Record<string, string[]> = {};
    
    Object.keys(categories).forEach(key => {
      result[key] = [];
    });
    
    features.forEach((feature: string) => {
      for (const [key, cat] of Object.entries(categories)) {
        if (cat.tags.includes(feature)) {
          if (!result[key]) result[key] = [];
          result[key].push(feature);
          break;
        }
      }
    });
    
    return Object.fromEntries(
      Object.entries(result).filter(([_, tags]) => tags.length > 0)
    );
  }, [newItem?.features]);

  // 🔥 Obtener días disponibles
  const availableDays = Object.keys(availability || {}).filter(day => 
    availability[day] && availability[day].length > 0
  );

  // 🔥 Formatear horario
  const formatSchedule = (day: string) => {
    const slots = availability[day] || [];
    if (slots.length === 0) return '';
    return slots.map((slot: any) => 
      `${formatTimeWithAMPM(slot.start || '09:00')} - ${formatTimeWithAMPM(slot.end || '18:00')}`
    ).join(', ');
  };

  // Obtener modalidad con colores dinámicos usando primary
  const getModalityInfo = (modalityValue: string) => {
    const modalityConfig: Record<string, { icon: React.ReactNode; label: string }> = {
      'Presencial': { 
        icon: <SvgBuilding2 className="w-3.5 h-3.5" />, 
        label: 'Presencial'
      },
      'Online / Virtual': { 
        icon: <SvgUsers className="w-3.5 h-3.5" />, 
        label: 'Virtual'
      },
      'A Domicilio': { 
        icon: <SvgMapPin className="w-3.5 h-3.5" />, 
        label: 'A Domicilio'
      },
      'Híbrido': { 
        icon: <SvgSparkles className="w-3.5 h-3.5" />, 
        label: 'Híbrido'
      },
    };
    return modalityConfig[modalityValue] || modalityConfig['Presencial'];
  };

  const modalityInfo = getModalityInfo(modality);

  return (
    <div className="space-y-4" style={{ color: textColor }}>
      <div className="flex items-center justify-between">
        <span 
          className="text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full border shadow-sm"
          style={{ 
            backgroundColor: `${primary}15`, 
            color: primary, 
            borderColor: `${primary}30` 
          }}
        >
          Vista Previa en Vivo (Servicio)
        </span>
        <span className="text-[10px] opacity-75">
          Así lo verá tu cliente
        </span>
      </div>

      <div 
        className="border rounded-3xl overflow-hidden shadow-2xl transition-all backdrop-blur-md"
        style={{
          backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
          borderColor: borderDynamic,
          color: textColor
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Columna de imagen - 4 columnas en desktop */}
          <div className="md:col-span-4 h-52 md:h-auto relative overflow-hidden">
            <div 
              className="w-full h-full bg-black/30 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer group"
              onClick={() => selectedImage && setModalImg(selectedImage)}
            >
              {selectedImage ? (
                <>
                  <img 
                    src={selectedImage} 
                    alt={name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md">
                      Ampliar
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center opacity-40">
                  <SvgBuilding2 className="w-12 h-12" />
                  <span className="text-[10px] mt-2">Sin imagen</span>
                </div>
              )}

              {/* Badges sobre la imagen */}
              <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg"
                  style={{ 
                    backgroundColor: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
                    color: isDarkBg ? '#f1f5f9' : '#1e293b',
                    border: `1px solid ${isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                  }}
                >
                  {category}
                </span>
                {brand && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black text-white shadow-lg"
                    style={{ backgroundColor: primary }}
                  >
                    {brand}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black backdrop-blur-md shadow-lg"
                  style={{ 
                    backgroundColor: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
                    color: isDarkBg ? '#f1f5f9' : '#1e293b',
                    border: `1px solid ${isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                  }}
                >
                  {formatDuration(duration)}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black backdrop-blur-md shadow-lg flex items-center gap-1"
                  style={{ 
                    backgroundColor: `${primary}25`,
                    color: primary,
                    border: `1px solid ${primary}40`
                  }}
                >
                  {modalityInfo.icon}
                  {modalityInfo.label}
                </span>
              </div>
            </div>

            {/* Miniaturas */}
            {validImages.length > 1 && (
              <div className="absolute bottom-3 left-3 flex gap-1.5 z-10">
                {validImages.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-8 h-8 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                      selectedImage === img
                        ? 'border-current scale-105 shadow-md opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                    style={{ borderColor: selectedImage === img ? primary : 'transparent' }}
                  >
                    <img 
                      src={img} 
                      alt={`Miniatura ${idx + 1}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
                {validImages.length > 4 && (
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-bold backdrop-blur-md"
                    style={{ 
                      backgroundColor: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
                      color: isDarkBg ? '#f1f5f9' : '#1e293b'
                    }}
                  >
                    +{validImages.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Columna de contenido - 8 columnas en desktop */}
          <div className="md:col-span-8 p-5 md:p-6 flex flex-col">
            
            {/* Header: Nombre */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-lg md:text-xl tracking-tight ${textColor} leading-tight`}>
                  {name}
                </h3>
              </div>
            </div>

            {/* 🔥 METADATOS UNIFICADOS: Duración, Modalidad, Cupos y Colores */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              {/* Duración */}
              <span className={`flex items-center gap-1.5 text-xs font-medium ${isDarkBg ? 'text-slate-300' : 'text-slate-600'}`}>
                <SvgClock className="w-3.5 h-3.5" />
                {formatDuration(duration)}
              </span>

              {/* Modalidad */}
              <span 
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{ color: primary, backgroundColor: `${primary}15` }}
              >
                {modalityInfo.icon}
                {modalityInfo.label}
              </span>

              {/* Cupos */}
              {maxCapacity > 0 && (
                <span className={`flex items-center gap-1.5 text-xs font-medium ${isDarkBg ? 'text-slate-300' : 'text-slate-600'}`}>
                  <SvgUsers className="w-3.5 h-3.5" />
                  {maxCapacity} cupos
                </span>
              )}

              {/* Colores */}
              {serviceColors.length > 0 && (
                <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: borderDynamic }}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>
                    Colores:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {serviceColors.map((color, index) => {
                      const isGradient = color.includes('linear-gradient');
                      const bgColor = isGradient 
                        ? color 
                        : (color.startsWith('#') ? color : getColorFromName(color));
                      
                      return (
                        <span
                          key={index}
                          title={color}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border"
                          style={{
                            borderColor: borderDynamic,
                            color: textColor,
                            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          }}
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                            style={{ background: bgColor }}
                          />
                          {color}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          

            {/* Descripción */}
            {description && (
              <div className={`text-sm leading-relaxed mb-3 ${isDarkBg ? 'text-slate-300' : 'text-slate-600'} line-clamp-2`}>
                {description}
              </div>
            )}

            {/* Características / Features - TAGS */}
            {Object.keys(groupedTags).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(groupedTags).slice(0, 2).map(([key, tags]) => (
                  tags.slice(0, 2).map((tag: string) => (
                    <span 
                      key={`${key}-${tag}`}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                        isDarkBg 
                          ? 'bg-white/5 text-slate-300 border-white/10' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <SvgCheckCircle className="w-2.5 h-2.5" style={{ color: primary, opacity: 0.6 }} />
                      {tag}
                    </span>
                  ))
                ))}
                {Object.values(groupedTags).reduce((acc, tags) => acc + tags.length, 0) > 4 && (
                  <span className={`text-[10px] px-2.5 py-1 rounded-full ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>
                    +{Object.values(groupedTags).reduce((acc, tags) => acc + tags.length, 0) - 4}
                  </span>
                )}
              </div>
            )}

            {/* DISPONIBILIDAD */}
            {availableDays.length > 0 && (
              <div className="mb-3">
                <span className={`text-[10px] uppercase font-bold tracking-wider block ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>
                  Disponibilidad:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {availableDays.slice(0, 5).map((day) => (
                    <span 
                      key={day}
                      className="px-2 py-0.5 rounded-lg text-[9px] font-medium border"
                      style={{ 
                        borderColor: borderDynamic,
                        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                      }}
                    >
                      {DAYS_MAP[day] || day}
                      <span className="text-[8px] opacity-50 ml-1">
                        {formatSchedule(day)}
                      </span>
                    </span>
                  ))}
                  {availableDays.length > 5 && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-lg ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>
                      +{availableDays.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer: Precio y disponibilidad */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-3 border-t" style={{ borderColor: borderDynamic }}>
              <div>
                <span className={`text-[9px] uppercase font-bold tracking-wider block ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>Precio</span>
                <div className="flex items-baseline gap-2">
<span className="font-black text-2xl" style={{ color: primary }}>
                    Bs. {formatPrice(priceVes)}
                  </span>
<span className="text-xs font-semibold" style={{ color: adaptiveGreen }}>
                    (${priceUsd.toFixed(2)} USD)
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`text-[9px] uppercase font-bold tracking-wider block ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}>Disponibilidad</span>
                <span 
                  className="text-xs font-bold px-3 py-1 rounded-lg border inline-block"
                  style={{ 
                    borderColor: borderDynamic,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                  }}
                >
                  {stock} cupos
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE ZOOM */}
      {modalImg && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setModalImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalImg(null)}
              className="absolute -top-10 right-0 text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
            <img 
              src={modalImg} 
              alt="Zoom Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'flex items-center justify-center w-full h-full text-white/40 text-sm';
                  fallback.textContent = '📷 Imagen no disponible';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}