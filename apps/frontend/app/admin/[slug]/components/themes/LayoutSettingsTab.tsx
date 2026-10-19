'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, AlignCenter, Check } from 'lucide-react';

interface LayoutSettingsTabProps {
  brandConfig: any;
  setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

type LayoutType = 'default' | 'centered';

const LAYOUT_OPTIONS = [
  {
    id: 'default' as LayoutType,
    label: 'Clásico',
    description: 'Dos columnas: info a la izquierda, pagos a la derecha',
    icon: LayoutGrid,
  },
  {
    id: 'centered' as LayoutType,
    label: 'Centrado',
    description: 'Todo centrado en una sola columna',
    icon: AlignCenter,
  },
];

export default function LayoutSettingsTab({
  brandConfig,
  setBrandConfig,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: LayoutSettingsTabProps) {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('default');

  useEffect(() => {
    const savedLayout = brandConfig?.heroLayout || 'default';
    setSelectedLayout(savedLayout);
  }, [brandConfig]);

  const handleLayoutSelect = (layoutId: LayoutType) => {
    setSelectedLayout(layoutId);
    setBrandConfig((prev: any) => {
      const updated = { ...prev, heroLayout: layoutId };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('brandConfig', JSON.stringify(updated));
        console.log('💾 [LayoutSettingsTab] Guardado en localStorage:', updated);
      }
      
      return updated;
    });
  };

  // ✅ USAR secondary PARA EL CARD BG
  const cardBg = secondary || (isDarkBg 
    ? 'rgba(15, 23, 42, 0.65)' 
    : 'rgba(255, 255, 255, 0.7)');
    
  const cardBorder = isDarkBg 
    ? 'rgba(255, 255, 255, 0.12)' 
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <div className="w-full">
      <div 
        className="w-full border rounded-3xl shadow-xl p-6 space-y-6"
        style={{ 
          backgroundColor: cardBg, 
          borderColor: cardBorder, 
          color: textColor 
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              Diseño del Hero
            </h3>
            <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
              Elige cómo se muestra el encabezado principal de tu tienda
            </p>
          </div>
          <span 
            className="text-[8px] font-mono px-2 py-1 rounded-lg opacity-40"
            style={{ color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            {selectedLayout === 'default' ? 'Clásico' : 'Centrado'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAYOUT_OPTIONS.map((option) => {
            const isSelected = selectedLayout === option.id;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleLayoutSelect(option.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer ${
                  isSelected ? 'ring-2 ring-offset-0' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? `${primary}15` : 'transparent',
                  borderColor: isSelected ? primary : cardBorder,
                  color: textColor,
                  boxShadow: isSelected ? `0 0 0 2px ${primary}` : 'none',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isSelected ? primary : textColor }} />
                      <span className="font-bold text-sm">{option.label}</span>
                    </div>
                    <p className={`text-[10px] mt-1 opacity-60`} style={{ color: textColor }}>
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
          <p className="text-[9px] opacity-40 mb-2" style={{ color: textColor }}>PREVISUALIZACIÓN</p>
          <div 
            className={`w-full rounded-xl border p-4 transition-all duration-300 ${
              selectedLayout === 'centered' ? 'flex flex-col items-center text-center' : 'grid grid-cols-2 gap-4'
            }`}
            style={{ 
              borderColor: cardBorder,
              backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)'
            }}
          >
            {selectedLayout === 'default' ? (
              <>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded-full" style={{ backgroundColor: primary }} />
                  <div className="flex flex-wrap gap-1">
                    <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                    <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                    <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                  </div>
                  <div className="h-3 w-32 rounded-full bg-slate-500/20" />
                  <div className="flex gap-1">
                    <div className="h-6 w-6 rounded-xl bg-slate-500/20" />
                    <div className="h-6 w-6 rounded-xl bg-slate-500/20" />
                    <div className="h-6 w-6 rounded-xl bg-slate-500/20" />
                  </div>
                </div>
                <div className="flex justify-end items-start">
                  <div className="flex flex-col gap-1 items-end">
                    <div className="h-3 w-20 rounded-full bg-slate-500/20" />
                    <div className="h-3 w-24 rounded-full bg-slate-500/20" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-2 w-full">
                <div className="h-4 w-32 rounded-full" style={{ backgroundColor: primary }} />
                <div className="flex flex-wrap justify-center gap-1">
                  <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                  <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                  <div className="h-3 w-12 rounded-full bg-slate-500/20" />
                </div>
                <div className="h-3 w-40 rounded-full bg-slate-500/20" />
                <div className="flex gap-1">
                  <div className="h-6 w-6 rounded-xl bg-slate-500/20" />
                  <div className="h-6 w-6 rounded-xl bg-slate-500/20" />
                </div>
                <div className="flex gap-2 mt-1">
                  <div className="h-3 w-14 rounded-full bg-slate-500/20" />
                  <div className="h-3 w-16 rounded-full bg-slate-500/20" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}