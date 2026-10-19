'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Zap, X, Star, Loader2 } from 'lucide-react';
import { useQuickReplies, type QuickReply } from './hooks/useQuickReplies';
import {
  renderTemplate,
  buildTemplateVars,
  getMissingVars,
} from './utils/quickRepliesUtils';
interface QuickRepliesPickerProps {
  tenant: any;
  onPick: (text: string) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
}

export default function QuickRepliesPicker({
  tenant,
  onPick,
  primary,
  secondary,
  textColor,
  isDarkBg,
  borderColor,
}: QuickRepliesPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { replies, loading, error } = useQuickReplies();
  const templateVars = useMemo(() => buildTemplateVars(tenant), [tenant]);

  const grouped = useMemo(() => {
    const map = new Map<string, QuickReply[]>();
    for (const r of replies) {
      const cat = r.category || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries());
  }, [replies]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handlePick = (reply: QuickReply) => {
    const rendered = renderTemplate(reply.text, templateVars);
    onPick(rendered);
    setIsOpen(false);
  };

const panelBg = secondary || (isDarkBg ? '#0f172a' : '#ffffff');
  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 cursor-pointer border"
        style={{
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor,
          color: primary,
        }}
        title="Respuestas rápidas"
      >
        <Zap className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full mb-2 right-0 w-80 max-h-[440px] overflow-y-auto rounded-2xl border shadow-2xl z-50 backdrop-blur-xl"
          style={{ backgroundColor: panelBg, borderColor, color: textColor }}
        >
          <div
            className="flex items-center justify-between p-3 border-b sticky top-0 z-10"
            style={{ borderColor, backgroundColor: panelBg }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" style={{ color: primary }} />
              <span className="text-xs font-bold">Respuestas rápidas</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:opacity-70 transition cursor-pointer"
              style={{ color: textColor }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: primary }} />
            </div>
          ) : error ? (
            <p className="text-[11px] text-center py-6 px-4 opacity-70" style={{ color: textColor }}>
              {error}
            </p>
          ) : replies.length === 0 ? (
            <p className="text-[11px] text-center py-6 px-4 opacity-70" style={{ color: textColor }}>
              No hay plantillas todavía
            </p>
          ) : (
            <div className="p-2 space-y-3">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <div
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50"
                    style={{ color: textColor }}
                  >
                    {category}
                  </div>
                  <div className="space-y-1 mt-1">
       {items.map((reply) => {
  const preview = renderTemplate(reply.text, templateVars);
  const missingVars = getMissingVars(reply.text, templateVars);
  const hasMissing = missingVars.length > 0;

  return (
    <button
      key={reply.id}
      type="button"
      onClick={() => handlePick(reply)}
      className="w-full text-left p-2.5 rounded-lg hover:opacity-90 transition"
      style={{
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[11px] font-bold truncate" style={{ color: textColor }}>
          {reply.label}
        </span>
        {reply.isDefault && (
          <Star
            className="w-2.5 h-2.5 shrink-0 opacity-60"
            style={{ color: primary }}
            fill="currentColor"
          />
        )}
        {hasMissing && (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: 'rgba(251,191,36,0.15)',
              color: '#d97706',
              border: '1px solid rgba(251,191,36,0.3)',
            }}
            title={`Faltan configurar: ${missingVars.join(', ')}`}
          >
            ⚠ Falta configurar
          </span>
        )}
      </div>
      <p
        className="text-[10px] line-clamp-2 leading-snug"
        style={{ color: textColor, opacity: 0.65 }}
      >
        {preview}
      </p>
    </button>
  );
})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
