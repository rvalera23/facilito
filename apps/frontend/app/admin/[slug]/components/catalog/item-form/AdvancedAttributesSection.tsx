'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBrands } from '@/hooks/useBrands';

interface AdvancedAttributesSectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  existingItems?: any[];
  textColor: string;
  inputBgClass: string;
  primary: string;
  style?: React.CSSProperties;
  tenantId?: string;
  isDarkBg?: boolean;
  secondary?: string;
}

const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz', 'L', 'ml'];

export default function AdvancedAttributesSection({
  newItem = {},
  setNewItem,
  existingItems = [],
  textColor,
  inputBgClass,
  primary,
  style,
  tenantId,
  isDarkBg = false,
  secondary = '#ffffff',
}: AdvancedAttributesSectionProps) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // 🔥 Obtener marcas desde la base de datos - SIN addBrand
  const { brands, loading: brandsLoading } = useBrands(tenantId);
  
  // 🔥 Leer valores de newItem
  const brandInput = newItem?.brand || '';
  const modelInput = newItem?.model || newItem?.attributes?.model || '';
  const currentUnit = newItem?.weightUnit || newItem?.attributes?.weightUnit || 'kg';
  const weightValue = newItem?.weightValue ?? newItem?.attributes?.weightValue ?? '';
  const dimensionsInput = newItem?.dimensions || '';
  const warrantyInput = newItem?.warranty || '';
  
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  
  const brandContainerRef = useRef<HTMLDivElement>(null);
  const unitContainerRef = useRef<HTMLDivElement>(null);

  // 🔥 Obtener lista de nombres de marcas desde la base de datos (con validación)
  const registeredBrands = (brands || []).map(b => typeof b === 'string' ? b : b?.name).filter(Boolean);
  
  // 🔥 Combinar con marcas existentes en items (con validación) Y marcas personalizadas
  const allBrands = Array.from(new Set([
    ...registeredBrands,
    ...(existingItems || []).map((item) => item?.brand).filter(Boolean),
    ...customBrands
  ]));

  // 🔥 Asegurar que allBrands siempre sea un array
  const safeAllBrands = Array.isArray(allBrands) ? allBrands : [];

  const filteredBrands = safeAllBrands.filter((b) =>
    b && typeof b === 'string' && b.toLowerCase().includes((brandInput || '').toLowerCase())
  );

  const exactBrandMatchExists = safeAllBrands.some(
    (b) => b && typeof b === 'string' && b.toLowerCase() === (brandInput || '').toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandContainerRef.current && !brandContainerRef.current.contains(event.target as Node)) {
        setShowBrandMenu(false);
      }
      if (unitContainerRef.current && !unitContainerRef.current.contains(event.target as Node)) {
        setShowUnitMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  // 🔥 Helper para actualizar campos en newItem y attributes
  const updateItemField = (field: string, value: any) => {
    if (typeof setNewItem !== 'function') return;
    
    setNewItem((prev: any) => {
      const updated = { ...(prev || {}) };
      
      updated[field] = value;
      
      if (!updated.attributes) updated.attributes = {};
      updated.attributes[field] = value;
      
      return updated;
    });
  };

  // 🔥 Helper para actualizar el peso correctamente
  const updateWeight = (value: string, unit?: string) => {
    if (typeof setNewItem !== 'function') return;
    
    const finalUnit = unit || currentUnit;
    const finalValue = value || '';
    
    setNewItem((prev: any) => {
      const updated = { ...(prev || {}) };
      
      updated.weightValue = finalValue;
      updated.weightUnit = finalUnit;
      updated.weight = finalValue ? `${finalValue} ${finalUnit}` : '';
      
      if (!updated.attributes) updated.attributes = {};
      updated.attributes.weightValue = finalValue;
      updated.attributes.weightUnit = finalUnit;
      updated.attributes.weight = finalValue ? `${finalValue} ${finalUnit}` : '';
      
      return updated;
    });
  };

  const selectBrand = (bName: string) => {
    setShowBrandMenu(false);
    updateItemField('brand', bName);
  };

  // 🔥 Crear nueva marca - SIN addBrand (solo local)
  const createNewBrand = (name: string) => {
    if (!name.trim()) return;
    const trimmedName = name.trim();
    
    // Agregar a marcas personalizadas
    setCustomBrands(prev => {
      if (prev.includes(trimmedName)) return prev;
      return [...prev, trimmedName];
    });
    
    // Seleccionar la nueva marca
    selectBrand(trimmedName);
    
    // Cerrar menú
    setShowBrandMenu(false);
  };

  const selectUnit = (unit: string) => {
    setShowUnitMenu(false);
    updateWeight(weightValue, unit);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (brandInput.trim() && !exactBrandMatchExists) {
        createNewBrand(brandInput.trim());
      }
    }
  };

  // 🔥 ESTILOS DINÁMICOS CORREGIDOS - Usando isDarkBg y secondary
  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const dropdownBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const dropdownItemHover = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const dropdownItemSelected = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

  const dropdownMenuStyle: React.CSSProperties = {
    borderColor: style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
    color: textColor,
    backgroundColor: dropdownBg,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  };

  // 🔥 Borde dinámico para inputs
  const inputBorderColor = style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');

  return (
    <div className="pt-3 relative z-40">
      <style jsx global>{`
        .custom-dark-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-dark-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
          border-radius: 9999px;
        }
        .custom-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
          border-radius: 9999px;
        }
        .custom-dark-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <button
        type="button"
        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        className="group w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer"
        style={{
          borderColor: inputBorderColor,
          backgroundColor: showAdvancedOptions ? (isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'transparent',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 shadow-sm"
            style={{ backgroundColor: `${primary}25`, color: primary }}
          >
            {showAdvancedOptions ? '−' : '+'}
          </div>
          <span className="text-xs font-bold tracking-wide" style={{ color: textColor }}>
            Especificaciones avanzadas y medidas
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider opacity-70 font-semibold" style={{ color: textColor }}>
          {showAdvancedOptions ? 'Ocultar' : 'Opcional'}
        </span>
      </button>

      {showAdvancedOptions && (
        <div 
          className="space-y-4 mt-3 p-5 rounded-3xl border transition-all animate-fadeIn shadow-2xl relative z-30 overflow-visible" 
          style={{
            ...style,
            borderColor: inputBorderColor,
            color: textColor,
          }}
        >
          {/* Fila en Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            
            {/* Marca Global - CON COLORES HEREDADOS */}
            <div className="space-y-2 relative" ref={brandContainerRef}>
              <div className="flex items-center justify-between h-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                  Marca Global
                </label>
                {brandInput ? (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    exactBrandMatchExists 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {exactBrandMatchExists ? '✓ Global' : 'Presiona Enter'}
                  </span>
                ) : (
                  <span className="text-[10px] opacity-50" style={{ color: textColor }}>Selecciona o escribe</span>
                )}
              </div>
              
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={brandsLoading ? "Cargando marcas..." : "Selecciona o escribe marca..."}
                  value={brandInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShowBrandMenu(true);
                    updateItemField('brand', val);
                  }}
                  onFocus={() => setShowBrandMenu(true)}
                  onKeyDown={handleKeyDown}
                  className={`w-full border rounded-2xl px-4 py-3 text-xs outline-none transition-all shadow-inner bg-transparent ${cleanInputBg}`}
                  style={{ borderColor: inputBorderColor, color: textColor }}
                  disabled={brandsLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowBrandMenu(!showBrandMenu)}
                  className="absolute right-3 p-1.5 opacity-60 hover:opacity-100 transition cursor-pointer"
                  style={{ color: textColor }}
                >
                  <span className="text-xs">▼</span>
                </button>
              </div>

              {/* Menú Desplegable Marca - CON COLORES HEREDADOS */}
              {showBrandMenu && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-dark-scroll"
                  style={dropdownMenuStyle}
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 sticky top-0 backdrop-blur-md flex justify-between items-center z-10" style={{ 
                    color: textColor,
                    backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                    borderBottom: `1px solid ${dropdownBorder}`
                  }}>
                    <span>{brandsLoading ? 'Cargando...' : 'Catálogo de marcas'}</span>
                    <span className="text-[9px] font-mono opacity-80">{filteredBrands.length} disp.</span>
                  </div>

                  {brandsLoading ? (
                    <div className="px-4 py-3 text-xs text-center opacity-60" style={{ color: textColor }}>
                      Cargando marcas...
                    </div>
                  ) : filteredBrands.length > 0 ? (
                    filteredBrands.map((bName, idx) => {
                      const isSelected = brandInput.toLowerCase() === bName.toLowerCase();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectBrand(bName)}
                          className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${
                            isSelected ? 'font-bold' : 'hover:opacity-80'
                          }`}
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
                          <span>{bName}</span>
                          {isSelected && <span className="text-[10px] font-mono opacity-80">✓ Activa</span>}
                        </button>
                      );
                    })
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (brandInput.trim()) {
                          createNewBrand(brandInput.trim());
                        }
                      }}
                      className="w-full text-left px-4 py-3 text-xs hover:opacity-80 transition flex items-center justify-between cursor-pointer"
                      style={{ 
                        color: textColor,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = dropdownItemHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>Crear marca: <strong className="underline">{brandInput}</strong></span>
                      <span className="text-[10px] opacity-70">↵ Enter / Clic</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modelo / Referencia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between h-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                  Modelo / Referencia <span className="text-[9px] opacity-65 lowercase">(opcional)</span>
                </label>
              </div>
              <input
                type="text"
                placeholder="Ej. Galaxy S24, Air Force 1, etc..."
                value={modelInput}
                onChange={(e) => {
                  const val = e.target.value;
                  updateItemField('model', val);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className={`w-full border rounded-2xl px-4 py-3 text-xs outline-none transition-all shadow-inner bg-transparent ${cleanInputBg}`}
                style={{ borderColor: inputBorderColor, color: textColor }}
              />
            </div>

          </div>

          {/* Fila: Dimensiones y Garantía */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Dimensiones (Talla) <span className="text-[9px] opacity-65 lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej. 10 x 5 x 2 cm, XS, S, M, L..."
                value={dimensionsInput}
                onChange={(e) => updateItemField('dimensions', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-xs outline-none transition-all shadow-inner bg-transparent ${cleanInputBg}`}
                style={{ borderColor: inputBorderColor, color: textColor }}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                Garantía <span className="text-[9px] opacity-65 lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej. 1 año, 2 años, 6 meses..."
                value={warrantyInput}
                onChange={(e) => updateItemField('warranty', e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-xs outline-none transition-all shadow-inner bg-transparent ${cleanInputBg}`}
                style={{ borderColor: inputBorderColor, color: textColor }}
              />
            </div>
          </div>

          {/* Peso */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Peso <span className="text-[9px] opacity-65 lowercase">(opcional)</span>
            </label>
            <div className="flex items-center shadow-inner rounded-2xl overflow-visible border relative" style={{ borderColor: inputBorderColor }}>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={weightValue}
                onChange={(e) => {
                  const val = e.target.value;
                  updateWeight(val);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 text-xs outline-none transition bg-transparent"
                style={{ color: textColor }}
              />

              {/* Botón selector de unidad */}
              <div className="relative" ref={unitContainerRef}>
                <button
                  type="button"
                  onClick={() => setShowUnitMenu(!showUnitMenu)}
                  className="px-4 py-3 text-xs outline-none transition font-bold bg-black/5 dark:bg-white/5 cursor-pointer border-l flex items-center justify-between gap-2 rounded-r-2xl"
                  style={{ 
                    width: '85px', 
                    color: textColor, 
                    borderColor: inputBorderColor
                  }}
                >
                  <span>{currentUnit}</span>
                  <span className="text-[10px] opacity-60">▼</span>
                </button>

                {/* Menú Desplegable de Unidades */}
                {showUnitMenu && (
                  <div 
                    className="absolute right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden w-28 custom-dark-scroll"
                    style={dropdownMenuStyle}
                  >
                    <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 sticky top-0 backdrop-blur-md" style={{ 
                      color: textColor,
                      backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                      borderBottom: `1px solid ${dropdownBorder}`
                    }}>
                      Unidad
                    </div>
                    {WEIGHT_UNITS.map((unit, idx) => {
                      const isSelected = currentUnit === unit;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectUnit(unit)}
                          className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${
                            isSelected ? 'font-bold' : 'hover:opacity-80'
                          }`}
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
                          <span>{unit}</span>
                          {isSelected && <span className="text-[10px] font-mono opacity-80">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}