'use client';

import React, { useState } from 'react';
import TrashModal from './TrashModal';
import { useTrash } from './TrashProvider';

interface TrashManagerProps {
  onRestoreItem?: (item: any) => Promise<void>;
  onDeletePermanently?: (item: any) => Promise<void>;
  onEmptyTrash?: () => Promise<void>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  trashCount?: number;
}

export const TrashManager: React.FC<TrashManagerProps> = ({
  onRestoreItem,
  onDeletePermanently,
  onEmptyTrash,
  primary,
  secondary,
  textColor,
  isDarkBg,
  trashCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { trashItems } = useTrash();

  const count = trashItems.length || trashCount;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition hover:bg-white/5"
        style={{
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          color: textColor,
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Papelera</span>
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: primary }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <TrashModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
        onRestoreItem={onRestoreItem}
        onDeletePermanently={onDeletePermanently}
        onEmptyTrash={onEmptyTrash}
      />
    </>
  );
};

export default TrashManager;