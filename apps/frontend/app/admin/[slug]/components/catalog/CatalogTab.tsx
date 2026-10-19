  'use client';

  import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
  import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  import { useTrash, TrashProvider } from './inventory/TrashProvider';
  import TrashManager from './inventory/TrashManager';

  import BasicInfoSection from './item-form/BasicInfoSection';
  import ServiceInfoSection from './item-form/ServiceInfoSection';
  import InventorySection from './item-form/InventorySection';
  import ServiceInventorySection from './item-form/ServiceInventorySection';
  import AdvancedAttributesSection from './item-form/AdvancedAttributesSection';
  import MediaAndTagsSection from './item-form/MediaAndTagsSection';
  import ServiceAttributesSection from './item-form/ServiceAttributesSection';
  import ServiceMediaAndTagsSection from './item-form/ServiceMediaAndTagsSection';
  import ItemPreviewCard from './item-form/ItemPreviewCard';
  import ServicePreviewCard from './item-form/ServicePreviewCard';
  import ItemInventoryTable from './inventory/ItemInventoryTable';
  import ServiceInventoryTable from './inventory/ServiceInventoryTable';
  import InventoryMetricsBar from './inventory/InventoryMetricsBar';
import InventoryFilterChips, { InventoryFilterKey } from './inventory/InventoryFilterChips';
  import ItemPreviewModal from './inventory/ItemPreviewModal';
  import ServiceDetailModal from '@/app/tienda/[slug]/components/ServiceDetailModal';
  // ✅ NUEVO IMPORT
  import DiscountSection from './item-form/DiscountSection';

  import type { MediaAndTagsSectionRef } from './item-form/MediaAndTagsSection';

  interface CatalogItem {
    id?: string;
    _id?: string;
    itemId?: string;
    sku?: string;
    code?: string;
    codigo?: string;
    inventoryId?: string;
    name?: string;
    description?: string;
    price?: number | string;
    prices?: Record<string, any>;
    stock?: number | string;
    category?: string;
    brand?: string;
    condition?: string;
    warranty?: string;
    weight?: string;
    dimensions?: string;
    durationMinutes?: number | string;
    features?: string[];
    existingImages?: string[];
    mediaUrls?: string[];
    images?: any[];
    files?: File[];
    isActive?: boolean;
    status?: string;
    tenantId?: string;
    itemType?: string;
    includes?: string;
    notIncludes?: string;
    certifications?: string[];
    materials?: string[];
    clientRequirements?: string[];
    cancellationPolicy?: string;
    ivaType?: string;
    ivaRate?: number;
    attributes?: any;
    deletedAt?: string | null;
    availability?: any;
    serviceModality?: string;
    maxCapacity?: number;
    minAdvanceBooking?: number;
    [key: string]: any;
  }

  interface CatalogTabProps {
    newItem: CatalogItem;
    setNewItem: React.Dispatch<React.SetStateAction<CatalogItem>> | ((item: any) => void);
    handleCreateItem: (e: React.FormEvent) => void;
    handleUpdateItem: (id: string, formData: FormData, e: React.FormEvent) => void;
    handleUpdateItemsList?: (updatedItems: CatalogItem[]) => void;
    items: CatalogItem[];
    businessConfig?: any;
    businessType?: string;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    handleRemoveItem: (id: string) => void;
    handleStartEdit?: (item: any) => void;
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 COMPONENTE INTERNO CON EL CONTENIDO - MEMOIZADO
  const CatalogTabContent = React.memo(function CatalogTabContent({
    newItem,
    setNewItem,
    handleCreateItem,
    handleUpdateItem,
    handleUpdateItemsList,
    items,
    businessConfig,
    businessType: businessTypeProp,
    primary,
    secondary,
    textColor,
    isDarkBg,
    handleRemoveItem,
    handleStartEdit,
  }: CatalogTabProps) {
    const [isFormCollapsed, setIsFormCollapsed] = useState(true);
    const [localItems, setLocalItems] = useState<CatalogItem[]>([]);
    const [activeInventoryFilter, setActiveInventoryFilter] = useState<InventoryFilterKey>('all');
    const [previewProduct, setPreviewProduct] = useState<any>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const mediaRef = useRef<MediaAndTagsSectionRef>(null);
    const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const formRef = useRef(newItem);
    
  // ✅ Asegurar que formRef siempre tenga el estado más reciente
  useEffect(() => {
    formRef.current = newItem;
    console.log('🔄 [CatalogTab] formRef actualizado:', {
      onSale: formRef.current?.onSale,
      discountPercentage: formRef.current?.discountPercentage,
    });
  }, [newItem]);
    
    const { addToTrash, trashItems, removeFromTrash, emptyTrash } = useTrash();
    const { registerComponent, unregisterComponent } = useAppRefreshContext();
    const { rates: exchangeRates } = useExchangeRateContext();

    // 🔥 DETECCIÓN MEJORADA DE SERVICIO
    const isServiceBusiness = useMemo(() => {
      if (businessTypeProp === 'service') return true;
      if (businessConfig) {
        if (businessConfig.modelType === 'service') return true;
        if (businessConfig.itemType === 'service') return true;
        if (businessConfig.work_modality === 'service') return true;
        if (businessConfig.workModality === 'service') return true;
        if (businessConfig.businessType === 'service') return true;
        if (businessConfig.attributes?.itemType === 'service') return true;
      }
      if (newItem?.itemType === 'service') return true;
      if (newItem?.attributes?.itemType === 'service') return true;
      if (items && items.length > 0) {
        const firstItem = items[0];
        if (firstItem?.itemType === 'service') return true;
        if (firstItem?.attributes?.itemType === 'service') return true;
      }
      return false;
    }, [businessTypeProp, businessConfig, newItem, items]);

    const isEditing = useMemo(() => 
      !!(newItem.id || newItem._id),
      [newItem.id, newItem._id]
    );

    const borderDynamic = useMemo(() => 
      isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      [isDarkBg]
    );

    const inputBgClass = useMemo(() => 
      `w-full border rounded-xl px-3.5 py-3 text-xs outline-none bg-transparent`,
      []
    );

    const inputStyle = useMemo(() => ({ 
      borderColor: borderDynamic, 
      color: textColor 
    }), [borderDynamic, textColor]);

    const containerStyle = useMemo(() => ({ 
      backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
      borderColor: borderDynamic, 
      color: textColor 
    }), [secondary, isDarkBg, borderDynamic, textColor]);

    const InventoryTableComponent = useMemo(() => 
      isServiceBusiness ? ServiceInventoryTable : ItemInventoryTable,
      [isServiceBusiness]
    );

    const HeaderIcon = useMemo(() => 
      isServiceBusiness ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      [isServiceBusiness]
    );

    // 🔥 FILTRAR ITEMS ACTIVOS
    useEffect(() => {
      const activeItems = items.filter(item => !item.deletedAt);
      setLocalItems(activeItems);
    }, [items]);

    // 🔥 FILTRADO POR CHIPS (memoizado)
    const lowStockThreshold = useMemo(() => {
      return Number(
        businessConfig?.attributes?.lowStockThreshold ??
        businessConfig?.lowStockThreshold ??
        2
      );
    }, [businessConfig]);

    const filteredItems = useMemo(() => {
      if (activeInventoryFilter === 'all') return localItems;

      return localItems.filter((item) => {
        const status = item?.status || '';
        const isPublished = status === 'published' || status === 'Publicado';

        const qty = isServiceBusiness
          ? Number(item?.maxCapacity ?? item?.attributes?.maxCapacity ?? 0)
          : Number(item?.stock ?? item?.attributes?.stock ?? 0);

        switch (activeInventoryFilter) {
          case 'published':
            return isPublished;
          case 'drafts':
            return !isPublished;
          case 'low-stock':
            return qty > 0 && qty <= lowStockThreshold;
          case 'out-of-stock':
            return qty === 0;
          case 'on-sale':
            return item?.onSale === true;
          default:
            return true;
        }
      });
    }, [localItems, activeInventoryFilter, isServiceBusiness, lowStockThreshold]);

    // 🔥 FUNCIÓN PARA MOSTRAR NOTIFICACIONES - MEMOIZADA
    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setNotification({ message, type });
      notificationTimeoutRef.current = setTimeout(() => setNotification(null), 3000);
    }, []);

    // 🔥 MOVER A PAPELERA - MEMOIZADA
    const handleMoveToTrash = useCallback(async (itemOrId: string | CatalogItem) => {
      let item: CatalogItem | null = null;
      
      if (typeof itemOrId === 'string') {
        item = localItems.find(i => (i.id || i._id) === itemOrId) || null;
        if (!item) {
          showNotification('No se encontró el artículo para eliminar', 'error');
          return;
        }
      } else {
        item = itemOrId;
      }

      if (!item) {
        showNotification('No se encontró el artículo', 'error');
        return;
      }

      const itemId = item.id || item._id;
      if (!itemId) {
        showNotification('No se encontró el ID del artículo', 'error');
        return;
      }

      const tenantId = item.tenantId || businessConfig?.id || businessConfig?.tenantId;
      if (!tenantId) {
        showNotification('No se encontró el tenant asociado al artículo', 'error');
        return;
      }

      showNotification(`Moviendo "${item.name}" a la papelera...`, 'info');

      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const url = `${cleanBase}/products/${itemId}/soft-delete/${tenantId}`;
        const response = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const updatedItem = await response.json();
        
        const newLocalItems = localItems.filter(i => (i.id || i._id) !== itemId);
        setLocalItems(newLocalItems);
        
        const trashItem = { ...updatedItem, deletedAt: new Date().toISOString() };
        addToTrash(trashItem);

        if (handleUpdateItemsList) {
          handleUpdateItemsList(newLocalItems);
        }

        showNotification(`"${item.name || 'Artículo'}" movido a la papelera`, 'info');

      } catch (error) {
        showNotification(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }, [localItems, businessConfig, addToTrash, handleUpdateItemsList, showNotification]);

    // 🔥 RESTAURAR DESDE PAPELERA - MEMOIZADA
    const handleRestoreFromTrash = useCallback(async (item: any) => {
      const itemId = item.id || item._id;
      if (!itemId) {
        showNotification('No se encontró el ID del artículo', 'error');
        return;
      }

      const tenantId = item.tenantId || businessConfig?.id || businessConfig?.tenantId;
      if (!tenantId) {
        showNotification('No se encontró el tenant asociado', 'error');
        return;
      }

      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const url = `${cleanBase}/products/${itemId}/restore/${tenantId}`;
        const response = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const restoredItem = await response.json();
        
        removeFromTrash(itemId);

        const itemToAdd = { ...restoredItem, deletedAt: null };
        setLocalItems(prev => {
          const exists = prev.some(i => (i.id || i._id) === itemId);
          const newList = exists 
            ? prev.map(i => (i.id || i._id) === itemId ? itemToAdd : i)
            : [...prev, itemToAdd];
          
          if (handleUpdateItemsList) {
            setTimeout(() => handleUpdateItemsList(newList), 0);
          }
          
          return newList;
        });

        showNotification(`"${item.name || 'Artículo'}" restaurado correctamente`, 'success');

      } catch (error) {
        showNotification(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }, [businessConfig, removeFromTrash, handleUpdateItemsList, showNotification]);

    // 🔥 ELIMINAR PERMANENTEMENTE - MEMOIZADA
    const handlePermanentDelete = useCallback(async (item: any) => {
      const itemId = item.id || item._id;
      if (!itemId) {
        showNotification('No se encontró el ID del artículo', 'error');
        return;
      }

      const tenantId = item.tenantId || businessConfig?.id || businessConfig?.tenantId;
      if (!tenantId) {
        showNotification('No se encontró el tenant asociado', 'error');
        return;
      }

      showNotification(`Eliminando permanentemente "${item.name}"...`, 'info');

      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const url = `${cleanBase}/products/${itemId}/${tenantId}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        removeFromTrash(itemId);
        showNotification(`"${item.name || 'Artículo'}" eliminado permanentemente`, 'info');

      } catch (error) {
        showNotification(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }, [businessConfig, removeFromTrash, showNotification]);

    // 🔥 VACIAR PAPELERA - MEMOIZADA
    const handleEmptyTrash = useCallback(async () => {
      if (trashItems.length === 0) {
        showNotification('La papelera está vacía', 'info');
        return;
      }

      const tenantId = businessConfig?.id || businessConfig?.tenantId;
      if (!tenantId) {
        showNotification('No se encontró el tenant asociado', 'error');
        return;
      }

      showNotification(`Vaciando papelera (${trashItems.length} elementos)...`, 'info');

      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const url = `${cleanBase}/products/trash/${tenantId}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        emptyTrash();
        showNotification('Papelera vaciada correctamente', 'success');

      } catch (error) {
        showNotification(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }, [trashItems, businessConfig, emptyTrash, showNotification]);

    // 🔥 CAMBIAR ESTADO - MEMOIZADA (CONSERVANDO IVA Y TODOS LOS CAMPOS)
    const handleToggleStatus = useCallback(async (itemToToggle: CatalogItem) => {
      if (!itemToToggle) return;

      const itemId = itemToToggle.id || itemToToggle._id;
      if (!itemId) {
        showNotification('No se encontró el ID del artículo', 'error');
        return;
      }

      const newStatus = itemToToggle.status;
      const newIsActive = itemToToggle.isActive;
      const originalStock = itemToToggle.stock ?? itemToToggle.attributes?.stock ?? 0;

      // 🔥 OBTENER TODOS LOS CAMPOS DEL PRODUCTO PARA PRESERVARLOS
      const ivaType = itemToToggle.ivaType || itemToToggle.attributes?.ivaType || 'excluded';
      const ivaRate = Number(itemToToggle.ivaRate || itemToToggle.attributes?.ivaRate || 16);
      
      // 🔥 PRESERVAR IMÁGENES
      const existingImages = itemToToggle.existingImages || itemToToggle.mediaUrls || itemToToggle.images || [];
      const coverImage = itemToToggle.coverImage || (Array.isArray(existingImages) && existingImages.length > 0 ? existingImages[0] : '');

      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        // 🔥 Detectar si es servicio o producto
        const isServiceItem =
          itemToToggle?.itemType === 'service' ||
          itemToToggle?.attributes?.itemType === 'service' ||
          isServiceBusiness;

        const endpointBase = isServiceItem ? 'services' : 'items';
        const url = `${cleanBase}/api/${endpointBase}/${itemId}/status`;

        // 🔥 Body diferente para servicios (no tienen IVA ni imágenes complejas)
        const bodyPayload = isServiceItem
          ? {
              isActive: newIsActive,
              status: newStatus,
              tenantId: itemToToggle.tenantId || businessConfig?.id,
            }
          : {
              isActive: newIsActive,
              status: newStatus,
              ivaType: ivaType,
              ivaRate: ivaRate,
              existingImages: existingImages,
              coverImage: coverImage,
              attributes: {
                ...(itemToToggle.attributes || {}),
                ivaType: ivaType,
                ivaRate: ivaRate,
                existingImages: existingImages,
                coverImage: coverImage,
                prices: itemToToggle.prices || itemToToggle.attributes?.prices || {},
              },
            };

        const response = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const updatedItem = await response.json();

        const mergedItem = {
          ...itemToToggle,
          ...updatedItem,
          stock: originalStock,
          ivaType: ivaType,
          ivaRate: ivaRate,
          existingImages: existingImages,
          coverImage: coverImage,
          attributes: {
            ...(itemToToggle.attributes || {}),
            ...(updatedItem.attributes || {}),
            stock: originalStock,
            ivaType: ivaType,
            ivaRate: ivaRate,
            existingImages: existingImages,
            coverImage: coverImage,
          }
        };

        const newLocalItems = localItems.map(item => {
          const itemCurrentId = item.id || item._id;
          return itemCurrentId === itemId ? mergedItem : item;
        });
        setLocalItems(newLocalItems);

        if (handleUpdateItemsList) {
          handleUpdateItemsList(newLocalItems);
        }

        const editingId = newItem.id || newItem._id;
        if (editingId === itemId && typeof setNewItem === 'function') {
          setNewItem((prev: any) => ({
            ...prev,
            ...mergedItem,
            stock: originalStock,
          }));
        }

        showNotification(`"${itemToToggle.name || 'Artículo'}" actualizado correctamente`, 'success');

      } catch (error) {
        showNotification(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }, [localItems, newItem, setNewItem, handleUpdateItemsList, showNotification]);

    const handleOpenPreviewFromTable = useCallback((item: any) => {
      if (isServiceBusiness) {
        setPreviewProduct(item);
        return;
      }

      const enrichedItem = {
        ...item,
        features: Array.isArray(item.features)
          ? item.features
          : (typeof item.features === 'string' ? JSON.parse(item.features) : [])
      };

      setPreviewProduct(enrichedItem);
    }, [isServiceBusiness]);

  const resetForm = useCallback(() => {
    setNewItem({
      name: '', description: '', price: '', prices: {}, stock: '', itemId: '', sku: '',
      category: '', brand: '', condition: isServiceBusiness ? 'Servicio' : 'Nuevo', warranty: '', weight: '',
      dimensions: '', durationMinutes: 60, features: [], existingImages: [],
      mediaUrls: [], images: [], files: [], isActive: true,
      includes: '', notIncludes: '', certifications: [], materials: [],
      clientRequirements: [], cancellationPolicy: '',
      ivaType: 'excluded',
      ivaRate: 16,
      availability: {},
      serviceModality: '',
      maxCapacity: '',
      minAdvanceBooking: '',
      // ✅ NUEVOS CAMPOS
      onSale: false,
      discountPercentage: 0,
      discountStartDate: null,
      discountEndDate: null,
            // 🔥 FASE K: canales de venta (defaults)
      availableKiosk: true,
      availableOnline: true,
    });

    if (mediaRef.current) {
      mediaRef.current.resetMedia();
    }

    showNotification('Formulario y campos reiniciados', 'info');
  }, [setNewItem, isServiceBusiness, showNotification]);

const handleFormSubmit = useCallback((publishState: boolean, e: React.FormEvent) => {
  e.preventDefault();

  const currentItem = formRef.current;

  // --- VALIDACIONES ---
  const name = (currentItem.name || '').trim();
  if (!name || name.length < 3) {
    showNotification('El nombre debe tener al menos 3 caracteres', 'error');
    return;
  }

  const category = (currentItem.category || '').trim();
  if (!category) {
    showNotification('Debes seleccionar una categoría', 'error');
    return;
  }

  const rawPriceInput = currentItem.price ?? currentItem.prices?.VES ?? currentItem.attributes?.prices?.VES ?? 0;
  const parsedVes = Number(rawPriceInput) || 0;
  if (parsedVes <= 0) {
    showNotification('El precio debe ser mayor a 0', 'error');
    return;
  }

  if (!isServiceBusiness) {
    const stock = Number(currentItem.stock ?? 0);
    if (stock < 0) {
      showNotification('El stock no puede ser negativo', 'error');
      return;
    }
  }

  if (isEditing) {
    const currentId = currentItem.id || currentItem._id || '';
    if (!currentId) {
      showNotification('Error: No se encontró el ID del elemento', 'error');
      return;
    }
  }

  const currentTenantId = currentItem.tenantId || businessConfig?.id || businessConfig?.slug || '';
  if (!currentTenantId) {
    showNotification('Error: No se encontró el tenant asociado', 'error');
    return;
  }

  let resolvedCode = currentItem.itemId || currentItem.sku || currentItem.code || currentItem.codigo || currentItem.inventoryId || '';
  if (!resolvedCode && !isEditing) {
    const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'CAT';
    const namePrefix = name ? name.substring(0, 3).toUpperCase() : 'ITM';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const autoCode = `${catPrefix}-${namePrefix}-${randomNum}`;
    
    if (typeof setNewItem === 'function') {
      setNewItem((prev: any) => ({ ...(prev || {}), itemId: autoCode, sku: autoCode, code: autoCode }));
    }
    
    showNotification(`Código generado automáticamente: ${autoCode}`, 'info');
    return;
  }

  if (!resolvedCode) {
    showNotification('Error: No se pudo generar un código para el artículo', 'error');
    return;
  }

  // --- PREPARAR DATOS ---
  const rawWeight = currentItem.weight;
  const safeWeight = (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '' && !isNaN(Number(rawWeight)))
    ? String(rawWeight) : '0';

  const parsedUsd = Number(currentItem.prices?.USD ?? currentItem.attributes?.prices?.USD) || (parsedVes > 0 ? Number((parsedVes / 780).toFixed(2)) : 0);
  const parsedEur = Number(currentItem.prices?.EUR ?? currentItem.attributes?.prices?.EUR) || 0;
  const parsedCrypto = Number(currentItem.prices?.CRYPTO ?? currentItem.prices?.USDT ?? currentItem.attributes?.prices?.CRYPTO) || 0;

  const finalPrices = {
    VES: parsedVes,
    USD: parsedUsd,
    EUR: parsedEur,
    CRYPTO: parsedCrypto
  };

  const productMetadata = {
    prices: finalPrices,
    weight: safeWeight
  };

  // --- CREAR FormData ---
  const formData = new FormData();
  const currentId = currentItem.id || currentItem._id || '';

  if (isEditing && currentId) {
    formData.append('id', currentId);
  }
  
  formData.append('tenantId', currentTenantId);
  formData.append('name', name);
  formData.append('description', (currentItem.description || '').trim());
  formData.append('price', String(parsedVes));
  formData.append('stock', isServiceBusiness ? String(currentItem.stock || 0) : String(currentItem.stock || 0));
  formData.append('itemId', resolvedCode);
  formData.append('sku', resolvedCode);
  formData.append('code', resolvedCode);
  formData.append('category', category);
  formData.append('brand', (currentItem.brand || '').trim());
  formData.append('condition', currentItem.condition || (isServiceBusiness ? 'Servicio' : 'Nuevo'));
  formData.append('warranty', (currentItem.warranty || '').trim());
  formData.append('weight', safeWeight);
  formData.append('dimensions', (currentItem.dimensions || '').trim());
  formData.append('metadata', JSON.stringify(productMetadata));
  
  // 🔥 IVA DEL PRODUCTO
  const ivaType = currentItem?.ivaType || 'excluded';
  const ivaRate = Number(currentItem?.ivaRate ?? 16);
  
  formData.append('ivaType', ivaType);
  formData.append('ivaRate', String(ivaRate));

  // 🔥 COSTOS Y MÁRGENES
  if (currentItem.cost !== undefined && currentItem.cost !== '' && currentItem.cost !== null) {
    const costVal = Number(currentItem.cost);
    if (Number.isFinite(costVal) && costVal >= 0) {
      formData.append('cost', String(costVal));
    }
  }
  if (currentItem.minStock !== undefined && currentItem.minStock !== '' && currentItem.minStock !== null) {
    const minStockVal = Number(currentItem.minStock);
    if (Number.isFinite(minStockVal) && minStockVal >= 0) {
      formData.append('minStock', String(minStockVal));
    }
  }

  // 🔥 OFERTA Y DESCUENTO
  formData.append('onSale', String(currentItem.onSale || false));
  formData.append('discountPercentage', String(currentItem.discountPercentage || 0));

  if (currentItem.discountStartDate) {
    formData.append('discountStartDate', currentItem.discountStartDate);
  }
  if (currentItem.discountEndDate) {
    formData.append('discountEndDate', currentItem.discountEndDate);
  }
  
  // 🔥 ATRIBUTOS CON TODOS LOS CAMPOS
  const finalAttributes = {
    ...(currentItem.attributes || {}),
    prices: finalPrices,
    includes: currentItem.includes || '',
    notIncludes: currentItem.notIncludes || '',
    certifications: currentItem.certifications || [],
    materials: currentItem.materials || [],
    clientRequirements: currentItem.clientRequirements || [],
    cancellationPolicy: currentItem.cancellationPolicy || '',
    durationMinutes: currentItem.durationMinutes || 60,
    ivaType: ivaType,
    ivaRate: ivaRate,
    professionals: currentItem.professionalIds || [],
    onSale: currentItem.onSale || false,
    discountPercentage: currentItem.discountPercentage || 0,
    discountStartDate: currentItem.discountStartDate || null,
    discountEndDate: currentItem.discountEndDate || null,
    colors: Array.isArray(currentItem.colors) ? currentItem.colors : (currentItem.color ? [currentItem.color] : []),
    stock: Number(currentItem.stock ?? 0),
  };
  formData.append('attributes', JSON.stringify(finalAttributes));
  formData.append('prices', JSON.stringify(finalPrices));
  
  // 🔥 IMÁGENES - GUARDAR URLs Y FILES
  const existingImages = currentItem.existingImages || currentItem.mediaUrls || [];
  if (Array.isArray(existingImages) && existingImages.length > 0) {
    const serverImages = existingImages.filter((url: string) => 
      typeof url === 'string' && url.startsWith('http') && !url.startsWith('blob:')
    );
    if (serverImages.length > 0) {
      formData.append('existingImages', JSON.stringify(serverImages));
      formData.append('mediaUrls', JSON.stringify(serverImages));
      formData.append('images', JSON.stringify(serverImages));
    }
  }

  if (Array.isArray(currentItem.files) && currentItem.files.length > 0) {
    currentItem.files.forEach((file: File) => {
      if (file instanceof File) {
        formData.append('files', file);
      }
    });
  }

  if (currentItem.coverImage && typeof currentItem.coverImage === 'string') {
    formData.append('coverImage', currentItem.coverImage);
  }

  // 🔥 FEATURES (características)
  if (currentItem.features && Array.isArray(currentItem.features)) {
    currentItem.features.forEach((feature: string) => {
      if (feature && typeof feature === 'string') {
        formData.append('features[]', feature);
      }
    });
    formData.append('features', JSON.stringify(currentItem.features));
  }

  // 🔥 COLORES
  const colors = Array.isArray(currentItem.colors) 
    ? currentItem.colors 
    : (currentItem.color ? [currentItem.color] : []);
  if (colors.length > 0) {
    formData.append('colors', JSON.stringify(colors));
    formData.append('color', colors[0]);
  }

  // 🔥 DESCUENTO Y OFERTA (también en attributes)
  if (currentItem.onSale) {
    formData.append('onSale', 'true');
    formData.append('discountPercentage', String(currentItem.discountPercentage || 0));
    if (currentItem.discountStartDate) {
      formData.append('discountStartDate', currentItem.discountStartDate);
    }
    if (currentItem.discountEndDate) {
      formData.append('discountEndDate', currentItem.discountEndDate);
    }
  }

  // --- SERVICIOS ---
  if (isServiceBusiness && currentItem.availability) {
    formData.append('availability', JSON.stringify(currentItem.availability));
  }

  if (isServiceBusiness && currentItem.professionalIds && currentItem.professionalIds.length > 0) {
    formData.append('professionals', JSON.stringify(currentItem.professionalIds));
  }
  
  if (isServiceBusiness) {
    formData.append('itemType', 'service');
    formData.append('durationMinutes', String(currentItem.durationMinutes || 60));
    formData.append('includes', (currentItem.includes || '').trim());
    formData.append('notIncludes', (currentItem.notIncludes || '').trim());
    formData.append('certifications', JSON.stringify(currentItem.certifications || []));
    formData.append('materials', JSON.stringify(currentItem.materials || []));
    formData.append('clientRequirements', JSON.stringify(currentItem.clientRequirements || []));
    formData.append('cancellationPolicy', (currentItem.cancellationPolicy || '').trim());
    
    if (currentItem.serviceModality) {
      formData.append('serviceModality', currentItem.serviceModality);
    }
    
    if (currentItem.maxCapacity !== undefined && currentItem.maxCapacity !== null) {
      formData.append('maxCapacity', String(currentItem.maxCapacity));
    }
    
    if (currentItem.minAdvanceBooking !== undefined && currentItem.minAdvanceBooking !== null) {
      formData.append('minAdvanceBooking', String(currentItem.minAdvanceBooking));
    }
    // 🔥 FASE K: canales de venta (servicios)
    formData.append('availableKiosk', String(currentItem.availableKiosk ?? true));
    formData.append('availableOnline', String(currentItem.availableOnline ?? true));
  } else {
    formData.append('itemType', 'product');
    // 🔥 FASE K: canales de venta
    formData.append('availableKiosk', String(currentItem.availableKiosk ?? true));
    formData.append('availableOnline', String(currentItem.availableOnline ?? true));
  }
  
  // --- ESTADO Y PUBLICACIÓN ---
  const finalIsActive = publishState ? true : (isEditing ? (currentItem.isActive ?? currentItem.status === 'published') : false);
  const finalStatus = finalIsActive ? 'published' : 'draft';

  formData.append('isActive', String(finalIsActive));
  formData.append('status', finalStatus);

  // --- EJECUTAR ---
  if (isEditing) {
    handleUpdateItem(currentId, formData, e);
  } else {
    handleCreateItem(e);
  }
  
  // ✅ LIMPIAR FORMULARIO DESPUÉS DE GUARDAR
  setTimeout(() => {
    resetForm();
  }, 100);
}, [isServiceBusiness, isEditing, businessConfig, setNewItem, showNotification, handleUpdateItem, handleCreateItem, resetForm]);

    // 🔥 RENDERIZAR NOTIFICACIÓN - MEMOIZADA
    const renderNotification = useMemo(() => {
      if (!notification) return null;
      
      const baseColor = primary;
      
      const getColors = () => {
        if (notification.type === 'success') {
          return {
            bg: isDarkBg ? `${baseColor}20` : `${baseColor}15`,
            border: isDarkBg ? `${baseColor}40` : `${baseColor}30`,
            text: baseColor,
          };
        }
        if (notification.type === 'error') {
          return {
            bg: isDarkBg ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.10)',
            border: isDarkBg ? 'rgba(239, 68, 68, 0.30)' : 'rgba(239, 68, 68, 0.25)',
            text: isDarkBg ? '#f87171' : '#991b1b',
          };
        }
        return {
          bg: isDarkBg ? `${baseColor}15` : `${baseColor}10`,
          border: isDarkBg ? `${baseColor}30` : `${baseColor}25`,
          text: baseColor,
        };
      };

      const style = getColors();
      
      return (
        <div 
          className="fixed bottom-6 right-6 z-[999999] px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4"
          style={{
            backgroundColor: style.bg,
            borderColor: style.border,
            color: style.text,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3 text-sm font-medium">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-1 opacity-50 hover:opacity-100 cursor-pointer text-xs"
              style={{ color: style.text }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      );
    }, [notification, primary, isDarkBg]);

    // 🔥 REGISTRO EN CONTEXT - MEMOIZADO
    useEffect(() => {
      const componentId = 'catalog-tab';
      const refreshData = async () => {
        console.log('🔄 [CatalogTab] Refrescando datos');
      };

      registerComponent(componentId, refreshData);
      return () => unregisterComponent(componentId);
    }, [registerComponent, unregisterComponent]);

    return (
      <div className="space-y-6 w-full pb-16" style={{ color: textColor }}>
        
        {renderNotification}
        
        {/* FORMULARIO */}
        <div 
          className={`border rounded-3xl shadow-xl w-full ${isFormCollapsed ? 'p-5 space-y-0' : 'p-6 space-y-6'}`} 
          style={containerStyle}
        >
          <div 
            onClick={() => setIsFormCollapsed(prev => !prev)}
            className="flex items-center justify-between pb-3 border-b cursor-pointer hover:opacity-70 select-none"
            style={{ borderColor: borderDynamic }}
          >
            <div>
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                {isEditing ? 'Editando elemento...' : (isServiceBusiness ? 'Nuevo Servicio / Cita Agendable' : 'Nuevo Artículo / Producto')}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm hover:scale-105"
                style={{ borderColor: borderDynamic, color: textColor }}
              >
                {isFormCollapsed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          <div className={`${isFormCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-none opacity-100 space-y-6 pt-4'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7">
                <form onSubmit={(e) => handleFormSubmit(true, e)} className="space-y-6">
                  <div style={inputStyle}>
                    {isServiceBusiness ? (
  <ServiceInfoSection 
    inputBgClass={inputBgClass} 
    newItem={newItem} 
    primary={primary} 
    setNewItem={setNewItem} 
    style={inputStyle} 
    textColor={textColor} 
    tenantConfig={businessConfig}
    isDarkBg={isDarkBg}  // ✅ AGREGAR ESTA LÍNEA
    secondary={secondary} // ✅ TAMBIÉN PASAR secondary
  />
                    ) : (
                      <BasicInfoSection 
                        inputBgClass={inputBgClass} 
                        newItem={newItem} 
                        primary={primary} 
                        setNewItem={setNewItem} 
                        style={inputStyle} 
                        textColor={textColor} 
                        tenantConfig={businessConfig}
                        isDarkBg={isDarkBg}
                        secondary={secondary}
                      />
                    )}
                  </div>

                  {/* ✅ SECCIÓN DE OFERTA Y DESCUENTO (productos y servicios) */}
                  <div style={inputStyle}>
                    <DiscountSection
                      newItem={newItem}
                      setNewItem={setNewItem}
                      textColor={textColor}
                      primary={primary}
                      isDarkBg={isDarkBg}
                      style={inputStyle}
                      isService={isServiceBusiness}
                    />
                  </div>

                  <div style={inputStyle}>
                    {isServiceBusiness ? (
                      <ServiceInventorySection 
                        inputBgClass={inputBgClass} 
                        isDarkBg={isDarkBg} 
                        newItem={newItem} 
                        primary={primary} 
                              primary={primary}
        isDarkBg={isDarkBg}
        secondary={secondary}
                        setNewItem={setNewItem} 
                        style={inputStyle} 
                        textColor={textColor}
                        tenantId={businessConfig?.id || businessConfig?.tenantId}
                      />
                    ) : (
                      <InventorySection 
                        inputBgClass={inputBgClass} 
                        isDarkBg={isDarkBg} 
                        newItem={newItem} 
                        primary={primary} 
                        setNewItem={setNewItem} 
                        style={inputStyle} 
                        textColor={textColor} 
                        isDarkBg={isDarkBg}
                        secondary={secondary} 
                      />
                    )}
                  </div>

                  <div style={inputStyle}>
                    {isServiceBusiness ? (
                      <ServiceAttributesSection 
                        existingItems={localItems}
                        inputBgClass={inputBgClass}
                        isService={true}
                        newItem={newItem}
                        primary={primary}
                        setNewItem={setNewItem}
                        style={inputStyle}
                        textColor={textColor}
                        isDarkBg={isDarkBg}
                        secondary={secondary} 
                      />
                    ) : (
                      <AdvancedAttributesSection 
                        existingItems={localItems}
                        inputBgClass={inputBgClass}
                        newItem={newItem}
                        primary={primary}
                        setNewItem={setNewItem}
                        style={inputStyle}
                        textColor={textColor}
                        tenantId={businessConfig?.id}
                        isDarkBg={isDarkBg}
                        secondary={secondary}
                      />
                    )}
                  </div>

                  <div style={inputStyle}>
                    {isServiceBusiness ? (
                      <ServiceMediaAndTagsSection 
                        inputBgClass={inputBgClass} 
                        isDarkBg={isDarkBg} 
                        newItem={newItem} 
                        primary={primary} 
                        setNewItem={setNewItem} 
                        style={inputStyle} 
                        textColor={textColor} 
                        isDarkBg={isDarkBg}
                        secondary={secondary} 
                      />
                    ) : (
                      <MediaAndTagsSection 
                        ref={mediaRef}
                        inputBgClass={inputBgClass} 
                        isDarkBg={isDarkBg} 
                        newItem={newItem} 
                        primary={primary} 
                        setNewItem={setNewItem} 
                        style={inputStyle} 
                        textColor={textColor} 
                        isDarkBg={isDarkBg}
                        secondary={secondary} 
                      />
                    )}
                  </div>

                  <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: borderDynamic }}>
                    <button 
                      type="button" 
                      onClick={resetForm} 
                      className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-amber-500/10 hover:text-amber-500" 
                      style={{ borderColor: borderDynamic, color: textColor }}
                    >
                      Vaciar Campos
                    </button>

                    <div className="flex items-center gap-3">
                      {isEditing && (
                        <button 
                          type="button" 
                          onClick={resetForm} 
                          className="px-4 py-2.5 rounded-xl border border-red-500/20 text-xs font-bold text-red-500 hover:bg-red-500/10"
                        >
                          Cancelar Edición
                        </button>
                      )}
                      
                      <button 
                        type="button" 
                        onClick={(e) => handleFormSubmit(false, e)} 
                        className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:opacity-80" 
                        style={{ borderColor: borderDynamic, color: textColor }}
                      >
                        Guardar Borrador
                      </button>

                      <button 
                        type="submit" 
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95" 
                        style={{ backgroundColor: primary }}
                      >
                        Guardar y Publicar
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-center" style={{ borderColor: borderDynamic }}>
                    <button
                      type="button"
                      onClick={() => setIsFormCollapsed(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium hover:opacity-70"
                      style={{ borderColor: borderDynamic, color: textColor }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      Cerrar formulario
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 self-start sticky top-6">
                {isServiceBusiness ? (
                  <ServicePreviewCard 
                    isDarkBg={isDarkBg} 
                    newItem={newItem} 
                    primary={primary} 
                    secondary={secondary} 
                    setNewItem={setNewItem} 
                    textColor={textColor} 
                  />
                ) : (
                  <ItemPreviewCard 
                    isDarkBg={isDarkBg} 
                    newItem={newItem} 
                    primary={primary} 
                    secondary={secondary} 
                    setNewItem={setNewItem} 
                    textColor={textColor} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE INVENTARIO */}
        <div 
          className={`border rounded-3xl shadow-xl w-full p-6 space-y-6`}
          style={containerStyle}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: borderDynamic }}>
            <div>
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                {isServiceBusiness ? 'Servicios Publicados' : 'Inventario'}
              </h3>
              <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                {localItems.length} {isServiceBusiness ? 'servicios' : 'productos'} en total
              </p>
            </div>
            <div 
              className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm hover:scale-105"
              style={{ borderColor: borderDynamic, color: textColor }}
            >
              {HeaderIcon}
            </div>
          </div>

<InventoryMetricsBar
  items={localItems}
  rates={{
    USD: Number(exchangeRates?.USD ?? 0),
    EUR: Number(exchangeRates?.EUR ?? 0),
  }}
  isService={isServiceBusiness}
  lowStockThreshold={lowStockThreshold}
  primary={primary}
  secondary={secondary}
  textColor={textColor}
  isDarkBg={isDarkBg}
  onFilterChange={(filter) => setActiveInventoryFilter(filter as InventoryFilterKey)}
/>

<InventoryFilterChips
  activeFilter={activeInventoryFilter}
  onFilterChange={setActiveInventoryFilter}
  isService={isServiceBusiness}
  lowStockThreshold={lowStockThreshold}
  items={localItems}
  primary={primary}
  textColor={textColor}
  isDarkBg={isDarkBg}
/>

<InventoryTableComponent 
  handleRemoveItem={handleMoveToTrash}
  handleStartEdit={handleStartEdit || (() => {})} 
  handleTogglePublish={handleToggleStatus} 
  handleViewItem={handleOpenPreviewFromTable}
  isDarkBg={isDarkBg} 
  items={filteredItems}
  primary={primary} 
  secondary={secondary} 
  textColor={textColor} 
  setNewItem={setNewItem}
  onRestoreItem={handleRestoreFromTrash}
  onDeletePermanently={handlePermanentDelete}
  onEmptyTrash={handleEmptyTrash}
  lowStockThreshold={lowStockThreshold}
  onUpdateItem={(updatedItem: any) => {
    // 🔥 Actualiza el item en el estado local sin esperar F5
    setLocalItems((prev) =>
      prev.map((i) => {
        const id = i.id || i._id;
        if (id === updatedItem.id) {
          return { ...i, ...updatedItem };
        }
        return i;
      })
    );
  }}
/>
        </div>

        {/* 🔥 MODAL DE PREVIEW - CONDICIONAL SEGÚN TIPO DE NEGOCIO */}
        {previewProduct && (
          isServiceBusiness ? (
            <ServiceDetailModal
              isOpen={!!previewProduct}
              onClose={() => setPreviewProduct(null)}
              isDarkBg={isDarkBg}
              isSecondaryLight={!isDarkBg}
              textMainClass={isDarkBg ? 'text-white' : 'text-slate-900'}
              textMutedClass={isDarkBg ? 'text-slate-400' : 'text-slate-600'}
              cardBgClass=""
              cardInnerBgClass=""
              primary={primary}
              secondary={secondary || (isDarkBg ? '#0f172a' : '#ffffff')}
              service={previewProduct}
              tenant={businessConfig}
              professionals={businessConfig?.professionals || []}
              onReserve={(data) => console.log('Reserva desde vista administrativa:', data)}
            />
          ) : (
            <ItemPreviewModal
              previewProduct={previewProduct}
              setPreviewProduct={setPreviewProduct}
              primary={primary}
              secondary={secondary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              onAddToCart={(product, quantity, options) => {
                console.log('🛒 [AddToCart - Producto] Producto:', product, 'Cantidad:', quantity, 'Opciones:', options);
              }}
            />
          )
        )}
      </div>
    );
  });

  // 🔥 ASIGNAR DISPLAY NAME
  CatalogTabContent.displayName = 'CatalogTabContent';

  // 🔥 EXPORTAR ENVUELTO EN TRASHPROVIDER CON TENANT ID
  export default function CatalogTab(props: CatalogTabProps) {
    const tenantId = props.businessConfig?.id || props.businessConfig?.tenantId;
    return (
      <TrashProvider tenantId={tenantId}>
        <CatalogTabContent {...props} />
      </TrashProvider>
    );
  }