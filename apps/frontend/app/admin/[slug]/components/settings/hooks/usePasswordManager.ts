'use client';

import { useState } from 'react';

export function usePasswordManager(setErrorMsg: (msg: string) => void) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validatePasswords = () => {
    if (!newPassword && !currentPassword) return true;

    if (newPassword && newPassword === currentPassword) {
      setErrorMsg('La nueva contraseña no puede ser igual a la contraseña actual.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las nuevas contraseñas no coinciden.');
      return false;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const resetPasswords = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    validatePasswords,
    resetPasswords
  };
}