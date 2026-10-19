// frontend/lib/groupNotificationsByDate.ts

export type DateGroupKey = 'today' | 'yesterday' | 'this_week' | 'older';

export interface DateGroup<T> {
  key: DateGroupKey;
  label: string;
  items: T[];
}

/**
 * 🔥 Agrupa items por fecha (Hoy / Ayer / Esta semana / Anteriores)
 * Estándar Slack/Gmail/Vinted.
 *
 * @param items Array de items con createdAt (ISO string o Date)
 * @param getDate Función para extraer la fecha (default: item.createdAt)
 */
export function groupNotificationsByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date | undefined = (item: any) => item?.createdAt
): DateGroup<T>[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const groups: Record<DateGroupKey, T[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  };

  for (const item of items) {
    const raw = getDate(item);
    if (!raw) {
      groups.older.push(item);
      continue;
    }
    const date = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(date.getTime())) {
      groups.older.push(item);
      continue;
    }

    if (date >= startOfToday) {
      groups.today.push(item);
    } else if (date >= startOfYesterday) {
      groups.yesterday.push(item);
    } else if (date >= startOfWeek) {
      groups.this_week.push(item);
    } else {
      groups.older.push(item);
    }
  }

  const labels: Record<DateGroupKey, string> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    this_week: 'Esta semana',
    older: 'Anteriores',
  };

  // Devolvemos solo los grupos con items, en orden
  const order: DateGroupKey[] = ['today', 'yesterday', 'this_week', 'older'];
  return order
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      key,
      label: labels[key],
      items: groups[key],
    }));
}