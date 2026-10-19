import type { LucideIcon } from 'lucide-react';

export type CommandSection = 'navigate' | 'action' | 'search';

export interface Command {
  id: string;
  label: string;
  keywords?: string[];
  section: CommandSection;
  icon: LucideIcon;
  hint?: string;
  action: () => void | Promise<void>;
  /** Se evalúa en runtime: si false, el comando no se muestra */
  visible?: () => boolean;
}
