'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/CreateDriverModal.tsx
// Modal para crear un driver. Dos modos:
//   1. Crear user nuevo (name/email/phone/password) + driver.
//   2. Vincular a un user existente por UUID.
// ============================================================

import { useState } from 'react';
import {
  X,
  Plus,
  Truck,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Link as LinkIcon,
  Search,
  Mail,
  Store,
} from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { apiFetch } from '@/lib/api';



interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  tenantId?: string | null;
  primary: string;
  secondary?: string;   // ← NUEVO
  isDarkBg: boolean;
  textColor: string;
}

type Mode = 'new' | 'existing';

type LookupResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  isRepartidor: boolean;
  tenants: Array<{
    driverId: string;
    tenantId: string | null;
    tenantName: string | null;
    tenantSlug: string | null;
    status: 'offline' | 'online' | 'busy' | 'paused';
    vehicleType: string | null;
  }>;
};

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'found'; data: LookupResult }
  | { kind: 'error'; message: string };

const VEHICLE_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'moto', label: 'Moto' },
  { value: 'carro', label: 'Carro' },
  { value: 'bici', label: 'Bicicleta' },
  { value: 'a_pie', label: 'A pie' },
];

export default function CreateDriverModal({
  isOpen,
  onClose,
  onCreated,
  tenantId,
  primary,
  secondary,
  isDarkBg,
  textColor,
}: CreateDriverModalProps) {
  const [mode, setMode] = useState<Mode>('new');

  // Campos comunes
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [maxActiveOrders, setMaxActiveOrders] = useState(1);

  // Modo "nuevo user"
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Modo "user existente" — búsqueda por email
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setLookupEmail('');
    setLookup({ kind: 'idle' });
    setVehicleType('');
    setVehiclePlate('');
    setMaxActiveOrders(1);
    setError(null);
    setSuccess(false);
    setMode('new');
  };

  const handleLookup = async () => {
    const e = lookupEmail.trim().toLowerCase();
    if (!e) {
      setLookup({ kind: 'error', message: 'Ingresá un email' });
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(e)) {
      setLookup({ kind: 'error', message: 'Email inválido' });
      return;
    }

    setLookup({ kind: 'loading' });
    try {
      const res = await apiFetch(
        `/delivery/drivers/lookup?email=${encodeURIComponent(e)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data) {
        setLookup({ kind: 'not_found' });
      } else {
        setLookup({ kind: 'found', data });
      }
    } catch (err: any) {
      setLookup({
        kind: 'error',
        message: err?.message || 'Error al buscar',
      });
    }
  };

  const handleSubmit = async () => {
    if (mode === 'new') {
      if (!name.trim()) {
        setError('El nombre es obligatorio');
        return;
      }
      if (!email.trim()) {
        setError('El email es obligatorio');
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email.trim())) {
        setError('El email no tiene un formato válido');
        return;
      }
    } else {
      if (lookup.kind !== 'found') {
        setError('Primero buscá y seleccioná un repartidor existente');
        return;
      }
      if (!lookup.data.isRepartidor) {
        setError('El email no pertenece a un repartidor');
        return;
      }
      const alreadyInTenant = lookup.data.tenants.some(
        (t) => t.tenantId === (tenantId || null),
      );
      if (alreadyInTenant) {
        setError('Este repartidor ya está vinculado a esta tienda');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Ambos modos usan create-with-user. apiFetch maneja
      // token, refresh y Content-Type por dentro.
      const url = '/delivery/drivers/create-with-user';

      const body: any =
        mode === 'new'
          ? {
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim() || null,
              password: password.trim() || null,
              tenantId: tenantId || null,
              vehicleType: vehicleType || null,
              vehiclePlate: vehiclePlate.trim() || null,
              maxActiveOrders: Number(maxActiveOrders) || 1,
            }
          : {
              email: lookupEmail.trim().toLowerCase(),
              tenantId: tenantId || null,
              vehicleType: vehicleType || null,
              vehiclePlate: vehiclePlate.trim() || null,
              maxActiveOrders: Number(maxActiveOrders) || 1,
            };

      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      setSuccess(true);
      onCreated();
      setTimeout(() => {
        reset();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Error al crear el repartidor');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: textColor,
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
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
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold" style={{ color: textColor }}>
              Nuevo repartidor
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

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('new')}
            disabled={submitting}
            className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'new' ? 'shadow-md' : 'opacity-60'
            }`}
            style={{
              borderColor: mode === 'new' ? primary : inputStyle.borderColor,
              backgroundColor:
                mode === 'new' ? `${primary}15` : 'transparent',
              color: mode === 'new' ? primary : textColor,
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear usuario nuevo
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            disabled={submitting}
            className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'existing' ? 'shadow-md' : 'opacity-60'
            }`}
            style={{
              borderColor: mode === 'existing' ? primary : inputStyle.borderColor,
              backgroundColor:
                mode === 'existing' ? `${primary}15` : 'transparent',
              color: mode === 'existing' ? primary : textColor,
            }}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Vincular existente
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'new' ? (
            <>
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carlos Pérez"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                  style={inputStyle}
                  disabled={submitting}
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                  style={inputStyle}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                    style={{ color: textColor }}
                  >
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04141234567"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                    style={inputStyle}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                    style={{ color: textColor }}
                  >
                    Contraseña
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="repartidor123"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                    style={inputStyle}
                    disabled={submitting}
                  />
                </div>
              </div>

              <p
                className="text-[10px] opacity-50"
                style={{ color: textColor }}
              >
                Si dejás la contraseña vacía, se usa{' '}
                <code
                  className="px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)',
                  }}
                >
                  repartidor123
                </code>{' '}
                por defecto. El repartidor puede cambiarla después.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Email del repartidor *
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => {
                      setLookupEmail(e.target.value);
                      setLookup({ kind: 'idle' });
                    }}
                    placeholder="repartidor@ejemplo.com"
                    className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                    style={inputStyle}
                    disabled={submitting || lookup.kind === 'loading'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookup();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={
                      submitting ||
                      lookup.kind === 'loading' ||
                      !lookupEmail.trim()
                    }
                    className="px-3 py-2.5 rounded-2xl text-xs font-bold border transition hover:opacity-80 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                    style={{
                      borderColor: primary,
                      color: primary,
                      backgroundColor: `${primary}10`,
                    }}
                  >
                    {lookup.kind === 'loading' ? (
                      <Loader size="xs" color={primary} />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Buscar
                  </button>
                </div>
              </div>

              {/* Estado del lookup */}
              {lookup.kind === 'error' && (
                <div
                  className="p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
                  style={{
                    borderColor: 'rgba(239,68,68,0.3)',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    color: '#f87171',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {lookup.message}
                </div>
              )}

              {lookup.kind === 'not_found' && (
                <div
                  className="p-2.5 rounded-xl border text-[11px] flex items-start gap-2"
                  style={{
                    borderColor: isDarkBg
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                    color: textColor,
                  }}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      No existe un usuario con ese email
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(lookupEmail.trim().toLowerCase());
                        setMode('new');
                        setLookup({ kind: 'idle' });
                      }}
                      disabled={submitting}
                      className="mt-1 font-bold underline disabled:opacity-40 cursor-pointer"
                      style={{ color: primary }}
                    >
                      Crear usuario nuevo con este email
                    </button>
                  </div>
                </div>
              )}

              {lookup.kind === 'found' && !lookup.data.isRepartidor && (
                <div
                  className="p-2.5 rounded-xl border flex items-start gap-2 text-[11px]"
                  style={{
                    borderColor: 'rgba(239,68,68,0.3)',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    color: '#f87171',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {lookup.data.user.name || lookup.data.user.email}
                    </div>
                    <div>
                      Este email pertenece a un usuario con rol{' '}
                      <strong>{lookup.data.user.role}</strong>. No se puede
                      vincular como repartidor.
                    </div>
                  </div>
                </div>
              )}

              {lookup.kind === 'found' && lookup.data.isRepartidor && (
                <div
                  className="p-3 rounded-xl border space-y-2 text-[11px]"
                  style={{
                    borderColor: `${primary}40`,
                    backgroundColor: `${primary}08`,
                    color: textColor,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className="w-4 h-4 shrink-0"
                      style={{ color: primary }}
                    />
                    <div className="font-bold">
                      {lookup.data.user.name}
                    </div>
                    <div className="opacity-60">
                      {lookup.data.user.email}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1 flex items-center gap-1">
                      <Store className="w-3 h-3" /> Tiendas donde ya está
                    </div>
                    {lookup.data.tenants.length === 0 ? (
                      <div className="opacity-60">Ninguna todavía</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {lookup.data.tenants.map((t) => {
                          const isCurrent =
                            t.tenantId === (tenantId || null);
                          return (
                            <span
                              key={t.driverId}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                              style={{
                                borderColor: isCurrent
                                  ? primary
                                  : isDarkBg
                                  ? 'rgba(255,255,255,0.15)'
                                  : 'rgba(0,0,0,0.1)',
                                backgroundColor: isCurrent
                                  ? `${primary}20`
                                  : 'transparent',
                                color: isCurrent ? primary : textColor,
                              }}
                            >
                              {t.tenantName || 'Pool'}
                              {isCurrent && ' (actual)'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {lookup.data.tenants.some(
                    (t) => t.tenantId === (tenantId || null),
                  ) && (
                    <div className="opacity-70 pt-1">
                      Ya está vinculado a esta tienda. No hace falta hacer
                      nada.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                style={{ color: textColor }}
              >
                Vehículo
              </label>
              <SearchableDropdown
                value={vehicleType}
                onChange={(val) => setVehicleType(val)}
                options={VEHICLE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                placeholder="Vehículo"
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                searchable={false}
                disabled={submitting}
              />
            </div>

            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                style={{ color: textColor }}
              >
                Placa
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="AB123CD"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                style={inputStyle}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Máx. pedidos simultáneos
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxActiveOrders}
              onChange={(e) => setMaxActiveOrders(Number(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-3 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
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
            className="mt-3 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
            style={{
              borderColor: 'rgba(34,197,94,0.3)',
              backgroundColor: 'rgba(34,197,94,0.06)',
              color: '#22c55e',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Repartidor creado
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition hover:opacity-70 disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: isDarkBg
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)',
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              (mode === 'existing' &&
                (lookup.kind !== 'found' ||
                  !lookup.data.isRepartidor ||
                  lookup.data.tenants.some(
                    (t) => t.tenantId === (tenantId || null),
                  )))
            }
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: primary }}
          >
            {submitting ? (
              <>
                <Loader size="xs" color="#ffffff" />
                {mode === 'existing' ? 'Vinculando...' : 'Creando...'}
              </>
            ) : mode === 'existing' ? (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                Vincular a esta tienda
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Crear repartidor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
