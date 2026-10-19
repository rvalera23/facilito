// ==========================================
// ARCHIVO: apps/frontend/app/tienda/[slug]/not-found.tsx
// ==========================================
import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
        Tienda no encontrada
      </h1>
      <p className="text-xs sm:text-sm opacity-70 max-w-md mb-6">
        El comercio que buscas no existe, no está disponible o el enlace es incorrecto.
      </p>
      <Link
        href="/"
        className="text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
      >
        Ir al Inicio
      </Link>
    </div>
  );
}