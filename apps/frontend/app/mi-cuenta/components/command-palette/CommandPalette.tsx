'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import type { Command } from './types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
}

// ============================================================
// 🔥 HELPERS DE BÚSQUEDA FUZZY
// ============================================================
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesQuery(command: Command, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  const haystack = [command.label, ...(command.keywords || [])]
    .map(normalize)
    .join(' ');
  return haystack.includes(q);
}

// ============================================================
// 🔥 COMPONENTE
// ============================================================
export default function CommandPalette({
  isOpen,
  onClose,
  commands,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const filtered = useMemo(
    () => commands.filter((c) => matchesQuery(c, query)),
    [commands, query]
  );

  const grouped = useMemo(() => {
    const navigate = filtered.filter((c) => c.section === 'navigate');
    const action = filtered.filter((c) => c.section === 'action');
    return { navigate, action };
  }, [filtered]);

  const flat = useMemo(() => [...grouped.navigate, ...grouped.action], [grouped]);

  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0);
  }, [flat.length, activeIndex]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-cmd-index="${activeIndex}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(flat.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flat[activeIndex];
        if (cmd) {
          onClose();
          setTimeout(() => {
            Promise.resolve(cmd.action()).catch((err) => {
              console.error('[CommandPalette] Error ejecutando comando:', err);
            });
          }, 0);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [flat, activeIndex, onClose]
  );

  if (!mounted) return null;

  const border = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const itemHoverBg = isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const muted = isDarkBg ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.9)';
  const sectionLabelColor = muted;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="command-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4"
          style={{ backgroundColor: isDarkBg ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            key="command-palette-box"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-2xl"
            style={{
              backgroundColor: secondary,
              borderColor: `${primary}30`,
              color: textColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b"
              style={{ borderColor: border }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: primary }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar o ejecutar un comando..."
                className="flex-1 bg-transparent border-0 outline-none text-sm font-medium placeholder:opacity-40"
                style={{ color: textColor }}
              />
              <kbd
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                style={{ borderColor: border, color: muted }}
              >
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs font-medium" style={{ color: muted }}>
                    No se encontraron comandos
                  </p>
                  <p className="text-[10px] mt-1 opacity-60" style={{ color: muted }}>
                    para "{query}"
                  </p>
                </div>
              ) : (
                <>
                  {grouped.navigate.length > 0 && (
                    <Section
                      label="Navegar"
                      items={grouped.navigate}
                      startIndex={0}
                      activeIndex={activeIndex}
                      onHover={setActiveIndex}
                      onSelect={(cmd) => {
                        onClose();
                        setTimeout(() => Promise.resolve(cmd.action()).catch(console.error), 0);
                      }}
                      primary={primary}
                      textColor={textColor}
                      itemHoverBg={itemHoverBg}
                      sectionLabelColor={sectionLabelColor}
                    />
                  )}

                  {grouped.action.length > 0 && (
                    <Section
                      label="Acciones"
                      items={grouped.action}
                      startIndex={grouped.navigate.length}
                      activeIndex={activeIndex}
                      onHover={setActiveIndex}
                      onSelect={(cmd) => {
                        onClose();
                        setTimeout(() => Promise.resolve(cmd.action()).catch(console.error), 0);
                      }}
                      primary={primary}
                      textColor={textColor}
                      itemHoverBg={itemHoverBg}
                      sectionLabelColor={sectionLabelColor}
                    />
                  )}
                </>
              )}
            </div>

            <div
              className="flex items-center justify-between px-4 py-2.5 border-t text-[10px]"
              style={{ borderColor: border, color: muted }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: border }}>
                    <ArrowUp className="w-2.5 h-2.5 inline" />
                  </kbd>
                  <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: border }}>
                    <ArrowDown className="w-2.5 h-2.5 inline" />
                  </kbd>
                  <span className="ml-1">Navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: border }}>
                    <CornerDownLeft className="w-2.5 h-2.5 inline" />
                  </kbd>
                  <span className="ml-1">Ejecutar</span>
                </span>
              </div>
              <span>facilito</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

// ============================================================
// 🔥 SUBCOMPONENTE: Section
// ============================================================
interface SectionProps {
  label: string;
  items: Command[];
  startIndex: number;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (cmd: Command) => void;
  primary: string;
  textColor: string;
  itemHoverBg: string;
  sectionLabelColor: string;
}

function Section({
  label,
  items,
  startIndex,
  activeIndex,
  onHover,
  onSelect,
  primary,
  textColor,
  itemHoverBg,
  sectionLabelColor,
}: SectionProps) {
  return (
    <div className="mb-1">
      <div
        className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ color: sectionLabelColor }}
      >
        {label}
      </div>
      <div className="px-2">
        {items.map((cmd, i) => {
          const globalIndex = startIndex + i;
          const isActive = globalIndex === activeIndex;
          const Icon = cmd.icon;

          return (
            <button
              key={cmd.id}
              type="button"
              data-cmd-index={globalIndex}
              onMouseEnter={() => onHover(globalIndex)}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{
                backgroundColor: isActive ? `${primary}15` : 'transparent',
                border: isActive ? `1px solid ${primary}40` : '1px solid transparent',
                color: textColor,
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: isActive ? primary : textColor, opacity: isActive ? 1 : 0.7 }}
              />
              <span className="flex-1 text-sm font-medium truncate">{cmd.label}</span>
              {cmd.hint && (
                <span
                  className="text-[10px] font-medium shrink-0"
                  style={{ color: sectionLabelColor }}
                >
                  {cmd.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
