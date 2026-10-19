// frontend/app/admin/[slug]/components/shipping/ShippingStats.tsx

import React, { useState, useEffect } from 'react';
import { ShippingStats as ShippingStatsType } from './types';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  BarChart3,
  CalendarDays
} from 'lucide-react';

interface ShippingStatsProps {
  stats: ShippingStatsType;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  previousStats?: ShippingStatsType; // 🔥 Para comparar con período anterior
}

export default function ShippingStats({ 
  stats, 
  primary, 
  textColor, 
  isDarkBg,
  previousStats 
}: ShippingStatsProps) {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // 🔥 ANIMACIÓN DE CONTADORES
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const newValues: Record<string, number> = {};
      Object.entries(stats).forEach(([key, value]) => {
        if (typeof value === 'number') {
          newValues[key] = Math.round(value * progress);
        }
      });
      setAnimatedValues(newValues);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [stats]);

  // 🔥 CALCULAR PORCENTAJES
  const total = stats.total || 1;
  const pendingPercent = Math.round((stats.pending / total) * 100);
  const inTransitPercent = Math.round((stats.inTransit / total) * 100);
  const deliveredPercent = Math.round((stats.delivered / total) * 100);
  const cancelledPercent = Math.round((stats.cancelled / total) * 100);

  // 🔥 COMPARAR CON PERÍODO ANTERIOR
  const getChange = (current: number, previous: number = 0): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = Math.round(((current - previous) / previous) * 100);
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const totalChange = previousStats ? getChange(stats.total, previousStats.total) : null;
  const deliveredChange = previousStats ? getChange(stats.delivered, previousStats.delivered) : null;

  // 🔥 CONFIGURACIÓN DE ESTADÍSTICAS
  const statsConfig = [
    { 
      key: 'total', 
      label: 'Total Envíos', 
      value: stats.total, 
      color: '#3b82f6',
      bgColor: 'rgba(59,130,246,0.15)',
      icon: Package,
      change: totalChange,
      trend: totalChange?.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />,
    },
    { 
      key: 'pending', 
      label: 'Pendientes', 
      value: stats.pending, 
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.15)',
      icon: Clock,
      percent: pendingPercent,
      change: null,
    },
    { 
      key: 'inTransit', 
      label: 'En Camino', 
      value: stats.inTransit, 
      color: '#8b5cf6',
      bgColor: 'rgba(139,92,246,0.15)',
      icon: Truck,
      percent: inTransitPercent,
      change: null,
    },
    { 
      key: 'delivered', 
      label: 'Entregados', 
      value: stats.delivered, 
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.15)',
      icon: CheckCircle,
      percent: deliveredPercent,
      change: deliveredChange,
      trend: deliveredChange?.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />,
    },
    { 
      key: 'cancelled', 
      label: 'Cancelados', 
      value: stats.cancelled, 
      color: '#ef4444',
      bgColor: 'rgba(239,68,68,0.15)',
      icon: XCircle,
      percent: cancelledPercent,
      change: null,
    },
  ];

  // 🔥 TASA DE ÉXITO (entregados vs total)
  const successRate = total > 0 ? Math.round((stats.delivered / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* 🔥 GRID DE ESTADÍSTICAS PRINCIPALES */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;
          const isActive = stat.value > 0;
          
          return (
            <div
              key={stat.key}
              className={`p-3 rounded-xl border transition-all duration-300 ${
                isActive ? 'hover:scale-[1.02] hover:shadow-lg' : 'opacity-60'
              }`}
              style={{
                borderColor: cardBorder,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <div className="flex items-center justify-between">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: stat.bgColor }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
                {stat.change && (
                  <div 
                    className="flex items-center gap-0.5 text-[8px] font-bold"
                    style={{ color: stat.change.isPositive ? '#10b981' : '#ef4444' }}
                  >
                    {stat.trend}
                    {stat.change.value > 0 ? `${stat.change.value}%` : '0%'}
                  </div>
                )}
              </div>
              
              <div className="mt-2">
                <p className="text-lg font-bold" style={{ color: textColor }}>
                  {animatedValues[stat.key] ?? stat.value}
                </p>
                <p className="text-[9px] uppercase font-bold tracking-wider opacity-60" style={{ color: textColor }}>
                  {stat.label}
                </p>
              </div>

              {/* 🔥 BARRA DE PROGRESO PARA ESTADOS */}
              {stat.percent !== undefined && stat.percent > 0 && (
                <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: `${cardBorder}40` }}>
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${stat.percent}%`,
                      backgroundColor: stat.color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔥 FILA ADICIONAL: MÉTRICAS AVANZADAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Tasa de éxito */}
        <div 
          className="p-2 rounded-xl border flex items-center gap-2"
          style={{ borderColor: cardBorder }}
        >
          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
          <div>
            <p className="text-[10px] font-bold" style={{ color: textColor }}>
              {successRate}%
            </p>
            <p className="text-[7px] uppercase opacity-40" style={{ color: textColor }}>
              Tasa de éxito
            </p>
          </div>
        </div>

        {/* Tasa de cancelación */}
        <div 
          className="p-2 rounded-xl border flex items-center gap-2"
          style={{ borderColor: cardBorder }}
        >
          <XCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
          <div>
            <p className="text-[10px] font-bold" style={{ color: textColor }}>
              {total > 0 ? Math.round((stats.cancelled / total) * 100) : 0}%
            </p>
            <p className="text-[7px] uppercase opacity-40" style={{ color: textColor }}>
              Cancelación
            </p>
          </div>
        </div>

        {/* Eficiencia de entrega */}
        <div 
          className="p-2 rounded-xl border flex items-center gap-2"
          style={{ borderColor: cardBorder }}
        >
          <Truck className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
          <div>
            <p className="text-[10px] font-bold" style={{ color: textColor }}>
              {stats.inTransit > 0 ? `${stats.inTransit} en ruta` : '0'}
            </p>
            <p className="text-[7px] uppercase opacity-40" style={{ color: textColor }}>
              En tránsito
            </p>
          </div>
        </div>

        {/* Promedio de entrega (si hay datos) */}
        <div 
          className="p-2 rounded-xl border flex items-center gap-2"
          style={{ borderColor: cardBorder }}
        >
          <CalendarDays className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-[10px] font-bold" style={{ color: textColor }}>
              {stats.delivered > 0 ? '✓' : '—'}
            </p>
            <p className="text-[7px] uppercase opacity-40" style={{ color: textColor }}>
              Última entrega
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 RESUMEN VISUAL EN TARJETA GRANDE (SOLO EN ESCRITORIO) */}
      {stats.total > 0 && (
        <div 
          className="hidden sm:block p-3 rounded-xl border overflow-hidden"
          style={{ 
            borderColor: cardBorder,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] opacity-40 mb-1" style={{ color: textColor }}>
                <span>Pendientes ({pendingPercent}%)</span>
                <span>En camino ({inTransitPercent}%)</span>
                <span>Entregados ({deliveredPercent}%)</span>
                <span>Cancelados ({cancelledPercent}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex">
                {pendingPercent > 0 && (
                  <div 
                    className="h-full transition-all duration-1000"
                    style={{ 
                      width: `${pendingPercent}%`,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                )}
                {inTransitPercent > 0 && (
                  <div 
                    className="h-full transition-all duration-1000"
                    style={{ 
                      width: `${inTransitPercent}%`,
                      backgroundColor: '#8b5cf6',
                    }}
                  />
                )}
                {deliveredPercent > 0 && (
                  <div 
                    className="h-full transition-all duration-1000"
                    style={{ 
                      width: `${deliveredPercent}%`,
                      backgroundColor: '#10b981',
                    }}
                  />
                )}
                {cancelledPercent > 0 && (
                  <div 
                    className="h-full transition-all duration-1000"
                    style={{ 
                      width: `${cancelledPercent}%`,
                      backgroundColor: '#ef4444',
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <BarChart3 className="w-3.5 h-3.5 opacity-40" />
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                {total} envíos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 INDICADOR DE CARGA (opcional) */}
      {stats.total === 0 && (
        <div 
          className="p-3 rounded-xl border border-dashed flex items-center justify-center gap-2"
          style={{ borderColor: cardBorder }}
        >
          <AlertCircle className="w-4 h-4 opacity-40" />
          <span className="text-[10px] opacity-40" style={{ color: textColor }}>
            No hay datos de envíos disponibles
          </span>
        </div>
      )}
    </div>
  );
}