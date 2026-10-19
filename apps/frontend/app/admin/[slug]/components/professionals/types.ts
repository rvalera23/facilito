// frontend/app/admin/[slug]/components/professionals/types.ts

export interface Professional {
  id: string;
  tenantId: string;
  userId?: string | null;
  name: string;
  description?: string | null;
  specialties?: string[];
  serviceIds?: string[];
  schedule?: Record<string, any>;
  breaks?: any[];
  rating?: number | string;
  reviewsCount?: number;
  isActive: boolean;
  status?: string;
  mediaUrls?: string[] | null;
  coverImage?: string | null;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // 🔥 NUEVO: user asociado (para email/phone readonly en edición)
  user?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string | null;
    role?: string;
  } | null;
}

export interface CreateProfessionalDto {
  name: string;
  description?: string;
  specialties?: string[];
  serviceIds?: string[];
  schedule?: Record<string, any>;
  breaks?: any[];
  isActive?: boolean;
}

export interface UpdateProfessionalDto extends Partial<CreateProfessionalDto> {
  id: string;
}

export interface ProfessionalsTabProps {
  tenantId?: string;
  tenantSlug?: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  getImageUrl?: (item: any) => string | null;
}