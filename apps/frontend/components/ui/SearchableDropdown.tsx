'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================
// 🔥 SearchableDropdown
// ------------------------------------------------------------
// Dropdown custom uniforme para TODO el proyecto.
// Reemplaza a los <select> nativos cuando querés:
//   - Búsqueda
//   - Hover custom
//   - Check en opción seleccionada
//   - Heredar el tema del tenant (primary, isDarkBg, secondary)
//   - Footer con conteo
// ============================================================

export interface SearchableDropdownOption {
  value: string;
  label: string;
}

export interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;

  // Estilos del tenant
  primary: string;
  textColor: string;
  secondary?: string;
  isDarkBg: boolean;
  borderColor?: string;

  // Opcional
  searchable?: boolean;                 // default: true
  footerLabel?: (count: number) => string; // ej: (n) => `${n} categorías`
  renderLabel?: (option: SearchableDropdownOption | null) => React.ReactNode;
  disabled?: boolean;
}

// Iconos (SVG heredados, sin librería de íconos)
const SearchIcon = ({ color }: { color: string }) => (
  <svg
    className="w-3.5 h-3.5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    style={{ color }}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ChevronIcon = ({ color, open }: { color: string; open: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    style={{ color }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg
    className="w-3.5 h-3.5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    style={{ color }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Filtrar...',
  emptyMessage = 'No hay opciones',
  primary,
  textColor,
  secondary,
  isDarkBg,
  borderColor,
  searchable = true,
  footerLabel,
  renderLabel,
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔥 Estilos derivados
  const dropdownBg = isDarkBg
    ? 'color-mix(in srgb, var(--bg-color, #0b0f19) 98%, transparent)'
    : (secondary || '#ffffff');
  const dropdownBorder = isDarkBg
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.1)';
  const dropdownItemHover = isDarkBg
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.04)';
  const dropdownItemSelected = isDarkBg
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';
  const resolvedBorderColor =
    borderColor ||
    (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');

  // 🔥 Filtrado
  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const lower = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.value.toLowerCase().includes(lower),
    );
  }, [options, search, searchable]);

  // 🔥 Valor seleccionado
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  // 🔥 Click outside → cerrar
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  // 🔥 Escape → cerrar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange(optValue);
      setIsOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) setSearch(''); // si estaba abierto, cerrar y limpiar search
  }, [isOpen, disabled]);

  // 🔥 Label a mostrar en el botón
  const displayLabel =
    selectedOption !== null
      ? renderLabel
        ? renderLabel(selectedOption)
        : selectedOption.label
      : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition cursor-pointer flex items-center justify-between bg-transparent ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          borderColor: resolvedBorderColor,
          color: textColor,
        }}
        onClick={handleToggle}
      >
        <span className={selectedOption ? '' : 'opacity-50'}>
          {displayLabel}
        </span>
        <ChevronIcon color={textColor} open={isOpen} />
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl max-h-72 overflow-hidden flex flex-col"
          style={{
            backgroundColor: dropdownBg,
            borderColor: dropdownBorder,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {searchable && (
            <div className="p-2 border-b" style={{ borderColor: dropdownBorder }}>
              <div className="relative flex items-center gap-2">
                <SearchIcon color={mutedText} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none border-none bg-transparent"
                  style={{
                    color: textColor,
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div
                className="px-3.5 py-4 text-center text-xs opacity-60"
                style={{ color: textColor }}
              >
                {emptyMessage}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className="w-full px-3.5 py-2.5 text-xs text-left transition flex items-center justify-between hover:opacity-80"
                    style={{
                      color: isSelected ? primary : textColor,
                      backgroundColor: isSelected
                        ? dropdownItemSelected
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          dropdownItemHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span>
                      {renderLabel ? renderLabel(opt) : opt.label}
                    </span>
                    {isSelected && <CheckIcon color={primary} />}
                  </button>
                );
              })
            )}
          </div>

          {footerLabel && (
            <div
              className="px-3.5 py-1.5 border-t text-[9px] opacity-50"
              style={{
                borderColor: dropdownBorder,
                color: textColor,
              }}
            >
              {footerLabel(filtered.length)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}