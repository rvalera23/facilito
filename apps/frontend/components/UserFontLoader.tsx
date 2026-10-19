'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getTenantConfig, applyFontToContainer, _loadFontAsset as loadFontAsset } from '@/lib/fontLoader';
export default function UserFontLoader() {
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pathname) return;

    // 🔥 DETECTAR CONTEXTO
    const isAdmin = pathname.startsWith('/admin/');
    const isStore = pathname.startsWith('/tienda/');
    const isMiCuenta = pathname.startsWith('/mi-cuenta/');
    const isHome = pathname === '/' || pathname === '';

    console.log('🔍 [UserFontLoader] Contexto:', { pathname, isAdmin, isStore, isMiCuenta, isHome });

    // ✅ HOME - NO aplicar fuentes
    if (isHome) {
      console.log('⏭️ [UserFontLoader] Home - NO aplicar fuentes');
      return;
    }

    // ✅ MI CUENTA - usar user_theme (no tocar)
    if (isMiCuenta) {
      console.log('👤 [UserFontLoader] Mi Cuenta - usar user_theme');

      // 🧹 Limpiar el font-family del body (podría venir pegado de /tienda o /admin)
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.fontFamily = '';
      }

      // 🔄 Resetear el ref para que al volver a /tienda o /admin se reaplique
      appliedRef.current = null;

      try {
        const userTheme = localStorage.getItem('user_theme');
        if (userTheme) {
          const parsed = JSON.parse(userTheme);
          const font = parsed.fontFamily || 'Quicksand';
          const weight = parsed.fontWeight || 400;
          applyFontToMiCuenta(font, weight);
          return;
        }
      } catch (e) {
        console.warn('⚠️ [UserFontLoader] Error cargando user_theme:', e);
      }
      applyFontToMiCuenta('Quicksand', 400);
      return;
    }

    // ✅ ADMIN / TIENDA - usar tenant_config CON SLUG
    if (isAdmin || isStore) {
      // 🔥 OBTENER EL SLUG DE LA URL (robusto: /admin/[slug] o /tienda/[slug])
      const slugMatch = pathname.match(/^\/(admin|tienda)\/([^/]+)/);
      const slug = slugMatch?.[2] || '';
      if (!slug) {
        console.warn('⚠️ [UserFontLoader] No se pudo obtener slug');
        return;
      }

      // 🧹 Limpiar el font-family del body antes de aplicar la fuente del tenant
      // (evita que fuentes de otras páginas queden pegadas)
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.fontFamily = '';
      }

      // ✅ EVITAR RE-APLICAR SOLO SI YA SE APLICÓ CON ÉXITO AL CONTAINER
      const alreadyApplied = appliedRef.current === slug;
      if (alreadyApplied) {
        // Verificar que el container siga existiendo y con la fuente correcta
        const container = document.querySelector(
          isAdmin ? '.admin-container' : '.store-container'
        ) as HTMLElement;
        const hasFont = container?.style?.fontFamily?.length > 0;
        if (hasFont) {
          console.log(`⏭️ [UserFontLoader] Ya aplicado para "${slug}", saltando`);
          return;
        }
        // Si el container no tiene fuente aplicada, reintentamos
        console.log(`🔁 [UserFontLoader] Reintentando aplicar fuente para "${slug}"`);
      }
      appliedRef.current = slug;

      // 🔥 OBTENER LA FUENTE GUARDADA PARA ESTE SLUG
      const config = getTenantConfig(slug);

      // ✅ FUNCIÓN AUXILIAR PARA APLICAR Y REGISTRAR EL LISTENER
      const setupFont = (font: string, weight: number) => {
        console.log(`✅ [UserFontLoader] Fuente para "${slug}":`, font, weight);

        if (isAdmin) {
          applyFontToAdmin(slug, font, weight);
        } else {
          applyFontToStore(slug, font, weight);
        }

        const handleFontChange = (e: CustomEvent) => {
          const { font: newFont, weight: newWeight, slug: eventSlug } = e.detail;
          if (eventSlug === slug) {
            console.log(`🔄 [UserFontLoader] Fuente actualizada para "${slug}":`, newFont, newWeight);
            if (isAdmin) {
              applyFontToAdmin(slug, newFont, newWeight);
            } else {
              applyFontToStore(slug, newFont, newWeight);
            }
          }
        };

        window.addEventListener('tenantFontChanged', handleFontChange as EventListener);

        return () => {
          window.removeEventListener('tenantFontChanged', handleFontChange as EventListener);
        };
      };

      // ✅ SI HAY CONFIG EN LOCALSTORAGE → APLICAR DIRECTO (desktop, sin cambios)
      if (config) {
        return setupFont(config.fontFamily, config.fontWeight);
      }

      // 🔥 SI NO HAY CONFIG (mobile / primera visita) → LEER DEL BACKEND
      console.log(`📡 [UserFontLoader] Sin config local para "${slug}" → consultando backend...`);

      let cancelled = false;
      let cleanup: (() => void) | undefined;

      (async () => {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || (
            typeof window !== 'undefined'
              ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
              : 'http://localhost:3000'
          );

          const res = await fetch(`${apiBase}/tenants/${slug}`, { cache: 'no-store' });
          if (!res.ok) {
            console.warn(`⚠️ [UserFontLoader] No se pudo obtener tenant "${slug}" del backend`);
            return;
          }

          const data = await res.json();
          if (cancelled) return;

          const font = data?.fontFamily || 'Quicksand';
          const weight = data?.fontWeight || 400;

          console.log(`✅ [UserFontLoader] Fuente desde backend para "${slug}":`, font, weight);

          // Guardar en localStorage para próximas visitas
          try {
            localStorage.setItem(
              `tenant_config_${slug}`,
              JSON.stringify({ fontFamily: font, fontWeight: weight, updatedAt: Date.now() })
            );
            localStorage.setItem(`tenant_font_${slug}`, font);
            localStorage.setItem(`tenant_font_weight_${slug}`, String(weight));
          } catch (e) {
            // localStorage puede fallar en modo incógnito
          }

          if (!cancelled) {
            cleanup = setupFont(font, weight);
          }
        } catch (err) {
          console.error(`❌ [UserFontLoader] Error consultando backend para "${slug}":`, err);
        }
      })();

      return () => {
        cancelled = true;
        if (cleanup) cleanup();
      };
    }

    // 🔥 CUALQUIER OTRA PÁGINA - NO aplicar fuentes
    console.log('⏭️ [UserFontLoader] Página pública - NO aplicar fuentes');

    // 🧹 LIMPIAR cualquier fuente previa que haya quedado pegada en el body
    // (esto evita que la fuente de /mi-cuenta se propague a la tienda)
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.fontFamily = '';
    }

  }, [pathname]);

  // ✅ APLICAR A ADMIN
  function applyFontToAdmin(slug: string, font: string, weight: number) {
    // 🔥 Aplicar al body para que los portales hereden la fuente
    if (document.body) {
      applyFontToContainer(document.body, font, weight);
    }

    const container = document.querySelector('.admin-container') as HTMLElement;
    if (container) {
      applyFontToContainer(container, font, weight);
      console.log(`✅ [UserFontLoader] Admin "${slug}" aplicado:`, font, weight);
    } else {
      // Esperar a que el contenedor exista
      const observer = new MutationObserver(() => {
        const el = document.querySelector('.admin-container') as HTMLElement;
        if (el) {
          applyFontToContainer(el, font, weight);
          observer.disconnect();
          console.log(`✅ [UserFontLoader] Admin "${slug}" aplicado (delay):`, font, weight);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 3000);
    }
  }

  // ✅ APLICAR A TIENDA
  function applyFontToStore(slug: string, font: string, weight: number) {
    // 🔥 Aplicar al body para que los portales (ProductDetailModal) hereden la fuente
    if (document.body) {
      applyFontToContainer(document.body, font, weight);
    }

    const container = document.querySelector('.store-container') as HTMLElement;
    if (container) {
      applyFontToContainer(container, font, weight);
      console.log(`✅ [UserFontLoader] Store "${slug}" aplicado:`, font, weight);
    } else {
      const observer = new MutationObserver(() => {
        const el = document.querySelector('.store-container') as HTMLElement;
        if (el) {
          applyFontToContainer(el, font, weight);
          observer.disconnect();
          console.log(`✅ [UserFontLoader] Store "${slug}" aplicado (delay):`, font, weight);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 3000);
    }
  }

  // ✅ APLICAR A MI CUENTA
  function applyFontToMiCuenta(font: string, weight: number) {
    const container = document.querySelector('.mi-cuenta-container') as HTMLElement;
    if (container) {
      applyFontToContainer(container, font, weight);
      console.log(`✅ [UserFontLoader] Mi Cuenta aplicado:`, font, weight);
    }
  }

  return null;
}