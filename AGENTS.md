# AGENTS.md

Este fichero es el punto de entrada para cualquier agente de IA que trabaje en este repositorio. Lee este documento completo antes de tocar cualquier fichero.

---

## ¿Qué es esta aplicación?

**Let Me Out** es una aplicación web interna para la gestión de ausencias de empleados. Permite a los empleados solicitar ausencias (vacaciones, bajas médicas, días de asuntos propios, etc.), que son revisadas y aprobadas por validadores designados, auditadas por auditores con acceso de solo lectura, y administradas por administradores del sistema.

Existen cuatro tipos de usuario: **Empleado** (solicita ausencias, añade observaciones, adjunta ficheros), **Validador** (aprueba o rechaza ausencias asignadas), **Auditor** (visibilidad de solo lectura sobre todas las ausencias, con capacidad de filtrar por equipo) y **Administrador** (gestión de usuarios, tipos de ausencia y equipos; sin perfil de empleado propio).

El estado actual del proyecto es **fase de documentación**. Toda la arquitectura, los requisitos funcionales y las convenciones de código están definidos y documentados. No existe código de producción todavía; el siguiente paso es iniciar el monorepo y comenzar el desarrollo siguiendo estrictamente la documentación existente.

---

## Documentación de referencia

Lee los documentos en el orden indicado antes de empezar cualquier tarea. No improvises decisiones que ya están tomadas en estos documentos.

| Prioridad | Documento | Qué encontrarás |
|---|---|---|
| 1 | [`docs/non-negotiable.md`](docs/non-negotiable.md) | 35 reglas absolutas. Ninguna tiene excepción. Léelo siempre primero. |
| 2 | [`docs/requirements.md`](docs/requirements.md) | 73 requisitos funcionales (RF-01 a RF-73) organizados en 15 secciones: tipos de usuario, tipos de ausencia, flujo de validación, observaciones, notificaciones, exportación CSV, adjuntos, equipos, etc. |
| 3 | [`docs/technical-requirements.md`](docs/technical-requirements.md) | Stack técnico completo, estructura del monorepo, los 10 modelos de base de datos con todas sus columnas y tipos, estrategia de migraciones, variables de entorno. |
| 4 | [`docs/best-practices-architecture.md`](docs/best-practices-architecture.md) | Arquitectura hexagonal (puertos y adaptadores), SOLID con ejemplos en TypeScript, CQRS con `@nestjs/cqrs`, contratos de API, gestión global de errores. |
| 5 | [`docs/best-practices-backend.md`](docs/best-practices-backend.md) | Convenciones de NestJS, Prisma y PostgreSQL: validación por capas, transacciones, seguridad, logging, manejo de fechas, índices, paginación, tests. |
| 6 | [`docs/best-practices-frontend.md`](docs/best-practices-frontend.md) | Convenciones de React, TanStack Query, TanStack Router, formularios con React Hook Form + Zod, accesibilidad, rendimiento, tests con RTL y MSW. |

---

## Convenciones clave

Estas son las decisiones de diseño más importantes. Están desarrolladas en los documentos anteriores; aquí aparecen resumidas para acceso rápido.

### Monorepo y stack

- Monorepo gestionado con **Turborepo** y **pnpm workspaces**.
- **Backend:** NestJS + Prisma + PostgreSQL.
- **Frontend:** Vite + React 18 + TanStack Router + TanStack Query + Zustand + shadcn/ui + Tailwind CSS + FullCalendar.
- **Paquetes compartidos:** `@repo/types` (enums, interfaces, schemas Zod) y `@repo/config` (configs de ESLint, TypeScript, Prettier).
- **TypeScript en modo strict** en todos los paquetes del monorepo, sin excepción.

### Base de datos

- **UUID v7** como clave primaria en todas las tablas, generado en el backend con la librería `uuidv7`. Nunca autoincrement.
- Base de datos PostgreSQL creada con `ENCODING='UTF8'`.
- Todos los cambios de schema se realizan **exclusivamente con migraciones de Prisma** (`prisma migrate dev` en local, `prisma migrate deploy` en CI/staging/producción). Nunca cambios manuales.
- Los 10 modelos de la base de datos son: `user`, `absence_type`, `absence`, `absence_validation_history`, `absence_status_history`, `observation`, `notification`, `team`, `team_member`, `observation_attachment`. Todos los nombres de tabla en **singular**.

### Autenticación y seguridad

- Los tokens JWT se almacenan **exclusivamente en cookies `httpOnly`**. Nunca en `localStorage`, `sessionStorage` ni en el cuerpo de la respuesta.
- En despliegue cross-site, las cookies usan `SameSite=None` y `Secure=true`. En despliegue same-site se usa `SameSite=Strict`. El refresh token debe tener `Path` restringido.
- El access token dura 15 minutos; el refresh token, 7 días.

### Código

- Ningún fichero supera las **400 líneas de código efectivo** (sin contar comentarios, imports ni líneas en blanco).
- Cada fichero tiene una única responsabilidad.
- Nunca se usan `console.log` en código de producción. Backend usa el `Logger` de NestJS.
- Nunca se usa `new Date()` directamente en lógica de negocio. Se inyecta `ClockService`.
- Las variables de entorno se acceden siempre a través de `ConfigService`, nunca con `process.env` directamente.

### Ficheros adjuntos

- Tipos permitidos: JPEG, PNG, PDF. Máximo 5 MB por fichero.
- El tipo MIME se verifica con magic bytes (`file-type`), nunca confiando en el `Content-Type` del cliente.
- Se almacenan en el sistema de ficheros local del servidor (no proveedores externos), con nombre generado (UUID v7 + extensión), fuera del directorio público.

---

## Flujo de trabajo

Cada unidad de trabajo sigue este proceso:

1. **Issue de GitHub** — Toda tarea parte de una issue creada con el template [`.github/ISSUE_TEMPLATE/task.md`](.github/ISSUE_TEMPLATE/task.md). La issue define la descripción, los requisitos funcionales relacionados, los criterios de aceptación y la estimación.

2. **Rama** — Crear una rama desde `main` con nombre siguiendo el patrón `type/short-description` (ejemplos: `feat/create-absence-endpoint`, `fix/overlap-validation`, `refactor/absence-mapper`).

3. **Desarrollo** — Implementar siguiendo estrictamente los documentos de buenas prácticas y las reglas de `non-negotiable.md`. Los tests son parte del criterio de aceptación, no opcionales.

4. **Commits** — Mensajes **en inglés**, en formato Conventional Commits. Ver referencia completa en [`docs/commit-conventions.md`](docs/commit-conventions.md). Nunca usar `--no-verify`.

5. **Pull Request** — Abrir un PR asociado a la issue antes de hacer merge. Nunca push directo a `main` o `master`.

### Flujo de ramas y PRs para agentes

- Cada agente debe crear una rama desde `main` con un nombre acorde a la tarea (ej. `feat/short-description`, `fix/short-description`).
- Commitear con frecuencia durante la implementación; no esperar a terminar toda la funcionalidad en un solo commit.
- Al completar la tarea, abrir un PR de la rama a `main`.
- La PR **nunca** debe ser aprobada por el mismo agente que la crea.

### Cuándo commitear

- Cuando se completa una unidad lógica pequeña (ej. un handler + tests, un componente + tests).
- Cuando se cierra un subtarea claramente delimitada dentro de la issue.
- Antes de un refactor significativo o de cambios de mayor riesgo.

### Labels de GitHub

Todas las issues deben incluir **exactamente una** label de cada categoría:

- **Área:** `area:infra`, `area:backend`, `area:frontend`, `area:shared`, `area:database`, `area:devops`
- **Tipo:** `type:feature`, `type:bug`, `type:chore`, `type:docs`, `type:test`, `type:refactor`
- **Prioridad:** `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- **Talla:** `size:XS`, `size:S`, `size:M`, `size:L`, `size:XL`

**Colores (paleta pastel):**

- `area:infra` #B3E5FC, `area:backend` #C8E6C9, `area:frontend` #F8BBD0, `area:shared` #D1C4E9, `area:database` #FFE0B2, `area:devops` #FFF9C4
- `type:feature` #C5CAE9, `type:bug` #FFCDD2, `type:chore` #E0E0E0, `type:docs` #B2DFDB, `type:test` #DCEDC8, `type:refactor` #D7CCC8
- `priority:critical` #FF8A80, `priority:high` #FFAB91, `priority:medium` #FFE082, `priority:low` #C8E6C9
- `size:XS` #C8E6C9, `size:S` #DCEDC8, `size:M` #FFF9C4, `size:L` #FFE0B2, `size:XL` #FFCCBC
- `phase:0-foundation` #FFE8A3, `phase:1-backend-base` #D7F0B6, `phase:2-auth-backend` #C9E6FF, `phase:3-frontend-base` #F7C6DA, `phase:4-admin-users` #E2D3F8
- `phase:5-admin-absence-types` #FFD6B5, `phase:6-absences-create` #C7F0E2, `phase:7-validation-flow` #FFE3A6, `phase:8-cancellation` #E0F2B6, `phase:9-observations` #F0D1F0
- `phase:10-attachments` #FFD1C8, `phase:11-notifications` #D6F5D6, `phase:12-calendar-dashboard` #FFF3B0, `phase:13-teams` #FFE7C2, `phase:14-audit-export` #CCE4FF

### Convenciones de commits

Los mensajes de commit son **siempre en inglés** y siguen esta estructura:

```
type(scope): Verb in third person singular + brief description.

Optional body explaining why the change was made. No length limit.
Focus on motivation and context, not on what the diff already shows.

Refs: #42
See: https://...
```

La primera línea es obligatoria. El cuerpo y las referencias son opcionales. La descripción debe empezar con un verbo en tercera persona del singular: `Adds`, `Fixes`, `Removes`, `Extracts`, `Renames`, `Updates`, etc.

Ejemplos:

```
feat(absence): Adds overlap validation in the create absence handler

fix(auth): Corrects refresh token cookie path to restrict it to /auth/refresh

refactor(user): Extracts user mapper to a dedicated file

test(absence): Adds unit tests for the annual balance calculator

docs(commit-conventions): Adds commit message format and examples

Refs: #12
```

Para la referencia completa con todos los tipos válidos, reglas detalladas y ejemplos de mensajes incorrectos, ver [`docs/commit-conventions.md`](docs/commit-conventions.md).

---

## Entorno de desarrollo

El proyecto incluye una configuración de **Dev Container** lista para usar:

- Imagen base: `node:24` con `gh` CLI y `pnpm` instalados en tiempo de build (como root).
- La base de datos PostgreSQL vive en un contenedor externo en la red Docker `local`.
- Al crear el contenedor (`postCreateCommand`): ejecuta `pnpm install`.
- Al iniciar el contenedor (`postStartCommand`): ejecuta `gh --version` como verificación.

Para trabajar en local sin Dev Container, necesitas Node.js 24, pnpm y una instancia de PostgreSQL accesible con las variables de entorno definidas en `.env` (usa `.env.example` como referencia).
