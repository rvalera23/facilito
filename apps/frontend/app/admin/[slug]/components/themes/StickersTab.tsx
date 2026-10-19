'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Download, FileImage, FileText, QrCode, Heart, Check, Tag, AtSign, Circle, Square } from 'lucide-react';
import { useToast } from '@/components/ui/useToast';
// ============================================================
// 🔥 INTERFACE
// ============================================================
interface StickersTabProps {
  brandConfig: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
}

type Shape = 'circle' | 'square';
type SizeMM = 40 | 50 | 70;
type TemplateId =
  | 'logo'
  | 'thanks'
  | 'comeback'
  | 'follow'
  | 'qr'
  | 'love'
  | 'discount'
  | 'verified';

interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  defaultShape: Shape;
}

// ============================================================
// 🔥 PLANTILLAS DISPONIBLES
// ============================================================
const TEMPLATES: TemplateConfig[] = [
  { id: 'logo',     label: 'Solo logo',       description: 'Tu logo limpio, con borde de corte.',         icon: FileImage,     defaultShape: 'circle' },
  { id: 'thanks',   label: 'Gracias',         description: 'Agradece a tus clientes por su compra.',      icon: Check,         defaultShape: 'circle' },
  { id: 'comeback', label: 'Vuelve pronto',   description: 'Invita a regresar con un mensaje cálido.',    icon: Heart,         defaultShape: 'circle' },
  { id: 'follow',   label: 'Sígueme',         description: 'Muestra tus redes sociales.',                  icon: AtSign,        defaultShape: 'square' },
    { id: 'qr',       label: 'Código QR',       description: 'QR directo a tu tienda virtual.',              icon: QrCode,        defaultShape: 'square' },
  { id: 'love',     label: 'Hecho con amor',  description: 'Sello artesanal con tu ciudad.',               icon: Heart,         defaultShape: 'circle' },
  { id: 'discount', label: '-10% próxima',    description: 'Incentiva la recompra con descuento.',         icon: Tag,           defaultShape: 'square' },
  { id: 'verified', label: 'Verificado',      description: 'Sello de producto verificado.',                icon: Check,         defaultShape: 'circle' },
];

// ============================================================
// 🔥 HELPERS
// ============================================================
const getFullImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    const API = process.env.NEXT_PUBLIC_API_URL;
    return `${API}${url}`;
  }
  return url;
};

const slugifyName = (name: string): string =>
  (name || 'tienda')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

    
// ============================================================
// 🔥 HELPER: Silenciar error de cssRules (bug html-to-image + Next.js)
// ============================================================
const safeToPng = async (node: HTMLElement, options: any) => {
  const originalDescriptors: Array<{ sheet: CSSStyleSheet; desc: PropertyDescriptor }> = [];

  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        void sheet.cssRules;
      } catch {
        let currentProto: any = sheet;
        while (currentProto && !Object.getOwnPropertyDescriptor(currentProto, 'cssRules')) {
          currentProto = Object.getPrototypeOf(currentProto);
        }
        if (currentProto) {
          const desc = Object.getOwnPropertyDescriptor(currentProto, 'cssRules');
          if (desc) {
            originalDescriptors.push({ sheet, desc });
            Object.defineProperty(sheet, 'cssRules', {
              get() {
                return [];
              },
              configurable: true,
            });
          }
        }
      }
    }

    return await toPng(node, options);
  } finally {
    for (const { sheet, desc } of originalDescriptors) {
      try {
        Object.defineProperty(sheet, 'cssRules', desc);
      } catch {
        // silencio
      }
    }
  }
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function StickersTab({
  brandConfig,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: StickersTabProps) {
  // ============================================================
  // ESTADO
  // ============================================================
  const { showToast } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('thanks');
  const [shape, setShape] = useState<Shape>('circle');
  const [sizeMM, setSizeMM] = useState<SizeMM>(50);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const stickerRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // DATOS DEL TENANT
  // ============================================================
  const storeName = brandConfig?.name || 'Mi Tienda';
  const storeSlug =
    brandConfig?.slug ||
    brandConfig?.store_slug ||
    brandConfig?.slugUrl ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop() || ''
      : '');
        const storeCity = brandConfig?.city || '';
  const storeInstagram = brandConfig?.instagram || '';
  const storeWhatsapp = brandConfig?.whatsapp || '';
  const logoUrl = useMemo(
    () => getFullImageUrl(brandConfig?.logoUrl),
    [brandConfig?.logoUrl]
  );

  const fontFamily = brandConfig?.fontFamily || 'Inter';
  const fontWeight = brandConfig?.fontWeight || 700;

  const primaryColor = brandConfig?.primaryColor || primary || '#f97316';
  const secondaryColor = brandConfig?.secondaryColor || secondary || '#0f172a';
  const accentColor = brandConfig?.accentColor || '#3b82f6';

  const storeUrl = useMemo(() => {
    if (!storeSlug) return '';
    const base =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://facilito.app';
    return `${base}/tienda/${storeSlug}`;
  }, [storeSlug]);

  // ============================================================
  // QR DATA URL
  // ============================================================
  useEffect(() => {
    // Si no hay slug, no generamos QR
    if (!storeSlug) {
      console.warn('[StickersTab] No hay slug para generar QR');
      setQrDataUrl('');
      return;
    }

    const url = storeUrl || `https://facilito.app/tienda/${storeSlug}`;

    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('[StickersTab] QR error:', err);
        setQrDataUrl('');
      });
  }, [storeUrl, storeSlug]);

  // ============================================================
  // TEMPLATE ACTUAL
  // ============================================================
  const currentTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0],
    [selectedTemplate]
  );

  // Cambiar shape según template al seleccionarlo
  const handleSelectTemplate = useCallback((id: TemplateId) => {
    setSelectedTemplate(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (t) setShape(t.defaultShape);
  }, []);

  // ============================================================
  // ESTILOS
  // ============================================================
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const itemBg = isDarkBg ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)';
  const cardBg = secondary || (isDarkBg ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.7)');

  // 🔥 Color de texto del panel (se ajusta al tema del admin)
  const panelTextColor = isDarkBg ? '#F1F5F9' : '#0F172A';
  const panelMutedColor = isDarkBg ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';

  // 🔥 FONDO del sticker: hereda el fondo del tema de la tienda
  const stickerBg = brandConfig?.backgroundColor || '#0F172A';

  // 🔥 Detectar si el fondo del sticker es claro u oscuro
  const isStickerBgLight = (() => {
    const hex = (stickerBg || '#0F172A').replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  })();

  // 🔥 Colores del sticker calculados automáticamente según el fondo
  const stickerTextColor = isStickerBgLight ? '#0F172A' : '#F8FAFC';
  const stickerMutedColor = isStickerBgLight ? 'rgba(15,23,42,0.7)' : 'rgba(248,250,252,0.7)';
  const stickerBorderColor = isStickerBgLight ? '#0F172A' : '#FFFFFF';
  const stickerGuideColor = isStickerBgLight ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.3)';

  // ============================================================
  // RENDER DEL STICKER (componente interno)
  // ============================================================
  const StickerRender = useCallback(
    ({ scale = 1 }: { scale?: number }) => {
      // Tamaño base en px (usamos 400px como referencia, se escala para descarga)
      const px = 400 * scale;
      const isCircle = shape === 'circle';

      return (
        <div
          ref={stickerRef}
          style={{
            width: `${px}px`,
            height: `${px}px`,
            borderRadius: isCircle ? '50%' : '24px',
            backgroundColor: stickerBg,
            // 🔥 Guía de corte exterior: dotted (color dinámico)
            border: `2px dotted ${stickerBorderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${px * 0.09}px`,
            boxSizing: 'border-box',
            fontFamily,
            fontWeight,
            color: stickerTextColor,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 🔥 Guía interna: sólido fino (margen de seguridad de impresión) */}
          <div
            style={{
              position: 'absolute',
              inset: `${px * 0.035}px`,
              borderRadius: isCircle ? '50%' : '18px',
              border: `1px solid ${stickerGuideColor}`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* Contenido */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              gap: `${px * 0.03}px`,
            }}
          >
            <StickerContent
              templateId={currentTemplate.id}
              px={px}
              logoUrl={logoUrl}
              storeName={storeName}
              storeCity={storeCity}
              storeInstagram={storeInstagram}
              storeWhatsapp={storeWhatsapp}
              primaryColor={primaryColor}
              accentColor={accentColor}
              qrDataUrl={qrDataUrl}
              stickerTextColor={stickerTextColor}
              stickerMutedColor={stickerMutedColor}
              isStickerBgLight={isStickerBgLight}
            />
          </div>
        </div>
      );
    },
    [
      shape,
      currentTemplate.id,
      logoUrl,
      storeName,
      storeCity,
      storeInstagram,
      storeWhatsapp,
      primaryColor,
      secondaryColor,
      accentColor,
      qrDataUrl,
      fontFamily,
      fontWeight,
    ]
  );

  // ============================================================
  // DESCARGA PNG
  // ============================================================
  const handleDownloadPng = useCallback(async () => {
    if (!stickerRef.current) return;
    setIsDownloadingPng(true);
    try {
      // 300 DPI real: para 50mm = 5cm = 1.9685in → 590.55px
      // Usamos 10x scale sobre 400px base = 4000px → sobra para cualquier tamaño
      // 🔥 Pre-cargar la fuente del tenant antes de exportar
      try {
        await document.fonts.load(`700 16px "${fontFamily}"`);
        await document.fonts.load(`900 16px "${fontFamily}"`);
        await document.fonts.load(`400 16px "${fontFamily}"`);
        await document.fonts.ready;
      } catch (e) {
        console.warn('[StickersTab] No se pudo pre-cargar la fuente:', e);
      }


      const dataUrl = await safeToPng(stickerRef.current, {
        pixelRatio: 10,
        cacheBust: true,
        backgroundColor: stickerBg,
        filter: (node: any) => {
          if (node?.tagName === 'LINK' || node?.tagName === 'STYLE') {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement('a');
      const slug = slugifyName(storeName);
      link.download = `sticker-${currentTemplate.id}-${slug}-${sizeMM}mm.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar PNG:', err);
      showToast({
        variant: 'error',
        message: 'No se pudo generar el sticker. Intentá de nuevo.',
      });
    } finally {
      setIsDownloadingPng(false);
    }
  }, [currentTemplate.id, storeName, sizeMM, stickerBg, showToast]);
  // ============================================================
  // DESCARGA PDF A4 (12 stickers en grid 3×4)
  // ============================================================
  const handleDownloadPdf = useCallback(async () => {
    if (!stickerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      // 🔥 Pre-cargar la fuente del tenant antes de exportar
      try {
        await document.fonts.load(`700 16px "${fontFamily}"`);
        await document.fonts.load(`900 16px "${fontFamily}"`);
        await document.fonts.load(`400 16px "${fontFamily}"`);
        await document.fonts.ready;
      } catch (e) {
        console.warn('[StickersTab] No se pudo pre-cargar la fuente:', e);
      }



      const dataUrl = await safeToPng(stickerRef.current, {
        pixelRatio: 10,
        cacheBust: true,
        backgroundColor: stickerBg,
        filter: (node: any) => {
          if (node?.tagName === 'LINK' || node?.tagName === 'STYLE') {
            return false;
          }
          return true;
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const a4W = 210;
      const a4H = 297;
      const cols = 3;
      const rows = 4;
      const marginX = 10;
      const marginY = 10;
      const gapX = 5;
      const gapY = 5;
      const cellW = (a4W - marginX * 2 - gapX * (cols - 1)) / cols;
      const cellH = (a4H - marginY * 2 - gapY * (rows - 1)) / rows;
      const stickerSize = Math.min(cellW, cellH, sizeMM);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = marginX + c * (cellW + gapX) + (cellW - stickerSize) / 2;
          const y = marginY + r * (cellH + gapY) + (cellH - stickerSize) / 2;
          pdf.addImage(dataUrl, 'PNG', x, y, stickerSize, stickerSize);
        }
      }

      const slug = slugifyName(storeName);
      pdf.save(`stickers-${currentTemplate.id}-${slug}-${sizeMM}mm.pdf`);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      showToast({
        variant: 'error',
        message: 'No se pudo generar el PDF. Intentá de nuevo.',
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [currentTemplate.id, storeName, sizeMM, stickerBg, showToast]);
  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div>
        <h4 className="text-sm font-bold" style={{ color: textColor }}>
          Stickers imprimibles
        </h4>
        <p className="text-[11px] opacity-60 mt-0.5" style={{ color: textColor }}>
          Generá stickers listos para imprimir con tu logo, colores y redes sociales.
          Descargá el PNG individual o una hoja A4 con 12 stickers.
        </p>
      </div>

      {/* CONTROLES: FORMA + TAMAÑO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* FORMA */}
        <div className="p-3 rounded-2xl border" style={{ backgroundColor: itemBg, borderColor: cardBorder }}>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 opacity-70" style={{ color: textColor }}>
            Forma
          </label>
          <div className="flex gap-2">
            {(['circle', 'square'] as Shape[]).map((s) => {
              const ShapeIcon = s === 'circle' ? Circle : Square;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold border transition inline-flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: shape === s ? `${primaryColor}20` : 'transparent',
                    borderColor: shape === s ? primaryColor : cardBorder,
                    color: shape === s ? primaryColor : panelTextColor,
                  }}
                >
                  <ShapeIcon className="w-3.5 h-3.5" />
                  {s === 'circle' ? 'Circular' : 'Cuadrada'}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAMAÑO */}
        <div className="p-3 rounded-2xl border" style={{ backgroundColor: itemBg, borderColor: cardBorder }}>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 opacity-70" style={{ color: textColor }}>
            Tamaño
          </label>
          <div className="flex gap-2">
            {([40, 50, 70] as SizeMM[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSizeMM(s)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold border transition"
                style={{
                  backgroundColor: sizeMM === s ? `${primaryColor}20` : 'transparent',
                  borderColor: sizeMM === s ? primaryColor : cardBorder,
                  color: sizeMM === s ? primaryColor : textColor,
                }}
              >
                {s}mm
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID DE PLANTILLAS */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 opacity-70" style={{ color: textColor }}>
          Plantilla
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTemplate(t.id)}
                className="p-3 rounded-2xl border text-left transition hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: isSelected ? `${primaryColor}15` : itemBg,
                  borderColor: isSelected ? primaryColor : cardBorder,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5" />
                                    <span
                    className="text-[11px] font-bold truncate"
                    style={{ color: isSelected ? primaryColor : textColor }}
                  >
                    {t.label}
                  </span>
                </div>
                <p className="text-[9px] opacity-60 leading-tight" style={{ color: textColor }}>
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PREVIEW */}
      <div className="p-4 rounded-2xl border" style={{ backgroundColor: itemBg, borderColor: cardBorder }}>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-3 opacity-70" style={{ color: textColor }}>
          Vista previa ({sizeMM}mm {shape === 'circle' ? 'circular' : 'cuadrada'})
        </label>
        <div className="flex justify-center">
          <StickerRender scale={1} />
        </div>
      </div>

      {/* BOTONES DE DESCARGA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isDownloadingPng}
          className="py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Download className="w-4 h-4" />
          {isDownloadingPng ? 'Generando PNG...' : 'Descargar PNG'}
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="py-3 rounded-2xl text-xs font-bold border transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            borderColor: `${primaryColor}40`,
            color: primaryColor,
            backgroundColor: `${primaryColor}08`,
          }}
        >
          <FileText className="w-4 h-4" />
          {isDownloadingPdf ? 'Generando PDF...' : 'Descargar hoja A4 (12)'}
        </button>
      </div>

      {/* NOTA AL PIE */}
      <p className="text-[9px] opacity-40 text-center" style={{ color: textColor }}>
        Los stickers se generan con tu logo, colores y fuente configurados.
        Borde negro = línea de corte.
      </p>
    </div>
  );
}

// ============================================================
// 🔥 CONTENIDO DEL STICKER SEGÚN PLANTILLA
// ============================================================// ============================================================
// 🔥 CONTENIDO DEL STICKER SEGÚN PLANTILLA
// ============================================================
function StickerContent({
  templateId,
  px,
  logoUrl,
  storeName,
  storeCity,
  storeInstagram,
  storeWhatsapp,
  primaryColor,
  accentColor,
  qrDataUrl,
  stickerTextColor,
  stickerMutedColor,
  isStickerBgLight,
}: {
  templateId: TemplateId;
  px: number;
  logoUrl: string;
  storeName: string;
  storeCity: string;
  storeInstagram: string;
  storeWhatsapp: string;
  primaryColor: string;
  accentColor: string;
  qrDataUrl: string;
  stickerTextColor: string;
  stickerMutedColor: string;
  isStickerBgLight: boolean;
}) {
  const logoSize = px * 0.42;
  const smallLogo = px * 0.28;
  const tinyLogo = px * 0.22;

  // 🔥 Logo SIN círculo forzado: la imagen respira completa
  const LogoImage = ({ size }: { size: number }) => (
    logoUrl ? (
      <img
        src={logoUrl}
        alt="logo"
        crossOrigin="anonymous"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'block',
          borderRadius: 0,
          clipPath: 'none',
          WebkitClipPath: 'none',
          overflow: 'visible',
          aspectRatio: 'auto',
        }}
      />
    ) : (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${size * 0.6}px`,
          fontWeight: 900,
          color: primaryColor,
        }}
      >
        {(storeName || 'T').charAt(0).toUpperCase()}
      </div>
    )
  );

  switch (templateId) {
    case 'logo':
      return (
        <>
          <LogoImage size={logoSize * 1.15} />
          <span
            style={{
              fontSize: `${px * 0.055}px`,
              fontWeight: 800,
              color: stickerTextColor,
              letterSpacing: '0.02em',
            }}
          >
            {storeName}
          </span>
        </>
      );

    case 'thanks':
      return (
        <>
          <LogoImage size={smallLogo} />
          <span
            style={{
              fontSize: `${px * 0.1}px`,
              fontWeight: 900,
              color: primaryColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            ¡GRACIAS!
          </span>
          <span
            style={{
              fontSize: `${px * 0.05}px`,
              fontWeight: 700,
              color: stickerTextColor,
            }}
          >
            por tu compra
          </span>
        </>
      );

    case 'comeback':
      return (
        <>
          <LogoImage size={smallLogo} />
          <span
            style={{
              fontSize: `${px * 0.085}px`,
              fontWeight: 900,
              color: primaryColor,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            ¡Vuelve pronto!
          </span>
          <span
            style={{
              fontSize: `${px * 0.045}px`,
              fontWeight: 600,
              color: stickerTextColor,
              opacity: 0.85,
            }}
          >
            {storeName}
          </span>
        </>
      );

    case 'follow':
      return (
        <>
          <LogoImage size={tinyLogo} />
          <span
            style={{
              fontSize: `${px * 0.065}px`,
              fontWeight: 900,
              color: primaryColor,
              letterSpacing: '-0.01em',
            }}
          >
            ¡Sígueme!
          </span>
          {storeInstagram && (
            <span
              style={{
                fontSize: `${px * 0.05}px`,
                fontWeight: 700,
                color: stickerTextColor,
              }}
            >
              @{storeInstagram.replace('@', '')}
            </span>
          )}
          {storeWhatsapp && (
            <span
              style={{
                fontSize: `${px * 0.045}px`,
                fontWeight: 600,
                color: stickerTextColor,
                opacity: 0.8,
              }}
            >
              {storeWhatsapp}
            </span>
          )}
        </>
      );

    case 'qr':
      return (
        <>
          <LogoImage size={px * 0.18} />
          <span
            style={{
              fontSize: `${px * 0.05}px`,
              fontWeight: 800,
              color: stickerTextColor,
              lineHeight: 1.1,
            }}
          >
            {storeName}
          </span>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR"
              style={{
                width: `${px * 0.32}px`,
                height: `${px * 0.32}px`,
                display: 'block',
                borderRadius: `${px * 0.02}px`,
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: `${px * 0.32}px`,
                height: `${px * 0.32}px`,
                backgroundColor: '#eee',
                borderRadius: `${px * 0.02}px`,
              }}
            />
          )}
          <span
            style={{
              fontSize: `${px * 0.033}px`,
              fontWeight: 700,
              color: stickerMutedColor,
              letterSpacing: '0.02em',
            }}
          >
            Escaneá para visitar
          </span>
        </>
      );

    case 'love':
      return (
        <>
          <LogoImage size={smallLogo} />
          <span
            style={{
              fontSize: `${px * 0.11}px`,
              fontWeight: 900,
              color: primaryColor,
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            Hecho con
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: `${px * 0.02}px`,
              fontSize: `${px * 0.11}px`,
              fontWeight: 900,
              color: primaryColor,
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            amor
            <span
              style={{
                fontSize: `${px * 0.1}px`,
                lineHeight: 1,
              }}
            >
              ♥
            </span>
          </span>
          <span
            style={{
              fontSize: `${px * 0.038}px`,
              fontWeight: 600,
              color: stickerTextColor,
              opacity: 0.75,
              marginTop: `${px * 0.015}px`,
            }}
          >
            {storeName}
          </span>
        </>
      );

    case 'discount':
      return (
        <>
          <span
            style={{
              fontSize: `${px * 0.035}px`,
              fontWeight: 800,
              color: stickerMutedColor,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Descuento exclusivo
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: primaryColor,
              color: '#FFFFFF',
              padding: `${px * 0.025}px ${px * 0.06}px`,
              borderRadius: `${px * 0.04}px`,
              marginTop: `${px * 0.01}px`,
              marginBottom: `${px * 0.01}px`,
            }}
          >
            <span
              style={{
                fontSize: `${px * 0.19}px`,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              -10%
            </span>
          </div>

          <span
            style={{
              fontSize: `${px * 0.052}px`,
              fontWeight: 800,
              color: stickerTextColor,
              lineHeight: 1.15,
              textAlign: 'center',
              maxWidth: '85%',
            }}
          >
            en tu próxima compra
          </span>

          <LogoImage size={px * 0.13} />
        </>
      );

    case 'verified':
      return (
        <>
          <LogoImage size={smallLogo} />

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${px * 0.14}px`,
              height: `${px * 0.14}px`,
              borderRadius: '50%',
              backgroundColor: primaryColor,
              color: '#FFFFFF',
              marginTop: `${px * 0.02}px`,
            }}
          >
            <span
              style={{
                fontSize: `${px * 0.09}px`,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              ✓
            </span>
          </div>

          <span
            style={{
              fontSize: `${px * 0.065}px`,
              fontWeight: 900,
              color: stickerTextColor,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              marginTop: `${px * 0.01}px`,
            }}
          >
            Producto verificado
          </span>

          <span
            style={{
              fontSize: `${px * 0.034}px`,
              fontWeight: 600,
              color: stickerMutedColor,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Calidad garantizada
          </span>
        </>
      );

    default:
      return null;
  }
}