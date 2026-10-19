'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

interface DeliverySettingsProps {
  tenant: any;
  setTenant?: (tenant: any) => void;
  onUpdate?: (data: any) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
  itemBg: string;
  inputClass: string;
  specificConfig?: any;
  onChangeConfig?: (config: any) => void;
}

const COMPANY_LOGOS: Record<string, { src: string; color: string; name: string }> = {
  mrw: {
    src: '/images/mrw.webp',
    color: '#e11d48',
    name: 'MRW'
  },
  domesa: {
    src: '/images/domesa1.png',
    color: '#0ea5e9',
    name: 'Domesa'
  },
  tealca: {
    src: '/images/tealca.svg',
    color: '#8b5cf6',
    name: 'Tealca'
  },
  zoom: {
    src: '/images/zoom.png',
    color: '#f59e0b',
    name: 'Zoom'
  },
};

const AVAILABLE_COMPANIES = [
  { id: 'mrw', name: 'MRW', description: 'Mensajería a nivel nacional', color: '#e11d48' },
  { id: 'domesa', name: 'Domesa', description: 'Envíos rápidos y seguros', color: '#0ea5e9' },
  { id: 'tealca', name: 'Tealca', description: 'Logística especializada', color: '#8b5cf6' },
  { id: 'zoom', name: 'Zoom', description: 'Mensajería express', color: '#f59e0b' },
];

const DEFAULT_COSTS_USD: Record<string, number> = {
  mrw: 1.00,
  domesa: 1.00,
  tealca: 1.00,
  zoom: 1.00,
};

const DEFAULT_DAYS: Record<string, string> = {
  mrw: '2-3 días hábiles',
  domesa: '1-2 días hábiles',
  tealca: '1 día hábil',
  zoom: '2-4 días hábiles',
};

export default function DeliverySettings({
  tenant,
  setTenant,
  onUpdate,
  primary,
  secondary,
  textColor,
  isDarkBg,
  cardBorder,
  itemBg,
  inputClass,
  specificConfig: externalSpecificConfig,
  onChangeConfig,
}: DeliverySettingsProps) {
  const [activeCompanies, setActiveCompanies] = useState<string[]>([]);
const [costsUSD, setCostsUSD] = useState<Record<string, number | null>>({});
  const [estimatedDays, setEstimatedDays] = useState<Record<string, string>>({});
  const { rates, loading: loadingRate, error: rateErrorMessage } = useExchangeRateContext();
  const usdRate = Number(rates?.USD) > 0 ? Number(rates.USD) : 0;
  const rateError = Boolean(rateErrorMessage);

  // 🔥 CARGAR CONFIGURACIÓN EXISTENTE DESDE specificConfig
  useEffect(() => {
    const config = externalSpecificConfig || tenant?.specific_config || tenant?.specificConfig || {};
    const deliveryConfig = config.delivery || {};
    
    if (deliveryConfig.activeCompanies && Array.isArray(deliveryConfig.activeCompanies)) {
      setActiveCompanies(deliveryConfig.activeCompanies);
    } else {
      setActiveCompanies(AVAILABLE_COMPANIES.map(c => c.id));
    }
    
    if (deliveryConfig.costsUSD) {
      setCostsUSD(deliveryConfig.costsUSD);
    } else {
      setCostsUSD({ ...DEFAULT_COSTS_USD });
    }
    
    if (deliveryConfig.estimatedDays) {
      setEstimatedDays(deliveryConfig.estimatedDays);
    } else {
      setEstimatedDays({ ...DEFAULT_DAYS });
    }
  }, [tenant, externalSpecificConfig]);

  const toggleCompany = (companyId: string) => {
    const newActive = activeCompanies.includes(companyId)
      ? activeCompanies.filter(id => id !== companyId)
      : [...activeCompanies, companyId];
    
    setActiveCompanies(newActive);
    updateSpecificConfig({
      activeCompanies: newActive,
      costsUSD,
      estimatedDays,
    });
  };

  const updateCostUSD = (companyId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const newCosts = { ...costsUSD, [companyId]: numValue };
      setCostsUSD(newCosts);
      updateSpecificConfig({
        activeCompanies,
        costsUSD: newCosts,
        estimatedDays,
      });
    }
  };

  // ============================================================
  // 🔥 COBRO A DESTINO (estándar UCP)
  // ============================================================
  // Cuando el admin activa "Cobro a destino" para una empresa,
  // costsUSD[company] = null. El comprador paga al recibir.
  // Al desactivar, se restaura el valor previo (o 1.00 por default).
  // ============================================================
  const togglePayOnDelivery = (companyId: string) => {
    const isCurrentlyPayOnDelivery = costsUSD[companyId] === null;

    const newCosts: Record<string, number | null> = { ...costsUSD };

    if (isCurrentlyPayOnDelivery) {
      // Desactivar → restaurar costo previo o default
      const defaultCost = DEFAULT_COSTS_USD[companyId] ?? 1.00;
      newCosts[companyId] = defaultCost;
    } else {
      // Activar → null = cobro a destino
      newCosts[companyId] = null;
    }

    setCostsUSD(newCosts);
    updateSpecificConfig({
      activeCompanies,
      costsUSD: newCosts,
      estimatedDays,
    });
  };

  const updateEstimatedDays = (companyId: string, value: string) => {
    const newDays = { ...estimatedDays, [companyId]: value };
    setEstimatedDays(newDays);
    updateSpecificConfig({
      activeCompanies,
      costsUSD,
      estimatedDays: newDays,
    });
  };

  const updateSpecificConfig = (deliveryData: any) => {
    if (onChangeConfig) {
      const currentConfig = externalSpecificConfig || {};
      const updatedConfig = {
        ...currentConfig,
        delivery: {
          ...currentConfig.delivery,
          ...deliveryData,
          usdRate: usdRate || 0,
          updatedAt: new Date().toISOString()
        }
      };
      onChangeConfig(updatedConfig);
    }
  };

  const calculatePriceVES = (usdPrice: number): number => {
    if (usdRate > 0 && usdPrice > 0) {
      return Math.round(usdPrice * usdRate * 100) / 100;
    }
    return 0;
  };

  const getCompany = (id: string) => {
    return AVAILABLE_COMPANIES.find(c => c.id === id);
  };

  const textMuted = isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const textMain = textColor;

  return (
    <div className="space-y-4">
      <div className="border-b border-black/5 dark:border-white/10 pb-2">

        <p className="text-[10px] opacity-60 mt-0.5" style={{ color: textMuted }}>
          Selecciona las empresas de mensajería que ofrecerás a tus clientes.
        </p>
        {loadingRate ? (
          <span className="text-[9px] animate-pulse opacity-60" style={{ color: textMuted }}>
            Cargando tasa de cambio...
          </span>
        ) : rateError ? (
          <span className="text-[9px] text-amber-400">
            ⚠️ Tasa no disponible; no se muestra conversión a bolívares
          </span>
        ) : usdRate > 0 ? (
          <span className="text-[9px] opacity-60" style={{ color: textMuted }}>
            💱 Tasa USD: Bs. {usdRate.toFixed(2)}
          </span>
        ) : (
          <span className="text-[9px] text-amber-400">
            ⚠️ Tasa no disponible
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold opacity-85" style={{ color: textMain }}>
          Empresas de Mensajería Activas
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AVAILABLE_COMPANIES.map((company) => {
            const isActive = activeCompanies.includes(company.id);
            const logo = COMPANY_LOGOS[company.id];
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => toggleCompany(company.id)}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  isActive
                    ? 'border-2 shadow-sm'
                    : 'opacity-50 hover:opacity-80'
                }`}
                style={{
                  borderColor: isActive ? company.color : cardBorder,
                  backgroundColor: isActive ? `${company.color}15` : 'transparent',
                }}
              >
                <div className="flex justify-center mb-1.5">
                  <img 
                    src={logo.src} 
                    alt={company.name}
                    className="w-12 h-12 object-contain rounded-lg"
                    style={{
                      filter: isActive ? 'none' : 'grayscale(0.5)'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const fallback = document.createElement('span');
                        fallback.className = 'text-2xl font-bold';
                        fallback.style.color = company.color;
                        fallback.textContent = company.name.charAt(0);
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <span className="text-xs font-bold block" style={{ color: textMain }}>
                  {company.name}
                </span>
                <span className={`text-[9px] ${isActive ? 'opacity-80' : 'opacity-40'}`} style={{ color: textMuted }}>
                  {isActive ? '✓ Activo' : 'Inactivo'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCompanies.length > 0 && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: cardBorder }}>
          <label className="block text-[11px] font-semibold opacity-85" style={{ color: textMain }}>
            Configuración por Empresa
          </label>
          
          {activeCompanies.map((companyId) => {
            const company = getCompany(companyId);
            if (!company) return null;

            const logo = COMPANY_LOGOS[companyId];
            const isPayOnDelivery = costsUSD[companyId] === null;
            const costUSD = isPayOnDelivery ? 0 : (costsUSD[companyId] ?? 0);
            const costVES = calculatePriceVES(costUSD);

            return (
              <div
                key={companyId}
                className="p-3 rounded-xl border"
                style={{ borderColor: cardBorder, backgroundColor: itemBg }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={logo.src}
                    alt={company.name}
                    className="w-8 h-8 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-bold" style={{ color: textMain }}>
                    {company.name}
                  </span>
                  <span className="text-[9px] opacity-40" style={{ color: textMuted }}>
                    {company.description}
                  </span>
                </div>

                {/* 🔥 CHECKBOX COBRO A DESTINO */}
                <label
                  className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg border cursor-pointer transition"
                  style={{
                    borderColor: isPayOnDelivery ? 'rgba(251,191,36,0.4)' : cardBorder,
                    backgroundColor: isPayOnDelivery ? 'rgba(251,191,36,0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPayOnDelivery}
                    onChange={() => togglePayOnDelivery(companyId)}
                    className="w-3.5 h-3.5 cursor-pointer"
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: isPayOnDelivery ? '#f59e0b' : textMain }}
                  >
                    Cobro a destino
                  </span>
                  <span className="text-[9px] opacity-50 ml-auto" style={{ color: textMuted }}>
                    El comprador paga al recibir
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: textMuted }}>
                      Costo (USD)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={isPayOnDelivery ? '' : costUSD}
                      onChange={(e) => updateCostUSD(companyId, e.target.value)}
                      disabled={isPayOnDelivery}
                      placeholder={isPayOnDelivery ? 'Cobro a destino' : '0.00'}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs outline-none bg-transparent ${inputClass} ${isPayOnDelivery ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={{ borderColor: cardBorder, color: textMain }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: textMuted }}>
                      Costo (VES)
                      <span className="text-[8px] font-normal opacity-40 ml-1">(auto-calculado)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={isPayOnDelivery ? 'Cobro a destino' : (costVES > 0 && usdRate > 0 ? `Bs. ${costVES.toFixed(2)}` : '—')}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold bg-black/5 dark:bg-white/5 cursor-not-allowed ${inputClass}`}
                      style={{
                        borderColor: cardBorder,
                        color: isPayOnDelivery ? '#f59e0b' : ((costVES > 0 || costUSD > 0) ? '#10b981' : textMuted),
                        opacity: isPayOnDelivery ? 0.9 : ((costVES > 0 || costUSD > 0) ? 1 : 0.4)
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: textMuted }}>
                      Tiempo estimado
                    </label>
                    <input
                      type="text"
                      value={estimatedDays[companyId] || ''}
                      onChange={(e) => updateEstimatedDays(companyId, e.target.value)}
                      placeholder="Ej: 2-3 días hábiles"
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs outline-none bg-transparent ${inputClass}`}
                      style={{ borderColor: cardBorder, color: textMain }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
        <p className="text-[9px] opacity-40 text-center" style={{ color: textMuted }}>
          💡 Los cambios se guardarán junto con el resto de la configuración al hacer clic en "Guardar Cambios"
        </p>
      </div>
    </div>
  );
}