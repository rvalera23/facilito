# Migraciones

Este directorio contiene las migraciones de TypeORM. Cada archivo representa
un cambio versionado al schema de la base de datos.

## Reglas

1. **Nunca modificar una migración ya aplicada.** Si hay que cambiar algo, se
   crea una migración nueva que ajusta el cambio.
2. **Cada migración es reversible.** El método `down()` debe deshacer exactamente
   lo que hace `up()`.
3. **Nombres descriptivos en PascalCase.** `CreateTurnCounters`,
   `AddUniqueTurnNumberToBookings`, no `migration1`, `fix`, `update`.
4. **Una migración = un cambio lógico.** No mezclar varias cosas en una sola.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run migration:show` | Lista todas las migraciones y su estado (aplicada / pendiente) |
| `npm run migration:generate -- src/migrations/NombreDescriptivo` | Genera una migración comparando entidades con la DB actual |
| `npm run migration:create -- src/migrations/NombreDescriptivo` | Crea una migración vacía para escribir a mano |
| `npm run migration:run` | Aplica todas las migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración aplicada |

## Flujo típico

1. Se modifica una entidad (agregar campo, cambiar tipo, etc.).
2. Se corre `npm run migration:generate -- src/migrations/NombreDelCambio`.
3. Se revisa el SQL generado en el archivo nuevo.
4. Si está correcto, se corre `npm run migration:run`.
5. Se commitea el archivo de migración junto con el cambio de la entidad.

## Baseline

La primera migración es un "baseline" que refleja el estado actual de la DB.
Se marcó como aplicada sin ejecutarla (con `--fake`) porque las tablas ya
existían antes de que este sistema de migraciones existiera.