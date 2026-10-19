import { useCallback, useEffect } from 'react';

// 🔥 Re-exportamos los hooks de persistencia desde su ubicación global
export { usePersistedState, usePersistedActiveTab } from '@/hooks/usePersistedState';
export const useNavigation = (onTabChange?: (tab: string, filter?: any) => void) => {
  const navigateTo = useCallback((tab: string, filter?: any) => {
    // Disparar evento para componentes que lo escuchen
    const event = new CustomEvent('navigateTab', { 
      detail: { tab, filter } 
    });
    window.dispatchEvent(event);
    
    // Fallback directo si se pasa la función
    if (onTabChange) {
      onTabChange(tab, filter);
    }
  }, [onTabChange]);

  return { navigateTo };
};

export const useNavigationListener = (
  setActiveTab: (tab: string) => void, 
  setFilter?: (filter: any) => void
) => {
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { tab, filter } = customEvent.detail;
      
      setActiveTab(tab);
      
      if (filter && setFilter) {
        setFilter(filter);
      }
    };

    window.addEventListener('navigateTab', handler);
    return () => window.removeEventListener('navigateTab', handler);
  }, [setActiveTab, setFilter]);
};

