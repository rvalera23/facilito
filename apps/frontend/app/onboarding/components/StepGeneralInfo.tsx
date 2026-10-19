'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PRODUCT_NICHES, SERVICE_NICHES, CURRENCIES, NICHE_CATEGORIES_MAP, SERVICE_NICHE_CATEGORIES_MAP } from '../../constants/nicheData';

interface StepGeneralInfoProps {
  data: {
    name: string;
    modelType: string;
    niche: string;
    currencies: string[];
    slogan: string;
    description: string;
  };
  update: (fields: Partial<StepGeneralInfoProps['data']>) => void;
  next: () => void;
  textColorClass?: string;
  mutedTextColorClass?: string;
  isLight?: boolean;
  activePalette?: any;
}

export default function StepGeneralInfo({ 
  data, 
  update, 
  next,
  textColorClass: propTextColor,
  mutedTextColorClass: propMutedTextColor,
  isLight: propIsLight,
  activePalette
}: StepGeneralInfoProps) {
  const [localIsLight, setLocalIsLight] = useState<boolean>(propIsLight ?? false);
  
  useEffect(() => {
    if (propIsLight !== undefined) {
      setLocalIsLight(propIsLight);
      return;
    }
    
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setLocalIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [propIsLight]);

  const isLight = propIsLight !== undefined ? propIsLight : localIsLight;
  const textColor = propTextColor || (isLight ? 'text-slate-900' : 'text-white');
  const mutedTextColor = propMutedTextColor || (isLight ? 'text-slate-600' : 'text-white/60');
  const labelColor = isLight ? 'text-slate-800' : 'text-white/80';
  const borderInput = isLight ? 'border-slate-300' : 'border-white/10';
  // 🔥 SIN fondo. Transparente, solo borde. Como Nombre/WhatsApp del paso 4.
  const bgInput = 'bg-transparent';
  // 🔥 SIN fondo. Solo borde con hover sutil.
  const unselectedBtnBg = isLight
    ? 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-100/50'
    : 'bg-transparent border-white/10 text-white/60 hover:bg-white/[0.04]';
  // 🔥 Dropdown con fondo del theme (--bg-color) para que se integre.
  // Necesita fondo + blur para leerse encima del form.
  const dropdownBg = isLight
    ? 'border-slate-200'
    : 'border-white/15';

  const dropdownStyle: React.CSSProperties = {
    backgroundColor: isLight
      ? 'rgba(255, 255, 255, 0.95)'
      : `color-mix(in srgb, ${activePalette?.background || '#0b0f19'} 95%, transparent)`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };
  const dropdownItemHover = isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.05]';
    const dropdownItemText = isLight ? 'text-slate-800' : 'text-white/80';

  const [nicheOpen, setNicheOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModelType = data.modelType || 'product';
  
  const cleanNicheLabel = (label: string) => {
    return label.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '').trim();
  };

  // Obtener solo categorías principales (primer nivel)
  const getMainNicheCategories = (modelType: string) => {
    // Función para formatear el label: convertir underscore a espacio y capitalizar
    const formatLabel = (key: string) => {
      return key
        .replace(/_/g, ' ') // Reemplazar underscores por espacios
        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalizar cada palabra
    };

    if (modelType === 'service') {
      // Para servicios, obtener solo las claves principales de SERVICE_NICHE_CATEGORIES_MAP
      return Object.keys(SERVICE_NICHE_CATEGORIES_MAP).map(key => ({
        label: formatLabel(key),
        value: key.toLowerCase().replace(/\s+/g, '_')
      }));
    }
    // Para productos, obtener solo las claves principales de NICHE_CATEGORIES_MAP
    return Object.keys(NICHE_CATEGORIES_MAP).map(key => ({
      label: formatLabel(key),
      value: key.toLowerCase().replace(/\s+/g, '_')
    }));
  };

  const rawNicheList = getMainNicheCategories(currentModelType);
  const currentNicheList = rawNicheList.filter((opt) =>
    cleanNicheLabel(opt.label).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCurrencies = data.currencies || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNicheOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelChange = (type: string) => {
    // Seleccionar la primera categoría disponible del nuevo modelo
    const newNicheList = getMainNicheCategories(type);
    const defaultNiche = newNicheList.length > 0 ? newNicheList[0].value : '';
    update({ modelType: type, niche: defaultNiche });
  };

  const handleCurrencyToggle = (currValue: string) => {
    let updated;
    if (selectedCurrencies.includes(currValue)) {
      updated = selectedCurrencies.filter((c) => c !== currValue);
    } else {
      updated = [...selectedCurrencies, currValue];
    }
    update({ currencies: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name?.trim()) {
      alert('Por favor ingresa el nombre de tu negocio.');
      return;
    }
    if (!data.niche) {
      alert('Por favor selecciona una categoría específica.');
      return;
    }
    if (!selectedCurrencies.length) {
      alert('Por favor selecciona al menos una moneda aceptada.');
      return;
    }
    if (!data.slogan?.trim()) {
      alert('Por favor ingresa un eslogan o frase corta.');
      return;
    }
    if (!data.description?.trim()) {
      alert('Por favor describe tu negocio.');
      return;
    }
    next();
  };

  // Usar rawNicheList para encontrar el label correcto
  const selectedNicheLabel = 
    rawNicheList.find((n) => n.value === data.niche)?.label || 'Seleccionar categoria especifica';

  const accentColor = activePalette?.primary || getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#f97316';

  // Iconos SVG para reemplazar emojis
  const RocketIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
    </svg>
  );

  const InventoryIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const LightbulbIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a1 1 0 01-1 1h-2a1 1 0 01-1-1v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );

  const CheckIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  const ModelCard = ({ 
    type, 
    title, 
    subtitle, 
    description,
    features,
    icon
  }: { 
    type: 'product' | 'service';
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    icon: React.ReactNode;
  }) => {
    const isSelected = currentModelType === type;
    
    return (
      <button
        type="button"
        onClick={() => handleModelChange(type)}
        className={`
          relative group p-6 rounded-3xl border-2 text-left transition-all duration-500 cursor-pointer w-full
          ${isSelected 
            ? 'border-transparent text-white shadow-2xl scale-[1.02]' 
            : `${unselectedBtnBg} hover:shadow-xl hover:scale-[1.01]`
          }
        `}
        style={
          isSelected
            ? {
                backgroundColor: accentColor,
                background: `linear-gradient(145deg, ${accentColor}, ${accentColor}dd)`,
                boxShadow: `0 20px 40px -8px ${accentColor}80, inset 0 1px 0 ${accentColor}40`,
                borderColor: 'transparent'
              }
            : {}
        }
      >
        <div className="flex flex-col items-center text-center gap-4 w-full">
          {/* Icono con animación */}
          <div className={`
            w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-500
            ${isSelected 
              ? 'bg-white/20 text-white shadow-lg' 
              : 'bg-current/10 text-current/60 group-hover:scale-110 group-hover:rotate-3'
            }
          `}>
            <div className="w-10 h-10">
              {icon}
            </div>
          </div>

          {/* Contenido principal */}
          <div className="w-full space-y-2">
            <div className={`
              font-black text-xl tracking-tight transition-colors duration-500
              ${isSelected ? 'text-white' : textColor}
            `}>
              {title}
            </div>
            
            <div className={`
              text-sm font-medium transition-colors duration-500
              ${isSelected ? 'text-white/80' : mutedTextColor}
            `}>
              {subtitle}
            </div>

            {/* Descripción más detallada */}
            <p className={`
              text-xs leading-relaxed transition-colors duration-500 px-2
              ${isSelected ? 'text-white/70' : mutedTextColor}
            `}>
              {description}
            </p>
            
            {/* Features con iconos */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className={`
                    text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-all duration-500 flex items-center gap-1
                    ${isSelected 
                      ? 'bg-white/20 text-white' 
                      : 'bg-current/10 text-current/50 group-hover:bg-current/20'
                    }
                  `}>
                    <CheckIcon />
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* Indicador visual adicional */}
            <div className="pt-2">
              <div className={`
                text-[10px] font-mono tracking-widest transition-colors duration-500
                ${isSelected ? 'text-white/50' : 'text-current/30'}
              `}>
                {isSelected ? '▸ SELECCIONADO ◂' : 'CLIC PARA SELECCIONAR'}
              </div>
            </div>
          </div>
        </div>

        {/* Efecto de brillo en seleccionado */}
        {isSelected && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent animate-pulse" />
          </div>
        )}
      </button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fadeIn space-y-8 transition-colors duration-500 text-current w-full max-w-full overflow-x-hidden">
      <div className="space-y-2">
        <h1 className={`text-3xl font-black tracking-tight ${textColor} transition-colors duration-500`}>
          Crea tu Negocio Virtual
        </h1>
        <p className={`${mutedTextColor} transition-colors duration-500 text-sm font-medium`}>
          Paso 1: Define la esencia, modelo y monedas de tu emprendimiento
        </p>
      </div>

      {/* SECCIÓN DE SELECCIÓN DE MODELO - MUCHO MÁS ESTILO */}
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <label className={`block text-sm font-black tracking-wider uppercase ${labelColor} transition-colors duration-500 flex items-center gap-2`}>
              <RocketIcon />
              Elige tu modelo de negocio
            </label>
            <p className={`text-[11px] ${mutedTextColor}`}>
              Selecciona cómo quieres gestionar tu emprendimiento
            </p>
          </div>
          <div className={`
            px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5
            ${currentModelType === 'product' 
              ? 'bg-emerald-500/10 text-emerald-600' 
              : 'bg-blue-500/10 text-blue-600'
            }
          `}>
            {currentModelType === 'product' ? (
              <>
                <InventoryIcon />
                INVENTARIO
              </>
            ) : (
              <>
                <CalendarIcon />
                AGENDA / CITAS
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <ModelCard
            type="product"
            title="Venta de Productos"
            subtitle="Modelo basado en inventario físico"
            description="Gestiona stock, categorías, precios y carrito de compras. Ideal para tiendas físicas o e-commerce."
            features={['Stock en tiempo real', 'Carrito de compras', 'Categorías ilimitadas', 'Reportes de ventas']}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m0 0l2-2m-2 2l-2-2" />
              </svg>
            }
          />

          <ModelCard
            type="service"
            title="Prestación de Servicios"
            subtitle="Modelo basado en agenda y cupos"
            description="Administra citas, reservas, disponibilidad y cupos. Perfecto para consultorías, talleres o servicios profesionales."
            features={['Agenda inteligente', 'Cupos limitados', 'Recordatorios automáticos', 'Calendario interactivo']}
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m0 0l2-2m-2 2l-2-2" />
              </svg>
            }
          />
        </div>

        {/* Banner informativo con más personalidad */}
        <div 
          className="mt-4 p-5 rounded-2xl border text-center transition-all duration-500 w-full overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}05)`,
            borderColor: `${accentColor}30`
          }}
        >
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, ${accentColor}, transparent 70%)`
          }} />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              <LightbulbIcon />
              <span className={`text-xs font-black uppercase tracking-wider ${mutedTextColor}`}>
                Modo {currentModelType === 'product' ? 'Producto' : 'Servicio'} activado
              </span>
            </div>
            <p className={`text-[11px] font-medium ${mutedTextColor}`}>
              {currentModelType === 'product' 
                ? 'Tu negocio estará optimizado para gestionar inventario, productos y ventas físicas'
                : 'Tu negocio estará optimizado para gestionar citas, cupos y servicios profesionales'
              }
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Nombre del Negocio / Marca *
        </label>
        <input
          type="text"
          required
          placeholder={currentModelType === 'product' ? 'Ej. Bodega La Bendicion' : 'Ej. Climafrio Soluciones 24/7'}
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          className={`w-full ${bgInput} border-2 ${borderInput} rounded-2xl px-4 py-3.5 text-sm focus:ring-2 outline-none ${textColor} transition`}
          style={{ 
            '--tw-ring-color': accentColor, 
            borderColor: data.name ? accentColor : undefined 
          } as React.CSSProperties}
        />
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Categoria Especifica *
        </label>
        <button
          type="button"
          onClick={() => setNicheOpen(!nicheOpen)}
          className={`w-full ${bgInput} border-2 ${borderInput} rounded-2xl px-4 py-3.5 text-sm text-left flex justify-between items-center focus:ring-2 outline-none ${textColor} transition cursor-pointer`}
          style={{ 
            '--tw-ring-color': accentColor, 
            borderColor: data.niche ? accentColor : undefined 
          } as React.CSSProperties}
        >
          <span className="truncate">{cleanNicheLabel(selectedNicheLabel)}</span>
          <svg className={`w-4 h-4 ${mutedTextColor} transition-transform shrink-0 ml-2 ${nicheOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {nicheOpen && (
          <div 
            className={`absolute z-50 mt-2 w-full border rounded-2xl shadow-2xl overflow-hidden py-1 max-h-72 flex flex-col transition-colors duration-500 ${dropdownBg}`}
            style={dropdownStyle}
          >
            <div className={`p-2 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <input
                autoFocus
                type="text"
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${textColor} ${bgInput}`}
                style={{ 
                  borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                }}
              />
            </div>

            <div className="overflow-y-auto max-h-52">
              {currentNicheList.length > 0 ? (
                currentNicheList.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      update({ niche: opt.value });
                      setNicheOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition cursor-pointer ${
                      data.niche === opt.value
                        ? 'font-bold'
                        : `${dropdownItemText} ${dropdownItemHover}`
                    }`}
                    style={
                      data.niche === opt.value
                        ? { 
                            backgroundColor: `${accentColor}15`, 
                            color: accentColor 
                          }
                        : {}
                    }
                  >
                    {cleanNicheLabel(opt.label)}
                  </button>
                ))
              ) : (
                <div className={`px-4 py-3 text-xs text-center ${mutedTextColor}`}>
                  No se encontraron categorias
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Monedas Aceptadas *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CURRENCIES.map((cur) => {
            const isSelected = selectedCurrencies.includes(cur.value);
            return (
              <button
                key={cur.value}
                type="button"
                onClick={() => handleCurrencyToggle(cur.value)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : unselectedBtnBg
                }`}
                style={
                  isSelected
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : {}
                }
              >
                <span>{cur.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Eslogan o Frase Corta *
        </label>
        <input
          type="text"
          required
          placeholder="Ej. Calidad y confianza cerquita de ti"
          value={data.slogan}
          onChange={(e) => update({ slogan: e.target.value })}
          className={`w-full ${bgInput} border-2 ${borderInput} rounded-2xl px-4 py-3.5 text-sm focus:ring-2 outline-none ${textColor} transition`}
          style={{ 
            '--tw-ring-color': accentColor, 
            borderColor: data.slogan ? accentColor : undefined 
          } as React.CSSProperties}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Descripcion *
        </label>
        <textarea
          rows={3}
          required
          placeholder="Describe tu negocio, que ofreces y que te hace especial..."
          value={data.description || ''}
          onChange={(e) => update({ description: e.target.value })}
          className={`w-full ${bgInput} border-2 ${borderInput} rounded-2xl px-4 py-3.5 text-sm focus:ring-2 outline-none ${textColor} transition resize-none`}
          style={{ 
            '--tw-ring-color': accentColor, 
            borderColor: data.description ? accentColor : undefined 
          } as React.CSSProperties}
        />
      </div>

      <div className={`pt-4 border-t ${borderInput} transition-colors duration-500`}>
        <button
          type="submit"
          className="w-full text-white font-bold py-4 rounded-2xl shadow-lg transition text-sm cursor-pointer relative overflow-hidden group flex items-center justify-center gap-2"
          style={{ 
            backgroundColor: accentColor, 
            boxShadow: `0 10px 25px -5px ${accentColor}50` 
          }}
        >
          <span className="relative z-10">Siguiente Paso</span>
          <ArrowRightIcon />
          <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
        </button>
      </div>
    </form>
  );
}