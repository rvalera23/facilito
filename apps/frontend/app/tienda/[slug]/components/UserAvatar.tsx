'use client';

import React, { useMemo, useState } from 'react';

// ============================================================
// 🔥 USER AVATAR — Foto o inicial con color por nombre
// ============================================================
// Si el usuario tiene avatar, lo muestra.
// Si no, muestra la inicial del nombre sobre un fondo de color
// generado deterministicamente a partir del nombre.
//
// Uso:
//   <UserAvatar name="María González" avatarUrl={url} size={40} />

interface UserAvatarProps {
  /** Nombre completo del usuario */
  name: string;

  /** URL de la imagen (opcional) */
  avatarUrl?: string | null;

  /** Tamaño en px. Default: 40 */
  size?: number;

  /** Clase extra */
  className?: string;
}

// ============================================================
// 🔥 PALETA DE COLORES — 12 colores, alto contraste
// ============================================================
// Colores elegidos para funcionar bien sobre texto blanco.
// Son colores "Tailwind 500/600" con contraste AA garantizado.

const AVATAR_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
];

// ============================================================
// 🔥 HELPER: color determinístico por nombre
// ============================================================
// Mismo nombre → mismo color SIEMPRE.
// Usa un hash simple pero consistente.
function getColorFromName(name: string): string {
  if (!name) return AVATAR_COLORS[0];

  let hash = 0;
  const cleanName = name.trim().toLowerCase();

  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash * 31 + cleanName.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================================
// 🔥 HELPER: inicial del nombre
// ============================================================
// Toma la primera letra del primer nombre (ignora espacios).
function getInitial(name: string): string {
  if (!name) return '?';

  const clean = name.trim();
  if (!clean) return '?';

  // Tomar la primera letra alfanumérica
  const match = clean.match(/[A-Za-zÀ-ÿ0-9]/);
  return match ? match[0].toUpperCase() : '?';
}

// ============================================================
// 🔥 COMPONENTE
// ============================================================

export default function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const bgColor = useMemo(() => getColorFromName(name), [name]);
  const initial = useMemo(() => getInitial(name), [name]);

  const hasValidImage = !!avatarUrl && !imgError;

  // Redondear el tamaño de fuente al 40% del contenedor
  const fontSize = Math.max(10, Math.round(size * 0.42));
  const borderRadius = size >= 40 ? '50%' : '50%'; // Siempre círculo

  return (
    <div
      className={`shrink-0 flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hasValidImage ? 'transparent' : bgColor,
        color: '#ffffff',
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
      aria-label={name}
      title={name}
    >
      {hasValidImage ? (
        <img
          src={avatarUrl as string}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}