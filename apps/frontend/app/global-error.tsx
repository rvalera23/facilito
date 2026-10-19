// ==========================================
// ARCHIVO: apps/frontend/app/global-error.tsx
// ==========================================
// Página de error para errores críticos del layout raíz.
// Next.js la usa cuando root layout.tsx tira una excepción
// (ej. falla un Provider, fuente, o el propio RootLayout).
// Debe ser 100% autónoma: NO puede depender de Context, hooks ni nada externo.
// Ver: https://nextjs.org/docs/app/api-reference/file-conventions/global-error
// ==========================================

'use client';

import React from 'react';
import { DEFAULT_THEME } from '@/lib/branding';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const primary = DEFAULT_THEME.primaryColor;
  const background = DEFAULT_THEME.backgroundColor;
  const textColor = '#f1f5f9';
  const mutedColor = '#94a3b8';

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundColor: background,
          color: textColor,
          fontFamily:
            'Quicksand, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <a
            href="/"
            style={{
              display: 'inline-block',
              fontSize: '20px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: textColor,
              textDecoration: 'none',
              marginBottom: '32px',
            }}
          >
            facil<span style={{ color: primary }}>i</span>to
          </a>

          {/* Ícono */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              backgroundColor: `${primary}20`,
              border: `2px solid ${primary}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke={primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '40px',
              fontWeight: 900,
              margin: '0 0 16px',
              letterSpacing: '-0.03em',
              color: primary,
            }}
          >
            Ups
          </h1>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              margin: '0 0 12px',
              color: textColor,
            }}
          >
            La aplicación no pudo cargar
          </h2>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              margin: '0 0 32px',
              color: mutedColor,
            }}
          >
            Algo salió mal al iniciar. Probá recargar la página o volver al inicio.
          </p>

          {isDev && error?.message && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: `${primary}10`,
                border: `1px solid ${primary}30`,
                color: primary,
                fontSize: '12px',
                fontFamily: 'monospace',
                textAlign: 'left',
                wordBreak: 'break-word',
              }}
            >
              <strong>Debug:</strong> {error.message}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: primary,
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 10px 25px -5px ${primary}50`,
              }}
            >
              Reintentar
            </button>

            <a
              href="/"
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: 'transparent',
                color: primary,
                border: `1px solid ${primary}40`,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}