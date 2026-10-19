// frontend/app/admin/[slug]/components/conversations/utils/conversationUtils.ts

import { toAbsoluteApiUrl } from '@/lib/apiUrl';

export const getFullAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  const result = toAbsoluteApiUrl(avatar);
  return result || null;
};

export const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Fecha no disponible';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'hace un momento';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
    if (diff < 172800000) return 'ayer';
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const getDisplayName = (buyer: any): string => {
  if (!buyer) return 'Cliente';
  return buyer.name || buyer.fullName || buyer.nombre || 'Cliente anónimo';
};

export const getDisplayEmail = (buyer: any): string | null => {
  if (!buyer) return null;
  return buyer.email || buyer.correo || null;
};

export const getDisplayPhone = (buyer: any): string | null => {
  if (!buyer) return null;
  return buyer.phone || buyer.telefono || buyer.celular || null;
};