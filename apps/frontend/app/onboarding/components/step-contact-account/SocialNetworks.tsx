import React from 'react';
import { SOCIAL_NETWORKS_CONFIG } from './paymentConstants';

interface SocialNetworksProps {
  data: any;
  update: (fields: any) => void;
}

export default function SocialNetworks({ data, update }: SocialNetworksProps) {
  // Íconos SVG para cada red social
  const getSocialIcon = (key: string) => {
    switch (key) {
      case 'instagram':
        return <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
      case 'facebook':
        return <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
      case 'tiktok':
        return <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/></svg>;
      case 'x_twitter':
        return <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
      case 'threads':
        return <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/></svg>;
      case 'linkedin':
        return <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2.5 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold tracking-wider text-slate-700">
          Redes Sociales <span className="text-[10px] text-slate-400 font-normal">(Escribe solo tu usuario/slug)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
        {SOCIAL_NETWORKS_CONFIG?.map((net: any) => (
          <div 
            key={net.key} 
            className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden transition shadow-xs"
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color, #f97316)'}
            onBlur={(e) => e.currentTarget.style.borderColor = ''}
          >
            <div className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-slate-200 py-2 text-xs text-slate-700 flex-shrink-0 select-none">
              {getSocialIcon(net.key)}
              <span className="font-bold hidden sm:inline">{net.name}</span>
            </div>
            
            <div className="flex items-center w-full px-2.5 bg-transparent overflow-hidden">
              <span className="text-[11px] text-slate-400 select-none whitespace-nowrap">{net.baseUrl}</span>
              <input
                type="text"
                placeholder={net.placeholder}
                value={data[net.key] || ''}
                onChange={(e) => update({ [net.key]: e.target.value.trim() })}
                className="w-full bg-transparent py-2 text-xs outline-none border-none ring-0 focus:outline-none focus:ring-0 text-slate-900 font-medium"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}