'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/DeliveryConfigModal.tsx
// Configuración de delivery local del tenant.
// Solo campos que acepta PATCH /tenants/:id:
//   latitude, longitude, deliveryBaseFee, deliveryPerKmFee,
//   deliveryMinOrder, deliveryMaxRadiusKm, deliveryPrepTimeMin,
//   deliveryAvgSpeedKmh, acceptsPickup, workModality
// ============================================================

import { useEffect, useState } from 'react';
import { X, Save, Settings, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface DeliveryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  tenantId: string | null | undefined;
  tenantConfig: any;    // el objeto tenant completo
  primary: string;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
}

export default function DeliveryConfigModal({
  isOpen,
  onClose,
  onUpdated,
  tenantId,
  tenantConfig,
  primary,
  secondary,
  isDarkBg,
  textColor,
}: DeliveryConfigModalProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [deliveryBaseFee, setDeliveryBaseFee] = useState('0');
  const [deliveryPerKmFee, setDeliveryPerKmFee] = useState('0');
  const [deliveryMinOrder, setDeliveryMinOrder] = useState('0');
  const [deliveryMaxRadiusKm, setDeliveryMaxRadiusKm] = useState('5');
  const [deliveryPrepTimeMin, setDeliveryPrepTimeMin] = useState('15');
  const [deliveryAvgSpeedKmh, setDeliveryAvgSpeedKmh] = useState('20');
  const [acceptsPickup, setAcceptsPickup] = useState(true);
  const [deliveryLocalEnabled, setDeliveryLocalEnabled] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (tenantConfig && isOpen) {
      setLatitude(tenantConfig.latitude != null ? String(tenantConfig.latitude) : '');
      setLongitude(tenantConfig.longitude != null ? String(tenantConfig.longitude) : '');
      setDeliveryBaseFee(tenantConfig.deliveryBaseFee != null ? String(tenantConfig.deliveryBaseFee) : '0');
      setDeliveryPerKmFee(tenantConfig.deliveryPerKmFee != null ? String(tenantConfig.deliveryPerKmFee) : '0');
      setDeliveryMinOrder(tenantConfig.deliveryMinOrder != null ? String(tenantConfig.deliveryMinOrder) : '0');
      setDeliveryMaxRadiusKm(tenantConfig.deliveryMaxRadiusKm != null ? String(tenantConfig.deliveryMaxRadiusKm) : '5');
      setDeliveryPrepTimeMin(tenantConfig.deliveryPrepTimeMin != null ? String(tenantConfig.deliveryPrepTimeMin) : '15');
      setDeliveryAvgSpeedKmh(tenantConfig.deliveryAvgSpeedKmh != null ? String(tenantConfig.deliveryAvgSpeedKmh) : '20');
      setAcceptsPickup(tenantConfig.acceptsPickup !== false);
      setDeliveryLocalEnabled(tenantConfig.deliveryLocalEnabled === true);
      setError(null);
      setSuccess(false);
    }
  }, [tenantConfig, isOpen]);

  if (!isOpen) return null;

  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: textColor,
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Este navegador no soporta geolocalización');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setLocating(false);
      },
      (err) => {
        setError(`No se pudo obtener la ubicación: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      setError('Falta tenantId');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const parseNum = (v: string, fallback: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };

      const body: Record<string, any> = {
        latitude: latitude.trim() === '' ? null : parseNum(latitude, 0),
        longitude: longitude.trim() === '' ? null : parseNum(longitude, 0),
        deliveryBaseFee: parseNum(deliveryBaseFee, 0),
        deliveryPerKmFee: parseNum(deliveryPerKmFee, 0),
        deliveryMinOrder: parseNum(deliveryMinOrder, 0),
        deliveryMaxRadiusKm: parseNum(deliveryMaxRadiusKm, 5),
        deliveryPrepTimeMin: parseNum(deliveryPrepTimeMin, 15),
        deliveryAvgSpeedKmh: parseNum(deliveryAvgSpeedKmh, 20),
        acceptsPickup,
        deliveryLocalEnabled,
      };

      const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      setSuccess(true);
      onUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la configuración');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: secondary || (isDarkBg ? '#0f172a' : '#ffffff'),
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold" style={{ color: textColor }}>
              Configurar delivery local
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition hover:opacity-70 disabled:opacity-40"
            style={inputStyle}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ubicación de la tienda */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
              Ubicación de la tienda
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating || submitting}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border transition hover:opacity-80 disabled:opacity-50 cursor-pointer flex items-center gap-1"
              style={{
                borderColor: primary,
                color: primary,
                backgroundColor: `${primary}10`,
              }}
            >
              <MapPin className="w-3 h-3" />
              {locating ? 'Ubicando...' : 'Usar mi ubicación'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitud (ej: 10.4760)"
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />
            <input
              type="text"
              inputMode="decimal"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitud (ej: -66.5732)"
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Fees */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2" style={{ color: textColor }}>
            Costos (USD)
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Fee base
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryBaseFee}
                onChange={(e) => setDeliveryBaseFee(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Fee por km
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryPerKmFee}
                onChange={(e) => setDeliveryPerKmFee(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Mín. pedido
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryMinOrder}
                onChange={(e) => setDeliveryMinOrder(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Radio / tiempos */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2" style={{ color: textColor }}>
            Radio y tiempos
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Radio máx (km)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryMaxRadiusKm}
                onChange={(e) => setDeliveryMaxRadiusKm(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Prep (min)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryPrepTimeMin}
                onChange={(e) => setDeliveryPrepTimeMin(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
            <div>
              <span className="block text-[9px] opacity-50 mb-1" style={{ color: textColor }}>
                Vel. prom (km/h)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={deliveryAvgSpeedKmh}
                onChange={(e) => setDeliveryAvgSpeedKmh(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Toggle deliveryLocalEnabled */}
        <label className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer mb-3" style={inputStyle}>
          <div>
            <span className="text-xs font-bold" style={{ color: textColor }}>
              Delivery local habilitado
            </span>
            <span className="text-[10px] block opacity-60" style={{ color: textColor }}>
              Permite que los compradores cercanos pidan delivery propio
            </span>
          </div>
          <input
            type="checkbox"
            checked={deliveryLocalEnabled}
            onChange={(e) => setDeliveryLocalEnabled(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: primary }}
          />
        </label>

        {/* Toggle acceptsPickup */}
        <label className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer mb-4" style={inputStyle}>
          <span className="text-xs font-bold" style={{ color: textColor }}>
            Acepta retiro en tienda
          </span>
          <input
            type="checkbox"
            checked={acceptsPickup}
            onChange={(e) => setAcceptsPickup(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: primary }}
          />
        </label>

        {/* Error */}
        {error && (
          <div
            className="mb-3 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
            style={{
              borderColor: 'rgba(239,68,68,0.3)',
              backgroundColor: 'rgba(239,68,68,0.06)',
              color: '#f87171',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            className="mb-3 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
            style={{
              borderColor: 'rgba(34,197,94,0.3)',
              backgroundColor: 'rgba(34,197,94,0.06)',
              color: '#22c55e',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Configuración guardada
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition hover:opacity-70 disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: primary }}
          >
            {submitting ? (
              <>
                <Loader size="xs" color="#ffffff" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Guardar configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}   