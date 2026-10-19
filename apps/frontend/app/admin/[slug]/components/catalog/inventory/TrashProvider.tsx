'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface TrashItem {
  id?: string;
  _id?: string;
  name?: string;
  deletedAt?: string | null;
  [key: string]: any;
}

interface TrashContextType {
  trashItems: TrashItem[];
  setTrashItems: React.Dispatch<React.SetStateAction<TrashItem[]>>;
  addToTrash: (item: TrashItem) => void;
  removeFromTrash: (itemId: string) => void;
  restoreFromTrash: (itemId: string) => void;
  emptyTrash: () => void;
  isInTrash: (itemId: string) => boolean;
  loadTrashFromBackend: (tenantId: string) => Promise<void>;
}

const TrashContext = createContext<TrashContextType | undefined>(undefined);

export const useTrash = () => {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error('useTrash must be used within a TrashProvider');
  }
  return context;
};

interface TrashProviderProps {
  children: ReactNode;
  initialItems?: TrashItem[];
  tenantId?: string;
}

export const TrashProvider: React.FC<TrashProviderProps> = ({
  children,
  initialItems = [],
  tenantId,
}) => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>(initialItems);

  const loadTrashFromBackend = async (tenantId: string) => {
    if (!tenantId) return;
    
    try {
      const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
      const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

      const response = await fetch(`${cleanBase}/products/trash/${tenantId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setTrashItems(items);
        console.log(`🗑️ [TrashProvider] Cargados ${items.length} items de la papelera`);
      } else {
        console.warn('⚠️ [TrashProvider] No se pudo cargar la papelera');
      }
    } catch (error) {
      console.error('❌ [TrashProvider] Error cargando papelera:', error);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadTrashFromBackend(tenantId);
    }
  }, [tenantId]);

  const addToTrash = (item: TrashItem) => {
    const itemWithDate = {
      ...item,
      deletedAt: item.deletedAt || new Date().toISOString(),
    };
    setTrashItems(prev => {
      const exists = prev.some(i => (i.id || i._id) === (itemWithDate.id || itemWithDate._id));
      if (exists) return prev;
      return [...prev, itemWithDate];
    });
  };

  const removeFromTrash = (itemId: string) => {
    setTrashItems(prev => prev.filter(item => (item.id || item._id) !== itemId));
  };

  const restoreFromTrash = (itemId: string) => {
    removeFromTrash(itemId);
  };

  const emptyTrash = () => {
    setTrashItems([]);
  };

  const isInTrash = (itemId: string) => {
    return trashItems.some(item => (item.id || item._id) === itemId);
  };

  return (
    <TrashContext.Provider
      value={{
        trashItems,
        setTrashItems,
        addToTrash,
        removeFromTrash,
        restoreFromTrash,
        emptyTrash,
        isInTrash,
        loadTrashFromBackend,
      }}
    >
      {children}
    </TrashContext.Provider>
  );
};