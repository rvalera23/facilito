/**
 * Lista canónica de bancos venezolanos.
 *
 * Fuente única de verdad para:
 *  - <select> de bancos (usar BANK_LIST + getBankLabel)
 *  - Lookups de código → nombre (usar getBankName)
 *
 * NO duplicar esta lista en otros archivos.
 * Si necesitás agregar un banco, se agrega ACÁ y se propaga por import.
 */

export const VENEZUELAN_BANKS: Record<string, string> = {
  '0102': 'Banco de Venezuela',
  '0104': 'Banco Venezolano de Crédito',
  '0105': 'Banco Mercantil',
  '0108': 'Banco Provincial',
  '0114': 'Bancaribe',
  '0115': 'Banco Exterior',
  '0128': 'Banco Caroní',
  '0134': 'Banesco',
  '0137': 'Banco Sofitasa',
  '0138': 'Banco Plaza',
  '0146': 'Banco del Sur',
  '0151': 'BFC Banco Fondo Común',
  '0156': '100% Banco',
  '0157': 'Del Sur',
  '0163': 'Banco del Tesoro',
  '0166': 'Banco Agrícola de Venezuela',
  '0168': 'Bancrecer',
  '0169': 'Mi Banco',
  '0171': 'Banco Activo',
  '0172': 'Bancamiga',
  '0173': 'Banco Nacional de Crédito (BNC)',
  '0174': 'Banplus',
  '0175': 'Banco Bicentenario',
  '0176': 'Banco de la Fuerza Armada',
  '0177': 'Banfanb',
};

export const BANK_LIST: Array<{ code: string; name: string }> = Object.entries(
  VENEZUELAN_BANKS,
).map(([code, name]) => ({ code, name }));

/**
 * Devuelve solo el nombre del banco: "Banco de Venezuela".
 * Usar en lookups, modales, tickets, chat.
 * Si el código no existe, devuelve el código tal cual (fallback seguro).
 */
export function getBankName(code: string): string {
  if (!code) return '';
  return VENEZUELAN_BANKS[code] || code;
}

/**
 * Devuelve el label con código: "0102 - Banco de Venezuela".
 * Usar en <option> de <select> y en textos que muestran el código.
 * Si el código no existe, devuelve el código tal cual.
 */
export function getBankLabel(code: string): string {
  if (!code) return '';
  const name = VENEZUELAN_BANKS[code];
  return name ? `${code} - ${name}` : code;
}