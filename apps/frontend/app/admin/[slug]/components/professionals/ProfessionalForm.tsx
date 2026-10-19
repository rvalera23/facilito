// frontend/app/admin/[slug]/components/professionals/ProfessionalForm.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Camera, Search, Mail, Store, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { Professional, CreateProfessionalDto } from './types';
import { useToast } from '@/components/ui/useToast';
import { Loader } from '@/components/ui/Loader';
import { apiFetch } from '@/lib/api';

interface ProfessionalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateProfessionalDto & { password?: string; avatarFile?: File | null; notes?: string }) => Promise<void>;
  professional?: Professional | null;
  loading?: boolean;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

type LookupResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  isProfesional: boolean;
  tenants: Array<{
    professionalId: string;
    tenantId: string;
    tenantName: string | null;
    tenantSlug: string | null;
    isActive: boolean;
    specialties: string[];
  }>;
};

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'found'; data: LookupResult }
  | { kind: 'error'; message: string };

export default function ProfessionalForm({
  isOpen,
  onClose,
  onSave,
  professional,
  loading = false,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ProfessionalFormProps) {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });
  const [phone, setPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');

  // 🔥 Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!professional;
  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)');

  useEffect(() => {
    if (professional) {
      setName(professional.name || '');
      setDescription(professional.description || '');
      setSpecialties(professional.specialties || []);
      setIsActive(professional.isActive !== undefined ? professional.isActive : true);
      setEmail(professional.user?.email || '');
      setPhone(professional.user?.phone || '');
      setDisplayPhone(formatPhoneDisplay(professional.user?.phone || ''));
      setPassword('');
      setNotes((professional.user as any)?.notes || '');
      setAvatarFile(null);
      setAvatarPreview((professional.user as any)?.avatarUrl || null);
    } else {
      setName('');
      setDescription('');
      setSpecialties([]);
      setIsActive(true);
      setEmail('');
      setPhone('');
      setDisplayPhone('');
      setPassword('');
      setNotes('');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [professional]);

  // 🔥 Handler de teléfono con formato visual (usa formatPhoneDisplay)
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setPhone(digits);
    setDisplayPhone(formatPhoneDisplay(digits));
  };

  // 🔥 Password strength
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

  // 🔥 Handler de avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast({ variant: 'warning', message: 'La imagen no puede superar los 5MB' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast({ variant: 'warning', message: 'Solo se permiten imágenes' });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ variant: 'warning', message: 'El nombre es requerido' });
      return;
    }

    if (!isEditing) {
      if (!email.trim()) {
        showToast({ variant: 'warning', message: 'El email es requerido para crear el acceso' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        showToast({ variant: 'warning', message: 'El email no tiene un formato válido' });
        return;
      }
      // Fase P2: si el lookup encontró otro rol, bloquear
      if (lookup.kind === 'found' && !lookup.data.isProfesional) {
        showToast({
          variant: 'error',
          message: `El email pertenece a un usuario con rol ${lookup.data.user.role}. Usá otro email.`,
        });
        return;
      }
      // Fase P2: si ya está vinculado a esta tienda, bloquear
      if (lookup.kind === 'found' && lookup.data.isProfesional) {
        // El backend valida esto, pero chequeamos antes para dar mejor UX
        // (no tenemos el tenantId acá, así que delegamos al backend)
      }
    }

    const dto: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      specialties: specialties.length > 0 ? specialties : undefined,
      isActive,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      avatarFile: avatarFile || undefined,
    };

    if (!isEditing) {
      dto.email = email.trim().toLowerCase();
      dto.password = password.trim() || undefined;
    } else {
      if (password && password.trim().length > 0) {
        dto.password = password.trim();
      }
    }

    await onSave(dto);
  };

  // Fase P2: búsqueda de email antes de crear (multi-tienda).
  const handleLookup = async () => {
    const e = email.trim().toLowerCase();
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
        `/professionals/lookup?email=${encodeURIComponent(e)}`,
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

  const addSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (spec: string) => {
    setSpecialties(specialties.filter(s => s !== spec));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: cardBg,
          borderColor: borderDynamic,
          color: textColor,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold" style={{ color: textColor }}>
              {isEditing ? 'Editar Profesional' : 'Nuevo Profesional'}
            </h3>
            <p className="text-[11px] opacity-60">
              {isEditing ? 'Actualiza los datos del profesional' : 'Registra un nuevo profesional en tu negocio'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border hover:scale-105 transition"
            style={{ borderColor: borderDynamic }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 🔥 Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{ borderColor: `${primary}40`, backgroundColor: `${primary}10` }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: primary }}>
                    {name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2"
                style={{ backgroundColor: primary, borderColor: cardBg, color: '#fff' }}
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
            <p className="text-[10px] opacity-50">JPG, PNG o WebP — máx. 5MB</p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Nombre completo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Carlos Rodríguez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor }}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Descripción (opcional)
            </label>
            <textarea
              placeholder="Breve descripción del profesional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent resize-none"
              style={{ borderColor: borderDynamic, color: textColor }}
            />
          </div>

          {/* Campos de acceso */}
          <div className="pt-2 border-t" style={{ borderColor: borderDynamic }} />

          {/* Email readonly / búsqueda */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Email de acceso {!isEditing && <span className="text-rose-500">*</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="profesional@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLookup({ kind: 'idle' });
                }}
                className="flex-1 border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
                style={{ borderColor: borderDynamic, color: textColor }}
                required={!isEditing}
                readOnly={isEditing}
                disabled={isEditing || lookup.kind === 'loading'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isEditing) {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
              />
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={
                    lookup.kind === 'loading' || !email.trim()
                  }
                  className="px-3 py-2.5 rounded-xl text-[11px] font-bold border transition hover:opacity-80 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  style={{
                    borderColor: primary,
                    color: primary,
                    backgroundColor: `${primary}10`,
                  }}
                >
                  {lookup.kind === 'loading' ? (
                    <Loader size="xs" color={primary} />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  Buscar
                </button>
              )}
            </div>

            {/* Estados del lookup (solo en creación) */}
            {!isEditing && lookup.kind === 'error' && (
              <div
                className="mt-2 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
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

            {!isEditing && lookup.kind === 'not_found' && (
              <div
                className="mt-2 p-2.5 rounded-xl border text-[11px] flex items-start gap-2"
                style={{
                  borderColor: borderDynamic,
                  color: textColor,
                }}
              >
                <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Email disponible</div>
                  <div className="opacity-70">
                    No existe un usuario con este email. Se creará uno nuevo con rol profesional.
                  </div>
                </div>
              </div>
            )}

            {!isEditing && lookup.kind === 'found' && !lookup.data.isProfesional && (
              <div
                className="mt-2 p-2.5 rounded-xl border flex items-start gap-2 text-[11px]"
                style={{
                  borderColor: 'rgba(239,68,68,0.3)',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                  color: '#f87171',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{lookup.data.user.name || lookup.data.user.email}</div>
                  <div>
                    Este email pertenece a un usuario con rol <strong>{lookup.data.user.role}</strong>. No se puede crear un profesional con ese email.
                  </div>
                </div>
              </div>
            )}

            {!isEditing && lookup.kind === 'found' && lookup.data.isProfesional && (
              <div
                className="mt-2 p-3 rounded-xl border space-y-2 text-[11px]"
                style={{
                  borderColor: `${primary}40`,
                  backgroundColor: `${primary}08`,
                  color: textColor,
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  <div className="font-bold">{lookup.data.user.name}</div>
                  <div className="opacity-60">{lookup.data.user.email}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1 flex items-center gap-1">
                    <Store className="w-3 h-3" /> Tiendas donde ya está
                  </div>
                  {lookup.data.tenants.length === 0 ? (
                    <div className="opacity-60">Ninguna todavía</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {lookup.data.tenants.map((t) => (
                        <span
                          key={t.professionalId}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                          style={{
                            borderColor: borderDynamic,
                            color: textColor,
                          }}
                        >
                          {t.tenantName || 'Pool'}
                          {t.isActive && ' ●'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="opacity-70 pt-1">
                  Este profesional ya existe. Se vinculará a esta tienda sin crear un nuevo user.
                </div>
              </div>
            )}

            <p className="text-[10px] opacity-50 mt-1">
              {isEditing
                ? 'El email no se puede cambiar después de crear el usuario.'
                : 'El profesional usará este email para iniciar sesión. Buscá el email para verificar si ya existe en otra tienda.'}
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              placeholder="0414-1234567"
              value={displayPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor }}
              maxLength={18}
            />
            <p className="text-[10px] opacity-50 mt-1">
              Formato: 0414-1234567
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Notas internas (opcional)
            </label>
            <textarea
              placeholder="Notas solo visibles para el admin"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent resize-none"
              style={{ borderColor: borderDynamic, color: textColor }}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Contraseña {isEditing ? '(dejar vacío para no cambiar)' : '(opcional)'}
            </label>
            <input
              type="text"
              placeholder={isEditing ? 'Dejar vacío para mantener la actual' : 'Dejar vacío para usar la predeterminada'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor }}
            />

            {/* Strength indicator */}
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
                            : isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-medium" style={{ color: passwordStrength.color }}>
                  Contraseña {passwordStrength.label}
                </p>
                <ul className="text-[10px] opacity-60 space-y-0.5" style={{ color: textColor }}>
                  <li className={password.length >= 8 ? 'line-through opacity-40' : ''}>
                    ✓ Mínimo 8 caracteres
                  </li>
                  <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'line-through opacity-40' : ''}>
                    ✓ Mayúscula y minúscula
                  </li>
                  <li className={/[0-9]/.test(password) ? 'line-through opacity-40' : ''}>
                    ✓ Al menos un número
                  </li>
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'line-through opacity-40' : ''}>
                    ✓ Un carácter especial (!@#$%)
                  </li>
                </ul>
              </div>
            )}

            {!password && (
              <p className="text-[10px] opacity-50 mt-1">
                {isEditing
                  ? 'Si querés cambiar la contraseña, escribí una nueva.'
                  : 'Si lo dejás vacío, se usará profesional123.'}
              </p>
            )}
          </div>

          {/* Especialidades */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 opacity-80">
              Especialidades
            </label>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {specialties.map((spec) => (
                <span
                  key={spec}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border"
                  style={{ borderColor: borderDynamic }}
                >
                  {spec}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(spec)}
                    className="opacity-50 hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {specialties.length === 0 && (
                <span className="text-[10px] opacity-40 italic">
                  Sin especialidades agregadas
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe una especialidad y presiona Añadir"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                className="flex-1 border rounded-xl px-4 py-2 text-xs outline-none bg-transparent"
                style={{ borderColor: borderDynamic, color: textColor }}
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center gap-1"
                style={{ backgroundColor: primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir
              </button>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <label className="text-[11px] font-bold opacity-80">Estado:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition ${isActive ? 'text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                style={{
                  backgroundColor: isActive ? primary : 'transparent',
                  borderColor: isActive ? 'transparent' : borderDynamic,
                }}
              >
                Activo
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition ${!isActive ? 'text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                style={{
                  backgroundColor: !isActive ? primary : 'transparent',
                  borderColor: !isActive ? 'transparent' : borderDynamic,
                }}
              >
                Inactivo
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: borderDynamic }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition hover:opacity-80"
              style={{ borderColor: borderDynamic, color: textColor }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: loading ? '#64748b' : primary }}
            >
              {loading ? (
                <>
                  <Loader size="sm" color="#ffffff" />
                  Guardando...
                </>
              ) : (
                isEditing ? 'Actualizar' : 'Crear Profesional'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}