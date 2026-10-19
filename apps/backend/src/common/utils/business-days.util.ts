// ==========================================
// ARCHIVO: apps/backend/src/common/utils/business-days.util.ts
// Utilidades de días hábiles (business days) para Venezuela.
// Excluye sábados, domingos y feriados nacionales 2025-2026.
// Alineado con el estándar de la industria (Amazon, eBay): feriados
// hardcodeados, sin config por tenant.
// ==========================================

/**
 * Feriados nacionales de Venezuela 2025-2026 (formato ISO YYYY-MM-DD).
 * Incluye feriados fijos y movibles (Carnaval, Semana Santa) ya calculados.
 */
const VE_HOLIDAYS: ReadonlySet<string> = new Set([
  // ── 2025 ────────────────────────────────────────────────
  '2025-01-01', // Año Nuevo
  '2025-03-03', // Lunes de Carnaval
  '2025-03-04', // Martes de Carnaval
  '2025-04-17', // Jueves Santo
  '2025-04-18', // Viernes Santo
  '2025-04-19', // Declaración de la Independencia (sábado, igual lo marco)
  '2025-05-01', // Día del Trabajador
  '2025-06-23', // Batalla de Carabobo
  '2025-07-05', // Independencia
  '2025-07-24', // Natalicio de Bolívar
  '2025-10-12', // Día de la Raza
  '2025-12-24', // Nochebuena
  '2025-12-25', // Navidad
  '2025-12-31', // Fin de año

  // ── 2026 ────────────────────────────────────────────────
  '2026-01-01', // Año Nuevo
  '2026-02-16', // Lunes de Carnaval
  '2026-02-17', // Martes de Carnaval
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajador
  '2026-06-23', // Batalla de Carabobo
  '2026-07-05', // Independencia
  '2026-07-24', // Natalicio de Bolívar
  '2026-10-12', // Día de la Raza
  '2026-12-24', // Nochebuena
  '2026-12-25', // Navidad
  '2026-12-31', // Fin de año
]);

/**
 * Normaliza una fecha a YYYY-MM-DD usando UTC para evitar drift de zona.
 */
function toKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Devuelve true si la fecha es un día hábil (no sábado, no domingo, no feriado).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay(); // 0 = domingo, 6 = sábado
  if (day === 0 || day === 6) return false;
  return !VE_HOLIDAYS.has(toKey(date));
}

/**
 * Suma n días hábiles a una fecha.
 * Si la fecha de inicio no es hábil, arranca desde el siguiente día hábil.
 * n = 0 devuelve la fecha normalizada al siguiente día hábil.
 */
export function addBusinessDays(date: Date, n: number): Date {
  const result = new Date(date.getTime());

  if (n === 0) {
    while (!isBusinessDay(result)) {
      result.setUTCDate(result.getUTCDate() + 1);
    }
    return result;
  }

  // Para n > 0: avanzar hasta el próximo día hábil y contar n
  if (n > 0) {
    while (!isBusinessDay(result)) {
      result.setUTCDate(result.getUTCDate() + 1);
    }
    let remaining = n;
    while (remaining > 0) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (isBusinessDay(result)) remaining--;
    }
    return result;
  }

  // Para n < 0: retroceder n días hábiles
  let remaining = -n;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() - 1);
    if (isBusinessDay(result)) remaining--;
  }
  return result;
}

/**
 * Cuenta los días hábiles entre dos fechas (a → b).
 * No cuenta el día de inicio; cuenta el día final si es hábil.
 * Si b < a devuelve negativo.
 */
export function businessDaysBetween(a: Date, b: Date): number {
  if (b.getTime() === a.getTime()) return 0;

  const sign = b.getTime() > a.getTime() ? 1 : -1;
  const start = sign > 0 ? new Date(a.getTime()) : new Date(b.getTime());
  const end = sign > 0 ? new Date(b.getTime()) : new Date(a.getTime());

  let count = 0;
  const cursor = new Date(start.getTime());

  while (cursor.getTime() < end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(cursor)) count++;
  }

  return count * sign;
}