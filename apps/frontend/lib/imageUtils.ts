// apps/frontend/lib/imageUtils.ts
import { toAbsoluteApiUrl } from './apiUrl';
/**
 * 🔥 UTILIDAD CENTRAL PARA MANEJO DE IMÁGENES
 * 
 * Este archivo es el ÚNICO lugar donde se manejan las URLs de imágenes.
 * Todas las demás funciones deben importar desde aquí.
 * 
 * SOPORTA:
 * - Imágenes del backend (uploads/)
 * - Imágenes locales (public/images/)
 * - URLs absolutas
 * - Blobs y Data URLs
 * - URLs con comillas, corchetes o caracteres extraños
 * - URLs con extensión .jpg, .png, .webp (cualquier extensión)
 * 
 * NOTA: La conversión a WebP debe hacerse en el BACKEND al subir las imágenes.
 * Este archivo solo construye URLs, NO convierte formatos.
 */

// 🔥 IMÁGENES LOCALES (que ya están optimizadas)
const LOCAL_IMAGE_PATHS = ['/images/', 'images/'];


// 🔥 Helper: convierte un path relativo a URL absoluta usando el origin actual
const toAbsolute = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
};

/**
 * Detecta si una URL es una imagen local (public/images/)
 */
const isLocalImage = (url: string): boolean => {
  for (const path of LOCAL_IMAGE_PATHS) {
    if (url.includes(path)) return true;
  }
  return false;
};

/**
 * 🔥 LIMPIA UNA URL DE CARACTERES EXTRAÑOS
 * - Elimina comillas, corchetes, %22, etc.
 * - Elimina espacios en blanco al inicio y final
 */
const cleanUrl = (url: string): string => {
  if (!url) return '';
  
  let clean = url.trim();
  
  // Eliminar comillas (simples y dobles) al inicio y final
  clean = clean.replace(/^["']|["']$/g, '');
  
  // Eliminar corchetes al inicio y final
  clean = clean.replace(/^\[|\]$/g, '');
  
  // Eliminar %22 (comillas codificadas en URL)
  clean = clean.replace(/%22/g, '');
  
  // Eliminar cualquier otro carácter extraño
  clean = clean.replace(/[\[\]"]/g, '');
  
  // Si la URL tiene http pero con caracteres extraños después, limpiar
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const urlObj = new URL(clean);
      clean = urlObj.toString();
    } catch {
      // Si falla, intentar limpiar manualmente
      const match = clean.match(/https?:\/\/[^\s"'\]]+/);
      if (match) {
        clean = match[0];
      }
    }
  }
  
  return clean;
};

/**
 * Extrae un string de cualquier valor (objeto, string, File, etc.)
 */
const extractString = (value: any): string | null => {
  if (!value) return null;
  
  // Si es File o Blob, crear URL
  if (value instanceof File || value instanceof Blob) {
    return URL.createObjectURL(value);
  }
  
  // Si es string, limpiarlo
  if (typeof value === 'string') {
    const cleaned = cleanUrl(value);
    return cleaned || null;
  }
  
  // Si es objeto, buscar propiedades de imagen
  if (typeof value === 'object') {
    if (value.url) return extractString(value.url);
    if (value.path) return extractString(value.path);
    if (value.secure_url) return extractString(value.secure_url);
    if (value.preview) return extractString(value.preview);
    if (value.src) return extractString(value.src);
    if (value.href) return extractString(value.href);
    
    // Si tiene toString y no es [object Object] NI parece JSON
    if (value.toString && typeof value.toString === 'function') {
      const str = value.toString();
      if (
        str &&
        str !== '[object Object]' &&
        !str.startsWith('{') &&
        !str.startsWith('[') &&
        !str.includes('"')
      ) {
        return extractString(str);
      }
    }
  }
  
  return null;
};

/**
 * 🔥 Construye la URL completa con el dominio del backend
 * 
 * IMPORTANTE: NO convierte a WebP aquí. La conversión debe hacerse en el backend.
 * Este archivo solo construye URLs con la extensión original del archivo.
/**
 * 🔥 Construye la URL completa usando la utilidad central.
 * Es IDEMPOTENTE: no importa cuántas veces la llames, el resultado es el mismo.
 * NO convierte a WebP aquí. La conversión debe hacerse en el backend.
 */
function buildFullUrl(rawImg: string): string {
  // Limpiar URL de caracteres extraños
  let clean = cleanUrl(rawImg);

  if (!clean) return '';

  // Blobs y data URLs se devuelven tal cual
  if (clean.startsWith('blob:') || clean.startsWith('data:')) {
    return clean;
  }

  // Imágenes locales (public/images/): dejarlas pasar tal cual
  if (isLocalImage(clean)) {
    if (!clean.startsWith('/')) clean = '/' + clean;
    return clean;
    }

  // 🔥 TODA la lógica de /api/uploads está en toAbsoluteApiUrl.
  // Sin importar si llega /uploads/x, /api/uploads/x, /api/api/uploads/x
  // o http://ip/api/api/uploads/x, siempre devuelve
  // https://origin/api/uploads/x
  return toAbsoluteApiUrl(clean);
}

/**
 * 🔥 FUNCIÓN PRINCIPAL: Obtiene la URL completa de una imagen
 * 
 * Esta es la ÚNICA función que debes usar para obtener URLs de imágenes.
 * 
 * @param item - Producto, servicio, tenant, o cualquier objeto con imágenes
 * @param field - Campo específico a buscar (opcional)
 * @returns URL completa de la imagen o null
 * 
 * @example
 * const imageUrl = getImageUrl(product);
 * const logoUrl = getImageUrl(tenant, 'logoUrl');
 * const localImage = getImageUrl('/images/persona1.png');
 */
export function getImageUrl(item: any, field?: string): string | null {
  if (!item) return null;

  // 🔥 Si es un string, procesarlo directamente
  if (typeof item === 'string') {
    const cleaned = cleanUrl(item);
    return cleaned ? buildFullUrl(cleaned) : null;
  }

  // 🔥 Si se especifica un campo, buscar directamente
  if (field) {
    const value = item[field];
    const extracted = extractString(value);
    if (extracted) {
      return buildFullUrl(extracted);
    }
    return null;
  }

  // 🔥 Buscar en campos comunes (orden de prioridad)
  const fieldsToCheck = [
    'coverImage', 'cover', 'image', 'photo', 'mainImage',
    'banner', 'logo', 'avatar', 'profileImage', 'thumbnail'
  ];
  
  for (const f of fieldsToCheck) {
    const value = item[f];
    if (value) {
      const extracted = extractString(value);
      if (extracted) {
        return buildFullUrl(extracted);
      }
    }
  }
  
  // 🔥 Buscar en mediaUrls
  if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
    for (const media of item.mediaUrls) {
      const extracted = extractString(media);
      if (extracted) {
        return buildFullUrl(extracted);
      }
    }
  }
  
  // 🔥 Buscar en arrays de imágenes
  const imageArrays = ['images', 'existingImages', 'fileUrls', 'photos', 'files', 'gallery', 'attachments'];
  for (const key of imageArrays) {
    const array = item[key];
    if (Array.isArray(array) && array.length > 0) {
      for (const img of array) {
        const extracted = extractString(img);
        if (extracted) {
          return buildFullUrl(extracted);
        }
      }
    }
  }
  
  // 🔥 Buscar en attributes
  if (item.attributes) {
    const attrImages = getImageUrl(item.attributes);
    if (attrImages) return attrImages;
  }
  
  // 🔥 Buscar en metadata
  if (item.metadata) {
    const metaImages = getImageUrl(item.metadata);
    if (metaImages) return metaImages;
  }
  
  return null;
}

/**
 * 🔥 Normaliza una URL para usarla como clave de deduplicación
 */
const normalizeForDedup = (url: string): string => {
  if (!url) return '';
  let key = url.trim().toLowerCase();
  key = key.split('?')[0].split('#')[0];
  key = key.replace(/\/+$/, '');
  key = key.replace(/^https:\/\//, 'http://');
  return key;
};


/**
 * 🔥 Obtiene todas las imágenes de un item
 */
export function getAllImages(item: any): string[] {
  if (!item) return [];
  
  const images: string[] = [];
  const seen = new Set<string>();
  
  // Si es un string, devolverlo como única imagen
  if (typeof item === 'string') {
    const url = getImageUrl(item);
    if (url) {
      const key = normalizeForDedup(url);
      if (key && !seen.has(key)) {
        seen.add(key);
        images.push(url);
      }
    }
    return images;
  }
  
  // Función para agregar imagen sin duplicados (por clave normalizada)
  const addImage = (url: string | null) => {
    if (!url) return;
    const key = normalizeForDedup(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    images.push(url);
  };
  
  // 1. Campos individuales
  const singleFields = ['coverImage', 'cover', 'image', 'photo', 'mainImage', 'banner', 'logo', 'avatar'];
  for (const field of singleFields) {
    if (item[field]) {
      const extracted = extractString(item[field]);
      if (extracted) {
        addImage(buildFullUrl(extracted));
      }
    }
  }
  
  // 2. mediaUrls
  if (Array.isArray(item.mediaUrls)) {
    for (const media of item.mediaUrls) {
      const extracted = extractString(media);
      if (extracted) {
        addImage(buildFullUrl(extracted));
      }
    }
  }
  
  // 3. Arrays de imágenes
  const imageArrays = ['images', 'existingImages', 'fileUrls', 'photos', 'files', 'gallery', 'attachments'];
  for (const key of imageArrays) {
    const array = item[key];
    if (Array.isArray(array)) {
      for (const img of array) {
        const extracted = extractString(img);
        if (extracted) {
          addImage(buildFullUrl(extracted));
        }
      }
    }
  }
  
  // 4. Attributes
  if (item.attributes) {
    const attrImages = getAllImages(item.attributes);
    for (const img of attrImages) {
      addImage(img);
    }
  }
  
  // 5. Metadata
  if (item.metadata) {
    const metaImages = getAllImages(item.metadata);
    for (const img of metaImages) {
      addImage(img);
    }
  }
  
  // 🔥 FILTRO FINAL: descartar lo que no sea una URL de imagen válida
  const validImages = images.filter((url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    // Descartar strings que parezcan JSON o descripciones raras
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
    if (trimmed.includes('{') || trimmed.includes('}')) return false;
    // Aceptar solo: http(s), blob:, data:image, /images/, images/, /uploads/
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:image') ||
      trimmed.startsWith('/images/') ||
      trimmed.startsWith('images/') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.includes('/uploads/')
    );
  });

  // 🔥 DEDUPLICAR por nombre de archivo (última barrera)
  const seenKeys = new Set<string>();
  const finalImages = validImages.filter((url) => {
    const key = url.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/').pop()?.toLowerCase() || url;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  return finalImages;
}

/**
 * 🔥 Helper para verificar si una URL es válida
 */
export function isValidImageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith('http') || 
         url.startsWith('blob:') || 
         url.startsWith('data:') ||
         url.startsWith('/images/') ||
         url.startsWith('images/');
}

/**
 * 🔥 Helper para obtener la primera imagen válida
 * 
 * Esta función NUNCA falla. Si no encuentra imagen, retorna null.
 * Usa todos los métodos posibles para extraer la imagen.
 */
export function getFirstImage(item: any): string | null {
  if (!item) return null;
  
  // Si es un string, procesarlo directamente
  if (typeof item === 'string') {
    return getImageUrl(item);
  }
  
  // Intentar obtener coverImage directamente
  const cover = getImageUrl(item);
  if (cover) return cover;
  
  // Intentar obtener todas las imágenes y tomar la primera
  const all = getAllImages(item);
  if (all.length > 0) return all[0];
  
  // Último intento: buscar en la raíz del objeto
  if (item.url && typeof item.url === 'string') {
    return getImageUrl(item.url);
  }
  if (item.path && typeof item.path === 'string') {
    return getImageUrl(item.path);
  }
  
  return null;
}

/**
 * 🔥 Helper para obtener la URL de un campo específico con fallback
 */
export function getImageField(item: any, field: string, fallback?: string): string | null {
  if (!item) return fallback || null;
  
  const value = item[field];
  if (!value) return fallback || null;
  
  const extracted = extractString(value);
  if (!extracted) return fallback || null;
  
  return buildFullUrl(extracted);
}

/**
 * 🔥 Helper para obtener la URL del logo de un tenant
 */
export function getTenantLogo(tenant: any): string | null {
  if (!tenant) return null;
  
  // Orden de prioridad
  const fields = ['logoUrl', 'logo_url', 'logoPreview', 'logo', 'image', 'logoImage'];
  for (const field of fields) {
    const url = getImageField(tenant, field);
    if (url) return url;
  }
  
  return null;
}

/**
 * 🔥 Helper para obtener la URL del banner de un tenant
 */
export function getTenantBanner(tenant: any): string | null {
  if (!tenant) return null;
  
  // Orden de prioridad
  const fields = ['bannerUrl', 'banner_url', 'banner', 'coverImage', 'cover', 'headerImage'];
  for (const field of fields) {
    const url = getImageField(tenant, field);
    if (url) return url;
  }
  
  return null;
}

/**
 * 🔥 Helper para obtener la URL del favicon de un tenant
 */
export function getTenantFavicon(tenant: any): string | null {
  if (!tenant) return null;
  
  // Orden de prioridad
  const fields = ['faviconUrl', 'favicon_url', 'favicon', 'icon', 'iconUrl'];
  for (const field of fields) {
    const url = getImageField(tenant, field);
    if (url) return url;
  }
  
  return null;
}

/**
 * 🔥 Helper para procesar múltiples imágenes de un array
 */
export function processImages(images: any[]): string[] {
  if (!Array.isArray(images)) return [];
  
  const result: string[] = [];
  const seen = new Set<string>();
  
  for (const img of images) {
    const url = getImageUrl(img);
    if (url && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}

/**
 * 🔥 Helper para procesar imágenes de un producto con logs de depuración
 * 
 * Use esta función si las imágenes no se cargan y necesita saber qué está pasando.
 */
export function debugImages(item: any): { found: string | null; all: string[]; sources: any } {
  if (!item) return { found: null, all: [], sources: {} };
  
  const sources: any = {};
  
  // Buscar en campos individuales
  const singleFields = ['coverImage', 'cover', 'image', 'photo', 'mainImage', 'banner', 'logo', 'avatar'];
  for (const field of singleFields) {
    if (item[field]) {
      sources[field] = item[field];
    }
  }
  
  // Buscar en mediaUrls
  if (Array.isArray(item.mediaUrls)) {
    sources.mediaUrls = item.mediaUrls;
  }
  
  // Buscar en arrays de imágenes
  const imageArrays = ['images', 'existingImages', 'fileUrls', 'photos', 'files', 'gallery'];
  for (const key of imageArrays) {
    if (Array.isArray(item[key])) {
      sources[key] = item[key];
    }
  }
  
  // Buscar en attributes
  if (item.attributes) {
    sources.attributes = item.attributes;
  }
  
  const all = getAllImages(item);
  const found = getFirstImage(item);
  
  console.log('🔍 [debugImages] Fuentes:', sources);
  console.log('🔍 [debugImages] Todas las imágenes:', all);
  console.log('🔍 [debugImages] Primera imagen:', found);
  
  return { found, all, sources };
}