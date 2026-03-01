# Let Me Out

Aplicacion interna para la gestion de ausencias de empleados. Permite solicitar vacaciones, bajas y dias propios, con validacion por roles (empleado, validador, auditor, admin) y trazabilidad completa del flujo.

## Stack

- Monorepo: Turborepo + pnpm workspaces
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Vite + React + TanStack Router/Query + Zustand + Tailwind + shadcn/ui
- Shared: @repo/types (enums, interfaces, Zod), @repo/config (ESLint/TS/Prettier)

## Estructura del repo

```
apps/
  api/   # NestJS backend
  web/   # Vite + React SPA
packages/
  types/ # Tipos, enums y schemas compartidos
  config/# Configuracion de tooling
```

## Requisitos

- Node.js 24
- pnpm 9.x
- PostgreSQL 16

## Variables de entorno

Usa `.env.example` como base.

- `DATABASE_URL`: cadena PostgreSQL
- `APP_PORT`: puerto del backend (default 3000)
- `JWT_SECRET`: secreto access token (min 32 chars)
- `JWT_REFRESH_SECRET`: secreto refresh token (distinto de JWT_SECRET)
- `JWT_EXPIRES_IN`: duracion access token (ej. 15m)
- `JWT_REFRESH_EXPIRES_IN`: duracion refresh token (ej. 7d)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `CORS_ORIGIN`: URL del frontend permitida

## Comandos (raiz)

- `pnpm install`: instala dependencias del monorepo
- `pnpm dev`: arranca todos los paquetes con turbo (usa los scripts `dev` de cada paquete)
- `pnpm build`: build de todos los paquetes con dependencias
- `pnpm lint`: lint global (ESLint en todos los paquetes)
- `pnpm typecheck`: typecheck global
- `pnpm test`: tests globales
- `pnpm format`: verifica formato con Prettier en todos los paquetes
- `pnpm lint:staged`: lint/format solo en archivos staged (hook de pre-commit)

## Comandos por paquete

### apps/api

- `pnpm --filter @repo/api dev`: backend en modo watch
- `pnpm --filter @repo/api build`: build del backend
- `pnpm --filter @repo/api typecheck`: TS sin emitir
- `pnpm --filter @repo/api prisma:generate`: genera Prisma Client
- `pnpm --filter @repo/api prisma:migrate`: migraciones en desarrollo
- `pnpm --filter @repo/api prisma:studio`: UI de Prisma

### apps/web

- `pnpm --filter @repo/web dev`: frontend (placeholder por ahora)
- `pnpm --filter @repo/web build`: build (placeholder por ahora)

### packages/types

- `pnpm --filter @repo/types test`: tests de schemas Zod

## Seed: usuario administrador inicial

El seed crea el primer usuario administrador en la base de datos. Es idempotente: si el usuario ya existe, no hace nada.

**Variables de entorno necesarias** (en `.env`, raíz del proyecto):

```
SEED_ADMIN_EMAIL=admin@tuempresa.com
SEED_ADMIN_PASSWORD=contraseña_segura
SEED_ADMIN_NAME=Administrador
```

**Cuándo ejecutarlo:**

- La primera vez que levantes el entorno (local, staging o producción), después de aplicar las migraciones.
- En CI/CD, como paso posterior a `prisma migrate deploy`.
- Si necesitas recrear la base de datos desde cero.

**Cómo ejecutarlo:**

```bash
pnpm --filter @repo/api exec prisma db seed
```

El comando carga el `.env` de la raíz automáticamente.

## Desarrollo local rapido

1. Crea `.env` a partir de `.env.example`.
2. Arranca Postgres y define `DATABASE_URL`.
3. Instala dependencias: `pnpm install`.
4. Ejecuta migraciones: `pnpm --filter @repo/api prisma:migrate`.
5. Ejecuta el seed para crear el admin inicial: `pnpm --filter @repo/api exec prisma db seed`.
6. Arranca backend: `pnpm --filter @repo/api dev`.

## Convenciones

- TypeScript strict en todos los paquetes.
- Migraciones Prisma versionadas (no se edita SQL manualmente).
- JWT solo en cookies httpOnly.
- UUID v7 generado en backend.
