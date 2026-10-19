// lib/formatPhone.ts
// Helper de SOLO LECTURA para mostrar teléfonos con formato visual.
// NO modifica nada de la lógica de guardado. Idempotente y a prueba de fallos.

type CountryFormat = {
  dialCode: string;
  format: string; // '#' = dígito, resto = literal
};

const COUNTRY_FORMATS: CountryFormat[] = [
  { dialCode: '+58', format: '(####) ###-####' }, // Venezuela con 0 (11 dígitos)
  { dialCode: '+58', format: '(###) ###-####' },  // Venezuela sin 0 (10 dígitos)
  { dialCode: '+1',  format: '(###) ###-####' },
  { dialCode: '+52', format: '## #### ####' },
  { dialCode: '+54', format: '### ###-####' },
  { dialCode: '+57', format: '### ### ####' },
  { dialCode: '+34', format: '### ### ###' },
  { dialCode: '+56', format: '### ### ####' },
  { dialCode: '+51', format: '### ### ###' },
  { dialCode: '+593', format: '## ### ####' },
  { dialCode: '+507', format: '### ####' },
  { dialCode: '+506', format: '#### ####' },
];

const DIAL_CODES_SORTED = ['+593', '+507', '+506', '+58', '+57', '+56', '+54', '+52', '+51', '+34', '+1'];

function applyFormat(digits: string, format: string): string {
  let out = '';
  let i = 0;
  for (let f = 0; f < format.length && i < digits.length; f++) {
    if (format[f] === '#') {
      out += digits[i];
      i++;
    } else {
      out += format[f];
    }
  }
  return out;
}

/**
 * Devuelve el teléfono formateado para MOSTRAR.
 * - Acepta: '+58 04141234567', '+58 4141234567', '04141234567', '4141234567', ya formateado, etc.
 * - countryCode es opcional (por si viene de tenants.country_code).
 * - Si no puede formatear, devuelve el string original (nunca rompe).
 */
export function formatPhoneDisplay(
  phone: string | null | undefined,
  countryCode?: string | null,
): string {
  if (!phone) return '';
  const raw = String(phone).trim();
  if (!raw) return '';

  // 1. Detectar dialCode: por countryCode explícito o por prefijo del propio string
  let dialCode: string | null = null;
  let body = raw;

  if (countryCode && DIAL_CODES_SORTED.includes(countryCode.trim())) {
    dialCode = countryCode.trim();
    body = raw.replace(/^\+\d+\s*/, '').trim();
  } else {
    const match = raw.match(/^(\+\d+)\s*(.*)$/);
    if (match && DIAL_CODES_SORTED.includes(match[1])) {
      dialCode = match[1];
      body = match[2];
    }
  }

  // 2. Extraer solo dígitos del cuerpo
  let digits = body.replace(/\D/g, '');
  if (!digits) return raw;

  // 3. Si no hay dialCode, asumimos Venezuela (fallback histórico del proyecto)
  if (!dialCode) {
    dialCode = '+58';
    // Si el número ya venía con 0 inicial, respetarlo
  }

  // 4. Elegir el formato correcto
  let format: string | null = null;

  if (dialCode === '+58') {
    // 🔥 NORMALIZAR: siempre agregar el 0 inicial si no lo tiene
    // Los teléfonos venezolanos se muestran siempre con 0 adelante (0414, 0424, etc.)
    if (digits.length === 10 && !digits.startsWith('0')) {
      digits = '0' + digits;
    }
    // Ahora todos los venezolanos tienen 11 dígitos (0 + 10)

    if (digits.length === 11 && digits.startsWith('0')) {
      format = '(####) ###-####';
    } else if (digits.length === 11) {
      // 11 dígitos sin 0 (raro, pero por si acaso), igual formateamos
      format = '(####) ###-####';
    }
  } else {  
    const candidates = COUNTRY_FORMATS.filter((c) => c.dialCode === dialCode);
    const match = candidates.find(
      (c) => c.format.replace(/[^#]/g, '').length === digits.length,
    );
    format = match?.format ?? null;
  }

  // 5. Fallback: si no matchea, devolvemos el original SIN tocar
  if (!format) return raw;

  return applyFormat(digits, format);
}