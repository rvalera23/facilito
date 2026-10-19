import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CalendarDays,
  Truck,
  Palette,
  Store,
  Settings,
  Users,
  Star,
  Bell,
  MessageCircle,
  ExternalLink,
  Copy,
  Monitor,
  Home,
  User,        // 🔥 NUEVO
  LogOut,
  LucideIcon,
} from 'lucide-react';
import type { Command } from './types';

// ============================================================
// 🔥 ICONOS POR TAB
// ============================================================
export const TAB_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  catalog: Package,
  orders: ShoppingBag,
  bookings: CalendarDays,
  shipping: Truck,
  themes: Palette,
  branding: Store,
  settings: Settings,
  professionals: Users,
  reviews: Star,
  notifications: Bell,
  messages: MessageCircle,
};

// ============================================================
// 🔥 TIPOS DE PARÁMETROS PARA CONSTRUIR COMANDOS
// ============================================================
export interface BuildCommandsOptions {
  availableTabs: Array<{ id: string; label: string }>;
  tenantSlug: string;
  setActiveTab: (tab: string) => void;
  onToggleKiosk: () => void;
  onLogout: () => void;
  onGoHome: () => void;
  isKioskActive: boolean;
  /** Token del kiosko activo (si lo hay). Se usa para armar la URL del kiosko. */
  kioskToken?: string | null;
}

// ============================================================
// 🔥 CONSTRUCTOR DE COMANDOS
// ============================================================
export function buildCommands({
  availableTabs,
  tenantSlug,
  setActiveTab,
  onToggleKiosk,
  onLogout,
  onGoHome,
  isKioskActive,
  kioskToken,
}: BuildCommandsOptions): Command[] {
  const navigateCommands: Command[] = [
    ...availableTabs.map((tab) => ({
      id: `navigate-${tab.id}`,
      label: tab.label,
      keywords: [tab.id, 'ir', 'abrir', 'navegar'],
      section: 'navigate' as const,
      icon: TAB_ICONS[tab.id] || Settings,
      hint: 'Panel',
      action: () => setActiveTab(tab.id),
    })),
    {
      id: 'navigate-mi-cuenta',
      label: 'Mi Cuenta',
      keywords: ['cuenta', 'perfil', 'usuario', 'mi cuenta', 'perfil personal', 'account', 'profile'],
      section: 'navigate' as const,
      icon: User,
      hint: 'Perfil',
      action: () => {
        window.location.href = '/mi-cuenta';
      },
    },
  ];

  const kioskExtraCommands: Command[] =
    isKioskActive && kioskToken
      ? [
          {
            id: 'action-open-kiosk',
            label: 'Abrir kiosko en nueva pestaña',
            keywords: ['kiosko', 'kiosk', 'autopago', 'abrir', 'preview', 'ver', 'nueva'],
            section: 'action',
            icon: ExternalLink,
            hint: 'Kiosko',
            action: () => {
              if (!tenantSlug || !kioskToken) return;
              const url = `/tienda/kiosko?token=${encodeURIComponent(kioskToken)}&slug=${encodeURIComponent(tenantSlug)}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            },
          },
          {
            id: 'action-copy-kiosk-link',
            label: 'Copiar enlace del kiosko',
            keywords: ['kiosko', 'kiosk', 'copiar', 'link', 'url', 'compartir'],
            section: 'action',
            icon: Copy,
            hint: 'Portapapeles',
            action: async () => {
              if (!tenantSlug || !kioskToken) return;
              const url = `${window.location.origin}/tienda/kiosko?token=${encodeURIComponent(kioskToken)}&slug=${encodeURIComponent(tenantSlug)}`;
              try {
                await navigator.clipboard.writeText(url);
                window.dispatchEvent(
                  new CustomEvent('toast', {
                    detail: { type: 'success', message: 'Enlace del kiosko copiado' },
                  })
                );
              } catch {
                // Silencioso
              }
            },
          },
        ]
      : [];

  const actionCommands: Command[] = [
    {
      id: 'action-open-public-store',
      label: 'Abrir mi tienda pública',
      keywords: ['tienda', 'ver', 'publica', 'preview', 'abrir'],
      section: 'action',
      icon: ExternalLink,
      hint: 'Tienda pública',
      action: () => {
        if (tenantSlug) {
          window.open(`/tienda/${tenantSlug}`, '_blank', 'noopener,noreferrer');
        }
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
        if (!tenantSlug) return;
        const url = `${window.location.origin}/tienda/${tenantSlug}`;
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
      id: 'action-toggle-kiosk',
      label: isKioskActive ? 'Desactivar modo kiosko' : 'Activar modo kiosko',
      keywords: ['kiosko', 'kiosk', 'autopago', 'terminal', 'activar', 'desactivar'],
      section: 'action',
      icon: Monitor,
      hint: 'Kiosko',
      action: () => onToggleKiosk(),
    },
    ...kioskExtraCommands,
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