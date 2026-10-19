'use client';

import React, { useState, useEffect } from 'react';

interface SpecificConfigPayload {
  deliveryType?: string;
  hasVariants?: string;
  serviceType?: string;
  slotDuration?: string;
  workModality?: string; // 🔥 NUEVO: unificar modalidad
}

interface StepDynamicConfigProps {
  data: {
    modelType?: string;
    businessType?: string; 
    enfoque?: string;
    type?: string;
    niche?: string;
    specificConfig?: SpecificConfigPayload;
  };
  update: (fields: any) => void;
  next: () => void;
  back: () => void;
}

export default function StepDynamicConfig({ data, update, next, back }: StepDynamicConfigProps) {
  const [config, setConfig] = useState<SpecificConfigPayload>(data.specificConfig || {});
  const [isLight, setIsLight] = useState<boolean>(false);

  useEffect(() => {
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
          setIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-white/60';
  const labelColor = isLight ? 'text-slate-800' : 'text-white/80';
  const borderInput = isLight ? 'border-slate-300' : 'border-white/15';
  // 🔥 SIN fondo. Transparente, solo borde.
  const bgInput = isLight ? 'bg-transparent text-slate-900' : 'bg-transparent text-white';
    const backBtnClass = isLight 
    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300' 
    : 'bg-white/10 hover:bg-white/20 text-white border-white/15';

  // 🔥 FIX: leer modelType correctamente (puede venir como 'product'/'service' o 'productos'/'servicios')
  const rawType = (
    data.modelType || 
    data.businessType || 
    data.enfoque || 
    data.type || 
    ''
  ).toLowerCase();

  const selectedType = rawType.includes('service') || rawType.includes('servicio') 
    ? 'service' 
    : 'product';

  const isProductBusiness = 
    selectedType === 'product' ||
    selectedType.includes('product') || 
    selectedType.includes('venta') || 
    selectedType.includes('tienda');

  const badgeText = isProductBusiness ? 'Tienda / Productos' : 'Servicios';

  // 🔥 OBTENER MODALIDAD DE TRABAJO DESDE config
  const workModality = config.workModality || 'local';

  const handleSelect = (key: keyof SpecificConfigPayload, value: string) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    update({ specificConfig: updated });
  };

  // 🔥 MANEJAR SELECCIÓN DE MODALIDAD
  const handleModalitySelect = (modValue: string) => {
    const updated = { ...config, workModality: modValue };
    setConfig(updated);
    update({ specificConfig: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔥 Si es servicio y el workModality es 'delivery' (no aplica),
    // forzarlo a 'local' para no guardar un estado inválido.
    const currentWorkModality = config.workModality || 'local';
    const safeWorkModality =
      !isProductBusiness && currentWorkModality === 'delivery'
        ? 'local'
        : currentWorkModality;

    const configToSave = {
      ...config,
      workModality: safeWorkModality,
      ...(isProductBusiness
        ? {
            deliveryType: config.deliveryType || 'retiro_local',
            hasVariants: config.hasVariants || 'no',
          }
        : {
            serviceType: config.serviceType || 'citas',
          }),
    };

    update({ specificConfig: configToSave });
    next();
  };

  // 🔥 OPCIONES DE MODALIDAD — diferenciadas por tipo de negocio
  // Productos: pueden hacer delivery (envío físico).
  // Servicios: NO aplica "delivery" clásico (no se envía un corte de pelo).
  const modalityOptions = isProductBusiness
    ? [
        { id: 'local', label: 'Local / Tienda / Casa', desc: 'Punto físico de atención' },
        { id: 'delivery', label: 'Solo Delivery', desc: 'Envío a domicilio (sin local)' },
        { id: 'hybrid', label: 'Híbrido', desc: 'Local + Delivery' },
        { id: 'remote', label: '100% Remoto', desc: 'Online / Digital (Exclusivo)' },
      ]
    : [
        { id: 'local', label: 'En el local', desc: 'El cliente va al negocio' },
        { id: 'delivery', label: 'A domicilio', desc: 'El profesional va al cliente' },
        { id: 'hybrid', label: 'Híbrido', desc: 'Local + A domicilio' },
        { id: 'remote', label: '100% Online / Remoto', desc: 'Atención virtual (videollamada, etc.)' },
      ];
  return (
    <form onSubmit={handleSubmit} className={`space-y-6 animate-fadeIn transition-colors duration-500 ${textColor}`}>
      <div className="text-center space-y-2 mb-4">
        <h2 className={`text-2xl font-black tracking-tight ${textColor} transition-colors duration-500`}>
          Configuracion de tu Negocio
        </h2>
        <div 
          className={`inline-block border px-4 py-1.5 rounded-2xl transition-colors duration-500 ${borderInput}`}
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)15', 
            borderColor: 'var(--accent-color, #f97316)30' 
          }}
        >
          <p 
            className="text-xs uppercase tracking-wider font-extrabold"
            style={{ color: 'var(--accent-color, #f97316)' }}
          >
            Modelo: {badgeText}
          </p>
        </div>
      </div>

      {/* 🔥 SECCIÓN MODALIDAD DE TRABAJO - IGUAL QUE EN LOCATION */}
      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} mb-1.5 transition-colors duration-500`}>
          Modalidad de Trabajo *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {modalityOptions.map((item) => {
            const isSelected = workModality === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModalitySelect(item.id)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-current shadow-sm ring-1'
                    : `bg-transparent ${borderInput} ${mutedTextColor} ${isLight ? 'hover:bg-slate-100/50' : 'hover:bg-white/[0.04]'}`
                                  }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: 'var(--accent-color, #f97316)15',
                        borderColor: 'var(--accent-color, #f97316)',
                        color: 'var(--accent-color, #f97316)',
                        ['--tw-ring-color' as any]: 'var(--accent-color, #f97316)',
                      }
                    : {}
                }
              >
                <div className="flex justify-between items-center w-full mb-1">
                  <span className="text-xs font-bold">{item.label}</span>
                  <div 
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected ? 'text-white' : `${isLight ? 'border-slate-300' : 'border-white/20'}`
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: 'var(--accent-color, #f97316)', borderColor: 'var(--accent-color, #f97316)' }
                        : {}
                    }
                  >
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
                <span className={`text-[10px] ${mutedTextColor} transition-colors duration-500`}>{item.desc}</span>
              </button>
            );
          })}
        </div>
        <p className={`text-[10px] mt-1.5 ${mutedTextColor}`}>
          {workModality === 'local' && (isProductBusiness
            ? 'Atiendes desde un punto físico fijo.'
            : 'Atiendes desde un punto físico (consultorio, local, etc.).')}
          {workModality === 'delivery' && 'Realizas envíos a domicilio sin local físico.'}
          {workModality === 'hybrid' && (isProductBusiness
            ? 'Tienes local y también haces delivery.'
            : 'Tienes local y también atiendes online.')}
          {workModality === 'remote' && 'Trabajas 100% online/digital sin ubicación física.'}
        </p>
      </div>

      {/* 🔥 SECCIÓN ESPECÍFICA SEGÚN TIPO DE NEGOCIO */}
      {isProductBusiness ? (
        <div className="space-y-5">
          <div className="space-y-3">
            <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
              ¿Como entregas tus productos o atiendes la venta? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { id: 'delivery_propio', label: 'Delivery / Envio', desc: 'Llevar el producto al cliente' },
                { id: 'retiro_local', label: 'Punto Fijo / Local', desc: 'El cliente compra en el puesto o tienda' },
                { id: 'online', label: 'Online / Remoto', desc: 'Productos digitales o servicio remoto' },
                { id: 'ambos', label: 'Ambas opciones', desc: 'Delivery y retiro presencial' },
              ].map((item) => {
                const isSelected = (config.deliveryType || 'retiro_local') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect('deliveryType', item.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'ring-2'
                        : `${bgInput} ${borderInput} ${mutedTextColor} ${isLight ? 'hover:bg-slate-100/50 hover:border-slate-400' : 'hover:bg-transparent hover:border-white/30'}`
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--accent-color, #f97316)20',
                            borderColor: 'var(--accent-color, #f97316)',
                            color: isLight ? '#0f172a' : '#ffffff',
                            boxShadow: '0 4px 12px var(--accent-color, #f97316)25',
                          }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-center w-full mb-2">
                      <span className={`text-xs font-black ${isSelected ? (isLight ? 'text-slate-900' : 'text-white') : ''}`}>
                        {item.label}
                      </span>
                      <div 
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'text-white' : `${isLight ? 'border-slate-300' : 'border-white/20'}`
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: 'var(--accent-color, #f97316)', borderColor: 'var(--accent-color, #f97316)' }
                            : {}
                        }
                      >
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                    <span className={`text-[11px] ${isSelected ? (isLight ? 'text-slate-700' : 'text-white/80') : mutedTextColor} leading-tight transition-colors duration-500`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
              ¿Manejas variantes (tallas, sabores, presentaciones)? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'si', label: 'Si, manejo variantes', desc: 'Diferentes tamanos, colores o tipos' },
                { id: 'no', label: 'No, productos estandar', desc: 'Articulos directos sin variaciones' },
              ].map((item) => {
                const isSelected = (config.hasVariants || 'no') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect('hasVariants', item.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'ring-2'
                        : `${bgInput} ${borderInput} ${mutedTextColor} ${isLight ? 'hover:bg-slate-100 hover:border-slate-400' : 'hover:bg-transparent hover:border-white/30'}`
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--accent-color, #f97316)20',
                            borderColor: 'var(--accent-color, #f97316)',
                            color: isLight ? '#0f172a' : '#ffffff',
                            boxShadow: '0 4px 12px var(--accent-color, #f97316)25',
                          }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-center w-full mb-2">
                      <span className={`text-xs font-black ${isSelected ? (isLight ? 'text-slate-900' : 'text-white') : ''}`}>
                        {item.label}
                      </span>
                      <div 
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'text-white' : `${isLight ? 'border-slate-300' : 'border-white/20'}`
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: 'var(--accent-color, #f97316)', borderColor: 'var(--accent-color, #f97316)' }
                            : {}
                        }
                      >
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                    <span className={`text-[11px] ${isSelected ? (isLight ? 'text-slate-700' : 'text-white/80') : mutedTextColor} leading-tight transition-colors duration-500`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
              ¿Como gestionas la atencion a tus clientes? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'citas', label: 'Por Citas / Horas', desc: 'Agendamiento previo en calendario' },
                { id: 'orden_llegada', label: 'Orden de Llegada / Tarifa Fija', desc: 'Atencion dinamica, reparaciones o revisiones' },
                { id: 'reservas', label: 'Reservas / Dias o Equipos', desc: 'Bloqueo de equipos, espacios o jornadas' },
              ].map((item) => {
                const isSelected = (config.serviceType || 'citas') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect('serviceType', item.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'ring-2'
                        : `${bgInput} ${borderInput} ${mutedTextColor} ${isLight ? 'hover:bg-slate-100 hover:border-slate-400' : 'hover:bg-transparent hover:border-white/30'}`
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--accent-color, #f97316)20',
                            borderColor: 'var(--accent-color, #f97316)',
                            color: isLight ? '#0f172a' : '#ffffff',
                            boxShadow: '0 4px 12px var(--accent-color, #f97316)25',
                          }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-center w-full mb-2">
                      <span className={`text-xs font-black ${isSelected ? (isLight ? 'text-slate-900' : 'text-white') : ''}`}>
                        {item.label}
                      </span>
                      <div 
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'text-white' : `${isLight ? 'border-slate-300' : 'border-white/20'}`
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: 'var(--accent-color, #f97316)', borderColor: 'var(--accent-color, #f97316)' }
                            : {}
                        }
                      >
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                    <span className={`text-[11px] ${isSelected ? (isLight ? 'text-slate-700' : 'text-white/80') : mutedTextColor} leading-tight transition-colors duration-500`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={`flex space-x-3 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={back}
          className={`w-1/3 font-bold py-4 rounded-2xl transition text-xs cursor-pointer border ${backBtnClass}`}
        >
          ← Atras
        </button>
        <button
          type="submit"
          className="w-2/3 text-white font-bold py-4 rounded-2xl shadow-lg transition text-sm cursor-pointer"
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)', 
            boxShadow: '0 10px 25px -5px var(--accent-color, #f97316)50' 
          }}
        >
          Siguiente Paso →
        </button>
      </div>
    </form>
  );
}