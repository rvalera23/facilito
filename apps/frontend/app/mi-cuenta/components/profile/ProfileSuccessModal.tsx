'use client';

import { SuccessModal } from '@/components/ui/SuccessModal';

interface ProfileSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  cardBg: string;
  textColor: string;
  /** Opcional: para heredar del tema */
  primary?: string;
  borderColor?: string;
  isDarkBg?: boolean;
}

/**
 * 🔥 Wrapper del SuccessModal canónico.
 * Mantenemos este archivo por compatibilidad con imports existentes.
 */
export default function ProfileSuccessModal({
  isOpen,
  onClose,
  message,
  cardBg,
  textColor,
  primary = '#f97316',
  borderColor = 'rgba(0,0,0,0.12)',
  isDarkBg = false,
}: ProfileSuccessModalProps) {
  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="¡Cambios guardados!"
      message={message}
      primary={primary}
      borderColor={borderColor}
      cardBg={cardBg}
      textColor={textColor}
      isDarkBg={isDarkBg}
      accentColor="#22c55e"
      autoCloseMs={0}
      closeLabel="Aceptar"
    />
  );
}