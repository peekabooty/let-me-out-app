# Let Me Out

Aplicacion interna para la gestion de ausencias de empleados. Permite solicitar vacaciones, bajas y dias propios, con validacion por roles (empleado, validador, auditor, admin) y trazabilidad completa del flujo.

## Stack y arquitectura

| Capa       | Tecnologia                                                                              |
| ---------- | --------------------------------------------------------------------------------------- |
| Monorepo   | Turborepo + pnpm workspaces                                                             |
| Backend    | NestJS + Prisma + PostgreSQL                                                            |
| Frontend   | Vite + React 18 + TanStack Router + TanStack Query + Zustand + shadcn/ui + Tailwind CSS |
| Compartido | `@repo/types` (enums, interfaces, schemas Zod) · `@repo/config` (ESLint/TS/Prettier)    |

Arquitectura hexagonal con CQRS (`@nestjs/cqrs`) en el backend. Autenticacion JWT en cookies `httpOnly`. UUID v7 como clave primaria en todas las tablas.

```
apps/
  api/   # NestJS backend
  web/   # Vite + React SPA
packages/
  types/ # Tipos, enums y schemas Zod compartidos
  config/# Configuracion de tooling
```

## Requisitos

- Node.js 24
- pnpm 9.x
- PostgreSQL 16

## Desarrollo local rapido

1. Crea `.env` a partir de `.env.example`:

   ```bash
   cp .env.example .env
   ```

2. Ajusta `DATABASE_URL` para que apunte a tu instancia de PostgreSQL.

3. Instala dependencias:

   ```bash
   pnpm install
   ```

4. Aplica migraciones:

   ```bash
   pnpm --filter @repo/api prisma:migrate
   ```

5. Ejecuta el seed (crea admin inicial y tipos de ausencia base):

   ```bash
   pnpm --filter @repo/api exec prisma db seed
   ```

6. Arranca backend y frontend en modo watch:

   ```bash
   pnpm dev
   ```

   El backend escucha en el puerto definido por `APP_PORT` (defecto `3000`). El frontend en `http://localhost:5173`.

## Variables de entorno

Referencia completa en `.env.example`. Variables mas relevantes:

| Variable                  | Descripcion                                         | Ejemplo                                                    |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`            | Cadena de conexion PostgreSQL                       | `postgresql://user:pass@localhost:5432/absence_management` |
| `APP_PORT`                | Puerto del backend                                  | `3000`                                                     |
| `JWT_SECRET`              | Secreto para access tokens (min 32 chars)           | —                                                          |
| `JWT_REFRESH_SECRET`      | Secreto para refresh tokens (distinto del anterior) | —                                                          |
| `JWT_EXPIRES_IN`          | Duracion del access token                           | `15m`                                                      |
| `JWT_REFRESH_EXPIRES_IN`  | Duracion del refresh token                          | `7d`                                                       |
| `SMTP_HOST`               | Host SMTP para envio de emails                      | `smtp.example.com`                                         |
| `SMTP_PORT`               | Puerto SMTP                                         | `587`                                                      |
| `SMTP_USER` / `SMTP_PASS` | Credenciales SMTP                                   | —                                                          |
| `SMTP_FROM`               | Direccion remitente                                 | `"Sistema de Ausencias" <no-reply@empresa.com>`            |
| `CORS_ORIGIN`             | URL del frontend permitida por CORS                 | `http://localhost:5173`                                    |
| `COOKIE_SAMESITE`         | Politica SameSite de las cookies                    | `none` (cross-site) / `strict` (same-site)                 |
| `COOKIE_SECURE`           | Flag Secure en cookies                              | `true` en produccion                                       |
| `SEED_ADMIN_EMAIL`        | Email del administrador inicial                     | `admin@empresa.com`                                        |
| `SEED_ADMIN_PASSWORD`     | Contrasena del administrador inicial                | —                                                          |
| `SEED_ADMIN_NAME`         | Nombre del administrador inicial                    | `Administrador`                                            |
| `VITE_API_URL`            | URL de la API que usa el frontend                   | `http://localhost:3000`                                    |

## Seed: datos iniciales

El seed crea el primer usuario administrador y los tipos de ausencia base. Es idempotente: si los datos ya existen, no hace nada.

**Cuando ejecutarlo:**

- La primera vez que levantes el entorno (local, staging o produccion), despues de aplicar las migraciones.
- En CI/CD, como paso posterior a `prisma migrate deploy`.
- Si necesitas recrear la base de datos desde cero.

**Como ejecutarlo:**

```bash
pnpm --filter @repo/api exec prisma db seed
```

## Comandos de referencia

### Raiz del monorepo

| Comando          | Descripcion                                |
| ---------------- | ------------------------------------------ |
| `pnpm install`   | Instala dependencias de todos los paquetes |
| `pnpm dev`       | Arranca backend y frontend en modo watch   |
| `pnpm build`     | Build de todos los paquetes                |
| `pnpm test`      | Ejecuta tests en todos los paquetes        |
| `pnpm typecheck` | Typecheck global                           |
| `pnpm lint`      | Lint global                                |
| `pnpm format`    | Verifica formato con Prettier              |

### Backend (`apps/api`)

| Comando                                       | Descripcion                      |
| --------------------------------------------- | -------------------------------- |
| `pnpm --filter @repo/api dev`                 | Backend en modo watch            |
| `pnpm --filter @repo/api build`               | Build del backend                |
| `pnpm --filter @repo/api test`                | Tests unitarios con Jest         |
| `pnpm --filter @repo/api typecheck`           | TypeScript sin emitir            |
| `pnpm --filter @repo/api prisma:generate`     | Regenera Prisma Client           |
| `pnpm --filter @repo/api prisma:migrate`      | Aplica migraciones en desarrollo |
| `pnpm --filter @repo/api prisma:studio`       | Abre Prisma Studio               |
| `pnpm --filter @repo/api exec prisma db seed` | Ejecuta el seed                  |

Los scripts de Prisma en `apps/api` cargan automaticamente el archivo `.env` de la raiz.

### Frontend (`apps/web`)

| Comando                             | Descripcion                     |
| ----------------------------------- | ------------------------------- |
| `pnpm --filter @repo/web dev`       | Frontend en modo watch          |
| `pnpm --filter @repo/web build`     | Build del frontend              |
| `pnpm --filter @repo/web test`      | Tests de componentes con Vitest |
| `pnpm --filter @repo/web typecheck` | TypeScript sin emitir           |

### Paquetes compartidos

| Comando                          | Descripcion          |
| -------------------------------- | -------------------- |
| `pnpm --filter @repo/types test` | Tests de schemas Zod |

## Testing

```bash
# Todos los paquetes
pnpm test

# Solo backend
pnpm --filter @repo/api test

# Solo frontend
pnpm --filter @repo/web test

# Solo schemas compartidos
pnpm --filter @repo/types test
```

Umbrales minimos de cobertura: **80%** lineas y ramas en el backend, **70%** en el frontend.

## Troubleshooting

**El backend no arranca tras `pnpm dev`**
Verifica que `DATABASE_URL` apunta a una instancia de PostgreSQL accesible y que las migraciones estan aplicadas (`pnpm --filter @repo/api prisma:migrate`).

**El frontend muestra pantalla en blanco o error de CORS**
Asegurate de que `CORS_ORIGIN` en `.env` coincide exactamente con la URL desde la que sirves el frontend (por defecto `http://localhost:5173`). Verifica tambien que `VITE_API_URL` apunta al puerto correcto del backend.

**La sesion no se mantiene (el usuario es redirigido al login en cada recarga)**
Los tokens JWT se almacenan en cookies `httpOnly`. Si el frontend y el backend estan en origenes distintos, necesitas `COOKIE_SAMESITE=none` y `COOKIE_SECURE=true`, y el navegador debe estar en HTTPS (o en localhost). En local con `http://localhost` ambos flags son opcionales.

**El seed falla con error de contrasena**
La contrasena de `SEED_ADMIN_PASSWORD` debe cumplir la politica de contrasenas configurada (minimo 8 caracteres, al menos una mayuscula, una minuscula, un numero y un simbolo). Ajusta el valor en `.env`.

## Convenciones

- TypeScript strict en todos los paquetes sin excepcion.
- Migraciones Prisma versionadas en git; nunca cambios manuales en SQL.
- JWT exclusivamente en cookies `httpOnly`; nunca en `localStorage` ni `sessionStorage`.
- UUID v7 generado en el backend con la libreria `uuidv7`; nunca autoincrement.
- Mensajes de commit en ingles, formato Conventional Commits. Ver [`docs/commit-conventions.md`](docs/commit-conventions.md).
- Nunca push directo a `main`. Toda tarea parte de una rama y un PR.
