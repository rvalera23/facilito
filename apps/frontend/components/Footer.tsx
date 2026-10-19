// ==========================================
// ARCHIVO: components/Footer.tsx (ACTUALIZADO - REDES SIN BADGES/BORDES)
// ==========================================
'use client';

import { useState, useEffect } from 'react';

export default function Footer() {
  const [isLight, setIsLight] = useState<boolean>(false);
  
  useEffect(() => {
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-slate-400';
  const borderTopColor = isLight ? 'border-slate-950/10' : 'border-white/10';
  const badgeBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)';

  const redesSociales = [
    { nombre: 'Instagram', url: 'https://instagram.com', icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> },
    { nombre: 'TikTok', url: 'https://tiktok.com', icono: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg> },
    { nombre: 'WhatsApp', url: 'https://whatsapp.com', icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
    { nombre: 'X / Twitter', url: 'https://twitter.com', icono: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { nombre: 'YouTube', url: 'https://youtube.com', icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor"/></svg> }
  ];

  return (
    <footer 
      className={`w-full border-t ${borderTopColor} py-12 px-6 sm:px-12 transition-colors duration-500 relative overflow-hidden`}
      style={{ backgroundColor: 'var(--bg-color, #09090B)' }}
    >
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start space-y-2">
          <span className={`text-lg font-black tracking-tight ${textColor} transition-colors duration-500`}>
            facil<span style={{ color: 'var(--accent-color, #F59E0B)' }}>i</span>to
                        <span 
              className="ml-2.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors duration-500 shadow-sm align-middle inline-block" 
              style={{ backgroundColor: badgeBg, borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', color: 'var(--accent-color, #F59E0B)' }}
            >
              Plataforma
            </span>
          </span>
          <p className={`${mutedTextColor} text-xs transition-colors duration-500 text-center md:text-left`}>
            © {new Date().getFullYear()} facilito. Todos los derechos reservados.
          </p>
        </div>

        <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 font-medium">
          {redesSociales.map((red, index) => (
            <a 
              key={index}
              href={red.url} 
              target="_blank" 
              rel="noreferrer" 
              className={`${mutedTextColor} hover:${textColor} transition-all duration-300 hover:scale-110 cursor-pointer flex items-center gap-2`}
            >
              {red.icono}
              <span className="hidden sm:inline text-xs">{red.nombre}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}