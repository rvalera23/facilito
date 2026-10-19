'use client';

import { useState } from 'react';
import Image from 'next/image';

interface StoreFooterProps {
  isSecondaryLight: boolean;
  textMutedClass: string;
  tenant: any;
  textMainClass: string;
  primary: string;
  secondary?: string;        // ✅ NUEVO
  categories?: string[];
  logoSource?: string;
  products?: any[];
  onCategorySelect?: (category: string) => void;
}

export default function StoreFooter({ 
  isSecondaryLight, 
  textMutedClass, 
  tenant, 
  textMainClass, 
  primary,
  secondary,                 // ✅ NUEVO
  categories = [],
  logoSource,
  products = [],
  onCategorySelect,
}: StoreFooterProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);

  // 📍 Dirección - SOLO UNA (la primera)
  const storeAddress = tenant?.address || tenant?.direccion || '';
  const storeCity = tenant?.city || tenant?.ciudad || '';
  const fullAddress = storeAddress || storeCity || '';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  // 📱 Redes Sociales
  const socialLinks = {
    instagram: tenant?.instagram || '',
    facebook: tenant?.facebook || '',
    twitter: tenant?.xTwitter || tenant?.twitter || '',
    tiktok: tenant?.tiktok || '',
    youtube: tenant?.youtube || '',
    linkedin: tenant?.linkedin || '',
    telegram: tenant?.telegram || '',
    threads: tenant?.threads || '',
  };
  const hasSocials = Object.values(socialLinks).some(link => link && link.trim() !== '');
  
  const resolvedLogo = logoSource || tenant?.logoUrl || tenant?.logo || tenant?.image;

  // 🔥 Categorías
  const uniqueCategories = categories.length > 0 
    ? categories 
    : products
        .filter((p: any) => p.category)
        .map((p: any) => p.category)
        .filter((cat: string, index: number, self: string[]) => self.indexOf(cat) === index);

  const displayedCategories = showAllCategories ? uniqueCategories : uniqueCategories.slice(0, 6);

  // 🔥 HORARIOS
  const schedule = tenant?.specificConfig?.schedule || {};
  const hasSchedule = Object.keys(schedule).length > 0;

  const getScheduleDisplay = () => {
    if (!hasSchedule) return null;
    
    const dayLabels: Record<string, string> = {
      monday: 'Lun',
      tuesday: 'Mar',
      wednesday: 'Mié',
      thursday: 'Jue',
      friday: 'Vie',
      saturday: 'Sáb',
      sunday: 'Dom',
    };
    
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const openDays = dayOrder
      .filter(day => schedule[day] && !schedule[day].closed)
      .map(day => ({
        key: day,
        label: dayLabels[day] || day,
        open: schedule[day].open || '00:00',
        close: schedule[day].close || '23:59',
      }));
    
    if (openDays.length === 0) return 'Cerrado';
    
    const allSameTime = openDays.every(d => d.open === openDays[0].open && d.close === openDays[0].close);
    const isAllDay = openDays.every(d => d.open === '00:00' && d.close === '23:59');
    
    if (isAllDay && openDays.length === 7) return 'Todos los días • 24h';
    
    if (allSameTime && openDays.length === 7) {
      const timeStr = openDays[0].open === '00:00' && openDays[0].close === '23:59' 
        ? '24h' 
        : `${openDays[0].open} - ${openDays[0].close}`;
      return `Todos los días • ${timeStr}`;
    }
    
    if (allSameTime && openDays.length > 1) {
      const firstIdx = dayOrder.indexOf(openDays[0].key);
      const lastIdx = dayOrder.indexOf(openDays[openDays.length - 1].key);
      const isConsecutive = openDays.length === (lastIdx - firstIdx + 1);
      
      let daysStr = '';
      if (isConsecutive) {
        daysStr = `${openDays[0].label} a ${openDays[openDays.length - 1].label}`;
      } else {
        daysStr = openDays.map(d => d.label).join(', ');
      }
      
      const timeStr = openDays[0].open === '00:00' && openDays[0].close === '23:59' 
        ? '24h' 
        : `${openDays[0].open} - ${openDays[0].close}`;
      
      return `${daysStr} • ${timeStr}`;
    }
    
    return openDays.map(d => {
      const timeStr = d.open === '00:00' && d.close === '23:59' ? '24h' : `${d.open} - ${d.close}`;
      return `${d.label} ${timeStr}`;
    }).join(' • ');
  };

  const scheduleDisplay = getScheduleDisplay();

  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const mutedColor = isSecondaryLight ? 'text-slate-500' : 'text-slate-400';

  // 🔥 Color de fondo dinámico para el footer (hereda del tema)
  const footerBg = isSecondaryLight 
    ? 'rgba(255, 255, 255, 0.85)' 
    : (secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)');

  // ============================================================
  // 🔥 ICONOS SVG
  // ============================================================
  const ShieldIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  const HeartIcon = () => (
    <svg className="w-3 h-3 text-rose-500 fill-rose-500" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );

  const MapPinIcon = () => (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const ExternalLinkIcon = () => (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const InstagramIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );

  const FacebookIcon = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );

  const TwitterIcon = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  const YoutubeIcon = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );

  const LinkedinIcon = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );

  const TikTokIcon = () => (
    <svg className="w-3.5 h-3.5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.76-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );

  const SocialIconWrapper = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" 
       className="p-1.5 rounded-lg border transition-transform duration-300 hover:scale-110 hover:opacity-80"
       style={{ borderColor: borderColor }}>
      {children}
    </a>
  );

  // 🔥 Compartir
  const handleShare = () => {
    const shareData = {
      title: tenant?.name || 'Ubicación',
      text: `📍 ${fullAddress}`,
      url: googleMapsUrl,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(`📍 ${tenant?.name || 'Tienda'}\n${fullAddress}\n${googleMapsUrl}`)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        })
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    const text = `📍 ${tenant?.name || 'Tienda'}\n${fullAddress}\n${googleMapsUrl}`;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
    document.body.removeChild(textarea);
  };

  // Footer simple
  if (!fullAddress && !hasSocials && uniqueCategories.length === 0 && !hasSchedule) {
    return (
      <footer 
        className={`w-full max-w-full box-border overflow-x-hidden mt-16 px-4 sm:px-8 py-6 border-t ${isSecondaryLight ? 'border-slate-200/60 shadow-sm text-slate-900' : 'border-white/10 shadow-lg shadow-black/20 text-white'}`}
        style={{ backgroundColor: footerBg }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            {resolvedLogo ? (
              <Image
                src={resolvedLogo}
                alt={tenant.name}
                width={100}
                height={32}
                className="h-8 w-auto max-w-[100px] object-contain"
                quality={80}
              />
            ) : (
              <div 
                className="h-8 w-8 rounded-xl flex items-center justify-center font-black text-base shadow-inner shrink-0" 
                style={{ backgroundColor: primary + '25', color: primary }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
            <div>
              <p className={`font-black text-xs tracking-tight ${textMainClass}`}>{tenant.name}</p>
              <p className={`text-[10px] ${textMutedClass}`}>© {new Date().getFullYear()} Todos los derechos reservados</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm ${isSecondaryLight ? 'bg-white/40 border-slate-200/80 text-slate-700' : 'bg-white/10 border-white/15 text-slate-300'}`}>
              <ShieldIcon />
              <span className="text-[10px] font-bold tracking-wide">Plataforma Segura</span>
            </div>
            <p className={`text-[10px] font-medium flex items-center gap-1 ${textMutedClass}`}>
              Impulsado con <HeartIcon /> para comercio local
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // ============================================================
  // 🔥 FOOTER - COMPACTO Y LIMPIO CON CAMPOS ADICIONALES
  // ============================================================
  return (
    <footer 
      className={`w-full max-w-full box-border overflow-x-hidden mt-16 border-t ${isSecondaryLight ? 'border-slate-200/60 shadow-lg shadow-slate-200/30 text-slate-900' : 'border-white/10 shadow-2xl shadow-black/50 text-white'}`}
      style={{ backgroundColor: footerBg }}
    >
      <div className="w-full px-6 sm:px-10 lg:px-16 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* ✅ COLUMNA 1: Logo + Eslogan + Horario + Redes Sociales */}
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center gap-2.5">
              {resolvedLogo ? (
                <Image
                  src={resolvedLogo}
                  alt={tenant.name}
                  width={80}
                  height={28}
                  className="h-7 w-auto max-w-[80px] object-contain"
                  quality={80}
                />
              ) : (
                <div className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-base shadow-inner shrink-0" 
                     style={{ backgroundColor: primary + '20', color: primary }}>
                  {tenant.name.charAt(0)}
                </div>
              )}
              <span className={`w-px h-4 ${isSecondaryLight ? 'bg-slate-300' : 'bg-white/30'}`}></span>
              <p className={`text-[10px] font-medium leading-tight ${mutedColor}`}>
                {tenant.slogan || tenant.name}
              </p>
            </div>
            
            {scheduleDisplay && (
              <div className={`flex items-center gap-1.5 text-[10px] ${mutedColor}`}>
                <ClockIcon />
                <span className="font-medium">Horario:</span>
                <span>{scheduleDisplay}</span>
              </div>
            )}

            {/* Redes Sociales */}
            {hasSocials && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {socialLinks.instagram && (
                  <SocialIconWrapper href={socialLinks.instagram}><InstagramIcon /></SocialIconWrapper>
                )}
                {socialLinks.facebook && (
                  <SocialIconWrapper href={socialLinks.facebook}><FacebookIcon /></SocialIconWrapper>
                )}
                {socialLinks.twitter && (
                  <SocialIconWrapper href={socialLinks.twitter}><TwitterIcon /></SocialIconWrapper>
                )}
                {socialLinks.tiktok && (
                  <SocialIconWrapper href={socialLinks.tiktok}><TikTokIcon /></SocialIconWrapper>
                )}
                {socialLinks.youtube && (
                  <SocialIconWrapper href={socialLinks.youtube}><YoutubeIcon /></SocialIconWrapper>
                )}
                {socialLinks.linkedin && (
                  <SocialIconWrapper href={socialLinks.linkedin}><LinkedinIcon /></SocialIconWrapper>
                )}
                {socialLinks.telegram && (
                  <SocialIconWrapper href={socialLinks.telegram}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </SocialIconWrapper>
                )}
              </div>
            )}
          </div>

          {/* ✅ COLUMNA 2: Categorías */}
          {uniqueCategories.length > 0 && (
            <div className="flex flex-col h-full">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${mutedColor} mb-2`}>Categorías</h4>
              <div className="flex flex-wrap gap-1">
                {displayedCategories.map((category: string) => (
                  <button
                    key={category}
                    onClick={() => { if (onCategorySelect) onCategorySelect(category); }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-medium transition-transform duration-300 border hover:scale-105 ${
                      isSecondaryLight 
                        ? 'bg-slate-100/80 border-slate-200 hover:bg-slate-200 text-slate-700' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {uniqueCategories.length > 6 && (
                <button onClick={() => setShowAllCategories(!showAllCategories)} className={`text-[9px] font-medium transition hover:opacity-70 mt-1.5 text-left`} style={{ color: primary }}>
                  {showAllCategories ? 'Ver menos' : `Ver todas (${uniqueCategories.length})`}
                </button>
              )}
            </div>
          )}

          {/* ✅ COLUMNA 3: Ubicación */}
          {fullAddress && (
            <div className="flex flex-col h-full">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${mutedColor} mb-2`}>Ubicación</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPinIcon />
                  <div className="flex-1 min-w-0">
                    <div className="relative group">
                      <p className={`text-[10px] leading-snug ${mutedColor} line-clamp-2 cursor-help`}>
                        {storeAddress}
                      </p>
                      {storeAddress.length > 60 && (
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50">
                          <div className={`text-[9px] p-2 rounded-lg shadow-xl max-w-xs border ${isSecondaryLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-white/10 text-white'}`}>
                            {storeAddress}
                          </div>
                        </div>
                      )}
                    </div>
                    {storeCity && (
                      <p className={`text-[9px] ${mutedColor}`}>
                        {storeCity}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-6">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-medium text-white transition hover:opacity-80"
                    style={{ backgroundColor: primary }}
                  >
                    <ExternalLinkIcon />
                    Ver en Maps
                  </a>
                  <button
                    onClick={handleShare}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-medium transition hover:opacity-70 border ${mutedColor}`}
                    style={{ borderColor: borderColor, color: isSecondaryLight ? '#1e293b' : '#e2e8f0' }}
                  >
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {copySuccess ? '¡Copiado!' : 'Compartir'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ COLUMNA 4: Información Adicional (customFields) */}
          {(() => {
            const customFields = tenant?.customFields || tenant?.specificConfig?.customFields || [];
            const validFields = customFields.filter((f: any) => f.key && f.key.trim() !== '' && f.value && f.value.trim() !== '');
            
            if (validFields.length === 0) return null;
            
            return (
              <div className="flex flex-col h-full">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider ${mutedColor} mb-2`}>
                  Información Adicional
                </h4>
                <div className="space-y-1.5">
                  {validFields.map((field: any, idx: number) => (
                    <div key={idx} className="flex flex-col">
                      <span className={`text-[9px] font-semibold ${mutedColor}`}>
                        {field.key}
                      </span>
                      <span className={`text-[10px] ${mutedColor}`}>
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div className={`w-full border-t px-6 sm:px-10 lg:px-16 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-1.5 ${isSecondaryLight ? 'border-slate-200/60' : 'border-white/5'}`}>
        <p className={`text-[9px] font-medium ${mutedColor}`}>© {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.</p>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${mutedColor}`}>
            <ShieldIcon />
            <span className="text-[9px] font-medium">Compra segura</span>
          </div>
          <span className={`text-[9px] ${mutedColor}`}>•</span>
          <p className={`text-[9px] font-medium flex items-center gap-1 ${mutedColor}`}>
            Impulsado con <HeartIcon /> para comercio local
          </p>
        </div>
      </div>
    </footer>
  );
}