// frontend/hooks/useProductImages.ts
'use client';

import { useMemo, useCallback } from 'react';
// 🔥 IMPORTAR DESDE imageUtils EN VEZ DE TENER FUNCIONES DUPLICADAS
import { getImageUrl as getImageUrlUtil, getAllImages as getAllImagesUtil } from '@/lib/imageUtils';

export interface ProductImage {
  url: string;
  id?: string;
  alt?: string;
  isMain?: boolean;
  type?: 'server' | 'blob' | 'external';
}

/**
 * 🔥 HOOK PARA MANEJO DE IMÁGENES DE PRODUCTOS
 * PARA UN SOLO PRODUCTO
 */
export const useProductImages = (product: any, options?: {
  maxImages?: number;
  includePlaceholder?: boolean;
}) => {
  const { maxImages = 10, includePlaceholder = false } = options || {};

  // 🔥 USAR LA FUNCIÓN CENTRALIZADA DE imageUtils
  const getImageUrl = useCallback((image: string | null | undefined): string | null => {
    return getImageUrlUtil(image);
  }, []);

  // 🔥 EXTRAER IMÁGENES DE MÚLTIPLES FUENTES
  const extractImages = useCallback((source: any): string[] => {
    if (!source) return [];
    
    let rawImages: string[] = [];
    
    if (typeof source === 'string') {
      rawImages = source.trim() ? [source.trim()] : [];
    } else if (Array.isArray(source)) {
      rawImages = source
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item?.url) return item.url.trim();
          if (item?.path) return item.path.trim();
          return null;
        })
        .filter(Boolean) as string[];
    } else if (typeof source === 'object') {
      if (source.url) rawImages = [source.url.trim()];
      if (source.path) rawImages = [source.path.trim()];
    }
    
    return rawImages
      .filter(Boolean)
      .map((img) => getImageUrl(img))
      .filter(Boolean) as string[];
  }, [getImageUrl]);

  const rawImages = useMemo(() => {
    if (!product) return [];

    const sources: any[] = [];

    if (product.existingImages) sources.push(product.existingImages);
    if (product.mediaUrls) sources.push(product.mediaUrls);
    if (product.images) sources.push(product.images);
    if (product.photos) sources.push(product.photos);
    if (product.gallery) sources.push(product.gallery);
    if (product.image) sources.push(product.image);
    if (product.coverImage) sources.push(product.coverImage);
    if (product.cover) sources.push(product.cover);
    if (product.featuredImage) sources.push(product.featuredImage);
    
    const attrs = product?.attributes || {};
    if (attrs.existingImages) sources.push(attrs.existingImages);
    if (attrs.mediaUrls) sources.push(attrs.mediaUrls);
    if (attrs.images) sources.push(attrs.images);
    if (attrs.photos) sources.push(attrs.photos);
    if (attrs.gallery) sources.push(attrs.gallery);
    if (attrs.image) sources.push(attrs.image);
    if (attrs.coverImage) sources.push(attrs.coverImage);
    
    const metadata = product?.metadata || {};
    if (metadata.images) sources.push(metadata.images);
    if (metadata.photos) sources.push(metadata.photos);
    
    if (product.files) {
      const fileImages = product.files
        .filter((f: any) => f instanceof File || f?.file)
        .map((f: any) => {
          if (f instanceof File) return URL.createObjectURL(f);
          if (f?.file instanceof File) return URL.createObjectURL(f.file);
          return null;
        })
        .filter(Boolean);
      if (fileImages.length > 0) sources.push(fileImages);
    }

    const allImages: string[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const extracted = extractImages(source);
      for (const img of extracted) {
        if (!seen.has(img) && img.trim()) {
          seen.add(img);
          allImages.push(img);
        }
      }
    }

    let result = allImages.slice(0, maxImages);
    
    if (includePlaceholder && result.length === 0) {
      result = ['/placeholder-product.png'];
    }

    console.log('📸 [useProductImages] Imágenes extraídas para producto:', {
      name: product?.name,
      count: result.length,
      images: result,
    });

    return result;
  }, [product, maxImages, includePlaceholder, extractImages]);

  const mainImage = useMemo(() => {
    return rawImages.length > 0 ? rawImages[0] : null;
  }, [rawImages]);

  const hasImages = useMemo(() => {
    return rawImages.length > 0;
  }, [rawImages]);

  const imageUrls = useMemo(() => {
    return rawImages
      .map((img) => getImageUrl(img))
      .filter(Boolean) as string[];
  }, [rawImages, getImageUrl]);

  const imagesWithMetadata = useMemo(() => {
    return rawImages.map((url, index) => ({
      url: getImageUrl(url) || url,
      id: `img-${index}`,
      alt: product?.name || `Imagen ${index + 1}`,
      isMain: index === 0,
      type: url.startsWith('blob:') ? 'blob' : 
            url.startsWith('http') ? 'external' : 'server',
    }));
  }, [rawImages, getImageUrl, product?.name]);

  return {
    images: rawImages,
    imageUrls,
    mainImage,
    hasImages,
    imagesWithMetadata,
    count: rawImages.length,
    getImageUrl,
    extractImages,
    isLoading: false,
    error: null,
  };
};

// 🔥 HOOK PARA UN SOLO PRODUCTO
export const useMainImage = (product: any): string | null => {
  const { mainImage } = useProductImages(product);
  return mainImage;
};

// 🔥🔥🔥 HOOK PARA MÚLTIPLES PRODUCTOS
export const useMultipleMainImages = (products: any[]): Map<any, string | null> => {
  // 🔥 USAR LA FUNCIÓN CENTRALIZADA DE imageUtils
  const getImageUrl = (image: string | null | undefined): string | null => {
    return getImageUrlUtil(image);
  };

  const extractMainImage = (product: any): string | null => {
    if (!product) {
      console.log('📸 [useMultipleMainImages] product es null o undefined');
      return null;
    }

    console.log('📸 [useMultipleMainImages] Extrayendo imagen para:', product.name || product.id);

    const attrs = product?.attributes || {};
    
    const sources = [
      product.existingImages,
      product.mediaUrls,
      product.images,
      product.photos,
      product.gallery,
      product.image ? [product.image] : null,
      product.coverImage ? [product.coverImage] : null,
      product.cover ? [product.cover] : null,
      product.featuredImage ? [product.featuredImage] : null,
      attrs.existingImages,
      attrs.mediaUrls,
      attrs.images,
      attrs.photos,
      attrs.gallery,
      attrs.image ? [attrs.image] : null,
      attrs.coverImage ? [attrs.coverImage] : null,
      product.prices?.images,
      product.metadata?.images,
      product.metadata?.photos,
    ];
    
    for (const source of sources) {
      if (!source) continue;
      
      if (Array.isArray(source)) {
        for (const item of source) {
          let raw: string | null = null;
          if (typeof item === 'string' && item.trim()) raw = item.trim();
          if (item?.url && typeof item.url === 'string' && item.url.trim()) raw = item.url.trim();
          if (item?.path && typeof item.path === 'string' && item.path.trim()) raw = item.path.trim();
          
          if (raw) {
            const fullUrl = getImageUrl(raw);
            console.log('📸 [useMultipleMainImages] ✅ Imagen encontrada (con URL completa):', fullUrl);
            return fullUrl;
          }
        }
      }
      
      if (typeof source === 'string' && source.trim()) {
        const fullUrl = getImageUrl(source.trim());
        console.log('📸 [useMultipleMainImages] ✅ Imagen encontrada (string directo, con URL completa):', fullUrl);
        return fullUrl;
      }
    }
    
    console.log('📸 [useMultipleMainImages] ❌ No se encontró ninguna imagen para:', product.name || product.id);
    return null;
  };

  const imageMap = useMemo(() => {
    const map = new Map();
    console.log('📸 [useMultipleMainImages] Procesando', products.length, 'productos...');
    
    for (const product of products) {
      if (product) {
        const mainImage = extractMainImage(product);
        map.set(product, mainImage);
      }
    }
    
    console.log('📸 [useMultipleMainImages] Mapa creado con', map.size, 'entradas');
    return map;
  }, [products]);

  return imageMap;
};