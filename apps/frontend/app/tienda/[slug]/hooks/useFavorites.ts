// ==========================================
// ARCHIVO: apps/frontend/app/tienda/[slug]/hooks/useFavorites.ts
// ==========================================
import { useState, useEffect, useCallback } from 'react';

export type FavoriteItemType = 'product' | 'service';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getApiBase = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  };

  const getAuthData = () => {
    if (typeof window === 'undefined') return { userId: null, token: null };
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?.sub || user?.userId || user?._id;
      return { userId, token };
    } catch (e) {
      console.error('❌ [useFavorites] Error al parsear auth data:', e);
      return { userId: null, token: null };
    }
  };

  const fetchFavorites = useCallback(async () => {
    const { userId, token } = getAuthData();
    // ✅ Chequear AMBOS: sin token no tiene sentido llamar (evita 401 + ruido)
    if (!userId || !token) {
      setFavorites([]);
      setFavoriteProducts([]);
      setLoading(false);
      return;
    }

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data)
          ? data
          : data.favorites || data.data || data.items || [];

        const ids: string[] = [];
        const products: any[] = [];

        rawList.forEach((f: any, index: number) => {
          if (!f) return;

          // 🔥 Detectar tipo (backend envía itemType en el Favorite)
          const itemType: FavoriteItemType = f.itemType || 'product';

          // 🔥 El item viene en f.product (productos) o f.service (servicios)
          const item = f.product || f.service || f;
          if (!item) return;

          const itemId = String(
            item.id || item._id || f.itemId || f.productId || ''
          );

          if (itemId && itemId !== 'undefined' && itemId !== 'null') {
            ids.push(itemId);
            products.push({
              ...item,
              id: itemId,
              _id: itemId,
              _itemType: itemType, // 🔥 Discriminador para el frontend
              name: item.name || item.nombre || f.name || `Item ${index + 1}`,
              coverImage:
                item.coverImage ||
                item.image ||
                item.photo ||
                item.img ||
                (item.mediaUrls?.[0]),
              stock: item.stock ?? item.existencias ?? 99,
              itemId:
                item.itemId || item.sku || item.code || item.codigo || item.reference || '',
              tenantSlug:
                item.tenantSlug || item.tenant?.slug || f.tenant?.slug || null,
            });
          }
        });

        setFavorites(ids);
        setFavoriteProducts(products);
      } else {
        const errorBody = await response.text();
        console.error(
          '❌ [useFavorites] Error del servidor:',
          response.status,
          errorBody
        );
      }
    } catch (error) {
      console.error('❌ [useFavorites] Excepción de red:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  /**
   * toggleFavorite
   * Acepta:
   *  - Objeto con `id`/`_id` y opcionalmente `_itemType`
   *  - String (ID) → asume 'product' por defecto
   */
  const toggleFavorite = async (
    productOrId: any,
    explicitType?: FavoriteItemType,
  ) => {
    const { userId, token } = getAuthData();
    if (!userId || !token) {
      console.warn('⚠️ [useFavorites] Sin autenticación');
      return;
    }

    let itemId: string | undefined;
    let itemType: FavoriteItemType = explicitType || 'product';
    let itemObj: any = null;

    if (typeof productOrId === 'object' && productOrId !== null) {
      itemId = String(productOrId.id || productOrId._id || '');
      // Prioridad: explicitType > _itemType del objeto > fallback
      itemType = explicitType || productOrId._itemType || 'product';
      itemObj = productOrId;
    } else {
      itemId = String(productOrId);
      if (explicitType) {
        // Si nos pasan el tipo explícito, confiamos en él
        itemType = explicitType;
        itemObj =
          favoriteProducts.find((p) => String(p.id || p._id) === itemId) ||
          null;
      } else {
        // Sin tipo explícito: inferir del estado de favoritos
        const existing = favoriteProducts.find(
          (p) => String(p.id || p._id) === itemId
        );
        itemType = existing?._itemType || 'product';
        itemObj = existing || null;
      }
    }

    if (!itemId || itemId === 'undefined' || itemId === 'null') {
      console.error('❌ [useFavorites] ID inválido:', productOrId);
      return;
    }

    const previousFavorites = [...favorites];
    const previousFavoriteProducts = [...favoriteProducts];
    const isCurrentlyFavorite = favorites.includes(itemId);

    // 🔥 Optimistic UI
    if (isCurrentlyFavorite) {
      setFavorites((prev) => prev.filter((id) => id !== itemId));
      setFavoriteProducts((prev) =>
        prev.filter((p) => String(p.id || p._id) !== itemId)
      );
    } else {
      setFavorites((prev) => [...prev, itemId]);
      if (itemObj) {
        setFavoriteProducts((prev) => [...prev, { ...itemObj, _itemType: itemType }]);
      }
    }

    try {
      const apiBase = getApiBase();
      // 🔥 Mandar itemType por query param
      const url = `${apiBase}/favorites/${itemId}?type=${itemType}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      await fetchFavorites();
    } catch (error) {
      console.error('❌ [useFavorites] Revertiendo UI:', error);
      setFavorites(previousFavorites);
      setFavoriteProducts(previousFavoriteProducts);
    }
  };

  /**
   * removeFavorite
   * Acepta itemId + (opcional) itemType. Si no se pasa itemType, lo infiere.
   */
  const removeFavorite = async (
    itemId: string | number,
    itemType?: FavoriteItemType
  ) => {
    const id = String(itemId);
    const existing = favoriteProducts.find(
      (p) => String(p.id || p._id) === id
    );
    await toggleFavorite({
      id,
      _itemType: itemType || existing?._itemType || 'product',
    });
  };

  return {
    favorites,
    favoriteProducts,
    toggleFavorite,
    removeFavorite,
    loading,
    favoritesCount: favorites.length,
  };
};