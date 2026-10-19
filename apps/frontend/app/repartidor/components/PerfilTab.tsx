'use client';

// ============================================================
// ARCHIVO: app/repartidor/components/PerfilTab.tsx
// Perfil del repartidor (self-service).
// - Avatar (upload a POST /delivery/drivers/me/avatar)
// - Nombre, email, cédula, vehículo: SOLO lectura (los edita el admin)
// - Teléfono + checkbox WhatsApp: editables (contacto)
// - Cambio de contraseña (POST /auth/change-password)
// ============================================================

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  User as UserIcon,
  Camera,
  Save,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Truck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/useToast';
import { Loader } from '@/components/ui/Loader';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { apiFetch } from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import type { MyDriver } from '@/hooks/useMyDriverProfile';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface PerfilTabProps {
  driver: MyDriver;
  primary: string;
  secondary?: string;
  accent?: string;
  textColor: string;
  textMuted: string;
  cardBg: string;
  borderDynamic: string;
  isDarkBg: boolean;
  onUpdated?: () => void;
  updateProfile: (updates: {
    phone?: string | null;
    phone_is_whatsapp?: boolean;
  }) => Promise<void>;
  uploadMyAvatar?: (file: File) => Promise<{ avatarUrl: string }>;
}

type IdType = 'V' | 'E' | 'J' | 'P';

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: 'V', label: 'V — Venezolano' },
  { value: 'E', label: 'E — Extranjero' },
  { value: 'J', label: 'J — Jurídico' },
  { value: 'P', label: 'P — Pasaporte' },
];

const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'carro', label: 'Carro' },
  { value: 'bicicleta', label: 'Bicicleta' },
  { value: 'a_pie', label: 'A pie' },
  { value: 'camioneta', label: 'Camioneta' },
];

export default function PerfilTab({
  driver,
  primary,
  secondary,
  accent,
  textColor,
  textMuted,
  cardBg,
  borderDynamic,
  isDarkBg,
  onUpdated,
  updateProfile,
  uploadMyAvatar,
}: PerfilTabProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Mismo patrón que admin/mi-cuenta: fondo opaco del modal.
  // No usamos el `cardBg` de props porque viene semitransparente
  // (rgba(0,0,0,0.2)) y el SuccessModal debe verse sólido.
  const modalCardBg =
    secondary ||
    (isDarkBg ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)');

  // ---------------- Estado: datos personales ----------------
  const [name, setName] = useState(driver.user?.name || '');
  const [phone, setPhone] = useState(driver.user?.phone || '');
  const [displayPhone, setDisplayPhone] = useState(
    formatPhoneDisplay(driver.user?.phone || ''),
  );
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(
    driver.user?.phone_is_whatsapp ?? true,
  );

  // Fase 2.5: teléfono con formato visual (mismo patrón que ProfessionalForm)
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setPhone(digits);
    setDisplayPhone(formatPhoneDisplay(digits));
  };
  const [idType, setIdType] = useState<IdType>(
    (driver.user?.id_type as IdType) || 'V',
  );
  const [idNumber, setIdNumber] = useState(driver.user?.id_number || '');
  const [vehicleType, setVehicleType] = useState(driver.vehicleType || '');
  const [vehiclePlate, setVehiclePlate] = useState(driver.vehiclePlate || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [showSuccessProfileModal, setShowSuccessProfileModal] = useState(false);

  // ---------------- Estado: avatar ----------------
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ---------------- Estado: password ----------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showSuccessPasswordModal, setShowSuccessPasswordModal] = useState(false);
  // ---------------- Avatar actual ----------------
  const resolvedAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    const raw = driver.user?.avatarUrl;
    if (!raw) return null;
    if (raw.startsWith('http')) return raw;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return `${apiBase}${raw}`;
  }, [avatarPreview, driver.user?.avatarUrl]);

  // ---------------- Handlers ----------------
  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.showToast({
          variant: 'error',
          message: 'La imagen no puede superar los 2MB.',
        });
        return;
      }
      setUploadingAvatar(true);
      try {
        if (!uploadMyAvatar) {
          throw new Error('uploadMyAvatar no disponible');
        }
        await uploadMyAvatar(file);
        // Preview local + forzar refresh desde backend en el próximo render
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(String(reader.result));
        reader.readAsDataURL(file);
        toast.showToast({
          variant: 'success',
          message: 'Avatar actualizado correctamente.',
        });
        onUpdated?.();
      } catch (err: any) {
        toast.showToast({
          variant: 'error',
          message: err?.message || 'Error subiendo el avatar',
        });
      } finally {
        setUploadingAvatar(false);
        e.target.value = '';
      }
    },
    [toast, onUpdated, uploadMyAvatar],
  );

  const handleSaveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      // Fase 2.5: el repartidor solo actualiza datos de contacto.
      await updateProfile({
        phone: phone.trim() || null,
        phone_is_whatsapp: phoneIsWhatsapp,
      });
      // 🔥 Coherencia con admin y mi-cuenta: SuccessModal, no Toast.
      setShowSuccessProfileModal(true);
      onUpdated?.();
    } catch (err: any) {
      toast.showToast({
        variant: 'error',
        message: err?.message || 'Error guardando el perfil',
      });
    } finally {
      setSavingProfile(false);
    }
  }, [phone, phoneIsWhatsapp, updateProfile, toast, onUpdated]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      toast.showToast({
        variant: 'error',
        message: 'Ingresá tu contraseña actual.',
      });
      return;
    }
    if (newPassword.length < 8) {
      toast.showToast({
        variant: 'error',
        message: 'La nueva contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showToast({
        variant: 'error',
        message: 'Las contraseñas no coinciden.',
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      // 🔥 Coherencia: SuccessModal para éxito.
      setShowSuccessPasswordModal(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.showToast({
        variant: 'error',
        message: err?.message || 'Error cambiando la contraseña',
      });
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, toast]);

  // ---------------- Estilos base ----------------
  const inputStyle: React.CSSProperties = {
    backgroundColor: isDarkBg
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.03)',
    borderColor: borderDynamic,
    color: textColor,
  };

  const labelStyle: React.CSSProperties = {
    color: textMuted,
  };

  // ---------------- Render ----------------
  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* CARD: AVATAR + DATOS PRINCIPALES                              */}
      {/* ============================================================ */}
      <div
        className="rounded-3xl border p-6 space-y-5"
        style={{ backgroundColor: cardBg, borderColor: borderDynamic }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="relative group shrink-0"
            title="Cambiar avatar"
          >
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={name || 'Repartidor'}
                className="w-20 h-20 rounded-2xl object-cover border-2 transition group-hover:opacity-80"
                style={{ borderColor: `${primary}40` }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold transition group-hover:opacity-80"
                style={{ backgroundColor: primary, color: '#ffffff' }}
              >
                {(name || 'R').charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-2 shadow-md"
              style={{
                backgroundColor: primary,
                color: '#ffffff',
                borderColor: cardBg,
              }}
            >
              {uploadingAvatar ? (
                <Loader size="xs" color="#ffffff" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div className="space-y-1">
            <div className="text-base font-bold" style={{ color: textColor }}>
              {name || 'Repartidor'}
            </div>
            <div className="text-[11px]" style={{ color: textMuted }}>
              {formatPhoneDisplay(phone) || 'Sin teléfono'} · ★{' '}
              {driver.ratingAvg} ({driver.ratingCount})
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={labelStyle}>
              {driver.isVerified ? 'Verificado' : 'Sin verificar'}
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Field label="Nombre" icon={<UserIcon className="w-3.5 h-3.5" />} textMuted={textMuted}>
            <input
              type="text"
              value={name}
              readOnly
              disabled
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none cursor-not-allowed opacity-70"
              style={inputStyle}
            />
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textMuted }}>
              Solo el admin puede cambiar el nombre.
            </p>
          </Field>

          <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />} textMuted={textMuted}>
            <input
              type="email"
              value={driver.user?.email || ''}
              readOnly
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none cursor-not-allowed opacity-70"
              style={inputStyle}
            />
          </Field>

          <Field label="Teléfono" icon={<Phone className="w-3.5 h-3.5" />} textMuted={textMuted}>
            <input
              type="tel"
              value={displayPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="0414-1234567"
              maxLength={18}
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
              style={inputStyle}
              disabled={savingProfile}
            />
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textMuted }}>
              Formato: 0414-1234567
            </p>
            <label
              className="flex items-center gap-2 mt-2 text-[11px] cursor-pointer"
              style={{ color: textMuted }}
            >
              <input
                type="checkbox"
                checked={phoneIsWhatsapp}
                onChange={(e) => setPhoneIsWhatsapp(e.target.checked)}
                disabled={savingProfile}
                className="w-3.5 h-3.5 cursor-pointer"
                style={{ accentColor: primary }}
              />
              Este número también es WhatsApp
            </label>
          </Field>

          <Field
            label="Cédula"
            icon={<CreditCard className="w-3.5 h-3.5" />}
            textMuted={textMuted}
          >
            <div className="flex gap-2 opacity-70">
              <div className="w-[80px] flex-shrink-0">
                <SearchableDropdown
                  value={idType}
                  onChange={() => {}}
                  options={ID_TYPES.map((t) => ({
                    value: t.value,
                    label: t.value,
                  }))}
                  placeholder="V"
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={borderDynamic}
                  searchable={false}
                  disabled
                />
              </div>
              <input
                type="text"
                value={idNumber}
                readOnly
                disabled
                placeholder="—"
                className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none cursor-not-allowed"
                style={inputStyle}
              />
            </div>
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textMuted }}>
              Solo el admin puede cambiar la cédula.
            </p>
          </Field>
        </div>

        {/* Vehículo */}
        <div className="border-t pt-4" style={{ borderColor: borderDynamic }}>
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-3"
            style={labelStyle}
          >
            <Truck className="w-3.5 h-3.5" />
            Vehículo
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            <Field label="Tipo" textMuted={textMuted}>
              <SearchableDropdown
                value={vehicleType}
                onChange={() => {}}
                options={[
                  { value: '', label: 'Sin definir' },
                  ...VEHICLE_TYPES.map((v) => ({ value: v.value, label: v.label })),
                ]}
                placeholder="Sin definir"
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={borderDynamic}
                searchable={false}
                disabled
              />
            </Field>
            <Field label="Placa" textMuted={textMuted}>
              <input
                type="text"
                value={vehiclePlate}
                readOnly
                disabled
                placeholder="—"
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none cursor-not-allowed"
                style={inputStyle}
              />
            </Field>
          </div>
          <p className="text-[10px] opacity-50 mt-2" style={{ color: textMuted }}>
            Solo el admin puede cambiar el vehículo.
          </p>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: primary }}
          >
            {savingProfile ? (
              <>
                <Loader size="xs" color="#ffffff" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Guardar contacto
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD: CAMBIO DE CONTRASEÑA                                    */}
      {/* ============================================================ */}
      <div
        className="rounded-3xl border p-6 space-y-4"
        style={{ backgroundColor: cardBg, borderColor: borderDynamic }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${primary}20`, color: primary }}
          >
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: textColor }}>
              Cambiar contraseña
            </div>
            <div className="text-[11px]" style={{ color: textMuted }}>
              Mínimo 8 caracteres con mayúscula, minúscula y número.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Contraseña actual" textMuted={textMuted}>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
              style={inputStyle}
              disabled={savingPassword}
              autoComplete="current-password"
            />
          </Field>
          <Field label="Nueva contraseña" textMuted={textMuted}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
              style={inputStyle}
              disabled={savingPassword}
              autoComplete="new-password"
            />
            {newPassword && (
              <PasswordStrengthIndicator
                password={newPassword}
                className="mt-2"
              />
            )}
          </Field>
          <Field label="Confirmar nueva" textMuted={textMuted}>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition"
              style={inputStyle}
              disabled={savingPassword}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: primary }}
          >
            {savingPassword ? (
              <>
                <Loader size="xs" color="#ffffff" />
                Cambiando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Cambiar contraseña
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🔥 SuccessModal — coherente con admin y mi-cuenta */}
      <SuccessModal
        isOpen={showSuccessProfileModal}
        onClose={() => setShowSuccessProfileModal(false)}
        title="¡Perfil actualizado!"
        message="Tus datos se guardaron correctamente."
        primary={primary}
        borderColor={borderDynamic}
        cardBg={modalCardBg}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
      <SuccessModal
        isOpen={showSuccessPasswordModal}
        onClose={() => setShowSuccessPasswordModal(false)}
        title="¡Contraseña actualizada!"
        message="Tu nueva contraseña ya está activa."
        primary={primary}
        borderColor={borderDynamic}
        cardBg={modalCardBg}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    </div>
  );
}

// ============================================================
// SUBCOMPONENTE: Field
// ============================================================
function Field({
  label,
  icon,
  textMuted,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  textMuted: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: textMuted }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}