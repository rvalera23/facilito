import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Calendar,
  Star,
  Heart,
  MessageSquare,
  Bell,
  User,
  Palette,
  ExternalLink,
  Copy,
  Store,
  Home,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import type { Command } from './types';

// ============================================================
// 🔥 ICONOS POR TAB
// ============================================================
export const TAB_ICONS: Record<string, LucideIcon> = {
  resumen: LayoutDashboard,
  compras: ShoppingBag,
  envios: Truck,
  citas: Calendar,
  resenas: Star,
  favoritos: Heart,
  conversaciones: MessageSquare,
  notificaciones: Bell,
  perfil: User,
  branding: Palette,
};

// ============================================================
// 🔥 TIPOS DE PARÁMETROS PARA CONSTRUIR COMANDOS
// ============================================================
export interface BuildCommandsOptions {
  availableTabs: Array<{ id: string; label: string }>;
  storeSlug?: string | null;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onGoHome: () => void;
}

// ============================================================
// 🔥 CONSTRUCTOR DE COMANDOS
// ============================================================
export function buildCommands({
  availableTabs,
  storeSlug,
  setActiveTab,
  onLogout,
  onGoHome,
}: BuildCommandsOptions): Command[] {
  const navigateCommands: Command[] = availableTabs.map((tab) => ({
    id: `navigate-${tab.id}`,
    label: tab.label,
    keywords: [tab.id, 'ir', 'abrir', 'navegar'],
    section: 'navigate',
    icon: TAB_ICONS[tab.id] || LayoutDashboard,
    hint: 'Mi Cuenta',
    action: () => setActiveTab(tab.id),
  }));

  const storeActions: Command[] = storeSlug
    ? [
        {
          id: 'action-open-public-store',
          label: 'Abrir mi tienda pública',
          keywords: ['tienda', 'ver', 'publica', 'preview', 'abrir'],
          section: 'action',
          icon: ExternalLink,
          hint: 'Tienda pública',
          action: () => {
            window.open(`/tienda/${storeSlug}`, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'action-copy-store-link',
          label: 'Copiar enlace de mi tienda',
          keywords: ['copiar', 'link', 'url', 'compartir', 'enlace'],
          section: 'action',
          icon: Copy,
          hint: 'Portapapeles',
          action: async () => {
            const url = `${window.location.origin}/tienda/${storeSlug}`;
            try {
              await navigator.clipboard.writeText(url);
              window.dispatchEvent(
                new CustomEvent('toast', {
                  detail: { type: 'success', message: 'Enlace copiado al portapapeles' },
                })
              );
            } catch {
              // Silencioso
            }
          },
        },
        {
          id: 'action-open-admin',
          label: 'Ir al Panel de Administración',
          keywords: ['admin', 'panel', 'administracion', 'gestion'],
          section: 'action',
          icon: Store,
          hint: 'Admin',
          action: () => {
            window.location.href = `/admin/${storeSlug}`;
          },
        },
      ]
    : [
        {
          id: 'action-create-store',
          label: 'Crear mi tienda',
          keywords: ['crear', 'tienda', 'vender', 'onboarding', 'seller'],
          section: 'action',
          icon: Store,
          hint: 'Emprender',
          action: () => {
            window.location.href = '/onboarding?role=seller';
          },
        },
      ];

  const actionCommands: Command[] = [
    ...storeActions,
    {
      id: 'action-go-home',
      label: 'Ir al sitio principal',
      keywords: ['home', 'inicio', 'principal', 'salir', 'facilito'],
      section: 'action',
      icon: Home,
      hint: 'facilito',
      action: () => onGoHome(),
    },
    {
      id: 'action-logout',
      label: 'Cerrar sesión',
      keywords: ['logout', 'salir', 'cerrar', 'cuenta'],
      section: 'action',
      icon: LogOut,
      hint: 'Sesión',
      action: () => onLogout(),
    },
  ];

  return [...navigateCommands, ...actionCommands];
}
