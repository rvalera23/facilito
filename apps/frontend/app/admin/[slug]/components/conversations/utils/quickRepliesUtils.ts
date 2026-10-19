const DIAS_ES: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
};

const ORDEN_DIAS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const MODALIDAD_LABEL: Record<string, string> = {
  local: 'Atención en local',
  delivery: 'Solo delivery',
  hybrid: 'Local y delivery',
  online: 'Solo online',
};

const COMPANIA_LABEL: Record<string, string> = {
  mrw: 'MRW',
  domesa: 'Domesa',
  tealca: 'Tealca',
  zoom: 'Zoom',
};

function formatSchedule(schedule: any): string {
  if (!schedule || typeof schedule !== 'object') return '';

  const grupos: Array<{
    dias: string[];
    open: string;
    close: string;
    closed: boolean;
  }> = [];

  for (const dia of ORDEN_DIAS) {
    const info = schedule[dia];
    if (!info) continue;

    const open = info.open || '';
    const close = info.close || '';
    const closed = !!info.closed;

    const ultimo = grupos[grupos.length - 1];
    const mismoHorario =
      ultimo &&
      ultimo.open === open &&
      ultimo.close === close &&
      ultimo.closed === closed;

    if (mismoHorario) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ dias: [dia], open, close, closed });
    }
  }

  if (grupos.length === 0) return '';

  if (
    grupos.length === 1 &&
    grupos[0].dias.length === 7 &&
    !grupos[0].closed
  ) {
    return `Todos los días de ${grupos[0].open} a ${grupos[0].close}`;
  }

  return grupos
    .map((g) => {
      const diasLabel =
        g.dias.length === 1
          ? DIAS_ES[g.dias[0]]
          : `${DIAS_ES[g.dias[0]]}-${DIAS_ES[g.dias[g.dias.length - 1]]}`;

      if (g.closed) return `${diasLabel}: Cerrado`;
      return `${diasLabel} ${g.open}-${g.close}`;
    })
    .join(' · ');
}

export function buildTemplateVars(tenant: any): Record<string, string> {
  if (!tenant) return {};

  const specificConfig = tenant.specificConfig || {};
  const schedule = specificConfig.schedule;

  let telefono = '';
  if (tenant.phone) {
    telefono = `${tenant.countryCode || '+58'} ${tenant.phone}`.trim();
  }

  let direccion = '';
  if (tenant.address) {
    direccion = tenant.city
      ? `${tenant.address}, ${tenant.city}`
      : tenant.address;
  } else if (tenant.city) {
    direccion = tenant.city;
  }

  let envios = '';
  const activeCompanies = specificConfig?.delivery?.activeCompanies;
  if (Array.isArray(activeCompanies) && activeCompanies.length > 0) {
    envios = activeCompanies
      .map((c: string) => COMPANIA_LABEL[c.toLowerCase()] || c)
      .join(', ');
  }

  const modalidad = specificConfig?.workModality
    ? MODALIDAD_LABEL[specificConfig.workModality] ||
      specificConfig.workModality
    : '';

  return {
    nombre_tienda: tenant.name || '',
    eslogan: tenant.slogan || '',
    telefono,
    email: tenant.email || '',
    direccion,
    whatsapp: tenant.whatsapp || '',
    instagram: tenant.instagram || '',
    horario: formatSchedule(schedule),
    modalidad,
    envios,
  };
}

export function renderTemplate(
  text: string,
  vars: Record<string, string>,
): string {
  if (!text) return '';

  // 1. Reemplazar cada {{var}} por su valor (o cadena vacía si no tiene)
  let result = text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = vars[key];
    if (value === undefined || value === null) return '';
    const str = String(value).trim();
    return str;
  });

  // 2. Limpiar líneas vacías o que solo tienen "Label:" (sin valor)
  result = result
    .split('\n')
    .map((line) => {
      // Si la línea es solo whitespace → borrar
      if (line.trim() === '') return '';

      // Si la línea termina con ":" y no tiene nada después → borrar
      // Ej: "WhatsApp: " → borrar. "WhatsApp: +58..." → mantener.
      const trimmed = line.trim();
      if (/^[^:]+:\s*$/.test(trimmed)) {
        return '';
      }

      return line;
    })
    .filter((line, idx, arr) => {
      // Dejar solo una línea vacía consecutiva como máximo
      if (line.trim() === '') {
        if (idx === 0) return false;
        const prev = arr[idx - 1];
        return prev && prev.trim() !== '';
      }
      return true;
    })
    .join('\n')
    .trim();

  // 3. Limpiar espacios dobles, comas huérfanas, etc.
  result = result
    .replace(/ {2,}/g, ' ')        // espacios dobles → uno
    .replace(/\s+([,.!?])/g, '$1') // espacio antes de puntuación
    .replace(/([,.!?])\1+/g, '$1') // puntuación repetida
    .replace(/,\s*\./g, '.')       // ",." → "."
    .replace(/\.\s*,/g, '.')       // ".," → "."
    .replace(/,\s*$/gm, '')        // coma al final de línea
    .replace(/\(\s*\)/g, '')       // paréntesis vacíos
    .replace(/\s+$/gm, '');        // espacios al final de línea

  // 4. Colapsar múltiples saltos de línea en uno solo
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

export const AVAILABLE_VARIABLES: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  { key: 'nombre_tienda', label: 'Nombre de la tienda', description: 'El nombre comercial de tu tienda' },
  { key: 'eslogan', label: 'Eslogan', description: 'El eslogan o lema de tu tienda' },
  { key: 'telefono', label: 'Teléfono', description: 'Tu teléfono de contacto con código de país' },
  { key: 'email', label: 'Email', description: 'Tu correo electrónico de contacto' },
  { key: 'direccion', label: 'Dirección', description: 'Tu dirección física completa' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Tu número de WhatsApp' },
  { key: 'instagram', label: 'Instagram', description: 'Tu usuario de Instagram' },
  { key: 'horario', label: 'Horario', description: 'Tu horario de atención formateado' },
  { key: 'modalidad', label: 'Modalidad', description: 'Local, delivery, online o híbrido' },
  { key: 'envios', label: 'Empresas de envío', description: 'Las mensajerías que usás (MRW, Zoom, etc.)' },
];


// ============================================================
// 🔥 DETECTAR VARIABLES SIN VALOR EN UN TEXTO
// ============================================================
export function getMissingVars(
  text: string,
  vars: Record<string, string>,
): string[] {
  if (!text) return [];

  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  const missing: string[] = [];

  for (const m of matches) {
    const key = m.replace(/\{\{|\}\}/g, '');
    const value = vars[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      if (!missing.includes(key)) missing.push(key);
    }
  }

  return missing;
}