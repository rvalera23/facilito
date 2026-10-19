// utils/formatters.ts

export const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const parts = dateStr.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};

export const formatDateFull = (dateStr: string) => {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const parts = dateStr.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};

export const formatTime = (time: string) => {
  if (!time) return '--:--';
  try {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
};

export const formatPrice = (num: number) => {
  if (!num || num === 0) return null;
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};