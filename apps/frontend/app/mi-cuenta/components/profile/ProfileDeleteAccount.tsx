'use client';

import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ProfileDeleteAccountProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
  deleteConfirmationText?: string;      // 🔥 deprecated: el ConfirmDialog maneja su propio estado
  onConfirmationChange?: (value: string) => void;  // 🔥 deprecated
  deleting: boolean;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  inputClass?: string;                  // 🔥 deprecated
  errorMsg?: string;
  primary?: string;
  isDarkBg?: boolean;
}

export default function ProfileDeleteAccount({
  isOpen,
  onClose,
  onConfirm,
  email,
  deleting,
  cardBg,
  cardBorder,
  textColor,
  errorMsg,
  primary = '#f43f5e',
  isDarkBg = false,
}: ProfileDeleteAccountProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Estás completamente seguro?"
      message={
        errorMsg
          ? `${errorMsg} — Esta acción es irreversible. Se eliminará tu perfil y todo tu historial asociado.`
          : 'Esta acción es irreversible. Se eliminará tu perfil y todo tu historial asociado.'
      }
      confirmLabel="Sí, eliminar"
      variant="danger"
      loading={deleting}
      requireConfirmationText={email}
      requireConfirmationLabel="Para confirmar, escribe tu correo electrónico:"
      primary={primary}
      borderColor={cardBorder}
      cardBg={cardBg}
      textColor={textColor}
      isDarkBg={isDarkBg}
    />
  );
}