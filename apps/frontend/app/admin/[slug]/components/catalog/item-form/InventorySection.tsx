'use client';

import React, { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PRESET_COLORS } from '@/app/constants/nicheData';

interface InventorySectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  isDarkBg: boolean;
  inputBgClass: string;
  primary: string;
  style?: React.CSSProperties;
}

export default function InventorySection({
  newItem = {},
  setNewItem,
  textColor,
  isDarkBg,
  inputBgClass,
  primary,
  style,
}: InventorySectionProps) {
  const category = newItem?.category || '';
  const productName = newItem?.name || '';
  const currentCode = newItem?.itemId || newItem?.sku || newItem?.code || '';
  const currentStock = newItem?.stock !== undefined && newItem?.stock !== '' ? Number(newItem.stock) : '';
  
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [customColorName, setCustomColorName] = useState('');
  // ✅ ESTADO PARA ACORDEÓN DE COLORES (contraído por defecto)
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);

  // ✅ Obtener lista de colores seleccionados (siempre array)
  const selectedColors: string[] = Array.isArray(newItem?.colors) 
    ? newItem.colors 
    : (newItem?.color ? [newItem.color] : []);

  // ✅ Toggle color
  const toggleColor = useCallback((colorValue: string) => {
    if (typeof setNewItem !== 'function') return;
    
    const currentColors = Array.isArray(newItem?.colors) 
      ? [...newItem.colors] 
      : (newItem?.color ? [newItem.color] : []);
    
    const index = currentColors.indexOf(colorValue);
    
    if (index > -1) {
      // Eliminar color
      currentColors.splice(index, 1);
    } else {
      // Agregar color
      currentColors.push(colorValue);
    }
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      colors: currentColors,
      // Mantener compatibilidad con versión anterior
      color: currentColors.length > 0 ? currentColors[0] : '',
    }));
  }, [newItem?.colors, newItem?.color, setNewItem]);

  // ✅ Agregar color personalizado
  const addCustomColor = useCallback(() => {
    if (typeof setNewItem !== 'function' || !customColorName.trim()) return;
    
    const currentColors = Array.isArray(newItem?.colors) 
      ? [...newItem.colors] 
      : (newItem?.color ? [newItem.color] : []);
    
    // Evitar duplicados
    if (!currentColors.includes(customColorName.trim())) {
      currentColors.push(customColorName.trim());
    }
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      colors: currentColors,
      color: currentColors.length > 0 ? currentColors[0] : '',
    }));
    
    setCustomColorName('');
  }, [newItem?.colors, newItem?.color, setNewItem, customColorName]);

  // ✅ Eliminar color personalizado
  const removeCustomColor = useCallback((colorToRemove: string) => {
    if (typeof setNewItem !== 'function') return;
    
    const currentColors = Array.isArray(newItem?.colors) 
      ? [...newItem.colors] 
      : (newItem?.color ? [newItem.color] : []);
    
    const filtered = currentColors.filter(c => c !== colorToRemove);
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      colors: filtered,
      color: filtered.length > 0 ? filtered[0] : '',
    }));
  }, [newItem?.colors, newItem?.color, setNewItem]);

  const generateNewSku = useCallback(() => {
    if (typeof setNewItem !== 'function') return;
    const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'CAT';
    const namePrefix = productName ? productName.substring(0, 3).toUpperCase() : 'ITM';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newSku = `${catPrefix}-${namePrefix}-${randomNum}`;
    
    setNewItem((prev: any) => ({ 
      ...(prev || {}), 
      itemId: newSku, 
      sku: newSku, 
      code: newSku, 
      manualSku: true 
    }));
  }, [category, productName, setNewItem]);

  const handleStockChange = (delta: number) => {
    if (typeof setNewItem !== 'function') return;
    const baseVal = typeof currentStock === 'number' && !isNaN(currentStock) ? currentStock : 0;
    const nextVal = Math.max(0, baseVal + delta);
    setNewItem((prev: any) => ({ ...(prev || {}), stock: nextVal }));
  };

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  // ✅ Determinar si un color está seleccionado
  const isColorSelected = (colorValue: string) => {
    return selectedColors.includes(colorValue);
  };

  return (
    <div 
      className="space-y-4 p-4 rounded-2xl border transition-all" 
      style={{
        borderColor: style?.borderColor,
        boxShadow: style?.boxShadow,
        backgroundColor: 'transparent',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stock / Cantidad Inicial Avanzado */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Stock / Cantidad Inicial *
            </label>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeof currentStock === 'number' && currentStock > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {typeof currentStock === 'number' && currentStock > 5 ? 'Stock óptimo' : 'Stock bajo'}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="number"
              step="1"
              min="0"
              required
              placeholder="Ej. 50"
              value={currentStock}
              onChange={(e) => {
                if (typeof setNewItem === 'function') {
                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setNewItem((prev: any) => ({ ...(prev || {}), stock: val }));
                }
              }}
              className={`w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition pr-20 ${cleanInputBg}`}
              style={{ borderColor: style?.borderColor, color: textColor }}
            />
            <div className="absolute right-2 flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleStockChange(-1)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-xs transition cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: textColor }}
                title="Disminuir stock"
              >
                -
              </button>
              <div className="w-[1px] h-3 bg-white/10" />
              <button
                type="button"
                onClick={() => handleStockChange(1)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-xs transition cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: textColor }}
                title="Aumentar stock"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Código de Inventario / ID */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            ID / Código de Inventario
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ej. INV-849201"
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
              className={`w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition font-mono pr-10 ${cleanInputBg}`}
              style={{ borderColor: style?.borderColor, color: textColor }}
            />
            <button
              type="button"
              onClick={generateNewSku}
              title="Generar código automático inteligente"
              className="absolute right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs cursor-pointer flex items-center gap-1"
              style={{ color: primary }}
            >
              <span className="text-sm font-bold">↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Selector de Múltiples Colores Mejorado - CON ACORDEÓN */}
      <div className="pt-2 border-t" style={{ borderColor: style?.borderColor }}>
        {/* HEADER DEL ACORDEÓN */}
        <button
          type="button"
          onClick={() => setIsColorsExpanded(!isColorsExpanded)}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold uppercase tracking-wider opacity-80 cursor-pointer" style={{ color: textColor }}>
              Colores del Producto (Opcional)
            </label>
            {/* Mostrar cantidad de colores seleccionados */}
            {selectedColors.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/20 text-primary font-bold">
                {selectedColors.length} {selectedColors.length === 1 ? 'color' : 'colores'}
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${
              isColorsExpanded ? 'rotate-180' : ''
            }`}
            style={{ color: textColor }}
          />
        </button>

        {/* CONTENIDO DEL ACORDEÓN - SOLO SE RENDERIZA CUANDO ESTÁ EXPANDIDO */}
        {isColorsExpanded && (
          <div className="pt-3 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowCustomColorInput(!showCustomColorInput)}
                className="text-[10px] underline opacity-60 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                style={{ color: primary }}
              >
                {showCustomColorInput ? 'Usar presets' : 'Color personalizado'}
              </button>
            </div>

            {showCustomColorInput ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value="#3b82f6"
                    onChange={(e) => {
                      // Opcional: guardar el hex si quieres
                    }}
                    className="w-10 h-10 rounded-xl bg-transparent border cursor-pointer p-0.5 flex-shrink-0"
                    style={{ borderColor: style?.borderColor }}
                  />
                  <input
                    type="text"
                    placeholder="Nombre del color personalizado (Ej. Azul Océano)"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomColor();
                      }
                    }}
                    className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none transition ${cleanInputBg}`}
                    style={{ borderColor: style?.borderColor, color: textColor }}
                  />
                  <button
                    type="button"
                    onClick={addCustomColor}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-80 whitespace-nowrap"
                    style={{ backgroundColor: primary, color: '#fff' }}
                  >
                    Agregar +
                  </button>
                </div>
                
                {/* ✅ Mostrar colores personalizados agregados */}
                {selectedColors.filter(c => !PRESET_COLORS.some(p => p.value === c)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedColors.filter(c => !PRESET_COLORS.some(p => p.value === c)).map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border"
                        style={{
                          borderColor: style?.borderColor,
                          color: textColor,
                          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        }}
                      >
                        {color}
                        <button
                          type="button"
                          onClick={() => removeCustomColor(color)}
                          className="opacity-50 hover:opacity-100 transition cursor-pointer ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ✅ Presets con selección múltiple (click para toggle) */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  {PRESET_COLORS.map((col) => {
                    const isSelected = isColorSelected(col.value);
                    return (
                      <button
                        key={col.value}
                        type="button"
                        title={`${col.label}${isSelected ? ' (seleccionado)' : ''}`}
                        onClick={() => toggleColor(col.value)}
                        className={`w-8 h-8 rounded-full transition-all relative cursor-pointer shadow-sm ${
                          isSelected 
                            ? 'ring-2 ring-primary scale-110 shadow-md' 
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{
                          background: col.hex,
                          borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          borderWidth: '1px',
                        }}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black mix-blend-difference">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ✅ Resumen de colores seleccionados */}
                {selectedColors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1 pt-1.5 border-t" style={{ borderColor: style?.borderColor }}>
                    <span className="text-[9px] uppercase tracking-wider opacity-50 mr-1" style={{ color: textColor }}>
                      Seleccionados:
                    </span>
                    {selectedColors.map((color) => {
                      const preset = PRESET_COLORS.find(p => p.value === color);
                      return (
                        <span
                          key={color}
                          className="px-2 py-0.5 rounded text-[9px] font-medium border"
                          style={{
                            borderColor: style?.borderColor,
                            color: textColor,
                            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          }}
                        >
                          {preset ? preset.label : color}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}