'use client';

import React, { forwardRef } from 'react';

// ============================================================
// 🔥 BUSINESS CARD HORIZONTAL — Tarjeta de presentación digital
// ============================================================
// Formato: 1600×900 (16:9)
// Concepto: la imagen de fondo ocupa TODO. Overlay oscuro para
// legibilidad. Texto siempre blanco sobre la imagen.
// Nada de espacios en blanco: todo sobre la imagen.
//
// Estructura:
//   - Fondo: banner o gradiente del color primario
//   - Overlay: gradiente oscuro (top suave → bottom fuerte)
//   - Grid: 2 columnas (izq: identidad · der: contacto + tags)
//   - Footer: QR + redes + firma
// ============================================================

export interface BusinessFlyerData {
  tenantName: string;
  tenantSlogan?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  rif?: string | null;
  address?: string | null;
  city?: string | null;
  zone?: string | null;
  niche?: string | null;
  email?: string | null;
  phone?: string | null;
  schedule?: string | null;
  modality?: string | null;
  deliveryType?: string | null;
  paymentMethods?: string[];
  deliveryCompanies?: string[];
  ratingAvg?: number | null;
  ratingCount?: number | null;
  likesCount?: number | null;
  socialLinks?: {
    instagram?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
    tiktok?: string | null;
    x?: string | null;
    threads?: string | null;
    linkedin?: string | null;
    telegram?: string | null;
  };
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  isDarkBg: boolean;
  storeUrl: string;
  fontFamily?: string | null;
  fontWeight?: number | null;
}

// ============================================================
// ICONOS SVG INLINE
// ============================================================
const Icons = {
  MapPin: ({ color, size = 18 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Id: ({ color, size = 18 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 9h4M14 13h4M14 17h2" />
    </svg>
  ),
  Clock: ({ color, size = 18 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Phone: ({ color, size = 18 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Email: ({ color, size = 18 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  CreditCard: ({ color, size = 20 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Truck: ({ color, size = 20 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Instagram: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  Facebook: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  Whatsapp: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Tiktok: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z" />
    </svg>
  ),
  XTwitter: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Threads: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z" />
    </svg>
  ),
  Linkedin: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
    </svg>
  ),
  Telegram: ({ color, size = 24 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
  Star: ({ color, size = 20, filled = false }: { color: string; size?: number; filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Heart: ({ color, size = 20, filled = false }: { color: string; size?: number; filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

// ============================================================
// 🔥 HELPERS
// ============================================================

// Tamaño de fuente dinámico según longitud del nombre.
function nameSizeFor(name: string): number {
  const len = (name || '').length;
  if (len <= 16) return 56;
  if (len <= 26) return 46;
  if (len <= 40) return 38;
  if (len <= 60) return 30;
  return 24;
}

// Recorta una lista de strings dejando espacio para "+N más"
function limitTags(tags: string[], max: number): { shown: string[]; extra: number } {
  if (tags.length <= max) return { shown: tags, extra: 0 };
  return { shown: tags.slice(0, max), extra: tags.length - max };
}

// Convierte hex + alpha en rgba
function withAlpha(hexColor: string, alpha: number): string {
  const clean = (hexColor || '#000000').replace('#', '');
  if (clean.length !== 6) return hexColor;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================
// BUSINESS CARD HORIZONTAL
// ============================================================
const BusinessFlyer = forwardRef<HTMLDivElement, { data: BusinessFlyerData }>(
  ({ data }, ref) => {
    const {
      tenantName,
      tenantSlogan,
      logoUrl,
      bannerUrl,
      description,
      rif,
      address,
      city,
      zone,
      niche,
      email,
      phone,
      schedule,
      paymentMethods = [],
      deliveryCompanies = [],
      ratingAvg,
      ratingCount,
      likesCount,
      socialLinks = {},
      primaryColor,
      secondaryColor,
      textColor,
      isDarkBg,
      storeUrl,
      fontFamily,
    } = data;

    // ============================================================
    // 🎨 COLORES — Sobre imagen, SIEMPRE texto blanco.
    // Con overlay oscuro garantizamos contraste en ambos temas.
    // ============================================================
    const TEXT_WHITE = '#ffffff';
    const TEXT_WHITE_80 = 'rgba(255,255,255,0.85)';
    const TEXT_WHITE_60 = 'rgba(255,255,255,0.65)';
    const TEXT_WHITE_45 = 'rgba(255,255,255,0.45)';

    // Glassmorphism: celdas semi-transparentes sobre la imagen
    const glassBg = 'rgba(255,255,255,0.10)';
    const glassBorder = 'rgba(255,255,255,0.18)';

    // ----- QR -----
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      storeUrl,
    )}&bgcolor=ffffff&color=0f172a&margin=0`;

    // ----- Redes activas -----
    const socialEntries = [
      { key: 'instagram', url: socialLinks.instagram ? `https://instagram.com/${socialLinks.instagram.replace('@', '')}` : null, Icon: Icons.Instagram },
      { key: 'whatsapp', url: socialLinks.whatsapp ? `https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}` : null, Icon: Icons.Whatsapp },
      { key: 'facebook', url: socialLinks.facebook ? `https://facebook.com/${socialLinks.facebook}` : null, Icon: Icons.Facebook },
      { key: 'tiktok', url: socialLinks.tiktok ? `https://tiktok.com/@${socialLinks.tiktok.replace('@', '')}` : null, Icon: Icons.Tiktok },
      { key: 'x', url: socialLinks.x ? `https://twitter.com/${socialLinks.x.replace('@', '')}` : null, Icon: Icons.XTwitter },
      { key: 'threads', url: socialLinks.threads ? `https://threads.net/@${socialLinks.threads.replace('@', '')}` : null, Icon: Icons.Threads },
      { key: 'linkedin', url: socialLinks.linkedin ? `https://linkedin.com/in/${socialLinks.linkedin}` : null, Icon: Icons.Linkedin },
      { key: 'telegram', url: socialLinks.telegram ? `https://t.me/${socialLinks.telegram.replace('@', '')}` : null, Icon: Icons.Telegram },
    ].filter((s) => s.url);

    const ratingDisplay = ratingAvg && ratingCount
      ? { avg: Number(ratingAvg).toFixed(1), count: Number(ratingCount) }
      : null;

    const locationParts = [city, zone].filter(Boolean) as string[];
    const locationLine = locationParts.join(' · ');

    const nameFontSize = nameSizeFor(tenantName);

    const MAX_PAYMENT_TAGS = 4;
    const MAX_DELIVERY_TAGS = 3;
    const paymentTags = limitTags(paymentMethods, MAX_PAYMENT_TAGS);
    const deliveryTags = limitTags(deliveryCompanies, MAX_DELIVERY_TAGS);

    // ============================================================
    // 🎨 FONDO
    // ============================================================
    // Si hay banner → imagen con overlay.
    // Si no hay banner → gradiente diagonal con el color primario.
    const fallbackBg = `linear-gradient(135deg, ${primaryColor} 0%, ${withAlpha(primaryColor, 0.65)} 45%, ${secondaryColor} 100%)`;

    return (
      <div
        ref={ref}
        style={{
          width: 1600,
          height: 900,
          position: 'relative',
          overflow: 'hidden',
          color: TEXT_WHITE,
          fontFamily: fontFamily
            ? `"${fontFamily}", system-ui, -apple-system, sans-serif`
            : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: fallbackBg,
        }}
      >
        {/* ============================================================ */}
        {/* FONDO — Imagen del banner si existe                          */}
        {/* ============================================================ */}
        {bannerUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bannerUrl}
            alt={tenantName}
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}

        {/* ============================================================ */}
        {/* OVERLAY OSCURO — gradiente para legibilidad                  */}
        {/* ============================================================ */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isDarkBg
              ? 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.80) 100%)'
              : 'linear-gradient(135deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Círculos difusos decorativos */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(primaryColor, 0.35)} 0%, ${withAlpha(primaryColor, 0)} 70%)`,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            left: -180,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(primaryColor, 0.25)} 0%, ${withAlpha(primaryColor, 0)} 70%)`,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />

        {/* ============================================================ */}
        {/* CONTENIDO — Grid principal 2 columnas                        */}
        {/* ============================================================ */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '48px 60px 40px 60px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2,
          }}
        >
          {/* ============================================================ */}
          {/* ZONA SUPERIOR — Identidad (izq) + Contacto (der)            */}
          {/* ============================================================ */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: 48,
              minHeight: 0,
              maxHeight: 620,
            }}
          >
            {/* ------------------ COLUMNA IZQUIERDA: IDENTIDAD ------------------ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 14,
                minWidth: 0,
              }}
            >
              {/* Logo + Chips (rubro y rating) en fila */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                {logoUrl && (
                  <div
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 24,
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                      border: '3px solid rgba(255,255,255,0.25)',
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt={`${tenantName} logo`}
                      crossOrigin="anonymous"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {niche && niche !== 'general' && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.18)',
                        border: '1.5px solid rgba(255,255,255,0.30)',
                        color: TEXT_WHITE,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1.8,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        alignSelf: 'flex-start',
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {niche.replace(/_/g, ' ')}
                    </span>
                  )}

                  {ratingDisplay && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.18)',
                        border: '1.5px solid rgba(255,255,255,0.30)',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Icons.Star
                            key={i}
                            color="#facc15"
                            size={12}
                            filled={i <= Math.round(Number(ratingAvg))}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: TEXT_WHITE }}>
                        {ratingDisplay.avg}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_WHITE_60 }}>
                        ({ratingDisplay.count})
                      </span>
                    </div>
                  )}

                  {likesCount && likesCount > 0 && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 11px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.18)',
                        border: '1.5px solid rgba(255,255,255,0.30)',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Icons.Heart color="#f43f5e" size={12} filled={true} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_WHITE }}>
                        {likesCount}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 500, color: TEXT_WHITE_60 }}>
                        me gusta
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <h1
                style={{
                  fontSize: nameFontSize,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  padding: 0,
                  color: TEXT_WHITE,
                  textShadow: '0 4px 24px rgba(0,0,0,0.45)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {tenantName}
              </h1>

              {/* Slogan */}
              {tenantSlogan && (
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    margin: 0,
                    color: TEXT_WHITE_80,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {tenantSlogan}
                </p>
              )}

              {/* Descripción */}
              {description && (
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    margin: 0,
                    color: TEXT_WHITE_60,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    maxWidth: 620,
                  }}
                >
                  {description}
                </p>
              )}
            </div>

            {/* ------------------ COLUMNA DERECHA: CONTACTO ------------------ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 12,
                minWidth: 0,
              }}
            >
              {/* RIF */}
              {rif && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: glassBg,
                    border: `1px solid ${glassBorder}`,
                    backdropFilter: 'blur(8px)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Id color={TEXT_WHITE} size={17} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                      RIF
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rif}
                    </span>
                  </div>
                </div>
              )}

              {/* Teléfono + Email en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {phone && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: glassBg,
                      border: `1px solid ${glassBorder}`,
                      backdropFilter: 'blur(8px)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Phone color={TEXT_WHITE} size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                        Teléfono
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {phone}
                      </span>
                    </div>
                  </div>
                )}

                {email && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: glassBg,
                      border: `1px solid ${glassBorder}`,
                      backdropFilter: 'blur(8px)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Email color={TEXT_WHITE} size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                        Email
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Horario + Ubicación en 2 columnas (o solo ubicación full si no hay horario) */}
              {(schedule || address || locationLine) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: schedule ? '1fr 1fr' : '1fr',
                    gap: 12,
                  }}
                >
                  {schedule && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: glassBg,
                        border: `1px solid ${glassBorder}`,
                        backdropFilter: 'blur(8px)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icons.Clock color={TEXT_WHITE} size={16} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                          Horario
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {schedule}
                        </span>
                      </div>
                    </div>
                  )}

                  {(address || locationLine) && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: glassBg,
                        border: `1px solid ${glassBorder}`,
                        backdropFilter: 'blur(8px)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icons.MapPin color={TEXT_WHITE} size={16} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                          Ubicación
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[address, locationLine].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags: Pago + Envío */}
              {(paymentMethods.length > 0 || deliveryCompanies.length > 0) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    paddingTop: 4,
                  }}
                >
                  {paymentMethods.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <Icons.CreditCard color={TEXT_WHITE_80} size={14} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                          color: TEXT_WHITE_60,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Pago
                      </span>
                      <div style={{ display: 'flex', gap: 6, overflow: 'hidden', flex: 1 }}>
                        {paymentTags.shown.map((m, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.15)',
                              border: '1.5px solid rgba(255,255,255,0.30)',
                              color: TEXT_WHITE,
                              fontSize: 10,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              maxWidth: 130,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {m}
                          </span>
                        ))}
                        {paymentTags.extra > 0 && (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: 'transparent',
                              border: '1.5px solid rgba(255,255,255,0.25)',
                              color: TEXT_WHITE_60,
                              fontSize: 10,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            +{paymentTags.extra}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {deliveryCompanies.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <Icons.Truck color={TEXT_WHITE_80} size={14} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                          color: TEXT_WHITE_60,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Envío
                      </span>
                      <div style={{ display: 'flex', gap: 6, overflow: 'hidden', flex: 1 }}>
                        {deliveryTags.shown.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: 'transparent',
                              border: '1.5px solid rgba(255,255,255,0.30)',
                              color: TEXT_WHITE,
                              fontSize: 10,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              maxWidth: 130,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c}
                          </span>
                        ))}
                        {deliveryTags.extra > 0 && (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: 'transparent',
                              border: '1.5px solid rgba(255,255,255,0.25)',
                              color: TEXT_WHITE_60,
                              fontSize: 10,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            +{deliveryTags.extra}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

                   {/* ============================================================ */}
          {/* ZONA INFERIOR — QR + Redes + Firma (una sola línea)          */}
          {/* ============================================================ */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexShrink: 0,
              height: 100,
            }}
          >
            {/* QR + texto compacto */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: 5,
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR"
                  crossOrigin="anonymous"
                  style={{ width: 64, height: 64, display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: TEXT_WHITE_60, whiteSpace: 'nowrap' }}>
                  Conoce mi tienda
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_WHITE, whiteSpace: 'nowrap' }}>
                  Escanea el código
                </span>
              </div>
            </div>

            {/* Redes sociales — centro */}
            {socialEntries.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {socialEntries.slice(0, 6).map(({ key, Icon }) => (
                  <div
                    key={key}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.15)',
                      border: '1.5px solid rgba(255,255,255,0.30)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon color={TEXT_WHITE} size={15} />
                  </div>
                ))}
              </div>
            )}

            {/* Firma — derecha */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: TEXT_WHITE_80, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                Hecho con facilitó
              </span>
              <span style={{ fontSize: 9, fontWeight: 500, color: TEXT_WHITE_45, whiteSpace: 'nowrap' }}>
                {new Date().toLocaleDateString('es-VE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

BusinessFlyer.displayName = 'BusinessFlyer';

export default BusinessFlyer;