'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterState } from '../components/FilterSidebar';

interface UseProductFiltersProps {
  products: any[];
  exchangeRate: number;
  initialFilters?: Partial<FilterState>;
  searchQuery?: string;  // ✅ AGREGAR ESTA LÍNEA
}

export function useProductFilters({ 
  products, 
  exchangeRate, 
  initialFilters = {},
  searchQuery = '',  // ✅ AGREGAR ESTA LÍNEA
}: UseProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    minPriceUsd: null,
    maxPriceUsd: null,
    minPriceVes: null,
    maxPriceVes: null,
    minPriceEur: null,
    maxPriceEur: null,
    minPriceCrypto: null,
    maxPriceCrypto: null,
    minStock: null,
    maxStock: null,
    onlyInStock: false,
    stockStatus: 'all',
    lowStockThreshold: 5,
    onlyOnSale: false,
    minDiscountPercentage: null,
    maxDiscountPercentage: null,
    startDate: null,
    endDate: null,
    dateField: 'createdAt',
    selectedCategories: [],
    selectedBrands: [],
    selectedConditions: [],
    selectedWarranties: [],
    ivaTypes: [],
    minIvaRate: null,
    maxIvaRate: null,
    statuses: [],
    selectedFeatures: [],
    matchAllFeatures: false,
    serviceModalities: [],
    minDuration: null,
    maxDuration: null,
    selectedCertifications: [],
    selectedMaterials: [],
    sortBy: 'newest',
    ...initialFilters,
  });

  // ============================================================
  // 🔥 FUNCIONES DE EXTRACCIÓN DE DATOS
  // ============================================================

  const getProductPriceUsd = useCallback((p: any): number => {
    if (!p) return 0;
    if (p.priceUsd && Number(p.priceUsd) > 0) return Number(p.priceUsd);
    if (p.prices?.USD && Number(p.prices.USD) > 0) return Number(p.prices.USD);
    if (p.attributes?.prices?.USD && Number(p.attributes.prices.USD) > 0) {
      return Number(p.attributes.prices.USD);
    }
    if (p.price && Number(p.price) > 0 && Number(p.price) < 1000) return Number(p.price);
    if (exchangeRate > 0 && p.priceVes && Number(p.priceVes) > 0) {
      return Number(p.priceVes) / exchangeRate;
    }
    return 0;
  }, [exchangeRate]);

  const getProductPriceVes = useCallback((p: any): number => {
    if (!p) return 0;
    if (p.priceVes && Number(p.priceVes) > 0) return Number(p.priceVes);
    if (p.prices?.VES && Number(p.prices.VES) > 0) return Number(p.prices.VES);
    if (p.attributes?.prices?.VES && Number(p.attributes.prices.VES) > 0) {
      return Number(p.attributes.prices.VES);
    }
    if (p.price && Number(p.price) > 0 && Number(p.price) > 1000) return Number(p.price);
    if (exchangeRate > 0) {
      const usd = getProductPriceUsd(p);
      if (usd > 0) return usd * exchangeRate;
    }
    return 0;
  }, [exchangeRate, getProductPriceUsd]);

  const getProductPriceEur = useCallback((p: any): number => {
    if (!p) return 0;
    if (p.prices?.EUR && Number(p.prices.EUR) > 0) return Number(p.prices.EUR);
    if (p.attributes?.prices?.EUR && Number(p.attributes.prices.EUR) > 0) {
      return Number(p.attributes.prices.EUR);
    }
    const usd = getProductPriceUsd(p);
    if (usd > 0 && exchangeRate > 0) {
      return usd / 1.1674;
    }
    return 0;
  }, [exchangeRate, getProductPriceUsd]);

  const getProductPriceCrypto = useCallback((p: any): number => {
    if (!p) return 0;
    if (p.prices?.CRYPTO && Number(p.prices.CRYPTO) > 0) return Number(p.prices.CRYPTO);
    if (p.prices?.USDT && Number(p.prices.USDT) > 0) return Number(p.prices.USDT);
    if (p.attributes?.prices?.CRYPTO && Number(p.attributes.prices.CRYPTO) > 0) {
      return Number(p.attributes.prices.CRYPTO);
    }
    return getProductPriceUsd(p);
  }, [getProductPriceUsd]);

  const getProductStock = useCallback((p: any): number => {
    if (!p) return 0;
    return Number(p.stock || p.existencias || p.attributes?.stock || 0);
  }, []);

  const getProductDiscount = useCallback((p: any): number => {
    if (!p) return 0;
    const discount = Number(p.discountPercentage || p.attributes?.discountPercentage || 0);
    const onSale = p.onSale === true || p.attributes?.onSale === true;
    return onSale ? Math.min(100, Math.max(0, discount)) : 0;
  }, []);

  const getProductDate = useCallback((p: any, field: string = 'createdAt'): Date => {
    if (!p) return new Date(0);
    const dateStr = p[field] || p.attributes?.[field] || p.createdAt || p.updatedAt || p.publishedAt;
    if (!dateStr) return new Date(0);
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    } catch {
      return new Date(0);
    }
  }, []);

  const getProductPopularity = useCallback((p: any): number => {
    if (!p) return 0;
    return Number(p.soldCount || p.sales || p.ventas || p.attributes?.soldCount || 0);
  }, []);

  const getProductFeatures = useCallback((p: any): string[] => {
    if (!p) return [];
    const feats = p.features || p.attributes?.features || p.tags || [];
    if (Array.isArray(feats)) return feats;
    if (typeof feats === 'string') {
      try { return JSON.parse(feats); } catch { return [feats]; }
    }
    return [];
  }, []);

  const getProductBrands = useCallback((p: any): string[] => {
    if (!p) return [];
    const brand = p.brand || p.marca || p.attributes?.brand || '';
    return brand ? [brand] : [];
  }, []);

  const getProductIvaInfo = useCallback((p: any): { type: string; rate: number } => {
    if (!p) return { type: 'excluido', rate: 16 };
    return {
      type: p.ivaType || p.attributes?.ivaType || 'excluido',
      rate: Number(p.ivaRate || p.attributes?.ivaRate || 16),
    };
  }, []);

  const getServiceDuration = useCallback((p: any): number => {
    if (!p) return 0;
    return Number(p.durationMinutes || p.attributes?.durationMinutes || 0);
  }, []);

  const getServiceModalities = useCallback((p: any): string[] => {
    if (!p) return [];
    const modality = p.serviceModality || p.attributes?.serviceModality || '';
    return modality ? [modality] : [];
  }, []);

  const getCertifications = useCallback((p: any): string[] => {
    if (!p) return [];
    const certs = p.certifications || p.attributes?.certifications || [];
    return Array.isArray(certs) ? certs : [];
  }, []);

  const getMaterials = useCallback((p: any): string[] => {
    if (!p) return [];
    const mats = p.materials || p.attributes?.materials || [];
    return Array.isArray(mats) ? mats : [];
  }, []);

  const getProductStatus = useCallback((p: any): string => {
    if (!p) return 'draft';
    return p.status || p.attributes?.status || (p.isActive ? 'published' : 'draft');
  }, []);

  const getProductCondition = useCallback((p: any): string[] => {
    if (!p) return [];
    const cond = p.condition || p.attributes?.condition || '';
    return cond ? [cond] : [];
  }, []);

  const getProductWarranty = useCallback((p: any): string[] => {
    if (!p) return [];
    const warranty = p.warranty || p.attributes?.warranty || '';
    return warranty ? [warranty] : [];
  }, []);

  // ============================================================
  // 🔥 FILTRADO PRINCIPAL
  // ============================================================

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let result = [...products];

    // ============================================================
    // 1. FILTRO DE PRECIOS (Múltiples monedas)
    // ============================================================
    if (filters.minPriceUsd !== null) {
      result = result.filter(p => getProductPriceUsd(p) >= filters.minPriceUsd!);
    }
    if (filters.maxPriceUsd !== null) {
      result = result.filter(p => getProductPriceUsd(p) <= filters.maxPriceUsd!);
    }
    if (filters.minPriceVes !== null) {
      result = result.filter(p => getProductPriceVes(p) >= filters.minPriceVes!);
    }
    if (filters.maxPriceVes !== null) {
      result = result.filter(p => getProductPriceVes(p) <= filters.maxPriceVes!);
    }
    if (filters.minPriceEur !== null) {
      result = result.filter(p => getProductPriceEur(p) >= filters.minPriceEur!);
    }
    if (filters.maxPriceEur !== null) {
      result = result.filter(p => getProductPriceEur(p) <= filters.maxPriceEur!);
    }
    if (filters.minPriceCrypto !== null) {
      result = result.filter(p => getProductPriceCrypto(p) >= filters.minPriceCrypto!);
    }
    if (filters.maxPriceCrypto !== null) {
      result = result.filter(p => getProductPriceCrypto(p) <= filters.maxPriceCrypto!);
    }

    
    // ============================================================
// 🔥 FILTRO DE BÚSQUEDA POR NOMBRE (searchQuery)
// ============================================================
if (searchQuery && searchQuery.trim()) {
  const query = searchQuery.toLowerCase().trim();
  result = result.filter(p => {
    const name = p.name?.toLowerCase() || '';
    const description = p.description?.toLowerCase() || '';
    const category = p.category?.toLowerCase() || '';
    const brand = p.brand?.toLowerCase() || '';
    
    return name.includes(query) || 
           description.includes(query) || 
           category.includes(query) || 
           brand.includes(query);
  });
}


    // ============================================================
    // 2. FILTRO DE STOCK (MANTENIDO)
    // ============================================================
    if (filters.minStock !== null) {
      result = result.filter(p => getProductStock(p) >= filters.minStock!);
    }
    if (filters.maxStock !== null) {
      result = result.filter(p => getProductStock(p) <= filters.maxStock!);
    }
    if (filters.onlyInStock) {
      result = result.filter(p => getProductStock(p) > 0);
    }
    if (filters.stockStatus !== 'all') {
      result = result.filter(p => {
        const stock = getProductStock(p);
        switch (filters.stockStatus) {
          case 'in_stock': return stock > 0;
          case 'low_stock': return stock > 0 && stock <= filters.lowStockThreshold;
          case 'out_of_stock': return stock === 0;
          default: return true;
        }
      });
    }

    // ============================================================
    // 3. FILTRO DE OFERTAS Y DESCUENTOS
    // ============================================================
    if (filters.onlyOnSale) {
      result = result.filter(p => getProductDiscount(p) > 0);
    }
    if (filters.minDiscountPercentage !== null) {
      result = result.filter(p => getProductDiscount(p) >= filters.minDiscountPercentage!);
    }
    if (filters.maxDiscountPercentage !== null) {
      result = result.filter(p => getProductDiscount(p) <= filters.maxDiscountPercentage!);
    }

    // ============================================================
    // 4. FILTRO DE FECHAS
    // ============================================================
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(p => {
        const date = getProductDate(p, filters.dateField);
        return date >= start;
      });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(p => {
        const date = getProductDate(p, filters.dateField);
        return date <= end;
      });
    }

    // ============================================================
    // 5. FILTRO DE CATEGORÍAS ✅
    // ============================================================
    if (filters.selectedCategories && filters.selectedCategories.length > 0) {
      result = result.filter(p => {
        const category = p.category || p.categoria || '';
        return filters.selectedCategories.some(cat => 
          category.toLowerCase().includes(cat.toLowerCase())
        );
      });
    }

    // ============================================================
    // 6. FILTRO DE MARCAS
    // ============================================================
    if (filters.selectedBrands.length > 0) {
      result = result.filter(p => {
        const brands = getProductBrands(p);
        return filters.selectedBrands.some(brand => 
          brands.some(b => b.toLowerCase().includes(brand.toLowerCase()))
        );
      });
    }

    // ============================================================
    // 7. FILTRO DE CONDICIONES
    // ============================================================
    if (filters.selectedConditions.length > 0) {
      result = result.filter(p => {
        const conditions = getProductCondition(p);
        return filters.selectedConditions.some(cond => 
          conditions.some(c => c.toLowerCase().includes(cond.toLowerCase()))
        );
      });
    }

    // ============================================================
    // 8. FILTRO DE GARANTÍAS
    // ============================================================
    if (filters.selectedWarranties.length > 0) {
      result = result.filter(p => {
        const warranties = getProductWarranty(p);
        return filters.selectedWarranties.some(w => 
          warranties.some(warr => warr.toLowerCase().includes(w.toLowerCase()))
        );
      });
    }

    // ============================================================
    // 9. FILTRO DE IVA
    // ============================================================
    if (filters.ivaTypes.length > 0) {
      result = result.filter(p => {
        const iva = getProductIvaInfo(p);
        return filters.ivaTypes.includes(iva.type);
      });
    }
    if (filters.minIvaRate !== null) {
      result = result.filter(p => {
        const iva = getProductIvaInfo(p);
        return iva.rate >= filters.minIvaRate!;
      });
    }
    if (filters.maxIvaRate !== null) {
      result = result.filter(p => {
        const iva = getProductIvaInfo(p);
        return iva.rate <= filters.maxIvaRate!;
      });
    }

    // ============================================================
    // 10. FILTRO DE ESTADO
    // ============================================================
    if (filters.statuses.length > 0) {
      result = result.filter(p => {
        const status = getProductStatus(p);
        return filters.statuses.includes(status);
      });
    }

    // ============================================================
    // 11. FILTRO DE FEATURES / TAGS
    // ============================================================
    if (filters.selectedFeatures.length > 0) {
      result = result.filter(p => {
        const feats = getProductFeatures(p);
        const matched = filters.selectedFeatures.filter(f => 
          feats.some(feat => feat.toLowerCase().includes(f.toLowerCase()))
        );
        return filters.matchAllFeatures 
          ? matched.length === filters.selectedFeatures.length
          : matched.length > 0;
      });
    }

    // ============================================================
    // 12. FILTRO DE SERVICIOS - Modalidades
    // ============================================================
    if (filters.serviceModalities.length > 0) {
      result = result.filter(p => {
        const modalities = getServiceModalities(p);
        return filters.serviceModalities.some(m => 
          modalities.some(mod => mod.toLowerCase().includes(m.toLowerCase()))
        );
      });
    }

    // ============================================================
    // 13. FILTRO DE SERVICIOS - Duración
    // ============================================================
    if (filters.minDuration !== null) {
      result = result.filter(p => getServiceDuration(p) >= filters.minDuration!);
    }
    if (filters.maxDuration !== null) {
      result = result.filter(p => getServiceDuration(p) <= filters.maxDuration!);
    }

    // ============================================================
    // 14. FILTRO DE SERVICIOS - Certificaciones
    // ============================================================
    if (filters.selectedCertifications.length > 0) {
      result = result.filter(p => {
        const certs = getCertifications(p);
        return filters.selectedCertifications.some(c => 
          certs.some(cert => cert.toLowerCase().includes(c.toLowerCase()))
        );
      });
    }

    // ============================================================
    // 15. FILTRO DE SERVICIOS - Materiales
    // ============================================================
    if (filters.selectedMaterials.length > 0) {
      result = result.filter(p => {
        const mats = getMaterials(p);
        return filters.selectedMaterials.some(m => 
          mats.some(mat => mat.toLowerCase().includes(m.toLowerCase()))
        );
      });
    }



    // ============================================================
    // 16. ORDENAR
    // ============================================================
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => getProductDate(b, filters.dateField).getTime() - 
                              getProductDate(a, filters.dateField).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => getProductDate(a, filters.dateField).getTime() - 
                              getProductDate(b, filters.dateField).getTime());
        break;
      case 'popular':
        result.sort((a, b) => getProductPopularity(b) - getProductPopularity(a));
        break;
      case 'price_asc':
        result.sort((a, b) => getProductPriceUsd(a) - getProductPriceUsd(b));
        break;
      case 'price_desc':
        result.sort((a, b) => getProductPriceUsd(b) - getProductPriceUsd(a));
        break;
      case 'stock_asc':
        result.sort((a, b) => getProductStock(a) - getProductStock(b));
        break;
      case 'stock_desc':
        result.sort((a, b) => getProductStock(b) - getProductStock(a));
        break;
      case 'discount_desc':
        result.sort((a, b) => getProductDiscount(b) - getProductDiscount(a));
        break;
      case 'rating_desc':
        result.sort((a, b) => {
          const ratingA = Number(a.rating || a.attributes?.rating || 0);
          const ratingB = Number(b.rating || b.attributes?.rating || 0);
          return ratingB - ratingA;
        });
        break;
      case 'name_asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      default:
        break;
    }

    return result;}, [
  products,
  filters,
  searchQuery,  // ✅ AGREGAR ESTA LÍNEA
  getProductPriceUsd,
  getProductPriceVes,
  getProductPriceEur,
  getProductPriceCrypto,
  getProductStock,
  getProductDiscount,
  getProductDate,
  getProductPopularity,
  getProductFeatures,
  getProductBrands,
  getProductIvaInfo,
  getServiceDuration,
  getServiceModalities,
  getCertifications,
  getMaterials,
  getProductStatus,
  getProductCondition,
  getProductWarranty,
]);

  // ============================================================
  // 🔥 FUNCIONES DE ACTUALIZACIÓN
  // ============================================================

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      minPriceUsd: null,
      maxPriceUsd: null,
      minPriceVes: null,
      maxPriceVes: null,
      minPriceEur: null,
      maxPriceEur: null,
      minPriceCrypto: null,
      maxPriceCrypto: null,
      minStock: null,
      maxStock: null,
      onlyInStock: false,
      stockStatus: 'all',
      lowStockThreshold: 5,
      onlyOnSale: false,
      minDiscountPercentage: null,
      maxDiscountPercentage: null,
      startDate: null,
      endDate: null,
      dateField: 'createdAt',
      selectedCategories: [],
      selectedBrands: [],
      selectedConditions: [],
      selectedWarranties: [],
      ivaTypes: [],
      minIvaRate: null,
      maxIvaRate: null,
      statuses: [],
      selectedFeatures: [],
      matchAllFeatures: false,
      serviceModalities: [],
      minDuration: null,
      maxDuration: null,
      selectedCertifications: [],
      selectedMaterials: [],
      sortBy: 'newest',
    });
  }, []);

  const applyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // ============================================================
  // 🔥 RETORNAR
  // ============================================================

  return {
    filters,
    filteredProducts,
    updateFilter,
    resetFilters,
    applyFilters,
    // Utilidades para análisis
    getProductPriceUsd,
    getProductPriceVes,
    getProductStock,
    getProductDiscount,
    getProductFeatures,
    getProductBrands,
    getProductIvaInfo,
    getProductPopularity,
  };
}