      'use client';

      import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
      import { ChevronDown } from 'lucide-react';

      import { createPortal } from 'react-dom';

      import { 
        PRESET_COLORS,
        PRESET_CATEGORIES,
        NICHE_CATEGORIES_MAP 
      } from '@/app/constants/nicheData';
      import { PRODUCT_TAG_CATEGORIES } from '@/app/constants/itemCategories';
      import AdvancedAttributesSection from '../item-form/AdvancedAttributesSection';

      import { useBrands } from '@/hooks/useBrands';
      // 🔥 IMPORTAR imageUtils Y contexto de tasas
import { getFirstImage, getAllImages } from '@/lib/imageUtils';
import { toAbsoluteApiUrl } from '@/lib/apiUrl';
      import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
      import { useToast } from '@/components/ui/useToast';
      interface ItemEditModalProps {
        product?: any;          
        isOpen?: boolean;
        onClose?: () => void;
        onSave?: (updatedItem: any) => void;
        textColor: string;
        isDarkBg: boolean;
        primary: string;
        secondary?: string;
        rates?: Record<string, number>;
        tenantConfig?: any;
        existingItems?: any[];
      }

      interface UploadingFile { 
        id: string;
        name: string;
        url: string;
        progress: number;
        status: 'uploading' | 'success' | 'error';
        errorMessage?: string;
        fileObject?: File;
      }

      // Helper para determinar el color del precio según el tema
      const getAdaptiveGreenColor = (textColorValue: string): string => {
        if (!textColorValue) return '#22c55e';

        const str = textColorValue.trim().toLowerCase();

        if (str.startsWith('#')) {
          let hex = str.replace('#', '');
          if (hex.length === 3) {
            hex = hex.split('').map((char) => char + char).join('');
          }
          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 128 ? '#4ade80' : '#15803d';
          }
        }

        if (str.startsWith('rgb')) {
          const matches = str.match(/\d+/g);
          if (matches && matches.length >= 3) {
            const r = Number(matches[0]);
            const g = Number(matches[1]);
            const b = Number(matches[2]);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 128 ? '#4ade80' : '#15803d';
          }
        }

        if (['black', '000', 'slate-900', 'gray-900', 'neutral-900'].some(k => str.includes(k))) {
          return '#15803d';
        }

        return '#4ade80';
      };

      // Icono de búsqueda en SVG
      const SearchIcon = ({ color }: { color: string }) => (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );

      // Icono de chevron
      const ChevronIcon = ({ color, open }: { color: string; open: boolean }) => (
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      );

      // Icono de check
      const CheckIcon = ({ color }: { color: string }) => (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );

      // Capitaliza texto
      const formatFriendlyText = (text: string) => {
        if (!text) return 'General';
        return text
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => {
            if (!word) return '';
            const lowerWords = ['en', 'de', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'por', 'para', 'con', 'sin'];
            if (lowerWords.includes(word.toLowerCase()) && word.length <= 3) {
              return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      };

      export default function ItemEditModal({
        product = null,
        isOpen = true,
        onClose,
        onSave,
        textColor,
        isDarkBg,
        primary,
        secondary,
        rates = {},
        tenantConfig = {},
        existingItems = [],
      }: ItemEditModalProps) {
        
        // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
        const { rates: exchangeRates, loading: ratesLoading } = useExchangeRateContext();
        
        const { showToast } = useToast();

  const [newItem, setNewItem] = useState<any>({});
  const [images, setImages] = useState<UploadingFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false); // ✅ AGREGAR ESTA LÍNEA
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
        
        const [showBrandMenu, setShowBrandMenu] = useState(false);
        const brandContainerRef = useRef<HTMLDivElement>(null);
        const [customBrands, setCustomBrands] = useState<string[]>([]);
        
        const fileInputRef = useRef<HTMLInputElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        // OBTENER TENANT ID PARA MARCAS
        const tenantId = tenantConfig?.id || product?.tenantId || '';

        // USAR HOOK DE MARCAS DESDE LA BASE DE DATOS
        const { brands: dbBrands, loading: brandsLoading, refresh: refreshBrands } = useBrands(tenantId);

        // COLORES HEREDADOS
        const cardBg = secondary || (isDarkBg ? '#0f172a' : '#ffffff');
        const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)';

        const dynamicSubCardStyle = {
          backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: borderDynamic,
          color: textColor
        };

        const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
        const dropdownBorder = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        const dropdownItemHover = isDarkBg ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
        const dropdownItemSelected = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

        const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all bg-transparent`;

        // COMBINAR MARCAS
        const allBrands = useMemo(() => {
          const dbBrandNames = dbBrands.map(b => typeof b === 'string' ? b : b.name);
          const existingBrands = existingItems.map((item) => item.brand).filter(Boolean);
          return Array.from(new Set([...dbBrandNames, ...customBrands, ...existingBrands]));
        }, [dbBrands, customBrands, existingItems]);
        
        const brandInput = newItem?.brand || '';
        const filteredBrands = allBrands.filter((b) =>
          b.toLowerCase().includes(brandInput.toLowerCase())
        );
        const exactBrandMatchExists = allBrands.some(
          (b) => b.toLowerCase() === brandInput.toLowerCase()
        );

        const getAllAvailableCategories = useMemo(() => {
          const nicheFromConfig = tenantConfig?.niche || '';
          const nicheFromProduct = product?.niche || '';
          const nicheFromAttrs = product?.attributes?.niche || '';
          const nicheFromCategory = tenantConfig?.category || '';
          
          const storeNicheStr = String(nicheFromConfig || nicheFromProduct || nicheFromAttrs || nicheFromCategory || '').toLowerCase().trim();
          
          if (!storeNicheStr || storeNicheStr === 'general' || storeNicheStr === '') {
            const allCategories = new Set<string>();
            PRESET_CATEGORIES.forEach(cat => allCategories.add(cat));
            Object.values(NICHE_CATEGORIES_MAP).forEach(categories => {
              categories.forEach(cat => allCategories.add(cat));
            });
            return Array.from(allCategories).sort();
          }
          
          if (NICHE_CATEGORIES_MAP[storeNicheStr]) {
            const nicheCategories = NICHE_CATEGORIES_MAP[storeNicheStr] || [];
            return [...new Set([...nicheCategories, ...PRESET_CATEGORIES])];
          }
          
          const matchedKey = Object.keys(NICHE_CATEGORIES_MAP).find(key => 
            key === storeNicheStr || 
            storeNicheStr.includes(key) || 
            key.includes(storeNicheStr)
          );
          
          if (matchedKey) {
            const nicheCategories = NICHE_CATEGORIES_MAP[matchedKey] || [];
            return [...new Set([...nicheCategories, ...PRESET_CATEGORIES])];
          }
          
          const allCategories = new Set<string>();
          PRESET_CATEGORIES.forEach(cat => allCategories.add(cat));
          Object.values(NICHE_CATEGORIES_MAP).forEach(categories => {
            categories.forEach(cat => allCategories.add(cat));
          });
          return Array.from(allCategories).sort();
        }, [tenantConfig, product]);

        const filteredCategories = useMemo(() => {
          if (!categorySearch.trim()) return getAllAvailableCategories;
          const searchLower = categorySearch.toLowerCase().trim();
          return getAllAvailableCategories.filter(cat => 
            formatFriendlyText(cat).toLowerCase().includes(searchLower) ||
            cat.toLowerCase().includes(searchLower)
          );
        }, [getAllAvailableCategories, categorySearch]);

        const roundPrice = (value: number): number => {
          return Math.round(value * 100) / 100;
        };

        const getRateUSD = (): number => {
          const usd = Number(exchangeRates?.USD || rates?.USD || 0);
          return usd > 0 ? usd : 0;
        };

        const getRateEUR = (): number => {
          const eur = Number(exchangeRates?.EUR || rates?.EUR || 0);
          return eur > 0 ? eur : 0;
        };

        const ivaType = newItem?.ivaType || 'excluded';
        const ivaRate = newItem?.ivaRate || 16;
        const priceColor = getAdaptiveGreenColor(textColor);

        // 🔥 FUNCIÓN PARA EXTRAER IMÁGENES CORRECTAMENTE
        const extractImagesFromProduct = useCallback((product: any): string[] => {
          if (!product) return [];
          
          // 1. Usar getAllImages de imageUtils
          const allImages = getAllImages(product);
          if (allImages.length > 0) {
            console.log('📸 [extractImages] getAllImages encontró:', allImages.length);
            return allImages;
          }
          
          // 2. Buscar en attributes
          if (product.attributes) {
            const attrImages = getAllImages(product.attributes);
            if (attrImages.length > 0) {
              console.log('📸 [extractImages] attributes encontró:', attrImages.length);
              return attrImages;
            }
          }
          
          // 3. Buscar campos individuales
          const singleFields = ['image', 'coverImage', 'photo', 'cover', 'mainImage'];
          for (const field of singleFields) {
            if (product[field] && typeof product[field] === 'string' && product[field].trim()) {
              return [product[field]];
            }
            if (product.attributes?.[field] && typeof product.attributes[field] === 'string' && product.attributes[field].trim()) {
              return [product.attributes[field]];
            }
          }
          
          return [];
        }, []);

        useEffect(() => {
          const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsCategoryDropdownOpen(false);
            }
            if (brandContainerRef.current && !brandContainerRef.current.contains(event.target as Node)) {
              setShowBrandMenu(false);
            }
          };
          document.addEventListener('mousedown', handleClickOutside);
          return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        // 🔥 SINCRONIZAR DATOS DEL PRODUCTO - CON IMÁGENES CORREGIDAS
        useEffect(() => {
          if (!product) return;

          console.log('📸 [ItemEditModal] Sincronizando producto:', product.name);

          const attrs = product?.attributes || {};
          const resolvedSku = product?.itemId || product?.sku || product?.code || attrs?.sku || attrs?.itemId || '';
          
// 🔥 PRIORIDAD 1: USD como ancla, VES se recalcula con la tasa ACTUAL
// Esto arregla el bug del VES congelado: el precio que ve el admin
// siempre está actualizado con la tasa del día, igual que en ItemInventoryTable.
const rawVes = roundPrice(Number(product?.prices?.VES ?? product?.price ?? 0));
const rawUsd = roundPrice(Number(product?.prices?.USD ?? product?.attributes?.prices?.USD ?? 0));
const rawEur = roundPrice(Number(product?.prices?.EUR ?? product?.attributes?.prices?.EUR ?? 0));
const rawCrypto = roundPrice(Number(product?.prices?.CRYPTO ?? product?.attributes?.prices?.CRYPTO ?? 0));

const rateUSD = getRateUSD();
const rateEUR = getRateEUR();

let finalVes = rawVes;
let finalUsd = rawUsd;
let finalEur = rawEur;
let finalCrypto = rawCrypto;

// 🔥 El USD es el ancla. Si hay USD, recalculamos VES con la tasa ACTUAL.
if (finalUsd > 0 && rateUSD > 0) {
  finalVes = roundPrice(finalUsd * rateUSD);
}
// 🔴 Fallback: si NO hay USD pero sí VES, derivamos USD desde el VES (producto viejo sin USD)
else if (finalVes > 0 && rateUSD > 0) {
  finalUsd = roundPrice(finalVes / rateUSD);
}
// 🔴 Fallback final: si no hay ni USD ni VES, dejamos 0

// 🔥 EUR siempre se recalcula desde USD con la tasa actual
if (finalUsd > 0 && rateEUR > 0 && rateUSD > 0) {
  finalEur = roundPrice(finalUsd * (rateUSD / rateEUR));
}

// 🔥 CRYPTO = USD (USDT)
if (finalUsd > 0) {
  finalCrypto = finalUsd;
}

          // 🔥🔥🔥 EXTRAER IMÁGENES CORRECTAMENTE 🔥🔥🔥
          const extractedImages = extractImagesFromProduct(product);
          
          // Filtrar y limpiar
          const finalImages = Array.from(new Set(
            extractedImages
              .filter(Boolean)
              .filter((img) => typeof img === 'string' && img.trim() !== '')
          ));

          console.log('📸 [ItemEditModal] Imágenes FINALES extraídas:', finalImages);
          console.log('📸 [ItemEditModal] Cantidad de imágenes:', finalImages.length);

          // 🔥 OBTENER EL IVA DEL PRODUCTO
          const productIvaType = product?.ivaType || attrs?.ivaType || 'excluded';
          const productIvaRate = Number(product?.ivaRate ?? attrs?.ivaRate ?? 16);

    setNewItem({ 
      ...product,
      itemId: resolvedSku,
      sku: resolvedSku,
      code: resolvedSku,
      name: product?.name || product?.title || '',
      category: product?.category || attrs?.category || '',
  // 🔥 COLORES COMO ARRAY (MÚLTIPLES)
  colors: product?.colors || (product?.color ? [product.color] : (attrs?.color ? [attrs.color] : [])),
  color: product?.color || attrs?.color || (Array.isArray(product?.colors) && product.colors.length > 0 ? product.colors[0] : ''),
      status: product?.status || attrs?.status || 'published',
      price: finalVes,
      usdReference: finalUsd,
      prices: {
        VES: finalVes,
        USD: finalUsd,
        EUR: finalEur,
        CRYPTO: finalCrypto
      },
      brand: product?.brand || attrs?.brand || '',
      description: product?.description || product?.details || attrs?.description || '',
      features: Array.isArray(product?.features) ? product.features : (Array.isArray(attrs?.features) ? attrs.features : []),
      existingImages: finalImages,
      mediaUrls: finalImages,
      images: finalImages,
      weight: product?.weight || attrs?.weight || '',
      weightValue: product?.weightValue || attrs?.weightValue || '',
      weightUnit: product?.weightUnit || attrs?.weightUnit || 'kg',
      model: product?.model || attrs?.model || '',
      dimensions: product?.dimensions || attrs?.dimensions || '',
      warranty: product?.warranty || attrs?.warranty || '',
      stock: product?.stock ?? attrs?.stock ?? 0,
      // 🔥 IVA CORREGIDO
      ivaType: productIvaType,
      ivaRate: productIvaRate,
      // ✅✅✅ CAMPOS DE OFERTA - AGREGADOS ✅✅✅
  // ✅✅✅ CAMPOS DE OFERTA - AGREGADOS ✅✅✅
  onSale: product?.onSale || false,
  discountPercentage: Number(product?.discountPercentage || 0),
  discountStartDate: product?.discountStartDate || undefined,
  discountEndDate: product?.discountEndDate || undefined,
      attributes: {
        ...attrs,
        brand: product?.brand || attrs?.brand || '',
        description: product?.description || attrs?.description || '',
        features: Array.isArray(product?.features) ? product.features : (Array.isArray(attrs?.features) ? attrs.features : []),
        images: finalImages,
        mediaUrls: finalImages,
        existingImages: finalImages,
        weight: product?.weight || attrs?.weight || '',
        weightValue: product?.weightValue || attrs?.weightValue || '',
        weightUnit: product?.weightUnit || attrs?.weightUnit || 'kg',
        model: product?.model || attrs?.model || '',
        dimensions: product?.dimensions || attrs?.dimensions || '',
        warranty: product?.warranty || attrs?.warranty || '',
        stock: product?.stock ?? attrs?.stock ?? 0,
        usdReference: finalUsd,
        // 🔥 IVA EN ATTRIBUTES TAMBIÉN
        ivaType: productIvaType,
        ivaRate: productIvaRate,
        prices: {
          VES: finalVes,
          USD: finalUsd,
          EUR: finalEur,
          CRYPTO: finalCrypto
        },
        // ✅✅✅ CAMPOS DE OFERTA EN ATTRIBUTES - AGREGADOS ✅✅✅
  // ✅✅✅ CAMPOS DE OFERTA EN ATTRIBUTES - AGREGADOS ✅✅✅
  onSale: product?.onSale || false,
  discountPercentage: Number(product?.discountPercentage || 0),
  discountStartDate: product?.discountStartDate || undefined,
  discountEndDate: product?.discountEndDate || undefined,
      }
    });
// 🔥 ACTUALIZAR IMÁGENES EN LA UI - REEMPLAZAR COMPLETAMENTE
if (finalImages.length > 0) {
  // Limpiar imágenes anteriores (evitar memory leaks)
  setImages(prev => {
    prev.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    return [];
  });

  // Crear nuevas imágenes desde las finales
  const formattedImages = finalImages
    .filter(Boolean)
    .map((url: string, idx: number) => ({
      id: `server-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      name: url.split('/').pop() || `Imagen ${idx + 1}`,
url: toAbsoluteApiUrl(url),
      progress: 100,
      status: 'success' as const,
      fileObject: undefined,
    }));

  setImages(formattedImages);
  
  // Actualizar newItem con las imágenes limpias
  setNewItem((prev: any) => ({
    ...prev,
    existingImages: finalImages,
    mediaUrls: finalImages,
    images: finalImages,
  }));
} else {
  // Si no hay imágenes, limpiar todo
  setImages(prev => {
    prev.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    return [];
  });
  setNewItem((prev: any) => ({
    ...prev,
    existingImages: [],
    mediaUrls: [],
    images: [],
  }));
}

        }, [product, exchangeRates, rates]);

        // ✅ CORREGIDO: Actualizar estado padre con imágenes
        // 🔥 FIX: Las blob URLs NO van a existingImages/mediaUrls/images.
        // Solo los files reales van a `files`. Las URLs de servidor van a existingImages.
        const updateParentState = useCallback((currentImages: UploadingFile[]) => {
          const validSuccessFiles = currentImages.filter(i => i.status === 'success');
          const physicalFiles = validSuccessFiles.filter(i => i.fileObject).map(i => i.fileObject);
          
          const serverUrls = validSuccessFiles
            .filter(i => !i.fileObject)
            .map(i => i.url)
            .filter(Boolean)
            .filter(url => !url.startsWith('blob:'))
            .filter(url => !url.startsWith('data:'));

          const uniqueServerUrls = Array.from(new Set(serverUrls));
          
          setNewItem((prev: any) => ({ 
            ...prev, 
            files: physicalFiles,
            existingImages: uniqueServerUrls,
            mediaUrls: uniqueServerUrls,
            images: uniqueServerUrls,
            coverImage: uniqueServerUrls.length > 0 ? uniqueServerUrls[0] : prev?.coverImage || ''
          }));
        }, []);

        // ✅ CORREGIDO: Procesar archivos
        const processFiles = useCallback((fileList: FileList | File[]) => {
          const rawFiles = Array.from(fileList);
          const availableSlots = 7 - images.length;

          if (availableSlots <= 0) { 
            showToast({
              variant: 'warning',
              message: 'Has alcanzado el límite máximo de 7 imágenes permitidas.',
            });
            return; 
          }

          const filesToProcess = rawFiles.slice(0, availableSlots);

          const existingUrls = new Set(images.map(img => img.url));

          const newUploadingFiles: UploadingFile[] = filesToProcess
            .map(file => {
              const url = URL.createObjectURL(file);
              if (existingUrls.has(url)) {
                return null;
              }
              
              const MAX_SIZE_BYTES = 5 * 1024 * 1024;
              const isOverSize = file.size > MAX_SIZE_BYTES; 

              return {
                id: Math.random().toString(36).substring(2, 9),
                name: file.name,
                url: url,
                progress: 100,
                status: isOverSize ? 'error' : 'success',
                errorMessage: isOverSize ? `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(2)}MB y supera el límite de 5MB.` : undefined,
                fileObject: isOverSize ? undefined : file
              };
            })
            .filter((img): img is UploadingFile => img !== null);

          if (newUploadingFiles.length === 0) {
            showToast({
              variant: 'warning',
              message: 'Estas imágenes ya están cargadas o son duplicados.',
            });
            return;
          }
          
          const updated = [...images, ...newUploadingFiles];
          setImages(updated);
          updateParentState(updated);
        }, [images, updateParentState, showToast]);

        const removeImage = useCallback((id: string) => {
          const next = images.filter(i => i.id !== id);
          setImages(next);
          updateParentState(next);
        }, [images, updateParentState]);

        const generateNewSku = useCallback(() => {
          const category = newItem?.category || '';
          const productName = newItem?.name || '';
          const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'CAT';
          const namePrefix = productName ? productName.substring(0, 3).toUpperCase() : 'ITM';
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const newSku = `${catPrefix}-${namePrefix}-${randomNum}`;
          
          setNewItem((prev: any) => ({ 
            ...(prev || {}), 
            itemId: newSku, 
            sku: newSku, 
            code: newSku, 
            manualSku: true 
          }));
        }, [newItem?.category, newItem?.name]);

        const handleStockChange = (delta: number) => {
          const currentStock = Number(newItem?.stock ?? 0);
          const nextVal = Math.max(0, currentStock + delta);
          setNewItem((prev: any) => ({ ...(prev || {}), stock: nextVal }));
        };

        // 🔥 CORREGIDO: handlePriceChange usando tasas del contexto
        const handlePriceChange = (currency: string, value: string) => {
          const numValue = value === '' ? 0 : parseFloat(value) || 0;
          const roundedValue = roundPrice(numValue);
          
          const rateUSD = getRateUSD();
          const rateEUR = getRateEUR();

          if (rateUSD === 0) {
            showToast({
              variant: 'warning',
              message: '⚠️ No hay tasa USD disponible. No se pueden calcular precios.',
            });
            return;
          }

          setNewItem((prev: any) => {
            const currentPrices = prev?.prices || { VES: 0, USD: 0, EUR: 0, CRYPTO: 0 };
            let updatedPrices = { ...currentPrices };

            if (currency === 'VES') {
              updatedPrices.VES = roundedValue;
              updatedPrices.USD = roundPrice(roundedValue / rateUSD);
              updatedPrices.EUR = rateEUR > 0 ? roundPrice(updatedPrices.USD * (rateUSD / rateEUR)) : 0;
              updatedPrices.CRYPTO = updatedPrices.USD;
            } 
            else if (currency === 'USD') {
              updatedPrices.USD = roundedValue;
              updatedPrices.VES = roundPrice(roundedValue * rateUSD);
              updatedPrices.EUR = rateEUR > 0 ? roundPrice(roundedValue * (rateUSD / rateEUR)) : 0;
              updatedPrices.CRYPTO = roundedValue;
            }
            else if (currency === 'EUR') {
              updatedPrices.EUR = roundedValue;
              if (rateEUR > 0) {
                const usdValue = roundPrice(roundedValue * (rateEUR / rateUSD));
                updatedPrices.USD = usdValue;
                updatedPrices.VES = roundPrice(usdValue * rateUSD);
                updatedPrices.CRYPTO = usdValue;
              }
            }
            else if (currency === 'CRYPTO') {
              updatedPrices.CRYPTO = roundedValue;
              updatedPrices.USD = roundedValue;
              updatedPrices.VES = roundPrice(roundedValue * rateUSD);
              updatedPrices.EUR = rateEUR > 0 ? roundPrice(roundedValue * (rateUSD / rateEUR)) : 0;
            }

            return {
              ...prev,
              price: updatedPrices.VES,
              usdReference: updatedPrices.USD,
              prices: updatedPrices
            };
          });
        };

        // toggleTag
        const toggleTag = (catKey: string, tag: string) => {
          setNewItem((prev: any) => {
            const currentFeatures = prev?.features || [];
            const catConfig = PRODUCT_TAG_CATEGORIES[catKey as keyof typeof PRODUCT_TAG_CATEGORIES];
            if (!catConfig) return prev;
            
            const catTags = catConfig.tags;
            const isMulti = catConfig.multi;
            
            let nextFeatures = [...currentFeatures];

            if (!isMulti) {
              nextFeatures = nextFeatures.filter(t => !catTags.includes(t));
              nextFeatures.push(tag);
            } else {
              nextFeatures = nextFeatures.includes(tag) 
                ? nextFeatures.filter(t => t !== tag) 
                : [...nextFeatures, tag];
            }

            return { ...prev, features: nextFeatures };
          });
        };

        // Seleccionar marca
        const selectBrand = (bName: string) => {
          setShowBrandMenu(false);
          setNewItem((prev: any) => ({ ...(prev || {}), brand: bName }));
        };

        const handleBrandKeyDown = async (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (brandInput.trim() && !exactBrandMatchExists) {
              const brandExists = dbBrands.some(b => typeof b === 'string' ? b === brandInput.trim() : b.name === brandInput.trim());
              if (!brandExists) {
                setCustomBrands((prev) => [...prev, brandInput.trim()]);
              }
              selectBrand(brandInput.trim());
            }
          }
        };

        // Autoajuste del textarea
        useEffect(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
          }
        }, [newItem?.description]);

        if (!isOpen) return null;

        const currentStock = Number(newItem?.stock ?? 0);

        return createPortal(
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ backgroundColor: overlayBg }}
            onClick={onClose}
          >
            <div 
              className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ 
                backgroundColor: cardBg,
                border: `1px solid ${borderDynamic}`,
                color: textColor
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="px-6 py-4 border-b flex justify-between items-center shrink-0"
                style={{ borderColor: borderDynamic }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Editar Artículo</span>
                    <h3 className="text-sm sm:text-base font-bold" style={{ color: textColor }}>
                      {newItem?.name || 'Producto'}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95`}
                  style={dynamicSubCardStyle}
                >
                  ✕
                </button>
              </div>

              {/* Cuerpo con Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Nombre */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                    Título / Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Zapatillas Deportivas Pro"
                    value={newItem?.name || ''}
                    onChange={(e) => setNewItem((prev: any) => ({ ...(prev || {}), name: e.target.value }))}
                    className={inputClass}
                    style={{ borderColor: borderDynamic, color: textColor }}
                  />
                </div>
                {/* 🔥 FASE K: Canales de Venta */}

                <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                    Canales de Venta
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewItem((prev: any) => ({
                          ...(prev || {}),
                          availableKiosk: !(prev?.availableKiosk ?? true),
                        }));
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        (newItem?.availableKiosk ?? true)
                          ? 'border-2 shadow-md'
                          : 'opacity-60 hover:opacity-80'
                      }`}
                      style={{
                        borderColor: (newItem?.availableKiosk ?? true) ? primary : borderDynamic,
                        backgroundColor: (newItem?.availableKiosk ?? true) ? `${primary}15` : 'transparent',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            borderColor: (newItem?.availableKiosk ?? true) ? primary : textColor,
                            backgroundColor: (newItem?.availableKiosk ?? true) ? primary : 'transparent',
                          }}
                        >
                          {(newItem?.availableKiosk ?? true) && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="text-xs font-bold" style={{ color: (newItem?.availableKiosk ?? true) ? primary : textColor }}>
                            Disponible en kiosco
                          </div>
                          <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                            Visible en el POS presencial
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewItem((prev: any) => ({
                          ...(prev || {}),
                          availableOnline: !(prev?.availableOnline ?? true),
                        }));
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        (newItem?.availableOnline ?? true)
                          ? 'border-2 shadow-md'
                          : 'opacity-60 hover:opacity-80'
                      }`}
                      style={{
                        borderColor: (newItem?.availableOnline ?? true) ? primary : borderDynamic,
                        backgroundColor: (newItem?.availableOnline ?? true) ? `${primary}15` : 'transparent',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            borderColor: (newItem?.availableOnline ?? true) ? primary : textColor,
                            backgroundColor: (newItem?.availableOnline ?? true) ? primary : 'transparent',
                          }}
                        >
                          {(newItem?.availableOnline ?? true) && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="text-xs font-bold" style={{ color: (newItem?.availableOnline ?? true) ? primary : textColor }}>
                            Disponible en tienda online
                          </div>
                          <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                            Visible en el catálogo web
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Categoría y Marca */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoría */}
                  <div className="space-y-1.5" ref={dropdownRef}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                      Categoría * <span className="text-[9px] font-normal opacity-60">({filteredCategories.length} disponibles)</span>
                    </label>
                    
                    <div className="relative">
                      <div 
                        className="w-full rounded-xl border text-xs outline-none transition cursor-text flex items-center justify-between px-3.5 py-2.5 bg-transparent"
                        style={{ borderColor: borderDynamic, color: textColor }}
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      >
                        <span className={newItem?.category ? '' : 'opacity-50'}>
                          {newItem?.category ? formatFriendlyText(newItem.category) : 'Buscar o seleccionar categoría...'}
                        </span>
                        <ChevronIcon color={textColor} open={isCategoryDropdownOpen} />
                      </div>

                      {isCategoryDropdownOpen && (
                        <div 
                          className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl max-h-64 overflow-hidden flex flex-col"
                          style={{ 
                            backgroundColor: dropdownBg,
                            borderColor: dropdownBorder,
                          }}
                        >
                          <div className="p-2 border-b" style={{ borderColor: dropdownBorder }}>
                            <div className="relative flex items-center gap-2">
                              <SearchIcon color={mutedText} />
                              <input
                                type="text"
                                placeholder="Filtrar categorías..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg text-xs outline-none border-none bg-transparent"
                                style={{ 
                                  color: textColor,
                                  backgroundColor: 'transparent',
                                  boxShadow: 'none'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="overflow-y-auto flex-1">
                            {filteredCategories.length === 0 ? (
                              <div className="px-3.5 py-4 text-center text-xs opacity-60" style={{ color: textColor }}>
                                No se encontraron categorías
                              </div>
                            ) : (
                              filteredCategories.map((cat) => {
                                const isSelected = newItem?.category === cat;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setNewItem((prev: any) => ({ ...(prev || {}), category: cat }));
                                      setCategorySearch('');
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 text-xs text-left transition flex items-center justify-between hover:opacity-80`}
                                    style={{ 
                                      color: isSelected ? primary : textColor,
                                      backgroundColor: isSelected ? dropdownItemSelected : 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = dropdownItemHover;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <span>{formatFriendlyText(cat)}</span>
                                    {isSelected && <CheckIcon color={primary} />}
                                  </button>
                                );
                              })
                            )}
                          </div>

                          <div className="px-3.5 py-1.5 border-t text-[9px] opacity-50" style={{ 
                            borderColor: dropdownBorder,
                            color: textColor 
                          }}>
                            {filteredCategories.length} categorías
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marca */}
                  <div className="space-y-1.5 relative" ref={brandContainerRef}>
                    <div className="flex items-center justify-between h-5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                        Marca Global
                      </label>
                      {brandInput ? (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          exactBrandMatchExists ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {exactBrandMatchExists ? '✓ Global' : 'Presiona Enter'}
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-50">Selecciona o escribe</span>
                      )}
                    </div>
                    
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder={brandsLoading ? "Cargando marcas..." : "Selecciona o escribe marca..."}
                        value={brandInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShowBrandMenu(true);
                          setNewItem((prev: any) => ({ ...(prev || {}), brand: val }));
                        }}
                        onFocus={() => setShowBrandMenu(true)}
                        onKeyDown={handleBrandKeyDown}
                        className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all bg-transparent"
                        style={{ borderColor: borderDynamic, color: textColor }}
                        disabled={brandsLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowBrandMenu(!showBrandMenu)}
                        className="absolute right-3 p-1.5 opacity-60 hover:opacity-100 transition cursor-pointer"
                        style={{ color: textColor }}
                      >
                        <span className="text-xs">▼</span>
                      </button>
                    </div>

                    {showBrandMenu && (
                      <div 
                        className="absolute left-0 right-0 top-full mt-1.5 border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
                        style={{ 
                          backgroundColor: dropdownBg,
                          borderColor: dropdownBorder,
                          color: textColor
                        }}
                      >
                        <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-60 bg-black/5 dark:bg-black/20 sticky top-0 backdrop-blur-md flex justify-between items-center z-10" style={{ color: textColor }}>
                          <span>{brandsLoading ? 'Cargando...' : 'Catálogo de marcas'}</span>
                          <span className="text-[9px] font-mono opacity-80">{filteredBrands.length} disp.</span>
                        </div>

                        {brandsLoading ? (
                          <div className="px-4 py-3 text-xs text-center opacity-60" style={{ color: textColor }}>
                            Cargando marcas...
                          </div>
                        ) : filteredBrands.length > 0 ? (
                          filteredBrands.map((bName, idx) => {
                            const isSelected = brandInput.toLowerCase() === bName.toLowerCase();
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectBrand(bName)}
                                className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-black/10 dark:bg-white/15 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                style={{ color: textColor }}
                              >
                                <span>{bName}</span>
                                {isSelected && <span className="text-[10px] font-mono opacity-80">✓ Activa</span>}
                              </button>
                            );
                          })
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (brandInput.trim()) {
                                setCustomBrands((prev) => [...prev, brandInput.trim()]);
                                selectBrand(brandInput.trim());
                              }
                            }}
                            className="w-full text-left px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                            style={{ color: textColor }}
                          >
                            <span>Crear marca: <strong className="underline">{brandInput}</strong></span>
                            <span className="text-[10px] opacity-70">↵ Enter / Clic</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modelo */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                    Modelo / Referencia <span className="text-[9px] opacity-65 lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Galaxy S24, Air Force 1, etc..."
                    value={newItem?.model || newItem?.attributes?.model || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewItem((prev: any) => ({ 
                        ...(prev || {}), 
                        model: val,
                        attributes: { ...(prev?.attributes || {}), model: val }
                      }));
                    }}
                    className={inputClass}
                    style={{ borderColor: borderDynamic, color: textColor }}
                  />
                </div>

                {/* Precios */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                      Precios por Moneda
                    </label>
                    {ratesLoading && (
                      <span className="text-[9px] text-blue-400 animate-pulse">Cargando tasas...</span>
                    )}
                    {!ratesLoading && exchangeRates.USD === 0 && (
                      <span className="text-[9px] text-yellow-500">⚠️ Sin tasa disponible</span>
                    )}
                    {!ratesLoading && exchangeRates.USD > 0 && (
                      <span className="text-[9px] opacity-50" style={{ color: textColor }}>
                        USD: {exchangeRates.USD} | EUR: {exchangeRates.EUR}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>VES</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newItem?.prices?.VES ?? ''}
                        onChange={(e) => handlePriceChange('VES', e.target.value)}
                        className={inputClass}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>USD</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newItem?.prices?.USD ?? ''}
                        onChange={(e) => handlePriceChange('USD', e.target.value)}
                        className={inputClass}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>EUR</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newItem?.prices?.EUR ?? ''}
                        onChange={(e) => handlePriceChange('EUR', e.target.value)}
                        className={inputClass}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>USDT</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newItem?.prices?.CRYPTO ?? ''}
                        onChange={(e) => handlePriceChange('CRYPTO', e.target.value)}
                        className={inputClass}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                    </div>
                  </div>
                </div>

                {/* 🔥 OFERTA / DESCUENTO - SECCIÓN CON ESTÉTICA DISCOUNT SECTION */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: textColor }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                      <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                        Oferta / Descuento
                      </label>
                    </div>
                    {/* Badge minimalista */}
                    {newItem?.onSale === true && (newItem?.discountPercentage || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: textColor, fontSize: '11px' }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" style={{ color: '#f97316' }}>
                          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                          <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                        </svg>
                        {newItem.discountPercentage}% OFF
                      </span>
                    ) : newItem?.onSale === true ? (
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: textColor, fontSize: '11px', opacity: 0.6 }}>
                        Sin descuento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium" style={{ color: textColor, fontSize: '11px', opacity: 0.4 }}>
                        Sin oferta
                      </span>
                    )}
                  </div>

                  {/* Toggle de Oferta */}
                  <div className="flex items-center gap-4 p-3 rounded-xl border bg-transparent" style={{ borderColor: borderDynamic }}>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs font-medium" style={{ color: textColor }}>Activar Oferta</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newState = !newItem?.onSale;
                          setNewItem((prev: any) => ({
                            ...prev,
                            onSale: newState,
                            discountPercentage: newState ? (prev?.discountPercentage || 0) : 0,
                          }));
                        }}
                        className="relative w-12 h-6 rounded-full transition-colors duration-200"
                        style={{
                          backgroundColor: newItem?.onSale ? primary : (isDarkBg ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.5)'),
                        }}
                      >
                        <span 
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-md ${
                            newItem?.onSale ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {newItem?.onSale && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-60" style={{ color: textColor }}>Descuento:</span>
                        <div className="relative flex items-center w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="0"
                            value={newItem?.discountPercentage || 0}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              setNewItem((prev: any) => ({
                                ...prev,
                                discountPercentage: val,
                              }));
                            }}
                            className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent pr-6"
                            style={{ borderColor: borderDynamic, color: textColor }}
                          />
                          <span className="absolute right-2 text-xs font-bold" style={{ color: textColor }}>%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fechas de la oferta (opcional) */}
                  {newItem?.onSale && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowDateRange(!showDateRange)}
                        className="text-[10px] opacity-60 hover:opacity-100 transition flex items-center gap-1.5"
                        style={{ color: textColor }}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {showDateRange ? 'Ocultar fechas' : 'Programar fechas de oferta'}
                        {showDateRange ? (
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        )}
                      </button>

                      {showDateRange && (
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-transparent" style={{ borderColor: borderDynamic }}>
                          <div className="space-y-1">
                            <label className="text-[9px] opacity-60 block" style={{ color: textColor }}>
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              value={newItem?.discountStartDate?.split('T')[0] || ''}
                              onChange={(e) => {
                                setNewItem((prev: any) => ({
                                  ...prev,
                                  discountStartDate: e.target.value || null,
                                }));
                              }}
                              className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent"
                              style={{ borderColor: borderDynamic, color: textColor }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] opacity-60 block" style={{ color: textColor }}>
                              Fecha de fin
                            </label>
                            <input
                              type="date"
                              value={newItem?.discountEndDate?.split('T')[0] || ''}
                              onChange={(e) => {
                                setNewItem((prev: any) => ({
                                  ...prev,
                                  discountEndDate: e.target.value || null,
                                }));
                              }}
                              className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent"
                              style={{ borderColor: borderDynamic, color: textColor }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vista previa del precio con descuento - SOLO cuando hay descuento > 0 */}
                  {newItem?.onSale === true && (newItem?.discountPercentage || 0) > 0 && newItem?.prices?.VES > 0 && (
                    <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: borderDynamic }}>
                      {/* Título */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5" style={{ color: textColor }}>
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                          </svg>
                          Vista previa del precio con descuento
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: textColor, fontSize: '11px' }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" style={{ color: '#f97316' }}>
                            <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                            <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                          </svg>
                          {newItem.discountPercentage}% OFF
                        </span>
                      </div>

                      {/* Precio original vs con descuento */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="opacity-60" style={{ color: textColor }}>Precio original:</span>
                          <span className="line-through opacity-50" style={{ color: textColor }}>
                            Bs. {newItem.prices.VES.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span style={{ color: textColor }}>Precio con descuento:</span>
                          <span style={{ color: primary }}>
                            Bs. {(newItem.prices.VES * (1 - newItem.discountPercentage / 100)).toFixed(2)}
                          </span>
                        </div>

                        {newItem.prices.USD > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="opacity-60" style={{ color: textColor }}>En USD:</span>
                            <span className="font-medium" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                              ${(newItem.prices.USD * (1 - newItem.discountPercentage / 100)).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: borderDynamic }}>
                          <span className="opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z" />
                            </svg>
                            Ahorro:
                          </span>
                          <span className="font-bold" style={{ color: primary }}>
                            Bs. {(newItem.prices.VES * newItem.discountPercentage / 100).toFixed(2)}
                            {newItem.prices.USD > 0 && ` ($${(newItem.prices.USD * newItem.discountPercentage / 100).toFixed(2)})`}
                          </span>
                        </div>
                      </div>

                      {/* Desglose con IVA */}
                      {(() => {
                        const ivaType = newItem?.ivaType || 'excluded';
                        const ivaRate = Number(newItem?.ivaRate || 16);
                        const discountedVES = newItem.prices.VES * (1 - newItem.discountPercentage / 100);
                        const discountedUSD = newItem.prices.USD * (1 - newItem.discountPercentage / 100);
                        let ivaAmountVES = 0;
                        let priceWithIVAVES = discountedVES;
                        let ivaAmountUSD = 0;
                        let priceWithIVAUSD = discountedUSD;
                        
                        if (ivaType === 'excluded') {
                          ivaAmountVES = discountedVES * (ivaRate / 100);
                          priceWithIVAVES = discountedVES + ivaAmountVES;
                          ivaAmountUSD = discountedUSD * (ivaRate / 100);
                          priceWithIVAUSD = discountedUSD + ivaAmountUSD;
                        } else if (ivaType === 'included') {
                          ivaAmountVES = discountedVES - (discountedVES / (1 + ivaRate / 100));
                          priceWithIVAVES = discountedVES;
                          ivaAmountUSD = discountedUSD - (discountedUSD / (1 + ivaRate / 100));
                          priceWithIVAUSD = discountedUSD;
                        }
                        
                        if (ivaRate > 0) {
                          return (
                            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: borderDynamic }}>
                              <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                                <span>IVA ({ivaRate}%) aplicado al precio con descuento:</span>
                                <span className="font-medium" style={{ 
                                  color: ivaType === 'included' ? (isDarkBg ? '#4ade80' : '#15803d') : (isDarkBg ? '#86efac' : '#166534')
                                }}>
                                  Bs. {ivaAmountVES.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
                                <span style={{ color: textColor }}>Precio final (con IVA):</span>
                                <span style={{ color: primary }}>
                                  Bs. {priceWithIVAVES.toFixed(2)}
                                </span>
                              </div>
                              {ivaAmountUSD > 0 && (
                                <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                                  <span>IVA en USD:</span>
                                  <span className="font-medium" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                    ${ivaAmountUSD.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {priceWithIVAUSD > 0 && (
                                <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                                  <span>Total en USD:</span>
                                  <span className="font-medium" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                    ${priceWithIVAUSD.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Badge de descuento minimalista */}
                      {newItem.discountPercentage > 0 && (
                        <div className="flex items-center justify-center pt-1">
                          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: textColor, fontSize: '11px' }}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" style={{ color: '#f97316' }}>
                              <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                              <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                            </svg>
                            {newItem.discountPercentage}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensaje cuando no hay precio */}
                  {newItem?.onSale && !newItem?.prices?.VES && (
                    <div 
                      className="p-3 rounded-xl border flex items-center gap-2"
                      style={{
                        borderColor: isDarkBg ? 'rgba(251,191,36,0.3)' : 'rgba(245,158,11,0.25)',
                        backgroundColor: isDarkBg ? 'rgba(251,191,36,0.08)' : 'rgba(245,158,11,0.04)',
                      }}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isDarkBg ? '#fbbf24' : '#92400e' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <span className="text-xs" style={{ color: isDarkBg ? '#fbbf24' : '#92400e' }}>
                        Ingresa un precio en la sección de precios para ver el descuento aplicado.
                      </span>
                    </div>
                  )}
                </div>

                {/* 🔥 IVA - CORREGIDO */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                      Impuesto (IVA) - Tasa {ivaRate}% (Definida por Ley)
                    </label>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${
                      ivaType === 'exempt' 
                        ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' 
                        : ivaType === 'included' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {ivaType === 'exempt' 
                        ? 'Exento de IVA' 
                        : ivaType === 'included' 
                          ? `IVA Incluido (${ivaRate}%)` 
                          : `IVA No Incluido (${ivaRate}%)`}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>
                        Tipo de IVA
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'included', label: 'IVA Incluido', desc: 'El precio ya incluye IVA' },
                          { value: 'excluded', label: 'IVA No incluido', desc: 'Se suma IVA al precio' },
                          { value: 'exempt', label: 'Exento de IVA', desc: 'Producto sin IVA' }
                        ].map((option) => {
                          const isSelected = ivaType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setNewItem((prev: any) => ({
                                  ...prev,
                                  ivaType: option.value,
                                }));
                              }}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected 
                                  ? 'border-2 shadow-md' 
                                  : 'opacity-60 hover:opacity-80'
                              }`}
                              style={{
                                borderColor: isSelected ? primary : borderDynamic,
                                backgroundColor: isSelected ? `${primary}15` : 'transparent'
                              }}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold" style={{ color: isSelected ? primary : textColor }}>
                                  {option.label}
                                </div>
                                <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                                  {option.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-transparent flex items-center justify-between" style={{ borderColor: borderDynamic }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: textColor }}>Tasa de IVA aplicada:</span>
                      <span className="text-xs font-bold" style={{ color: priceColor }}>{ivaRate}%</span>
                    </div>
                    <span className="text-[9px] opacity-50" style={{ color: textColor }}>
                      Tasa obtenida del BCV (no modificable)
                    </span>
                  </div>

                  {ivaType !== 'exempt' && newItem?.prices?.USD > 0 && (
                    <div className="p-3 rounded-xl border bg-transparent" style={{ borderColor: borderDynamic }}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="opacity-70" style={{ color: textColor }}>Precio base (sin IVA):</span>
                        <span className="font-medium" style={{ color: textColor }}>${newItem.prices.USD.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="opacity-70" style={{ color: textColor }}>IVA ({ivaRate}%):</span>
                        <span className="font-medium" style={{ color: textColor }}>
                          ${((newItem.prices.USD * ivaRate) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
                        <span style={{ color: textColor }}>Precio con IVA:</span>
                        <span style={{ color: priceColor }}>
                          ${(newItem.prices.USD + (newItem.prices.USD * ivaRate) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🔥 COSTOS Y MÁRGENES - NUEVA SECCIÓN */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: textColor }}>
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                        Costos y Márgenes
                      </label>
                    </div>
                    {(() => {
                      const cost = Number(newItem?.cost ?? 0);
                      const priceUsd = Number(newItem?.prices?.USD ?? 0);
                      if (cost <= 0 || priceUsd <= 0) return null;
                      const margin = ((priceUsd - cost) / priceUsd) * 100;
                      const marginColor = margin >= 40
                        ? (isDarkBg ? '#4ade80' : '#15803d')
                        : margin >= 15
                        ? (isDarkBg ? '#fbbf24' : '#d97706')
                        : (isDarkBg ? '#f87171' : '#dc2626');
                      return (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: marginColor,
                            borderColor: `${marginColor}40`,
                            backgroundColor: `${marginColor}10`,
                          }}
                        >
                          Margen: {margin.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Costo unitario */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold opacity-70" style={{ color: textColor }}>
                        Costo unitario (USD)
                        <span className="text-[9px] opacity-50 ml-1">(opcional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold opacity-60" style={{ color: textColor }}>
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newItem?.cost ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                            setNewItem((prev: any) => ({ ...(prev || {}), cost: val }));
                          }}
                          className={`${inputClass} pl-7`}
                          style={{ borderColor: borderDynamic, color: textColor }}
                        />
                      </div>
                    </div>

                    {/* Stock mínimo */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold opacity-70" style={{ color: textColor }}>
                        Stock mínimo
                        <span className="text-[9px] opacity-50 ml-1">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="2"
                        value={newItem?.minStock ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                          setNewItem((prev: any) => ({ ...(prev || {}), minStock: val }));
                        }}
                        className={inputClass}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                    </div>
                  </div>

                  {/* Vista previa del margen */}
                  {(() => {
                    const cost = Number(newItem?.cost ?? 0);
                    const priceUsd = Number(newItem?.prices?.USD ?? 0);
                    if (cost <= 0 || priceUsd <= 0) return null;
                    const profit = priceUsd - cost;
                    const margin = (profit / priceUsd) * 100;
                    const marginColor = margin >= 40
                      ? (isDarkBg ? '#4ade80' : '#15803d')
                      : margin >= 15
                      ? (isDarkBg ? '#fbbf24' : '#d97706')
                      : (isDarkBg ? '#f87171' : '#dc2626');
                    return (
                      <div
                        className="p-3 rounded-xl border space-y-1"
                        style={{
                          borderColor: borderDynamic,
                          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="opacity-60" style={{ color: textColor }}>Precio venta:</span>
                          <span className="font-semibold" style={{ color: textColor }}>${priceUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="opacity-60" style={{ color: textColor }}>Costo:</span>
                          <span className="font-semibold" style={{ color: textColor }}>${cost.toFixed(2)}</span>
                        </div>
                        <div
                          className="flex items-center justify-between text-xs font-bold pt-1 border-t"
                          style={{ borderColor: borderDynamic }}
                        >
                          <span style={{ color: textColor }}>Ganancia:</span>
                          <span style={{ color: marginColor }}>
                            ${profit.toFixed(2)} ({margin.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Stock y Código */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                        Stock *
                      </label>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${currentStock > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {currentStock > 5 ? 'Stock óptimo' : 'Stock bajo'}
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        required
                        value={newItem?.stock ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                          setNewItem((prev: any) => ({ ...(prev || {}), stock: val }));
                        }}
                        className={`${inputClass} pr-20`}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                      <div className="absolute right-2 flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${borderDynamic}` }}>
                        <button
                          type="button"
                          onClick={() => handleStockChange(-1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-500/20 text-xs transition cursor-pointer"
                          style={{ color: textColor }}
                        >
                          -
                        </button>
                        <div className="w-[1px] h-3" style={{ backgroundColor: borderDynamic }} />
                        <button
                          type="button"
                          onClick={() => handleStockChange(1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-500/20 text-xs transition cursor-pointer"
                          style={{ color: textColor }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                      ID / Código
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={newItem?.itemId || newItem?.sku || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewItem((prev: any) => ({ 
                            ...(prev || {}), 
                            itemId: val, 
                            sku: val, 
                            code: val, 
                            manualSku: true 
                          }));
                        }}
                        className={`${inputClass} font-mono pr-10`}
                        style={{ borderColor: borderDynamic, color: textColor }}
                      />
                      <button
                        type="button"
                        onClick={generateNewSku}
                        title="Generar código automático"
                        className="absolute right-3 p-1 rounded-lg transition text-xs cursor-pointer flex items-center"
                        style={{ color: primary, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                      >
                        <span className="text-sm font-bold">↻</span>
                      </button>
                    </div>
                  </div>
                </div>


{/* ============================================================
    ATRIBUTOS AVANZADOS - PESO, DIMENSIONES, MARCA, MODELO, GARANTÍA
    ============================================================ */}
<AdvancedAttributesSection
  newItem={newItem}
  setNewItem={setNewItem}
  existingItems={existingItems}
  textColor={textColor}
  inputBgClass={`${isDarkBg ? 'bg-zinc-800/30' : 'bg-white/30'}`}
  primary={primary}
  tenantId={tenantId}
  isDarkBg={isDarkBg}
  secondary={secondary || cardBg}
  style={{
    borderColor: borderDynamic,
    backgroundColor: 'transparent',
  }}
/>
                
{/* ✅ MÚLTIPLES COLORES - CON ACORDEÓN (CONTRAÍDO POR DEFECTO) */}
<div className="space-y-2.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
  {/* HEADER DEL ACORDEÓN */}
  <button
    type="button"
    onClick={() => setShowCustomColorInput(!showCustomColorInput)}
    className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
  >
    <div className="flex items-center gap-3">
      <label className="text-[11px] font-bold uppercase tracking-wider opacity-80 cursor-pointer" style={{ color: textColor }}>
        Colores del Producto (Opcional)
      </label>
      {/* Mostrar cantidad de colores seleccionados */}
      {Array.isArray(newItem?.colors) && newItem.colors.length > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ 
          backgroundColor: `${primary}20`,
          color: primary 
        }}>
          {newItem.colors.length} {newItem.colors.length === 1 ? 'color' : 'colores'}
        </span>
      )}
    </div>
    <ChevronDown 
      className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${
        showCustomColorInput ? 'rotate-180' : ''
      }`}
      style={{ color: textColor }}
    />
  </button>

  {/* CONTENIDO DEL ACORDEÓN - SOLO SE EXPANDE CUANDO showCustomColorInput ES TRUE */}
  {showCustomColorInput && (
    <div className="pt-3 space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            // Toggle entre presets y custom
            setShowCustomColorInput(false);
          }}
          className="text-[10px] underline opacity-60 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
          style={{ color: primary }}
        >
          Usar presets
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5 items-center">
        {PRESET_COLORS.map((col) => {
          const currentColors = Array.isArray(newItem?.colors) 
            ? newItem.colors 
            : (newItem?.color ? [newItem.color] : []);
          const isSelected = currentColors.includes(col.value);
          
          return (
            <button
              key={col.value}
              type="button"
              title={`${col.label}${isSelected ? ' (seleccionado)' : ''}`}
              onClick={() => {
                const currentColorsList = Array.isArray(newItem?.colors) 
                  ? [...newItem.colors] 
                  : (newItem?.color ? [newItem.color] : []);
                
                const index = currentColorsList.indexOf(col.value);
                
                if (index > -1) {
                  currentColorsList.splice(index, 1);
                } else {
                  currentColorsList.push(col.value);
                }
                
                setNewItem((prev: any) => ({ 
                  ...prev, 
                  colors: currentColorsList,
                  color: currentColorsList.length > 0 ? currentColorsList[0] : '',
                }));
              }}
              className={`w-8 h-8 rounded-full transition-all relative cursor-pointer shadow-sm ${
                isSelected 
                  ? 'ring-2 ring-primary scale-110 shadow-md' 
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
              style={{
                background: col.hex,
                borderColor: borderDynamic,
                borderWidth: '1px',
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black mix-blend-difference">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {Array.isArray(newItem?.colors) && newItem.colors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t" style={{ borderColor: borderDynamic }}>
          <span className="text-[9px] uppercase tracking-wider opacity-50 mr-1" style={{ color: textColor }}>
            Seleccionados:
          </span>
          {newItem.colors.map((color: string) => {
            const preset = PRESET_COLORS.find(p => p.value === color);
            return (
              <span
                key={color}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium border"
                style={{
                  borderColor: borderDynamic,
                  color: textColor,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                  style={{
                    background: preset?.hex || '#94a3b8'
                  }}
                />
                {preset ? preset.label : color}
                <button
                  type="button"
                  onClick={() => {
                    const currentColorsList = Array.isArray(newItem?.colors) 
                      ? [...newItem.colors] 
                      : [];
                    const filtered = currentColorsList.filter(c => c !== color);
                    setNewItem((prev: any) => ({ 
                      ...prev, 
                      colors: filtered,
                      color: filtered.length > 0 ? filtered[0] : '',
                    }));
                  }}
                  className="opacity-50 hover:opacity-100 transition cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  )}
</div>



  {/* Descripción */}
  <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: borderDynamic }}>
    <div className="flex justify-between items-center">
      <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
        Descripción
      </label>
      <span className="text-[9px] opacity-40" style={{ color: textColor }}>
        {newItem?.description?.length || 0} caracteres
      </span>
    </div>
    <textarea
      ref={textareaRef}
      rows={5}
      placeholder="Detalles, materiales o especificaciones..."
      value={newItem?.description || ''}
      onChange={(e) => {
        setNewItem((prev: any) => ({ ...prev, description: e.target.value }));
        // Autoajuste de altura
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }}
      className={`${inputClass} resize-none min-h-[120px] overflow-hidden`}
      style={{ 
        borderColor: borderDynamic, 
        color: textColor,
        transition: 'height 0.1s ease'
      }}
    />
  </div>

{/* ETIQUETAS / CARACTERÍSTICAS - CON ACORDEÓN (CONTRAÍDO POR DEFECTO) */}
<div className="space-y-4 pt-3 border-t" style={{ borderColor: borderDynamic }}>
  <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: borderDynamic }}>
    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
      Etiquetas / Características
    </label>
    <span className="text-[9px] opacity-40" style={{ color: textColor }}>
      {newItem?.features?.length || 0} seleccionadas
    </span>
  </div>
  
  <div className="space-y-4">
    {Object.entries(PRODUCT_TAG_CATEGORIES).map(([key, cat]) => {
      // ✅ Estado local para cada sección (contraída por defecto)
      const [isExpanded, setIsExpanded] = useState(false);
      
      return (
        <div key={key} className="space-y-2">
          {/* HEADER DEL ACORDEÓN */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer" style={{ color: textColor }}>
              {cat.label}
              <span className="ml-1.5 text-[9px] opacity-40">
                ({cat.tags.filter(tag => (newItem?.features || []).includes(tag)).length}/{cat.tags.length})
              </span>
            </label>
            <ChevronDown 
              className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 opacity-40 group-hover:opacity-80 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              style={{ color: textColor }}
            />
          </button>

          {/* CONTENIDO DEL ACORDEÓN */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {cat.tags.map((tag: string) => {
                const isSelected = (newItem?.features || []).includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(key, tag)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                      isSelected 
                        ? 'text-white border-transparent shadow-sm' 
                        : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? primary : undefined,
                      borderColor: isSelected ? 'transparent' : borderDynamic
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>


                {/* ✅ CORREGIDO: Galería de Imágenes */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                      Galería Multimedia ({images.length}/7)
                    </label>
                    <span className="text-[10px] opacity-60" style={{ color: textColor }}>Máx. 5MB por archivo</span>
                  </div>
                  
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    multiple 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        processFiles(e.target.files);
                        e.target.value = '';
                      }
                    }} 
                  />
                  
                  <div
                    onClick={() => {
                      if (images.length < 7) fileInputRef.current?.click();
                      else showToast({
                        variant: 'warning',
                        message: 'Has alcanzado el límite máximo de 7 imágenes.',
                      });
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
                    }}
                    className="border border-dashed rounded-2xl p-6 text-center cursor-pointer bg-zinc-500/5 hover:bg-zinc-500/10 transition flex flex-col items-center justify-center gap-2"
                    style={{ borderColor: borderDynamic }}
                  >
                    <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: textColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <p className="text-xs opacity-70" style={{ color: textColor }}>
                      {images.length >= 7 ? 'Límite de 7 imágenes alcanzado' : 'Arrastra imágenes o haz clic para cargar'}
                    </p>
                  </div>

                  {images.length > 0 && (
                    <div className="space-y-2.5">
                      {images.map((img) => (
                        <div 
                          key={img.id} 
                          className="flex items-center gap-3.5 p-3 rounded-xl border text-xs"
                          style={dynamicSubCardStyle}
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            <img 
                              src={img.url} 
                              alt={img.name} 
                              onClick={() => setPreviewImage(img.url)}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-85 transition" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('span');
                                  fallback.className = 'text-[9px] opacity-40 w-full h-full flex items-center justify-center';
                                  fallback.textContent = '📷';
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <span className="truncate font-medium text-xs" style={{ color: textColor }}>{img.name}</span>
                            <span className="text-[9px] opacity-50" style={{ color: textColor }}>Lista</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-2 rounded-lg bg-zinc-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0" style={{ borderColor: borderDynamic }}>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer hover:opacity-80"
                  style={dynamicSubCardStyle}
                >
                  Cancelar
                </button>
      <button 
        type="button" 
        onClick={() => {
          if (onSave) {
            const formData = new FormData();

            const stockVal = Number(newItem?.stock ?? 0);
            const skuVal = newItem?.itemId || newItem?.sku || newItem?.code || '';

            const ivaTypeValue = newItem?.ivaType || 'excluded';
            const ivaRateValue = Number(newItem?.ivaRate ?? 16);

            const vesVal = roundPrice(Number(newItem?.prices?.VES ?? 0));
            const usdVal = roundPrice(Number(newItem?.prices?.USD ?? 0));
            const eurVal = roundPrice(Number(newItem?.prices?.EUR ?? 0));
            const cryptoVal = roundPrice(Number(newItem?.prices?.CRYPTO ?? 0));

            const finalPrices = {
              VES: vesVal,
              USD: usdVal,
              EUR: eurVal,
              CRYPTO: cryptoVal
            };

            // 🔥 DATOS BÁSICOS
            formData.append('name', newItem?.name || '');
            formData.append('description', newItem?.description || '');
            formData.append('category', newItem?.category || '');
            formData.append('brand', newItem?.brand || '');
            formData.append('warranty', newItem?.warranty || '');
            formData.append('itemType', newItem?.itemType || 'product');
            formData.append('status', newItem?.status || 'published');
            formData.append('isActive', String(newItem?.isActive ?? true));
            formData.append('stock', String(stockVal));
            formData.append('itemId', skuVal);

            // 🔥 IVA
            formData.append('ivaType', ivaTypeValue);
            formData.append('ivaRate', String(ivaRateValue));

            // 🔥 FASE K: canales de venta
            formData.append('availableKiosk', String(newItem?.availableKiosk ?? true));
            formData.append('availableOnline', String(newItem?.availableOnline ?? true));

            // 🔥 COSTOS Y MÁRGENES
            if (newItem?.cost !== undefined && newItem?.cost !== '' && newItem?.cost !== null) {
              const costVal = Number(newItem.cost);
              if (Number.isFinite(costVal) && costVal >= 0) {
                formData.append('cost', String(costVal));
              }
            }
            if (newItem?.minStock !== undefined && newItem?.minStock !== '' && newItem?.minStock !== null) {
              const minStockVal = Number(newItem.minStock);
              if (Number.isFinite(minStockVal) && minStockVal >= 0) {
                formData.append('minStock', String(minStockVal));
              }
            }

            // 🔥 OFERTA Y DESCUENTO
    formData.append('onSale', String(newItem?.onSale || false));
    formData.append('discountPercentage', String(newItem?.discountPercentage || 0));

    if (newItem?.discountStartDate) {
      formData.append('discountStartDate', newItem.discountStartDate);
    }
    if (newItem?.discountEndDate) {
      formData.append('discountEndDate', newItem.discountEndDate);
    }

            // 🔥 PRECIOS
            formData.append('price', String(vesVal));
            formData.append('prices', JSON.stringify(finalPrices));

            // 🔥 PESO
            const weightVal = newItem?.weightValue || newItem?.weight || '';
            const weightUnit = newItem?.weightUnit || 'kg';
            if (weightVal) {
              formData.append('weight', `${weightVal} ${weightUnit}`);
              formData.append('weightValue', String(weightVal));
              formData.append('weightUnit', weightUnit);
            }

            if (newItem?.dimensions) formData.append('dimensions', newItem.dimensions);
            if (newItem?.model) formData.append('model', newItem.model);
            if (newItem?.tenantId) formData.append('tenantId', newItem.tenantId);

            // 🔥🔥🔥 IMÁGENES - CORREGIDO (SIN DUPLICADOS) 🔥🔥🔥

            // ✅ PRIMERO: Obtener imágenes de images (estado local)
            // 🔥 FIX: filtrar blob URLs y data URLs. Solo URLs reales de servidor.
            let existingImageUrls = images
              .filter(i => i.status === 'success' && !i.fileObject)
              .map(i => i.url)
              .filter(Boolean)
              .filter(url => !url.startsWith('blob:'))
              .filter(url => !url.startsWith('data:'));

            // ✅ SEGUNDO: Si no hay, tomar de newItem
            if (existingImageUrls.length === 0) {
              const rawUrls = [
                ...(Array.isArray(newItem?.existingImages) ? newItem.existingImages : []),
                ...(Array.isArray(newItem?.mediaUrls) ? newItem.mediaUrls : []),
                ...(Array.isArray(newItem?.images) ? newItem.images : []),
                ...(Array.isArray(newItem?.attributes?.images) ? newItem.attributes.images : []),
                ...(Array.isArray(newItem?.attributes?.mediaUrls) ? newItem.attributes.mediaUrls : []),
                ...(Array.isArray(newItem?.attributes?.existingImages) ? newItem.attributes.existingImages : []),
              ]
                .filter(Boolean)
                .filter((url: any) => typeof url === 'string' && url.trim() !== '');
              
              existingImageUrls = rawUrls;
            }

            // ✅ TERCERO: Si no hay, tomar de product
            if (existingImageUrls.length === 0 && product) {
              const rawUrls = [
                ...(Array.isArray(product?.existingImages) ? product.existingImages : []),
                ...(Array.isArray(product?.mediaUrls) ? product.mediaUrls : []),
                ...(Array.isArray(product?.images) ? product.images : []),
              ]
                .filter(Boolean)
                .filter((url: any) => typeof url === 'string' && url.trim() !== '');
              
              existingImageUrls = rawUrls;
            }

            // ✅ CUARTO: Eliminar duplicados
            existingImageUrls = Array.from(new Set(existingImageUrls));
            // ✅ QUINTO: Limpiar URLs de caracteres extraños (UNA SOLA VEZ)
            // 🔥 FIX: filtrar blob/data URLs (no van al servidor)
            existingImageUrls = existingImageUrls
              .map(url => {
                let clean = url.trim();
                clean = clean.replace(/^["']|["']$/g, '');
                clean = clean.replace(/^\[|\]$/g, '');
                clean = clean.replace(/%22/g, '');
                clean = clean.replace(/[\[\]"]/g, '');
                
                // Si tiene http, extraer solo la ruta
                if (clean.startsWith('http://') || clean.startsWith('https://')) {
                  try {
                    const urlObj = new URL(clean);
                    clean = urlObj.pathname + urlObj.search;
                  } catch {
                    // Mantener como está
                  }
                }
                
                // Asegurar que empiece con /
                if (!clean.startsWith('/') && !clean.startsWith('http')) {
                  clean = '/' + clean;
                }
                return clean;
              })
              .filter(Boolean)
              .filter(url => !url.startsWith('blob:'))
              .filter(url => !url.startsWith('data:'));

            console.log('📸 [ItemEditModal] existingImageUrls FINALES:', existingImageUrls);

            // ✅ Obtener archivos NUEVOS
            const newImageFiles = images
              .filter(i => i.fileObject)
              .map(i => i.fileObject)
              .filter(Boolean);

            // ✅ Enviar imágenes existentes SOLO si hay alguna
            // 🔥 FIX: si está vacío, NO mandar → el backend mantiene las que ya tiene
            if (existingImageUrls.length > 0) {
              formData.append('existingImages', JSON.stringify(existingImageUrls));
              formData.append('coverImage', existingImageUrls[0]);
            }

            // ✅ Enviar archivos nuevos (UNA SOLA VEZ)
            newImageFiles.forEach((file) => {
              if (file) {
                formData.append('files', file);
              }
            });

            // 🔥 ATTRIBUTES - DEFINIDO DENTRO DEL onClick
            const currentAttributes = newItem?.attributes || {};
  const finalAttributes = {
    ...currentAttributes,
    prices: finalPrices,
    usdReference: usdVal,
    stock: stockVal,
    sku: skuVal,
    itemId: skuVal,
    model: newItem?.model || currentAttributes?.model || '',
  // 🔥 COLORES MÚLTIPLES EN ATTRIBUTES
  colors: newItem?.colors || currentAttributes?.colors || [],
  color: newItem?.color || currentAttributes?.color || (Array.isArray(newItem?.colors) && newItem.colors.length > 0 ? newItem.colors[0] : ''),
    weight: newItem?.weight || currentAttributes?.weight || '',
    weightValue: newItem?.weightValue || currentAttributes?.weightValue || '',
    weightUnit: newItem?.weightUnit || currentAttributes?.weightUnit || 'kg',
    dimensions: newItem?.dimensions || currentAttributes?.dimensions || '',
    warranty: newItem?.warranty || currentAttributes?.warranty || '',
    description: newItem?.description || currentAttributes?.description || '',
    ivaType: ivaTypeValue,
    ivaRate: ivaRateValue,
    images: existingImageUrls,
    mediaUrls: existingImageUrls,
    existingImages: existingImageUrls,
    // ✅ NUEVOS CAMPOS DE OFERTA - SIN FECHAS NULL
    onSale: newItem?.onSale || false,
    discountPercentage: Number(newItem?.discountPercentage || 0),
    // ⚠️ SOLO AGREGAR FECHAS SI EXISTEN
    ...(newItem?.discountStartDate && { discountStartDate: newItem.discountStartDate }),
    ...(newItem?.discountEndDate && { discountEndDate: newItem.discountEndDate }),
  };

            formData.append('attributes', JSON.stringify(finalAttributes));

            // 🔥 FEATURES
            if (Array.isArray(newItem?.features)) {
              formData.append('features', JSON.stringify(newItem.features));
            }

            console.log('📦 [ItemEditModal] FormData enviado:', {
              ivaType: formData.get('ivaType'),
              ivaRate: formData.get('ivaRate'),
              price: formData.get('price'),
              existingImages: formData.get('existingImages'),
              filesCount: newImageFiles.length,
            });

            onSave(formData);
          } else {
            onClose?.();
          }
        }} 
        className="px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer hover:opacity-90 active:scale-[0.98] text-white"
        style={{ backgroundColor: primary }}
      >
        Guardar Cambios
      </button>
              </div>
            </div>

            {/* Modal de previsualización de imagen */}
            {previewImage && createPortal(
              <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white text-xs font-bold px-3 py-1 rounded bg-white/20">Cerrar ✕</button>
                  <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" />
                </div>
              </div>,
              document.body
            )}
          </div>,
          document.body
        );
      }