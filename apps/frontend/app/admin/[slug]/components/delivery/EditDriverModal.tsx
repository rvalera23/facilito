'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/EditDriverModal.tsx
// Modal para editar un driver existente.
// Solo campos que acepta PATCH /delivery/drivers/:driverId:
//   status, currentLat, currentLng, vehicleType, vehiclePlate,
//   maxActiveOrders, isVerified
// ============================================================

import { useEffect, useRef, useState } from 'react';
import {
  X,
  Save,
  Truck,
  AlertCircle,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import type { DriverItem } from './DeliveryTab';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { apiFetch } from '@/lib/api';

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  driver: DriverItem | null;
  primary: string;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
}

const VEHICLE_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'moto', label: 'Moto' },
  { value: 'carro', label: 'Carro' },
  { value: 'bici', label: 'Bicicleta' },
  { value: 'a_pie', label: 'A pie' },
];

const STATUS_OPTIONS = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'busy', label: 'En ruta' },
  { value: 'paused', label: 'Pausa' },
];

export default function EditDriverModal({
  isOpen,
  onClose,
  onUpdated,
  driver,
  primary,
  secondary,
  isDarkBg,
  textColor,
}: EditDriverModalProps) {
  const [status, setStatus] = useState('offline');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [maxActiveOrders, setMaxActiveOrders] = useState(1);
  const [isVerified, setIsVerified] = useState(false);
  const [currentLat, setCurrentLat] = useState<string>('');
  const [currentLng, setCurrentLng] = useState<string>('');

  // 🔥 Fase 2: campos del user (users table) + avatar + password
  const [name, setName] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-poblar cuando se abre con un driver
  useEffect(() => {
    if (driver && isOpen) {
      setStatus(driver.status || 'offline');
      setVehicleType(driver.vehicleType || '');
      setVehiclePlate(driver.vehiclePlate || '');
      setMaxActiveOrders(driver.maxActiveOrders ?? 1);
      setIsVerified(Boolean(driver.isVerified));
      setCurrentLat(driver.currentLat != null ? String(driver.currentLat) : '');
      setCurrentLng(driver.currentLng != null ? String(driver.currentLng) : '');
      setName(driver.user?.name || '');
      setPhone(driver.user?.phone || '');
      setDisplayPhone(formatPhoneDisplay(driver.user?.phone || ''));
      setNotes(((driver.user as any)?.notes as string) || '');
      setPassword('');
      setAvatarFile(null);
      setAvatarPreview(driver.user?.avatarUrl || null);
      setError(null);
      setSuccess(false);
    }
  }, [driver, isOpen]);

  if (!isOpen || !driver) return null;

  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: textColor,
  };

  // 🔥 Teléfono con formato visual (mismo patrón que ProfessionalForm)
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setPhone(digits);
    setDisplayPhone(formatPhoneDisplay(digits));
  };

  // 🔥 Password strength (idéntico a ProfessionalForm)
  const passwordStrength = (() => {
    if (!password) return { label: '', color: '', score: 0 };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Débil', color: '#ef4444', score: 1 };
    if (score <= 4) return { label: 'Media', color: '#f59e0b', score: 2 };
    return { label: 'Fuerte', color: '#22c55e', score: 3 };
  })();

  // 🔥 Avatar (valida tamaño/tipo + preview con FileReader)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1) PATCH principal (status, vehículo, user fields)
      const body: Record<string, any> = {
        status,
        vehicleType: vehicleType || null,
        vehiclePlate: vehiclePlate.trim() || null,
        maxActiveOrders: Number(maxActiveOrders) || 1,
        isVerified,
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      };

      const parsedLat = currentLat.trim() === '' ? null : Number(currentLat);
      const parsedLng = currentLng.trim() === '' ? null : Number(currentLng);
      if (parsedLat !== null && Number.isFinite(parsedLat)) body.currentLat = parsedLat;
      if (parsedLng !== null && Number.isFinite(parsedLng)) body.currentLng = parsedLng;

      const res = await apiFetch(`/delivery/drivers/${driver.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      // 2) Avatar (si el admin eligió uno nuevo)
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        const resAvatar = await apiFetch(
          `/delivery/drivers/${driver.id}/avatar`,
          { method: 'POST', body: fd },
        );
        if (!resAvatar.ok) {
          const errData = await resAvatar.json().catch(() => ({}));
          throw new Error(
            errData.message || 'Error al subir el avatar',
          );
        }
      }

      // 3) Password (si el admin escribió una nueva)
      if (password.trim()) {
        if (password.trim().length < 6) {
          throw new Error(
            'La contraseña debe tener al menos 6 caracteres',
          );
        }
        const resPwd = await apiFetch(
          `/delivery/drivers/${driver.id}/password`,
          {
            method: 'PATCH',
            body: JSON.stringify({ password: password.trim() }),
          },
        );
        if (!resPwd.ok) {
          const errData = await resPwd.json().catch(() => ({}));
          throw new Error(
            errData.message || 'Error al cambiar la contraseña',
          );
        }
      }

      setSuccess(true);
      onUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el repartidor');
    } finally {
      setSubmitting(false);
    }
  };

  const driverName = driver.user?.name || 'Sin nombre';

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
            <div>
              <h3 className="text-base font-bold leading-tight" style={{ color: textColor }}>
                Editar repartidor
              </h3>
              <p className="text-[10px] opacity-60" style={{ color: textColor }}>
                {driverName}
              </p>
            </div>
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

        {/* Form */}
        <div className="space-y-3">
          {/* 🔥 Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{
                  borderColor: `${primary}40`,
                  backgroundColor: `${primary}10`,
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-3xl font-bold"
                    style={{ color: primary }}
                  >
                    {name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2"
                style={{
                  backgroundColor: primary,
                  borderColor: secondary || (isDarkBg ? '#0f172a' : '#ffffff'),
                  color: '#fff',
                }}
                title="Cambiar avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p
              className="text-[10px] opacity-50"
              style={{ color: textColor }}
            >
              JPG, PNG o WebP — máx. 5MB
            </p>
          </div>

          {/* Nombre */}
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
              placeholder="Ej. Carlos Rodríguez"
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />
          </div>

          {/* Email readonly */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Email de acceso
            </label>
            <input
              type="email"
              value={driver.user?.email || ''}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition opacity-70"
              style={inputStyle}
            />
            <p
              className="text-[10px] opacity-50 mt-1"
              style={{ color: textColor }}
            >
              El email no se puede cambiar después de crear el usuario.
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Teléfono
            </label>
            <input
              type="tel"
              value={displayPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="0414-1234567"
              disabled={submitting}
              maxLength={18}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />
            <p
              className="text-[10px] opacity-50 mt-1"
              style={{ color: textColor }}
            >
              Formato: 0414-1234567
            </p>
          </div>

          {/* Notas internas */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Notas internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas solo visibles para el admin"
              rows={2}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition resize-none"
              style={inputStyle}
            />
          </div>

          <div className="pt-2 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
              Estado
            </label>
            <SearchableDropdown
              value={status}
              onChange={(val) => setStatus(val)}
              options={STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              placeholder="Estado"
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
              searchable={false}
              disabled={submitting}
            />
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textColor }}>
              Cambiar a "online" sin coords puede fallar el check-delivery. Usá las coords de abajo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
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
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
                Placa
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="AB123CD"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
              Máx. pedidos simultáneos
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxActiveOrders}
              onChange={(e) => setMaxActiveOrders(Number(e.target.value) || 1)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />
          </div>

          {/* Toggle isVerified */}
          <label className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer" style={inputStyle}>
            <span className="text-xs font-bold" style={{ color: textColor }}>
              Verificado
            </span>
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              disabled={submitting}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: primary }}
            />
          </label>

          {/* Coords override */}
          <div className="pt-2 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
              Posición actual (opcional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={currentLat}
                onChange={(e) => setCurrentLat(e.target.value)}
                placeholder="Lat. ej: 10.4760"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                style={inputStyle}
              />
              <input
                type="text"
                inputMode="decimal"
                value={currentLng}
                onChange={(e) => setCurrentLng(e.target.value)}
                placeholder="Lng. ej: -66.5732"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
                style={inputStyle}
              />
            </div>
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textColor }}>
              Útil para pruebas: forzá la posición del driver cerca del comprador.
            </p>
          </div>

          {/* 🔥 Contraseña con strength */}
          <div className="pt-2 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
              Contraseña (dejar vacío para no cambiar)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar vacío para mantener la actual"
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition"
              style={inputStyle}
            />

            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          passwordStrength.score >= level
                            ? passwordStrength.color
                            : isDarkBg
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
                <p
                  className="text-[10px] font-medium"
                  style={{ color: passwordStrength.color }}
                >
                  Contraseña {passwordStrength.label}
                </p>
                <ul
                  className="text-[10px] opacity-60 space-y-0.5"
                  style={{ color: textColor }}
                >
                  <li
                    className={
                      password.length >= 8
                        ? 'line-through opacity-40'
                        : ''
                    }
                  >
                    ✓ Mínimo 8 caracteres
                  </li>
                  <li
                    className={
                      /[A-Z]/.test(password) && /[a-z]/.test(password)
                        ? 'line-through opacity-40'
                        : ''
                    }
                  >
                    ✓ Mayúscula y minúscula
                  </li>
                  <li
                    className={
                      /[0-9]/.test(password)
                        ? 'line-through opacity-40'
                        : ''
                    }
                  >
                    ✓ Al menos un número
                  </li>
                  <li
                    className={
                      /[^A-Za-z0-9]/.test(password)
                        ? 'line-through opacity-40'
                        : ''
                    }
                  >
                    ✓ Un carácter especial (!@#$%)
                  </li>
                </ul>
              </div>
            )}

            {!password && (
              <p
                className="text-[10px] opacity-50 mt-1"
                style={{ color: textColor }}
              >
                Si querés cambiar la contraseña, escribí una nueva.
              </p>
            )}
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
            Repartidor actualizado
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
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}