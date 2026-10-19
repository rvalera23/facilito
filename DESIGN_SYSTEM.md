# Design System Facilito

Documentación viva del sistema de diseño de Facilito.
Última actualización: sesión de refactor del 7 de octubre de 2026.

---

## 📌 Reglas de oro

1. **TODO modal de éxito de guardado** DEBE usar `<SuccessModal>`.
2. **TODO modal de confirmación** DEBE usar `<ConfirmDialog>`.
3. **TODO botón primario/outline/danger** DEBE usar `<Button>`.
4. **TODO toast** DEBE usar `useToast()` de `<ToastProvider>`.
5. **TODO estado vacío** DEBE usar `<EmptyState>`.
6. **TODO spinner/loading** DEBE usar `<Loader>` o `<LoaderFullPage>`.
7. **NO** usar `window.confirm()` — usar `<ConfirmDialog>`.
8. **NO** usar `alert()` — usar `showToast()`.
9. **NO** crear `inputClass` locales (pendiente FASE 6).
10. **NO** crear `SuccessModal` inline — usar el canónico.

---

## 🧩 Componentes canónicos

| Componente | Ubicación | Fase |
|------------|-----------|------|
| `SuccessModal` | `components/ui/SuccessModal.tsx` | ✅ 1 |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | ✅ 1 |
| `Button` | `components/ui/Button.tsx` | ✅ 2 |
| `Toast` + `ToastProvider` + `ToastThemeProvider` + `useToast` | `components/ui/Toast.tsx`, `ToastProvider.tsx`, `ToastThemeProvider.tsx`, `useToast.ts` | ✅ 3 |
| `EmptyState` | `components/ui/EmptyState.tsx` | ✅ 4 |
| `Loader` + `LoaderFullPage` + `LoaderInline` | `components/ui/Loader.tsx` | 🚧 5 (Capa 1) |
| `Input`, `Select`, `Textarea` | `components/ui/Input.tsx` (pendiente) | ⏸️ 6 |

---

## 🎨 Reglas de estilo

### Border radius
- Cards: `rounded-3xl` (24px) o `rounded-2xl` (16px).
- Botones: `rounded-xl` (12px).
- Botones grandes (lg): `rounded-2xl`.
- Inputs: `rounded-xl`.
- Avatares/badges circulares: `rounded-full`.

### Sombras
- Cards: `shadow-xl` o `shadow-sm`.
- Hover: `shadow-md`.
- Modales: `shadow-2xl`.

### Transiciones
- Estándar: `transition-all duration-200`.
- Hover en botones: `hover:opacity-90`.

### Colores (heredados del tenant)
- **`primary`** — color principal del tenant. Botones primarios, acentos, focos.
- **`cardBg`** — fondo de cards y modales. Hereda de `secondary` del tenant.
- **`borderColor`** — bordes neutrales. `rgba(0,0,0,0.08)` en claro, `rgba(255,255,255,0.1)` en oscuro.
- **`textColor`** — color de texto. Calculado por contraste del fondo.
- **`isDarkBg`** — boolean. Define modo claro/oscuro.

### Colores semánticos (universales, NO heredados)
- **Verde** (`#22c55e`) — SOLO para check de éxito / estado positivo.
- **Rojo** (`#f43f5e`) — SOLO para acciones destructivas / errores.
- **Ámbar** (`#f59e0b`) — SOLO para warnings / validaciones.
- **Azul** (`#3b82f6`) — SOLO para info.

**Regla estricta:** el verde **NUNCA** se usa en botones (excepto el check del `SuccessModal`). El rojo **NUNCA** se usa en botones primarios (solo en `danger`/`outline-danger`).

### Z-index
- **`z-[99999]`** — TODOS los modales y toasts.
- **`z-[999999]`** — solo overlays anidados (si hace falta).

### Backdrop
- Estándar: `bg-black/70 backdrop-blur-md`.
- Modal sobre card: `bg-black/60 backdrop-blur-sm` (más suave).
- Zoom de imagen: `bg-black/90 backdrop-blur-md`.

---

## 🔧 API de cada componente

### `<SuccessModal>`

```tsx
<SuccessModal
  isOpen={boolean}
  onClose={() => void}
  title="¡Cambios guardados!"
  message="La operación se completó correctamente."
  accentColor="#22c55e"           // 🟢 SOLO el check es verde
  autoCloseMs={2000}              // 0 = no autocierra
  closeLabel="Aceptar"            // opcional
  primary={string}
  borderColor={string}
  cardBg={string}
  textColor={string}
  isDarkBg={boolean}
/>
