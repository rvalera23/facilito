'use client';

// ============================================================
// 🔥 LISTA DE FUENTES DISPONIBLES
// ============================================================

export const AVAILABLE_FONTS = [
  // Sans Serif
  { value: 'Quicksand', label: 'Quicksand', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Inter', label: 'Inter', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Nunito', label: 'Nunito', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Roboto', label: 'Roboto', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Lato', label: 'Lato', category: 'Sans Serif', defaultWeight: 400 },
  { value: 'Raleway', label: 'Raleway', category: 'Sans Serif', defaultWeight: 400 },
  // Serif
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif', defaultWeight: 500 },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif', defaultWeight: 400 },
  { value: 'Fraunces', label: 'Fraunces', category: 'Serif', defaultWeight: 400 },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif', defaultWeight: 500 },
  // 🔥 CURSIVAS / SCRIPT
  { value: 'Dancing Script', label: 'Dancing Script', category: 'Cursiva', defaultWeight: 400 },
  { value: 'Kalam', label: 'Kalam', category: 'Cursiva', defaultWeight: 400 },
  { value: 'Architects Daughter', label: 'Architects Daughter', category: 'Cursiva', defaultWeight: 400 },
  { value: 'Indie Flower', label: 'Indie Flower', category: 'Cursiva', defaultWeight: 400 },
  { value: 'Patrick Hand', label: 'Patrick Hand', category: 'Cursiva', defaultWeight: 400 },
  // Display
  { value: 'Oswald', label: 'Oswald', category: 'Display', defaultWeight: 500 },
  { value: 'Bricolage Grotesque', label: 'Bricolage Grotesque', category: 'Display', defaultWeight: 400 },
  { value: 'Josefin Sans', label: 'Josefin Sans', category: 'Display', defaultWeight: 400 },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Display', defaultWeight: 400 },
  { value: 'Baloo 2', label: 'Baloo 2', category: 'Display', defaultWeight: 400 },
  { value: 'Sora', label: 'Sora', category: 'Display', defaultWeight: 400 },
  { value: 'Outfit', label: 'Outfit', category: 'Display', defaultWeight: 400 },
  { value: 'Manrope', label: 'Manrope', category: 'Display', defaultWeight: 400 },
];

// 🔥 TODOS LOS PESOS DISPONIBLES PARA CADA FUENTE (INCLUYENDO 800 Y 900)
const FONT_WEIGHTS: Record<string, string> = {
  // Sans Serif
  Quicksand: '400;500;600;700',
  Inter: '400;500;600;700;800;900',
  'Plus Jakarta Sans': '300;400;500;600;700;800',
  Nunito: '400;500;600;700;800;900',
  Roboto: '300;400;500;700;900',
  'Open Sans': '300;400;500;600;700;800',
  Lato: '300;400;700;900',
  Raleway: '400;500;600;700;800;900',
  // Serif
  'Playfair Display': '400;500;600;700;800;900',
  Merriweather: '300;400;700;900',
  Fraunces: '300;400;500;600;700;800;900',
  'Cormorant Garamond': '400;500;600;700',
  // 🔥 CURSIVAS / SCRIPT
  'Dancing Script': '400;500;600;700',
  Kalam: '300;400;700',
  'Architects Daughter': '400',
  'Indie Flower': '400',
  'Patrick Hand': '400',
  // Display
  Oswald: '200;300;400;500;600;700',
  'Bricolage Grotesque': '200;300;400;500;600;700;800',
  'Josefin Sans': '300;400;500;600;700',
  'Space Grotesk': '300;400;500;600;700',
  'Baloo 2': '400;500;600;700;800',
  Sora: '300;400;500;600;700',
  Outfit: '300;400;500;600;700',
  Manrope: '300;400;500;600;700',
};

export const DEFAULT_FONT_WEIGHT: Record<string, number> = {
  Quicksand: 400,
  Inter: 400,
  'Plus Jakarta Sans': 400,
  Nunito: 400,
  Roboto: 400,
  'Open Sans': 400,
  Lato: 400,
  Raleway: 400,
  'Playfair Display': 500,
  Merriweather: 400,
  Fraunces: 400,
  'Cormorant Garamond': 500,
  // 🔥 CURSIVAS / SCRIPT
  'Dancing Script': 400,
  Kalam: 400,
  'Architects Daughter': 400,
  'Indie Flower': 400,
  'Patrick Hand': 400,
  // Display
  Oswald: 500,
  'Bricolage Grotesque': 400,
  'Josefin Sans': 400,
  'Space Grotesk': 400,
  'Baloo 2': 400,
  Sora: 400,
  Outfit: 400,
  Manrope: 400,
};

// ============================================================
// 🔥 CLAVES DE LOCALSTORAGE - SIEMPRE CON SLUG
// ============================================================

const TENANT_CONFIG_KEY = (slug: string) => `tenant_config_${slug}`;
const TENANT_FONT_LEGACY_KEY = (slug: string) => `tenant_font_${slug}`;
const TENANT_FONT_WEIGHT_LEGACY_KEY = (slug: string) => `tenant_font_weight_${slug}`;

// ============================================================
// 🔥 FUNCIÓN PARA OBTENER EL SLUG ACTUAL
// ============================================================

export function getCurrentSlug(): string {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  const match = path.match(/^\/(admin|tienda)\/([^/]+)/);
  return match?.[2] || '';
}

// ============================================================
// 🔥 FUNCIONES PARA MANEJAR LA FUENTE POR TIENDA
// ============================================================

export function getTenantFont(slug?: string): string | null {
  if (typeof window === 'undefined') return null;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return null;
  
  try {
    const config = localStorage.getItem(TENANT_CONFIG_KEY(finalSlug));
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.fontFamily || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function getTenantFontWeight(slug?: string): number | null {
  if (typeof window === 'undefined') return null;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return null;
  
  try {
    const config = localStorage.getItem(TENANT_CONFIG_KEY(finalSlug));
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.fontWeight || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function setTenantFont(fontFamily: string, weight?: number, slug?: string): void {
  if (typeof window === 'undefined') return;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return;

  const finalWeight = weight || DEFAULT_FONT_WEIGHT[fontFamily] || 400;

  const config = {
    fontFamily,
    fontWeight: finalWeight,
    updatedAt: Date.now(),
  };

  // Clave nueva (canónica)
  localStorage.setItem(TENANT_CONFIG_KEY(finalSlug), JSON.stringify(config));

  // Claves legacy (por si algo más las lee)
  localStorage.setItem(TENANT_FONT_LEGACY_KEY(finalSlug), fontFamily);
  localStorage.setItem(TENANT_FONT_WEIGHT_LEGACY_KEY(finalSlug), String(finalWeight));

  loadFontAsset(fontFamily);
}

// ============================================================
// 🔥 FUNCIÓN PARA CARGAR EL ASSET DE GOOGLE FONTS
// ============================================================

function loadFontAsset(fontFamily: string): void {
  if (typeof document === 'undefined') return;
  
  // 🔥 SIEMPRE CARGAR TODOS LOS PESOS DISPONIBLES PARA LA FUENTE
  const fontId = `facilito-font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    
    // 🔥 OBTENER TODOS LOS PESOS DISPONIBLES PARA ESTA FUENTE
    let weights = FONT_WEIGHTS[fontFamily];
    if (!weights) {
      // Si la fuente no está en el mapa, cargar un rango amplio
      weights = '400;500;600;700;800;900';
    }
    
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weights}&display=swap`;
    document.head.appendChild(link);
    console.log(`🔤 [fontLoader] Cargando fuente ${fontFamily} con pesos: ${weights}`);
  }
}

// ============================================================
// 🔥 FUNCIÓN PARA APLICAR FUENTE A UN CONTENEDOR ESPECÍFICO
// ============================================================

export function applyFontToContainer(container: HTMLElement | null, fontFamily: string, weight?: number): void {
  if (!container) return;
  const finalWeight = weight || DEFAULT_FONT_WEIGHT[fontFamily] || 400;
  loadFontAsset(fontFamily);
  container.style.fontFamily = fontFamily;
  container.style.fontWeight = String(finalWeight);
}

// ============================================================
// 🔥 FUNCIÓN PARA OBTENER EL CONFIG COMPLETO DE LA TIENDA
// ============================================================

export function getTenantConfig(slug?: string): { fontFamily: string; fontWeight: number } | null {
  if (typeof window === 'undefined') return null;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return null;

  try {
    // 1) Intentar clave nueva (tenant_config_${slug})
    const config = localStorage.getItem(TENANT_CONFIG_KEY(finalSlug));
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed?.fontFamily) {
        return {
          fontFamily: parsed.fontFamily || 'Quicksand',
          fontWeight: parsed.fontWeight || 400,
        };
      }
    }

    // 2) Fallback a claves legacy (tenant_font_${slug} y tenant_font_weight_${slug})
    const legacyFont = localStorage.getItem(TENANT_FONT_LEGACY_KEY(finalSlug));
    if (legacyFont) {
      const legacyWeight = localStorage.getItem(TENANT_FONT_WEIGHT_LEGACY_KEY(finalSlug));
      return {
        fontFamily: legacyFont || 'Quicksand',
        fontWeight: legacyWeight ? Number(legacyWeight) : 400,
      };
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================================
// 🔥 FUNCIÓN PARA LIMPIAR FUENTES DE UNA TIENDA
// ============================================================

export function clearTenantFont(slug?: string): void {
  if (typeof window === 'undefined') return;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return;
  localStorage.removeItem(TENANT_CONFIG_KEY(finalSlug));
}

// ============================================================
// 🔥 FUNCIÓN PARA RESTAURAR FUENTE POR DEFECTO
// ============================================================

export function resetTenantFont(slug?: string): void {
  if (typeof window === 'undefined') return;
  const finalSlug = slug || getCurrentSlug();
  if (!finalSlug) return;
  
  const config = {
    fontFamily: 'Quicksand',
    fontWeight: 400,
    updatedAt: Date.now(),
  };
  
  localStorage.setItem(TENANT_CONFIG_KEY(finalSlug), JSON.stringify(config));
}

// ============================================================
// 🔥 FUNCIÓN PARA OBTENER EL PESO POR DEFECTO DE UNA FUENTE
// ============================================================

export function getDefaultWeight(fontFamily: string): number {
  return DEFAULT_FONT_WEIGHT[fontFamily] || 400;
}

// ============================================================
// 🔥 FUNCIÓN PARA CARGAR LA FUENTE DEL TENANT AL INICIAR
// ============================================================

export function loadTenantFontOnInit(slug?: string): { font: string; weight: number } {
  if (typeof document === 'undefined') {
    return { font: 'Quicksand', weight: 400 };
  }

  const finalSlug = slug || getCurrentSlug();
  let fontFamily = 'Quicksand';
  let fontWeight = 400;
  
  if (finalSlug) {
    const savedFont = getTenantFont(finalSlug);
    const savedWeight = getTenantFontWeight(finalSlug);
    
    if (savedFont) {
      fontFamily = savedFont;
      fontWeight = savedWeight || DEFAULT_FONT_WEIGHT[savedFont] || 400;
    }
  }
  
  loadFontAsset(fontFamily);
  return { font: fontFamily, weight: fontWeight };
}

// ============================================================
// 🔥 FUNCIONES DE COMPATIBILIDAD - PARA MI CUENTA Y OTROS
// ============================================================

export function loadFont(fontFamily: string, weight?: number): string {
  if (typeof document === 'undefined') {
    return fontFamily === 'Quicksand' ? 'var(--font-quicksand)' : `'${fontFamily}', sans-serif`;
  }
  loadFontAsset(fontFamily);
  if (fontFamily === 'Quicksand') return 'var(--font-quicksand)';
  return `'${fontFamily}', sans-serif`;
}

export function getUserFont(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = getCurrentSlug();
  if (!slug) return null;
  const config = getTenantConfig(slug);
  return config?.fontFamily || null;
}

export function applyUserFont(fontFamily: string, source: 'admin' | 'account' = 'admin', weight?: number): void {
  if (typeof window === 'undefined') return;
  
  const slug = getCurrentSlug();
  if (!slug) {
    console.warn('⚠️ [applyUserFont] No se pudo obtener slug');
    return;
  }
  
  const finalWeight = weight || DEFAULT_FONT_WEIGHT[fontFamily] || 400;
  
  setTenantFont(fontFamily, finalWeight, slug);
  
  const selector = source === 'admin' ? '.admin-container' : '.store-container';
  const container = document.querySelector(selector) as HTMLElement;
  if (container) {
    applyFontToContainer(container, fontFamily, finalWeight);
  }
  
  window.dispatchEvent(new CustomEvent('tenantFontChanged', {
    detail: { font: fontFamily, weight: finalWeight, slug }
  }));
}

// ============================================================
// 🔥 EXPORTAR TODO PARA COMPATIBILIDAD
// ============================================================

export {
  loadFontAsset as _loadFontAsset,
};