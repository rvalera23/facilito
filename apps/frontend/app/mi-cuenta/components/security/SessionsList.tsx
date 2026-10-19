'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

interface SessionsListProps {
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Hace ${d} día${d > 1 ? 's' : ''}`;
  const mo = Math.floor(d / 30);
  return `Hace ${mo} mes${mo > 1 ? 'es' : ''}`;
}

function DeviceIcon({ device }: { device: Session['device'] }) {
  if (device === 'mobile' || device === 'tablet') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

export default function SessionsList({ primary, textColor, isDarkBg }: SessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentRefresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/sessions', {
        headers: currentRefresh ? { 'X-Refresh-Token': currentRefresh } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudieron cargar las sesiones');
      }
      setSessions(data);
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (id: string) => {
    setActioningId(id);
    setError('');
    try {
      const res = await apiFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo cerrar la sesión');
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSuccessMessage('Sesión cerrada.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setActioningId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: currentRefresh ? { 'X-Refresh-Token': currentRefresh } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudieron cerrar las sesiones');
      setSuccessMessage(data.message || 'Sesiones cerradas.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSessions();
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setRevokingAll(false);
    }
  };

  const othersCount = sessions.filter((s) => !s.isCurrent).length;
  const cardBg = isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const subText = isDarkBg ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Sesiones activas
          </h4>
          <p className={`text-[11px] mt-0.5 ${subText}`}>
            Estos son los dispositivos donde iniciaste sesión. Si ves algo que no reconocés, cerralo.
          </p>
        </div>
        {othersCount > 0 && (
          <button
            type="button"
            onClick={handleRevokeAll}
            disabled={revokingAll}
            className="px-3 py-2 rounded-xl text-[11px] font-bold border transition cursor-pointer disabled:opacity-40"
            style={{
              borderColor: 'rgba(244,63,94,0.4)',
              color: '#f43f5e',
            }}
          >
            {revokingAll ? 'Cerrando...' : `Cerrar las otras ${othersCount}`}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded-xl text-center font-semibold">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] rounded-xl text-center font-semibold">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
            style={{ borderTopColor: 'transparent', borderRightColor: primary, borderBottomColor: primary, borderLeftColor: primary }}
          />
          <p className={`text-[11px] mt-2 ${subText}`}>Cargando sesiones...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-8 text-center">
          <p className={`text-[11px] ${subText}`}>No hay sesiones activas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
              style={{
                backgroundColor: cardBg,
                borderColor: s.isCurrent ? `${primary}66` : cardBorder,
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: s.isCurrent ? `${primary}22` : 'rgba(255,255,255,0.05)', color: s.isCurrent ? primary : textColor }}
                >
                  <DeviceIcon device={s.device} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold truncate" style={{ color: textColor }}>
                      {s.label}
                    </p>
                    {s.isCurrent && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${primary}22`, color: primary }}
                      >
                        Sesión actual
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${subText} truncate`}>
                    {s.ip ? `IP: ${s.ip}` : 'IP desconocida'} · {timeAgo(s.lastUsedAt || s.createdAt)}
                  </p>
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  disabled={actioningId === s.id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-40 hover:bg-rose-500/10"
                  style={{ color: '#f43f5e' }}
                >
                  {actioningId === s.id ? 'Cerrando...' : 'Cerrar'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
