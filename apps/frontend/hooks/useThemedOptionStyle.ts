// frontend/hooks/useThemedOptionStyle.ts
// ============================================================
// 🔥 Hook para estilizar <option> con el tema actual
// ============================================================
// Los <select> nativos ignoran la mayoría de CSS cuando están
// cerrados, pero SÍ respetan `style` inline en los <option>
// (Chrome, Edge, Safari, Firefox moderno).
//
// Uso:
//   const optionStyle = useThemedOptionStyle();
//   <select>
//     <option style={optionStyle}>Uno</option>
//     <option style={optionStyle}>Dos</option>
//   </select>
// ============================================================

'use client';

import { useThemeBackground } from './useThemeBackground';
import { getContrastTextColor } from '@/lib/branding';

export function useThemedOptionStyle(): React.CSSProperties {
  const bgColor = useThemeBackground(undefined, false);
  const textColor = getContrastTextColor(bgColor);

  return {
    backgroundColor: bgColor,
    color: textColor,
  };
}