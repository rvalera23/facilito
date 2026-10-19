'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Store, Package, Wrench, X, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';   // 🔥 NUEVO

interface SearchResult {
  id: string;
  name: string;
  slug?: string;
  type: 'tienda' | 'producto' | 'servicio';
  tenantName?: string;
  tenantSlug?: string;
  image?: string;
  price?: number;
  category?: string;
  description?: string;
}

interface GlobalSearchProps {
  isLight: boolean;
  textColor: string;
  mutedTextColor: string;
  placeholderColor: string;
  searchBg: string;
  primaryColor: string;
  secondary?: string;
  isCompact?: boolean;
}

export default function GlobalSearch({
  isLight,
  textColor,
  mutedTextColor,
  placeholderColor,
  searchBg,
  primaryColor,
  secondary,
  isCompact = false,
}: GlobalSearchProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const formatPrice = (price: any): string => {
    if (price === undefined || price === null || price === '') return '0,00';
    const num = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : Number(price);
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 NUEVO: usar getImageUrl del proyecto (maneja /api/uploads/, /uploads/,
  // http://, blob:, etc.). Elimina el getFullImageUrl custom que estaba roto.
  const resolveImage = (item: any): string | null => {
    if (!item) return null;
    try {
      // getImageUrl procesa coverImage, mediaUrls, image, photo, etc.
      // y devuelve una URL absoluta limpia.
      const url = getImageUrl(item);
      return url || null;
    } catch {
      return null;
    }
  };

  const isTenantService = (tenant: any): boolean => {
    const rawModality = String(
      tenant.work_modality || 
      tenant.workModality || 
      tenant.niche || 
      tenant.businessType || 
      tenant.type || 
      ''
    ).toLowerCase().trim();

    return (
      rawModality === 'service' || 
      rawModality === 'servicios' || 
      rawModality === 'cita' || 
      rawModality === 'citas' || 
      rawModality.includes('service') || 
      rawModality.includes('servicio') || 
      rawModality.includes('cita')
    );
  };

  const getServicePrice = (service: any): number => {
    const prices = service?.prices || service?.attributes?.prices || {};
    const vesPrice = Number(prices.VES || prices.ves || service?.price || service?.precio || 0);
    return vesPrice || 0;
  };

  const getProductPrice = (product: any): number => {
    const prices = product?.prices || product?.attributes?.prices || {};
    const vesPrice = Number(prices.VES || prices.ves || product?.price || product?.precio || 0);
    return vesPrice || 0;
  };

useEffect(() => {
  const query = searchTerm.trim();
  
  if (query.length < 2) {
    setResults([]);
    setShowDropdown(false);
    return;
  }

  setIsLoading(true);
  setShowDropdown(true);

  const fetchResults = async () => {
    try {
      // ✅ 1. Solo pide 2 endpoints en vez de 3 (products + services son iguales)
      // ✅ 2. Usa Promise.all para paralelizar, NO secuencial
      const [tenantsRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/tenants?search=${encodeURIComponent(query)}&limit=3`),
        fetch(`${API_BASE}/products/search?q=${encodeURIComponent(query)}&limit=3`),
      ]);

      const [tenantsData, productsData] = await Promise.all([
        tenantsRes.ok ? tenantsRes.json() : { tenants: [] },
        productsRes.ok ? productsRes.json() : { products: [] },
      ]);

      // Procesar tenants (mismo código)
      const tenants = (Array.isArray(tenantsData) ? tenantsData : tenantsData.tenants || [])
        .slice(0, 3)
        .map((t: any) => {
          const isService = isTenantService(t);
          return {
            id: t.id || t._id,
            name: t.name,
            slug: t.slug,
            type: isService ? 'servicio' : 'tienda' as const,
image: t.logoUrl || t.logo ? resolveImage({ coverImage: t.logoUrl || t.logo }) : null,
            description: t.slogan || t.description,
          };
        });

      // Procesar productos (mismo código)
      const productsArray = Array.isArray(productsData) ? productsData : productsData.products || [];
      const products = productsArray.slice(0, 3).map((p: any) => {
        const tenantSlug = p.tenant?.slug || p.tenantSlug || p.tenant_slug || null;
        const price = getProductPrice(p);
        return {
          id: p.id || p._id,
          name: p.name,
          slug: p.slug,
          type: 'producto' as const,
          tenantName: p.tenant?.name || p.tenantName || 'Tienda',
          tenantSlug: tenantSlug,
image: resolveImage(p),
          price: price,
          category: p.category,
          description: p.description,
        };
      });

      // ✅ 3. Los servicios los buscamos solo si no hay resultados de productos
      let services: SearchResult[] = [];
      if (products.length === 0 && tenants.length === 0) {
        try {
          const servicesRes = await fetch(`${API_BASE}/services/search?q=${encodeURIComponent(query)}&limit=3`);
          const servicesData = servicesRes.ok ? await servicesRes.json() : { services: [] };
          const servicesArray = Array.isArray(servicesData) ? servicesData : servicesData.services || [];
          
          services = servicesArray.slice(0, 3).map((s: any) => {
            const tenantSlug = s.tenant?.slug || s.tenantSlug || s.tenant_slug || null;
            const price = getServicePrice(s);
            return {
              id: s.id || s._id,
              name: s.name,
              slug: s.slug,
              type: 'servicio' as const,
              tenantName: s.tenant?.name || s.tenantName || 'Tienda',
              tenantSlug: tenantSlug,
image: resolveImage(s),
              price: price,
              category: s.category,
              description: s.description,
            };
          });
        } catch (error) {
          console.error('Error en /services/search:', error);
        }
      }

      const allResults = [...tenants, ...products, ...services];
      setResults(allResults);
    } catch (error) {
      console.error('Error en GlobalSearch:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 4. Aumentar debounce a 600ms para evitar demasiadas peticiones
  const timer = setTimeout(fetchResults, 600);
  return () => clearTimeout(timer);
}, [searchTerm]);

const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  const query = searchTerm.trim();
  
  if (!query) {
    setShowDropdown(false);
    return;
  }

  // ✅ Usar los resultados ya cargados si existen
  if (results.length > 0) {
    // Si hay resultados, ir al primero
    handleResultClick(results[0]);
    return;
  }

  // Si no hay resultados, hacer una sola búsqueda general
  try {
    router.push(`/?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Error en handleSearch:', error);
    router.push('/');
  }
  
  setShowDropdown(false);
  setSearchTerm('');
};

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false);
    setSearchTerm('');
    
    if (result.type === 'tienda' && result.slug) {
      router.push(`/tienda/${result.slug}`);
    } else if (result.type === 'producto' && result.tenantSlug) {
      router.push(`/tienda/${result.tenantSlug}?producto=${result.id}`);
    } else if (result.type === 'servicio' && result.tenantSlug) {
      router.push(`/tienda/${result.tenantSlug}?servicio=${result.id}`);
    } else {
      router.push(`/?q=${encodeURIComponent(result.name)}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Colores sutiles heredados
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const borderFocusColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  const textResultColor = isLight ? '#0f172a' : '#f1f5f9';
  const mutedResultColor = isLight ? '#64748b' : '#94a3b8';
  // 🔥 FIX: heredar el --bg-color del tenant en vez del #0f172a hardcodeado.
  // Si el consumidor pasa un secondary explícito, se respeta.
  const dropdownBg = secondary || (isLight
    ? '#ffffff'
    : 'color-mix(in srgb, var(--bg-color, #0b0f19) 98%, transparent)');
      const hoverBg = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'tienda':
        return { icon: Store, label: 'Tienda' };
      case 'producto':
        return { icon: Package, label: 'Producto' };
      case 'servicio':
        return { icon: Wrench, label: 'Servicio' };
      default:
        return { icon: Store, label: 'Tienda' };
    }
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <form
        onSubmit={handleSearch}
        className={`
          flex items-center w-full transition-all duration-200
          ${searchBg} rounded-lg
          border ${isFocused ? 'border-opacity-30' : 'border-opacity-10'}
          ${isFocused ? `ring-1 ring-${isLight ? 'slate-400/30' : 'white/20'}` : ''}
          h-9
        `}
        style={{
          borderColor: isFocused ? borderFocusColor : borderColor,
        }}
      >
        <Search 
          className={`w-4 h-4 ${mutedTextColor} ml-2.5`} 
        />
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar tiendas, productos, servicios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (searchTerm.trim().length >= 2) setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
          className={`
            bg-transparent border-0 outline-none w-full
            text-xs px-1.5 py-1.5
            ${textColor} ${placeholderColor}
            font-normal tracking-wide
          `}
        />
        
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className={`p-1 rounded-full transition-colors ${mutedTextColor} hover:bg-black/5 dark:hover:bg-white/5 mr-1`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          type="submit"
          className={`
            text-white font-medium transition-all duration-200
            text-xs px-3 py-1.5 rounded-lg mr-1
            hover:opacity-90 active:scale-95
          `}
          style={{ backgroundColor: primaryColor }}
        >
          Ir
        </button>
      </form>

      {/* Dropdown de resultados - estilo sutil */}
      {showDropdown && searchTerm.trim().length >= 2 && (
        <div
          className="absolute top-full mt-1.5 left-0 right-0 overflow-hidden shadow-xl border rounded-xl animate-in fade-in slide-in-from-top-1 duration-150"
                    style={{
            backgroundColor: dropdownBg,
            borderColor: borderColor,
            color: textResultColor,
            maxHeight: '420px',
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6" style={{ color: mutedResultColor }}>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Buscando...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs" style={{ color: mutedResultColor }}>
                  No se encontraron resultados
                </p>
                <p className="text-[10px] mt-1 opacity-60" style={{ color: mutedResultColor }}>
                  para "{searchTerm}"
                </p>
                <button
                  onClick={handleSearch}
                  className="mt-2 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: primaryColor }}
                >
                  Buscar en toda la plataforma
                </button>
              </div>
            ) : (
              <>
                {results.map((result, index) => {
                  const typeConfig = getTypeConfig(result.type);
                  const IconComponent = typeConfig.icon;
                  const displayPrice = result.price || 0;

                  return (
                    <button
                      key={`${result.type}-${result.id}-${index}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors text-left border-b last:border-b-0"
                      style={{
                        borderColor: borderColor,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-black/5 dark:bg-white/5">
                        {result.image ? (
                          <img
                            src={result.image}
                            alt={result.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconComponent className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate" style={{ color: textResultColor }}>
                            {result.name}
                          </span>
                          <span className="text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 opacity-60">
                            {typeConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]" style={{ color: mutedResultColor }}>
                          {result.type !== 'tienda' && result.tenantName && (
                            <span className="truncate max-w-[120px]">
                              {result.tenantName}
                            </span>
                          )}
                          {displayPrice > 0 && (
                            <span className="font-medium" style={{ color: primaryColor }}>
                              Bs. {formatPrice(displayPrice)}
                            </span>
                          )}
                          {result.category && (
                            <span className="opacity-60 truncate max-w-[80px]">
                              {result.category}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="w-3.5 h-3.5 opacity-30 flex-shrink-0" />
                    </button>
                  );
                })}
                
                <div className="p-2 border-t" style={{ borderColor: borderColor }}>
                  <button
                    onClick={handleSearch}
                    className="w-full text-center text-[10px] font-medium py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ color: primaryColor }}
                  >
                    Ver todos los resultados
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}