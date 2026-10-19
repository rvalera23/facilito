// ARCHIVO: apps/frontend/app/admin/[slug]/components/catalog/inventory/table/ServiceCellPopover.tsx
import React from 'react';

interface ServiceCellPopoverProps {
  internalSysId: string;
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, id: string) => void;
  onClose: () => void;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
}

export default function ServiceCellPopover({
  internalSysId,
  copiedId,
  onCopy,
  onClose,
  secondary,
  isDarkBg,
  textColor,
  subtleBorderColor
}: ServiceCellPopoverProps) {
  return (
    <div 
      className="absolute left-0 bottom-full mb-1.5 flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border"
      style={{ 
        backgroundColor: secondary || (isDarkBg ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
        borderColor: subtleBorderColor,
        color: textColor 
      }}
    >
      <span className="opacity-90">{internalSysId}</span>
      <button
        type="button"
        onClick={(e) => onCopy(e, internalSysId)}
        className="transition p-1 rounded-lg text-[9px] cursor-pointer flex items-center gap-1 font-sans font-semibold px-2 py-0.5"
        style={{ 
          backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          color: textColor 
        }}
      >
        {copiedId === internalSysId ? (
          <span className="text-emerald-400 font-bold">¡Copiado!</span>
        ) : (
          <span>Copiar</span>
        )}
      </button>
      <button 
        type="button" 
        onClick={onClose} 
        className="opacity-60 hover:opacity-100 text-[11px] px-1 font-bold ml-1"
      >
        ✕
      </button>
    </div>
  );
}