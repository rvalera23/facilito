'use client';

import { useState, useMemo, useEffect } from 'react';

export function useInventoryTable(
  initialItems: any[], 
  externalHandleTogglePublish?: (itemOrIds: any) => void, 
  onUpdateItem?: (updatedItem: any) => void,
  currentRateUSD: number = 0,
  currentRateEUR: number = 0,
  baseEndpoint: string = 'products'
) {
  const normalizeItem = (item: any) => {
    if (!item) return item;
    const attrs = item?.attributes || {};

    if (baseEndpoint === 'services') {
      const servicePrices = {
        ...(attrs?.prices || {}),
        ...(item?.prices || {}),
      };
      const positiveNumber = (value: unknown) => {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : null;
      };
      const ves = positiveNumber(servicePrices.VES) ?? positiveNumber(item?.priceVes) ?? positiveNumber(item?.price);
      const usd = positiveNumber(servicePrices.USD) ?? positiveNumber(item?.priceUsd);
      const eur = positiveNumber(servicePrices.EUR) ?? positiveNumber(item?.priceEur);
      const crypto = positiveNumber(servicePrices.CRYPTO) ?? positiveNumber(servicePrices.USDT) ?? positiveNumber(item?.crypto);
      const resolvedUsd = usd ?? (ves && currentRateUSD > 0 ? ves / currentRateUSD : null);
      const resolvedEur = eur ?? (resolvedUsd && currentRateUSD > 0 && currentRateEUR > 0
        ? resolvedUsd * currentRateUSD / currentRateEUR
        : null);
      const resolvedPrices = {
        ...servicePrices,
        ...(ves !== null ? { VES: ves } : {}),
        ...(resolvedUsd !== null ? { USD: Number(resolvedUsd.toFixed(2)) } : {}),
        ...(resolvedEur !== null ? { EUR: Number(resolvedEur.toFixed(2)) } : {}),
        ...(crypto !== null ? { CRYPTO: crypto } : {}),
      };

      return {
        ...item,
        ...(ves !== null ? { price: ves } : {}),
        ...(Object.keys(resolvedPrices).length > 0 ? { prices: resolvedPrices } : {}),
        attributes: {
          ...attrs,
          ...(Object.keys(resolvedPrices).length > 0 ? { prices: { ...(attrs?.prices || {}), ...resolvedPrices } } : {}),
        },
      };
    }
    
    const usdRef = Number(attrs?.usdReference ?? item?.usdReference ?? 0);
    
    let finalUsd = usdRef;
    if (finalUsd === 0) {
      finalUsd = Number(item?.prices?.USD ?? attrs?.prices?.USD ?? item?.priceUsd ?? 0);
    }
    
    const rateUSD = currentRateUSD > 0 ? currentRateUSD : 1;
    const rateEUR = currentRateEUR > 0 ? currentRateEUR : 1;
    
    const finalVes = finalUsd > 0 
      ? Number((finalUsd * rateUSD).toFixed(2)) 
      : Number(item?.prices?.VES ?? attrs?.prices?.VES ?? item?.priceVes ?? item?.price ?? 0);
    
    const finalEur = finalUsd > 0 && rateUSD > 0 && rateEUR > 0
      ? Number((finalUsd * rateUSD / rateEUR).toFixed(2))
      : Number(item?.prices?.EUR ?? attrs?.prices?.EUR ?? item?.priceEur ?? 0);
    
    const finalCrypto = finalUsd > 0
      ? Number(finalUsd.toFixed(2))
      : Number(item?.prices?.CRYPTO ?? attrs?.prices?.CRYPTO ?? 0);

    const stockVal = Number(item?.stock ?? attrs?.stock ?? 0);

    const model = attrs?.model || attrs?.modelo || item?.model || item?.modelo || '';
    const weight = attrs?.weight || attrs?.peso || item?.weight || item?.peso || item?.weightValue || '';
    const dimensions = attrs?.dimensions || attrs?.medidas || attrs?.talla || item?.dimensions || item?.medidas || item?.talla || '';

    const ivaType = item?.ivaType || attrs?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate ?? attrs?.ivaRate ?? 16);

    // 🔥 PRESERVAR TODOS LOS DATOS ORIGINALES
    return {
      ...item, // 🔥 ESTO PRESERVA name, description, durationMinutes, etc.
      stock: stockVal,
      price: finalVes,
      prices: {
        ...(attrs?.prices || {}),
        ...(item?.prices || {}),
        VES: finalVes,
        USD: finalUsd,
        EUR: finalEur,
        CRYPTO: finalCrypto
      },
      model,
      weight,
      dimensions,
      usdReference: finalUsd,
      ivaType: ivaType,
      ivaRate: ivaRate,
      attributes: {
        ...attrs,
        stock: stockVal,
        usdReference: finalUsd,
        prices: {
          ...(attrs?.prices || {}),
          VES: finalVes,
          USD: finalUsd,
          EUR: finalEur,
          CRYPTO: finalCrypto
        },
        model,
        weight,
        dimensions,
        ivaType: ivaType,
        ivaRate: ivaRate,
      }
    };
  };

  const [localItems, setLocalItems] = useState<any[]>([]);

  useEffect(() => {
    setLocalItems((initialItems || []).map(normalizeItem));
  }, [initialItems, currentRateUSD, currentRateEUR]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock' | 'itemId' | 'duration'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  const getProductCode = (item: any) => item?.itemId || item?.sku || item?.code || item?.inventoryId || item?.id_item || item?.product_id || item?.codigo || '';
  
  const getInternalId = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const possibleId = item?.id || item?._id || item?.uuid;
    const code = getProductCode(item);
    if (possibleId && possibleId !== code) return possibleId;
    if (possibleId && !possibleId.includes('-DWA-') && possibleId.length > 10) return possibleId;
    if (item?.attributes?.id) return item.attributes.id;
    return possibleId || code || '';
  };

  const formatVESPrice = (value: number | string) => {
    const num = Number(value) || 0;
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getItemImage = (item: any) => {
    if (!item) return null;
    
    const extractString = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
      }
      if (typeof value === 'object') {
        if (value.url) return extractString(value.url);
        if (value.path) return extractString(value.path);
        if (value.secure_url) return extractString(value.secure_url);
        if (value.preview) return extractString(value.preview);
        if (value.src) return extractString(value.src);
        if (value instanceof File || value instanceof Blob) {
          return URL.createObjectURL(value);
        }
        if (value.toString && typeof value.toString === 'function') {
          const str = value.toString();
          if (str && str !== '[object Object]') return str;
        }
      }
      return null;
    };

    if (item.attributes) {
      const attrs = item.attributes;
      if (attrs.existingImages && Array.isArray(attrs.existingImages) && attrs.existingImages.length > 0) {
        for (const img of attrs.existingImages) {
          const extracted = extractString(img);
          if (extracted && extracted.startsWith('http') && !extracted.startsWith('blob:')) {
            return extracted;
          }
        }
      }
      if (attrs.mediaUrls && Array.isArray(attrs.mediaUrls) && attrs.mediaUrls.length > 0) {
        for (const img of attrs.mediaUrls) {
          const extracted = extractString(img);
          if (extracted && extracted.startsWith('http') && !extracted.startsWith('blob:')) {
            return extracted;
          }
        }
      }
      if (attrs.images && Array.isArray(attrs.images) && attrs.images.length > 0) {
        for (const img of attrs.images) {
          const extracted = extractString(img);
          if (extracted && extracted.startsWith('http') && !extracted.startsWith('blob:')) {
            return extracted;
          }
        }
      }
    }

    let rawImg = extractString(item.coverImage) || extractString(item.image) || extractString(item.photo);
    
    if (!rawImg && Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      for (const media of item.mediaUrls) {
        const extracted = extractString(media);
        if (extracted && extracted.startsWith('http') && !extracted.startsWith('blob:')) {
          rawImg = extracted;
          break;
        }
      }
    }
    
    if (!rawImg) {
      const imageArrays = ['images', 'existingImages', 'fileUrls', 'photos', 'files'];
      for (const key of imageArrays) {
        const array = item[key];
        if (Array.isArray(array) && array.length > 0) {
          for (const img of array) {
            const extracted = extractString(img);
            if (extracted && extracted.startsWith('http') && !extracted.startsWith('blob:')) {
              rawImg = extracted;
              break;
            }
          }
          if (rawImg) break;
        }
      }
    }
    
    if (!rawImg) return null;
    
    rawImg = String(rawImg).trim().replace(/\\/g, '/');
    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) return rawImg;
    
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      try {
        const url = new URL(rawImg);
        return `${cleanBase}${url.pathname}${url.search || ''}`;
      } catch {
        const path = rawImg.replace(/^https?:\/\/[^\/]+/, '');
        return `${cleanBase}${path}`;
      }
    }
    
    if (rawImg.includes('uploads/')) {
      const parts = rawImg.split('uploads/');
      return `${cleanBase}/uploads/${parts[parts.length - 1]}`;
    }
    
    return `${cleanBase}/uploads/${rawImg.startsWith('/') ? rawImg.slice(1) : rawImg}`;
  };

const handleTogglePublish = async (targetItemOrIds: any) => {
  if (Array.isArray(targetItemOrIds)) {
    externalHandleTogglePublish?.(targetItemOrIds);
    return;
  }

  try {
    const targetItem = targetItemOrIds;
    const itemId = getInternalId(targetItem);
    
    if (!itemId) {
      console.error('❌ No se encontró el ID del item');
      return;
    }

    const originalStock = targetItem.stock ?? targetItem.attributes?.stock ?? 0;
    
    // 🔥 PRESERVAR TODOS LOS CAMPOS
    const ivaType = targetItem.ivaType || targetItem.attributes?.ivaType || 'excluded';
    const ivaRate = Number(targetItem.ivaRate || targetItem.attributes?.ivaRate || 16);
    const existingImages = targetItem.existingImages || targetItem.mediaUrls || targetItem.images || [];
    const coverImage = targetItem.coverImage || (Array.isArray(existingImages) && existingImages.length > 0 ? existingImages[0] : '');

    const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const cleanBase = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`).replace(/\/$/, '');

    // 🔥 Elegir endpoint según el tipo
    const isService = baseEndpoint === 'services';
    const endpointName = isService ? 'services' : 'items';

    // 🔥 Body adaptado al tipo
    const bodyPayload = isService
      ? {
          isActive: targetItem.isActive,
          status: targetItem.status,
        }
      : {
          isActive: targetItem.isActive,
          status: targetItem.status,
          // 🔥 PRESERVAR TODOS LOS CAMPOS (solo para productos)
          ivaType: ivaType,
          ivaRate: ivaRate,
          existingImages: existingImages,
          coverImage: coverImage,
          attributes: {
            ...(targetItem.attributes || {}),
            ivaType: ivaType,
            ivaRate: ivaRate,
            existingImages: existingImages,
            coverImage: coverImage,
          }
        };

    const response = await fetch(`${cleanBase}/api/${endpointName}/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error al actualizar estatus: ${response.status}`);
    }

    const updatedItem = await response.json();

    // 🔥 MERGEAR PRESERVANDO TODO
    const mergedItem = {
      ...targetItem, // 🔥 PRESERVAR DATOS ORIGINALES
      ...updatedItem,
      stock: originalStock,
      ivaType: ivaType,
      ivaRate: ivaRate,
      existingImages: existingImages,
      coverImage: coverImage,
      attributes: {
        ...(targetItem.attributes || {}),
        ...(updatedItem.attributes || {}),
        stock: originalStock,
        ivaType: ivaType,
        ivaRate: ivaRate,
        existingImages: existingImages,
        coverImage: coverImage,
      }
    };

    setLocalItems(prev => prev.map(i => 
      getInternalId(i) === itemId ? normalizeItem(mergedItem) : i
    ));

    if (externalHandleTogglePublish) {
      externalHandleTogglePublish(mergedItem);
    }
    
    if (onUpdateItem) {
      onUpdateItem(normalizeItem(mergedItem));
    }

  } catch (error) {
    console.error('❌ Error al cambiar estatus:', error);
    throw error;
  }
};

  const handleUpdateItem = async (idOrData: string | any, maybeUpdatedData?: any) => {
    try {
      let itemId: string;
      let updatedData: any;

      if (typeof idOrData === 'string') {
        itemId = idOrData;
        updatedData = maybeUpdatedData;
      } else {
        updatedData = idOrData;
        itemId = getInternalId(updatedData);
      }

      if (!itemId) return;

      const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const cleanBase = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`).replace(/\/$/, '');

      const isFormData = updatedData instanceof FormData;
      let bodyData: any;
      let headers: Record<string, string> = {};

      if (isFormData) {
        // Los modales ya construyen el FormData completo para productos y servicios.
        // No leerlo como un objeto: hacerlo convertiría campos ausentes en cero.
        bodyData = updatedData;
      } else {
        headers['Content-Type'] = 'application/json';

        const ves = Number(updatedData?.prices?.VES ?? updatedData?.price ?? 0);
        const usd = Number(updatedData?.prices?.USD ?? (currentRateUSD > 0 ? ves / currentRateUSD : 0));
        const eur = Number(updatedData?.prices?.EUR ?? (currentRateEUR > 0 ? ves / currentRateEUR : 0));
        const crypto = Number(updatedData?.prices?.CRYPTO ?? usd);
        const stock = Number(updatedData?.stock ?? 0);
        
        bodyData = JSON.stringify({
          ...updatedData,
          price: ves,
          stock: stock,
          prices: { VES: ves, USD: usd, EUR: eur, CRYPTO: crypto },
          attributes: {
            ...(updatedData?.attributes || {}),
            prices: { VES: ves, USD: usd, EUR: eur, CRYPTO: crypto },
            usdReference: usd,
            stock: stock
          }
        });
      }

      const response = await fetch(`${cleanBase}/${baseEndpoint}/${itemId}`, {
        method: 'PUT',
        headers,
        body: bodyData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error del servidor:', errorText);
        throw new Error('Error al actualizar el elemento');
      }

      const result = await response.json();
      const normalized = normalizeItem(result);

      setLocalItems(prev => prev.map(i => getInternalId(i) === itemId ? normalized : i));
      onUpdateItem?.(normalized);
      return normalized;
    } catch (error) {
      console.error('Error al actualizar:', error);
      throw error;
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...localItems];
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.model?.toLowerCase().includes(term) ||
        getProductCode(item).toLowerCase().includes(term) ||
        getInternalId(item).toLowerCase().includes(term)
      );
    }
    result.sort((a, b) => {
      let aVal = sortField === 'itemId' ? getProductCode(a) : a[sortField];
      let bVal = sortField === 'itemId' ? getProductCode(b) : b[sortField];

      if (sortField === 'price' || sortField === 'stock') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      return aVal < bVal ? (sortDirection === 'asc' ? -1 : 1) : aVal > bVal ? (sortDirection === 'asc' ? 1 : -1) : 0;
    });
    return result;
  }, [localItems, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const toggleSort = (field: 'name' | 'price' | 'stock' | 'itemId' | 'duration') => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return {
    localItems,
    filteredAndSortedItems,
    paginatedItems,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedIds,
    setSelectedIds,
    previewProduct,
    setPreviewProduct,
    copiedId,
    setCopiedId,
    activePopoverId,
    setActivePopoverId,
    totalPages,
    toggleSort,
    handleTogglePublish,
    handleUpdateItem,
    getItemImage,
    formatVESPrice,
    getInternalId,
    getProductCode
  };
}