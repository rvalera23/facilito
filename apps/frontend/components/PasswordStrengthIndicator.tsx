'use client';

interface Props {
  password: string;
  className?: string;
}

/**
 * Indicador visual de fortaleza de contraseña.
 * Coincide con la política del backend:
 *   - mínimo 8 caracteres
 *   - al menos una mayúscula
 *   - al menos una minúscula
 *   - al menos un número
 */
export default function PasswordStrengthIndicator({ password, className = '' }: Props) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = 4;
  const percent = (passed / total) * 100;

  let label = '';
  let color = '';
  if (passed === 0) {
    label = '';
    color = '';
  } else if (passed === 1) {
    label = 'Muy débil';
    color = '#ef4444';
  } else if (passed === 2) {
    label = 'Débil';
    color = '#f97316';
  } else if (passed === 3) {
    label = 'Buena';
    color = '#eab308';
  } else {
    label = 'Fuerte';
    color = '#22c55e';
  }

  return (
    <div className={`mt-2 ${className}`}>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] font-semibold" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] text-slate-500">
          {passed}/{total} requisitos
        </span>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        <li className={`text-[10px] ${checks.length ? 'text-emerald-400' : 'text-slate-500'}`}>
          {checks.length ? '✓' : '○'} Al menos 8 caracteres
        </li>
        <li className={`text-[10px] ${checks.upper ? 'text-emerald-400' : 'text-slate-500'}`}>
          {checks.upper ? '✓' : '○'} Una mayúscula
        </li>
        <li className={`text-[10px] ${checks.lower ? 'text-emerald-400' : 'text-slate-500'}`}>
          {checks.lower ? '✓' : '○'} Una minúscula
        </li>
        <li className={`text-[10px] ${checks.number ? 'text-emerald-400' : 'text-slate-500'}`}>
          {checks.number ? '✓' : '○'} Un número
        </li>
      </ul>
    </div>
  );
}
