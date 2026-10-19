// ARCHIVO: frontend/src/components/FavoritesDropdown.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, Image as ImageIcon, Eye, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/app/tienda/[slug]/hooks/useFavorites';

interface FavoritesDropdownProps {
  userId: string;
  isLight: boolean;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  hoverBg: string;
  primaryColor: string;
  secondary?: string;
  className?: string;
}

export default function FavoritesDropdown({
  userId,
  isLight,
  textColor,
  mutedTextColor,
  borderColor,
  hoverBg,
  primaryColor,
  secondary,
  className = '',
}: FavoritesDropdownProps) {
  const router = useRouter();
  const { favorites, favoriteProducts, loading, favoritesCount, toggleFavorite } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🔥 Leer el bg-color de la CSS var de forma reactiva (a themeChange).
  const [pageBg, setPageBg] = useState<string>(() => {
    if (typeof window === 'undefined') return secondary || '#0f172a';
    const css = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-color')
      .trim();
    return css || secondary || (isLight ? '#ffffff' : '#0f172a');
  });

  useEffect(() => {
    const updateBg = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-color')
        .trim();
      setPageBg(css || secondary || (isLight ? '#ffffff' : '#0f172a'));
    };
    updateBg();
    window.addEventListener('themeChange', updateBg);
    window.addEventListener('tenantThemeUpdated', updateBg);
    window.addEventListener('paletteChange', updateBg);
    return () => {
      window.removeEventListener('themeChange', updateBg);
      window.removeEventListener('tenantThemeUpdated', updateBg);
      window.removeEventListener('paletteChange', updateBg);
    };
  }, [secondary, isLight]);

  const borderDynamic = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const containerBg = pageBg;
  const resolvedTextMain = isLight ? 'text-slate-900' : 'text-slate-100';
  const resolvedTextMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const subCardBg = isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)';

  // 🔥 FUNCIÓN PARA REDIRIGIR A LA TIENDA CON EL PRODUCTO
  const handleProductClick = (product: any) => {
    const productId = product.id || product._id;
    const productTenantSlug = product.tenantSlug || product.tenant?.slug;
    
    if (!productId) return;

    setIsOpen(false);

    if (productTenantSlug) {
      router.push(`/tienda/${productTenantSlug}?producto=${productId}`);
      return;
    }

    // Fallback: ir a búsqueda
    router.push(`/?q=${encodeURIComponent(product.name)}`);
  };

  // 🔥 FUNCIÓN PARA OBTENER LA IMAGEN (igual que FavoritesModal)
  const getItemImage = (item: any) => {
    if (!item) return null;
    let rawImg = '';

    if (typeof item.coverImage === 'string' && item.coverImage.trim() !== '') {
      rawImg = item.coverImage;
    } else if (typeof item.image === 'string' && item.image.trim() !== '') {
      rawImg = item.image;
    } else if (typeof item.photo === 'string' && item.photo.trim() !== '') {
      rawImg = item.photo;
    } else if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      const first = item.mediaUrls[0];
      if (typeof first === 'string' && first.trim() !== '') rawImg = first;
      else if (first?.url) rawImg = first.url;
      else if (first?.path) rawImg = first.path;
    } else {
      const directImages = item.images || item.existingImages || item.fileUrls || item.photos || item.files;
      if (Array.isArray(directImages) && directImages.length > 0) {
        const first = directImages[0];
        if (typeof first === 'string' && first.trim() !== '') rawImg = first;
        else if (first?.url) rawImg = first.url;
        else if (first?.path) rawImg = first.path;
      }
    }

    if (!rawImg) return null;
    if (typeof rawImg !== 'string') rawImg = String(rawImg);
    rawImg = rawImg.trim();
    if (!rawImg) return null;

    rawImg = rawImg.replace(/\\/g, '/');

    const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
    const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      try {
        const urlObj = new URL(rawImg);
        if (urlObj.port && urlObj.port !== '3000') {
          return `${cleanBase}${urlObj.pathname}`;
        }
        return rawImg;
      } catch (e) {
        return rawImg;
      }
    }

    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
      return rawImg;
    }

    if (rawImg.includes('uploads/')) {
      const relativePath = rawImg.split('uploads/').pop();
      return `${cleanBase}/uploads/${relativePath}`;
    }

    const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
    return `${cleanBase}/uploads/${cleanPath}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Botón de favoritos - IGUAL QUE FavoritesModal Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border ${borderColor} bg-white/5 transition-all duration-300 cursor-pointer ${hoverBg} ${textColor}`}
        style={{ borderColor: borderDynamic }}
        title="Mis Favoritos"
      >
        <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
        {favoritesCount > 0 && (
          <span 
            className="absolute -top-1.5 -right-1.5 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg text-slate-950"
            style={{ backgroundColor: primaryColor }}
          >
            {favoritesCount > 9 ? '9+' : favoritesCount}
          </span>
        )}
      </button>

      {/* Dropdown de favoritos - ESTILO IGUAL QUE FavoritesModal */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border z-50 max-h-[400px] flex flex-col"
          style={{
            backgroundColor: containerBg,
            borderColor: borderDynamic,
            color: isLight ? '#0f172a' : '#ffffff',
          }}
        >
          {/* Header - IGUAL QUE FavoritesModal */}
          <div 
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ 
              borderColor: borderDynamic,
              backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'
            }}
          >
            <div className="flex items-center gap-2.5">
              <div 
                className="p-1.5 rounded-xl flex items-center justify-center text-rose-500"
                style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
              >
                <Heart className="w-4 h-4 fill-rose-500" />
              </div>
              <div>
                <span className={`text-sm font-bold ${resolvedTextMain}`}>Mis Favoritos</span>
                <p className={`text-[10px] font-medium ${resolvedTextMuted}`}>
                  {favoritesCount} productos guardados
                </p>
              </div>
            </div>
          </div>

          {/* Lista de productos - ESTILO IGUAL QUE FavoritesModal */}
          <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: primaryColor }} />
              </div>
            ) : favoriteProducts.length === 0 ? (
              <div className={`text-center py-8 ${resolvedTextMuted}`}>
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                <p className={`text-sm font-medium ${resolvedTextMain}`}>No tienes productos en favoritos</p>
              </div>
            ) : (
              favoriteProducts.slice(0, 5).map((product) => {
                const productId = product.id || product._id;
                const resolvedImage = getItemImage(product);
                const productTenantSlug = product.tenantSlug || product.tenant?.slug;
                
                return (
                  <div
                    key={productId}
                    onClick={() => handleProductClick(product)}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer border ${hoverBg}`}
                    style={{ 
                      borderColor: borderDynamic,
                      backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
                    }}
                  >
                    {/* Imagen - IGUAL QUE FavoritesModal */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border flex items-center justify-center" style={{ borderColor: borderDynamic }}>
                      {resolvedImage ? (
                        <img
                          src={resolvedImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className={`w-5 h-5 opacity-30 ${resolvedTextMuted}`} />
                      )}
                    </div>

                    {/* Info - IGUAL QUE FavoritesModal */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${resolvedTextMain}`}>
                        {product.name || 'Producto'}
                      </p>
                      {productTenantSlug && (
                        <span className={`text-[10px] font-medium ${resolvedTextMuted}`}>
                          {productTenantSlug}
                        </span>
                      )}
                    </div>

                    {/* Botón Quitar de Favoritos - IGUAL QUE FavoritesModal */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(productId);
                      }}
                      className={`p-1.5 rounded-xl transition border shrink-0 ${
                        isLight 
                          ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                      }`}
                      title="Quitar de favoritos"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer - IGUAL QUE FavoritesModal */}
          <div 
            className="px-4 py-3 border-t"
            style={{ 
              borderColor: borderDynamic,
              backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/mi-cuenta?tab=favoritos');
              }}
              style={{ backgroundColor: primaryColor }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 cursor-pointer text-white`}
            >
              Ver todos los favoritos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}