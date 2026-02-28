# Requisitos Técnicos — Sistema de Gestión de Ausencias

## 1. Visión General del Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Gestor de monorepo | Turborepo + pnpm workspaces | Turborepo 2.x / pnpm 9.x |
| Lenguaje | TypeScript (strict mode) | 5.x |
| Backend framework | NestJS | 10.x |
| Base de datos | PostgreSQL | 16.x |
| ORM | Prisma | 5.x |
| Autenticación | JWT + Passport.js | — |
| Frontend bundler | Vite | 5.x |
| Frontend framework | React | 18.x |
| Routing frontend | TanStack Router | 1.x |
| Estado servidor | TanStack Query (React Query) | 5.x |
| Estado global UI | Zustand | 4.x |
| Formularios | React Hook Form + Zod | RHF 7.x / Zod 3.x |
| Componentes UI | shadcn/ui + Tailwind CSS | — |
| Calendario | FullCalendar | 6.x |
| Exportación CSV | papaparse | 5.x |
| HTTP client | Axios | 1.x |
| Notificaciones email | Nodemailer | 6.x |
| Test runner backend | Jest | 29.x |
| Test runner frontend | Vitest | 1.x |
| Tests de componentes | React Testing Library | 14.x |
| Mock de API en tests | MSW (Mock Service Worker) | 2.x |
| Tests e2e backend | Supertest | 6.x |
| Tests de integración BD | Testcontainers | 1.x |

### Justificación de las decisiones principales

**TypeScript en todo el monorepo**
Usar TypeScript en modo estricto tanto en backend como en frontend permite compartir tipos, enums y schemas de validación a través de un paquete común (`@repo/types`). Esto elimina una categoría entera de bugs causados por desincronización entre los contratos del servidor y el cliente, y mejora drásticamente la experiencia de desarrollo con autocompletado y detección de errores en tiempo de compilación.

**NestJS**
Su arquitectura modular basada en decoradores, inyección de dependencias y sistema de guards encaja de forma natural con un dominio que tiene roles diferenciados, flujos de validación con múltiples estados y módulos de negocio bien delimitados (usuarios, ausencias, notificaciones, auditoría). NestJS reduce la cantidad de decisiones de arquitectura que deben tomarse desde cero y establece convenciones claras para escalar el proyecto. Su integración nativa con Passport.js, class-validator y Prisma cubre todas las necesidades de este sistema sin fricciones.

**PostgreSQL**
El dominio de la aplicación tiene relaciones bien definidas entre entidades (usuarios, ausencias, validadores, observaciones, historial) y reglas de negocio que pueden reforzarse mediante constraints de integridad referencial. PostgreSQL es la base de datos relacional de código abierto más robusta y con mayor soporte de tipos avanzados: UUID nativo, tipos enumerados, TIMESTAMPTZ con zona horaria, encoding UTF-8 completo (incluyendo emojis y el plano suplementario Unicode) y soporte excelente de índices B-tree para UUID v7.

**Prisma**
Su schema declarativo actúa como fuente de verdad única del modelo de datos. Las migraciones se versionan junto al código, lo que garantiza reproducibilidad en cualquier entorno. El cliente generado automáticamente a partir del schema proporciona tipos TypeScript exactos para cada operación de base de datos, eliminando la posibilidad de desincronización entre el modelo y el código. Su integración con NestJS es madura y bien documentada.

**JWT propio con Passport.js**
Para una aplicación interna sin requisitos de Single Sign-On o federación de identidades, un sistema JWT propio es la solución más simple y sin dependencias externas. Los access tokens de corta duración (15 min) limitan la ventana de exposición en caso de compromiso, mientras que los refresh tokens de mayor duración (7 días) mantienen una buena experiencia de usuario. Passport.js proporciona las estrategias `local` (login) y `jwt` (verificación) con integración nativa en NestJS.

**Vite + React SPA**
Al tratarse de una aplicación interna con autenticación, no se requiere SEO ni renderizado en servidor. Una SPA es la arquitectura más simple y adecuada para este caso. Vite ofrece un HMR (Hot Module Replacement) casi instantáneo durante el desarrollo y builds de producción optimizados con Rollup, sin la complejidad añadida de un metaframework como Next.js.

**TanStack Router + TanStack Query**
TanStack Router proporciona rutas completamente tipadas con TypeScript, guards de navegación implementables en `beforeLoad` y layout routes para separar la zona pública de la autenticada. TanStack Query gestiona todo el estado del servidor (fetching, caché, invalidación automática tras mutaciones, refetch en foco de ventana), eliminando la necesidad de gestionar manualmente estados de carga, error y refresco de datos.

**shadcn/ui + Tailwind CSS**
A diferencia de librerías de componentes tradicionales, shadcn/ui no es una dependencia externa opaca. El código de los componentes vive directamente en el proyecto, lo que permite personalización total sin sobreescribir estilos de terceros. Los componentes están construidos sobre Radix UI primitives, que son accesibles por defecto (ARIA, navegación por teclado). Tailwind CSS proporciona un sistema de diseño consistente con clases utilitarias.

**UUID v7 generado en backend**
Los IDs enteros autoincrementales son predecibles y permiten enumerar recursos de la API con un simple bucle. UUID v4 resuelve el problema de seguridad pero fragmenta los índices B-tree de PostgreSQL al ser completamente aleatorio, degradando el rendimiento de escritura. UUID v7 combina un prefijo de timestamp de 48 bits con aleatoriedad suficiente, manteniendo la ordenación cronológica (útil para paginación y auditoría) y la localidad en índices. Se genera en la capa de servicio del backend con la librería `uuidv7` de Node.js, sin necesidad de extensiones de PostgreSQL.

---

## 2. Estructura del Monorepo

```
/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/      # Módulos de negocio (auth, users, absences, ...)
│   │   │   ├── common/       # Guards, decoradores, pipes, filtros globales
│   │   │   ├── prisma/       # PrismaService y schema
│   │   │   └── main.ts
│   │   ├── test/             # Tests e2e
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   └── web/                  # Vite + React SPA
│       ├── src/
│       │   ├── components/   # Componentes reutilizables (shadcn/ui + propios)
│       │   ├── pages/        # Páginas por ruta
│       │   ├── hooks/        # Custom hooks (queries, mutations, ...)
│       │   ├── store/        # Zustand stores
│       │   ├── lib/          # Axios instance, utilidades
│       │   └── main.tsx
│       └── package.json
├── packages/
│   ├── types/                # Tipos TS, enums y schemas Zod compartidos
│   │   ├── src/
│   │   │   ├── enums.ts
│   │   │   ├── entities.ts
│   │   │   └── schemas.ts    # Schemas Zod compartidos
│   │   └── package.json
│   └── config/               # Configuraciones compartidas de tooling
│       ├── eslint-base.js
│       ├── tsconfig.base.json
│       ├── prettier.config.js
│       └── package.json
├── turbo.json                # Definición del pipeline de Turborepo
├── pnpm-workspace.yaml       # Declaración de workspaces
├── .eslintrc.js
├── .prettierrc
└── package.json              # Scripts raíz y devDependencies compartidas
```

**Por qué Turborepo + pnpm:**
Turborepo orquesta las tareas entre paquetes respetando el grafo de dependencias: si `apps/web` depende de `packages/types`, Turborepo construye `types` antes que `web` automáticamente. La caché incremental evita re-ejecutar tareas cuyos inputs no han cambiado, reduciendo drásticamente los tiempos de CI. pnpm utiliza un sistema de links simbólicos a un store global de paquetes, evitando la duplicación de `node_modules` que sufren npm y Yarn en monorepos.

---

## 3. Backend (`apps/api`)

### 3.1 Arquitectura modular

El backend sigue el patrón estándar de NestJS con separación en capas:

```
Controller (HTTP) → Service (lógica de negocio) → Prisma (persistencia)
```

**Módulos principales:**

| Módulo | Responsabilidad |
|---|---|
| `AuthModule` | Login, generación y refresco de tokens JWT, estrategias Passport |
| `UsersModule` | CRUD de usuarios, gestión de roles |
| `AbsenceTypesModule` | CRUD de tipos de ausencia, configuración de límites |
| `AbsencesModule` | Creación de ausencias, flujo de validación, cancelación, saldo anual |
| `NotificationsModule` | Envío de emails y persistencia de notificaciones in-app |
| `AuditModule` | Consulta del historial de cambios de estado |

### 3.2 Autenticación y autorización

**Autenticación:**
- Login mediante email y contraseña. La contraseña se almacena como hash bcrypt (factor de coste 12).
- Tras un login exitoso se emiten dos tokens:
  - **Access token** (JWT firmado con `JWT_SECRET`): duración de 15 minutos. Incluye en el payload el `userId`, `email` y `role`.
  - **Refresh token** (JWT firmado con `JWT_REFRESH_SECRET`): duración de 7 días. Se usa para obtener un nuevo access token sin requerir login.
- Estrategias Passport: `local` para el endpoint de login, `jwt` para el resto de endpoints protegidos.
- Guard `JwtAuthGuard` aplicado globalmente; los endpoints públicos (login, refresh) se marcan con el decorador `@Public()`.

**Autorización:**
- Decorador `@Roles(...roles)` sobre controllers o handlers para declarar los roles con acceso permitido.
- Guard `RolesGuard` que lee el rol del payload del JWT y lo compara con los roles requeridos.
- Para casos más complejos (ej. un validador no puede validar sus propias ausencias) la comprobación se realiza en la capa de servicio.

### 3.3 Validación de entrada

- `ValidationPipe` configurado globalmente con `whitelist: true` (descarta propiedades no declaradas en el DTO) y `forbidNonWhitelisted: true` (lanza error si se envían propiedades no permitidas).
- DTOs decorados con `class-validator` para cada operación (crear ausencia, login, crear usuario, etc.).
- Los schemas Zod de `@repo/types` se usan para validaciones de lógica de negocio compartida con el frontend (duración, límites anuales, antelación mínima).

### 3.4 Notificaciones

- **Email:** Nodemailer con transporte SMTP configurable mediante variables de entorno. Las plantillas de email son HTML estático generado en el servicio.
- **In-app:** Cada notificación se persiste en la tabla `notification`. El frontend las consume mediante polling periódico con TanStack Query. Las notificaciones se marcan como leídas cuando el usuario las visualiza.

### 3.5 Identificadores UUID v7

La generación de identificadores UUID v7 se centraliza en un helper del módulo `common`:

```typescript
import { uuidv7 } from 'uuidv7';

export const generateId = (): string => uuidv7();
```

Todos los servicios llaman a `generateId()` antes de cada operación de creación y pasan el ID generado a Prisma. Esto mantiene el control de los IDs en la aplicación y permite testarlos fácilmente.

### 3.6 Variables de entorno

`@nestjs/config` con un schema de validación (usando Joi o class-validator) que se ejecuta al arranque. Si alguna variable obligatoria falta o tiene un formato incorrecto, la aplicación no arranca y lanza un error descriptivo.

---

## 4. Frontend (`apps/web`)

### 4.1 Estructura de rutas

TanStack Router organiza las rutas en dos layouts principales:

- **Layout público** (`/login`): pantalla de login, sin autenticación requerida.
- **Layout autenticado** (`/`): todas las rutas protegidas. El guard en `beforeLoad` redirige a `/login` si no hay sesión activa. Dentro de este layout, cada ruta verifica adicionalmente el rol del usuario y redirige a una pantalla de "acceso denegado" si el rol no es suficiente.

**Rutas principales:**

| Ruta | Roles con acceso | Descripción |
|---|---|---|
| `/` | standard, validator | Dashboard con saldo y próximas ausencias |
| `/absences` | standard, validator | Listado de ausencias propias |
| `/absences/new` | standard, validator | Formulario de creación de ausencia |
| `/absences/:id` | standard, validator, auditor | Detalle de una ausencia |
| `/calendar` | standard, validator | Vista de calendario |
| `/validations` | validator | Ausencias pendientes de validar |
| `/admin` | admin | Panel de administración |
| `/admin/users` | admin | Gestión de usuarios |
| `/admin/absence-types` | admin | Gestión de tipos de ausencia |
| `/audit` | auditor | Listado de todas las ausencias |

### 4.2 Gestión del estado

- **Estado del servidor** (TanStack Query): ausencias, tipos de ausencia, usuarios, notificaciones, saldo anual. La caché se invalida automáticamente tras cada mutación relevante.
- **Estado global UI** (Zustand): datos de la sesión activa del usuario (id, nombre, rol, extraídos del JWT decodificado), estado de lectura de notificaciones in-app.
- No se usa ningún store global para datos remotos; TanStack Query cubre este rol completamente.

### 4.3 Formularios y validación

React Hook Form con `zodResolver` conecta cada formulario con su schema Zod correspondiente importado desde `@repo/types`. Esto garantiza que la validación en el cliente es idéntica a la que aplica el servidor, ofreciendo feedback inmediato al usuario sin duplicar reglas de negocio.

### 4.4 Cliente HTTP (Axios)

Se configura una instancia única de Axios con:
- `baseURL` apuntando a la URL de la API.
- Interceptor de request: adjunta el access token en la cabecera `Authorization: Bearer`.
- Interceptor de response: cuando recibe un `401`, intenta refrescar el access token llamando al endpoint de refresh. Si el refresco falla (refresh token expirado), redirige al login y limpia la sesión de Zustand.

### 4.5 Calendario (FullCalendar)

Vista mensual por defecto con foco en el mes actual. Los eventos representan ausencias y se colorean según el tipo de ausencia o el estado (pendiente, aceptada, cancelada, etc.). El calendario es navegable hacia meses y años pasados y futuros. Al hacer clic en un evento se navega al detalle de la ausencia.

### 4.6 Exportación CSV (papaparse)

La exportación se genera en el cliente a partir de los datos ya cargados por TanStack Query, sin necesidad de un endpoint específico en el backend. papaparse serializa el array de ausencias a CSV y se descarga mediante un enlace `<a>` con `href` de tipo `blob:`.

---

## 5. Paquetes Compartidos

### `@repo/types`

Fuente de verdad compartida entre backend y frontend para todos los contratos de datos.

**Enums:**

```typescript
enum UserRole {
  STANDARD = 'standard',
  VALIDATOR = 'validator',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
}

enum AbsenceStatus {
  WAITING_VALIDATION = 'waiting_validation',
  RECONSIDER = 'reconsider',
  ACCEPTED = 'accepted',
  DISCARDED = 'discarded',
  CANCELLED = 'cancelled',
}

enum ValidationDecision {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

enum AbsenceUnit {
  HOURS = 'hours',
  DAYS = 'days',
}
```

**Interfaces de entidades:** `User`, `AbsenceType`, `Absence`, `AbsenceValidationHistory`, `AbsenceStatusHistory`, `Observation`, `Notification`.

**Schemas Zod compartidos:** `CreateAbsenceSchema`, `CreateUserSchema`, `CreateAbsenceTypeSchema`, `LoginSchema`, `AddObservationSchema`. El frontend los usa con `zodResolver` y el backend los puede usar en pipes personalizados o como complemento a `class-validator`.

### `@repo/config`

- `tsconfig.base.json`: configuración TypeScript base con `strict: true`, `exactOptionalPropertyTypes: true` y paths de módulos. Cada paquete la extiende con sus particularidades.
- `eslint-base.js`: reglas ESLint comunes (TypeScript, imports, unicorn). El backend añade reglas de NestJS; el frontend añade reglas de React y hooks.
- `prettier.config.js`: configuración Prettier única para todo el monorepo (comillas simples, punto y coma, ancho 100).

---

## 6. Base de Datos

### 6.1 Configuración general

La base de datos PostgreSQL debe crearse con los siguientes parámetros:

```sql
CREATE DATABASE absence_management
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8';
```

**Por qué UTF-8:**
PostgreSQL almacena texto internamente en el encoding de la base de datos. Con `UTF8`, la base de datos soporta el rango Unicode completo desde U+0000 hasta U+10FFFF, incluyendo el plano suplementario donde residen los emojis (ej. 😀 = U+1F600, 🎉 = U+1F389). A diferencia de MySQL, PostgreSQL no tiene la problemática distinción entre `utf8` (limitado a 3 bytes, sin emojis) y `utf8mb4` (4 bytes, con emojis). En PostgreSQL, `UTF8` ya cubre el rango completo sin configuración adicional.

**Collation:** La collation afecta a la ordenación y comparación de cadenas de texto, no al almacenamiento de caracteres. Se usa `en_US.UTF-8` como collation base. Para la columna `observation.content`, donde el texto libre puede contener emojis, la collation no impide su almacenamiento; únicamente determina el orden de clasificación en operaciones de ordenación, que en esta columna no es crítico.

### 6.2 Identificadores UUID v7

Todas las tablas usan `UUID` como tipo de clave primaria. Los valores se generan en la capa de servicio del backend con la librería `uuidv7` antes de cada inserción. PostgreSQL almacena el UUID de forma eficiente en 16 bytes.

**Ventajas de UUID v7 frente a alternativas:**

| Tipo de ID | Predecible | Ordenable | Fragmentación de índice |
|---|---|---|---|
| Integer autoincremental | Sí (inseguro) | Sí | Ninguna |
| UUID v4 | No | No | Alta |
| UUID v7 | No | Sí (por timestamp) | Baja |

### 6.3 Modelo de tablas

---

#### Tabla `user`

Almacena los usuarios del sistema con su rol y credenciales de acceso.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `email` | `VARCHAR(255)` | UNIQUE NOT NULL | Email del usuario, usado como identificador de login |
| `name` | `VARCHAR(255)` | NOT NULL | Nombre completo del usuario |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Hash bcrypt de la contraseña (factor de coste 12) |
| `role` | `VARCHAR(50)` | NOT NULL | Rol del usuario: `standard`, `validator`, `auditor`, `admin` |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Permite deshabilitar usuarios sin eliminarlos físicamente |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de la última modificación |

---

#### Tabla `absence_type`

Almacena los tipos de ausencia configurables desde el panel de administración.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `name` | `VARCHAR(255)` | NOT NULL | Nombre descriptivo del tipo de ausencia |
| `unit` | `VARCHAR(10)` | NOT NULL | Unidad de medida: `hours` o `days` |
| `max_per_year` | `NUMERIC(6,2)` | NOT NULL | Máximo de horas o días permitidos por usuario por año natural |
| `min_duration` | `NUMERIC(6,2)` | NOT NULL | Duración mínima permitida por ausencia en la unidad definida |
| `max_duration` | `NUMERIC(6,2)` | NOT NULL | Duración máxima permitida por ausencia en la unidad definida |
| `requires_validation` | `BOOLEAN` | NOT NULL DEFAULT FALSE | Indica si la ausencia pasa por flujo de validación |
| `allow_past_dates` | `BOOLEAN` | NOT NULL DEFAULT FALSE | Indica si se puede registrar en fechas pasadas |
| `min_days_in_advance` | `INTEGER` | NULL | Días naturales mínimos de antelación requeridos; NULL si no aplica |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Permite desactivar el tipo sin eliminarlo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de la última modificación |

---

#### Tabla `absence`

Almacena cada ausencia registrada por un usuario.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `user_id` | `UUID` | FK → `user.id` NOT NULL | Usuario propietario de la ausencia |
| `absence_type_id` | `UUID` | FK → `absence_type.id` NOT NULL | Tipo de ausencia seleccionado |
| `start_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de inicio de la ausencia |
| `end_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de fin de la ausencia |
| `duration` | `NUMERIC(6,2)` | NOT NULL | Duración calculada y almacenada en la unidad del tipo (horas o días laborales) |
| `status` | `VARCHAR(50)` | NULL | Estado actual del flujo de validación; NULL para ausencias sin validación |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de la última modificación |

---

#### Tabla `absence_validation_history`

Registra cada acto de validación (aceptación o rechazo) realizado por un validador sobre una ausencia. Permite múltiples decisiones del mismo validador sobre la misma ausencia en distintos ciclos de validación (cuando una ausencia vuelve al estado "Esperando validación" tras ser replanteada).

Para determinar la decisión vigente de cada validador sobre una ausencia, se toma la fila más reciente por `(absence_id, validator_id)` ordenada por `decided_at DESC`.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `absence_id` | `UUID` | FK → `absence.id` NOT NULL | Ausencia sobre la que se toma la decisión |
| `validator_id` | `UUID` | FK → `user.id` NOT NULL | Usuario validador que emite la decisión |
| `decision` | `VARCHAR(20)` | NOT NULL | Decisión emitida: `accepted` o `rejected` |
| `decided_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Momento exacto en que se tomó la decisión |

---

#### Tabla `absence_status_history`

Registra cada transición de estado en el flujo de validación de una ausencia, incluyendo el usuario responsable y el momento del cambio. Es la base del sistema de auditoría.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `absence_id` | `UUID` | FK → `absence.id` NOT NULL | Ausencia cuyo estado cambia |
| `from_status` | `VARCHAR(50)` | NULL | Estado anterior; NULL en la transición inicial al crear la ausencia |
| `to_status` | `VARCHAR(50)` | NOT NULL | Nuevo estado tras la transición |
| `changed_by` | `UUID` | FK → `user.id` NOT NULL | Usuario que provocó el cambio de estado |
| `changed_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Momento exacto del cambio de estado |

---

#### Tabla `observation`

Almacena los comentarios que los usuarios implicados pueden añadir a una ausencia. El campo `content` usa el tipo `TEXT` de PostgreSQL, que en una base de datos con encoding `UTF8` soporta texto de longitud arbitraria con el rango Unicode completo, incluyendo emojis y cualquier carácter del plano suplementario.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `absence_id` | `UUID` | FK → `absence.id` NOT NULL | Ausencia a la que pertenece la observación |
| `user_id` | `UUID` | FK → `user.id` NOT NULL | Usuario autor de la observación |
| `content` | `TEXT` | NOT NULL | Texto del comentario. Tipo `TEXT` con encoding `UTF8` para soporte completo de emojis y caracteres Unicode (U+0000 a U+10FFFF) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación de la observación |

---

#### Tabla `notification`

Almacena las notificaciones in-app generadas por el sistema para cada usuario destinatario.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `user_id` | `UUID` | FK → `user.id` NOT NULL | Usuario destinatario de la notificación |
| `absence_id` | `UUID` | FK → `absence.id` NOT NULL | Ausencia relacionada con la notificación |
| `type` | `VARCHAR(100)` | NOT NULL | Tipo de evento: `validation_requested`, `status_changed`, etc. |
| `message` | `TEXT` | NOT NULL | Texto descriptivo de la notificación mostrado al usuario |
| `read` | `BOOLEAN` | NOT NULL DEFAULT FALSE | Indica si el usuario ha leído la notificación |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación de la notificación |

---

#### Tabla `team`

Almacena los equipos de usuarios. Cada equipo tiene un color asociado que se usará para representar las ausencias de sus miembros en el calendario de otros compañeros del mismo equipo.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `name` | `VARCHAR(255)` | NOT NULL | Nombre del equipo |
| `color` | `VARCHAR(7)` | NOT NULL | Color del equipo en formato hexadecimal (ej. `#FF5733`). No se restringe la unicidad del color |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Fecha y hora de la última modificación |

---

#### Tabla `team_member`

Relación N:M entre usuarios y equipos. Registra la pertenencia de un usuario a un equipo y la fecha en que se produjo la incorporación. La clave primaria es compuesta `(team_id, user_id)`, garantizando que un usuario no puede pertenecer al mismo equipo más de una vez.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `team_id` | `UUID` | FK → `team.id` NOT NULL | Equipo al que pertenece el usuario |
| `user_id` | `UUID` | FK → `user.id` NOT NULL | Usuario miembro del equipo |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora en que el usuario fue incorporado al equipo |

PK compuesta: `(team_id, user_id)`.

---

#### Tabla `observation_attachment`

Almacena los metadatos de los ficheros adjuntos a observaciones. El contenido binario del fichero no se guarda en base de datos sino en el sistema de ficheros local del servidor. En disco, cada fichero se almacena con un nombre generado (UUID v7 + extensión original) para evitar colisiones y no exponer el nombre original en la ruta del sistema de ficheros.

Tipos de fichero permitidos: `image/jpeg`, `image/png`, `application/pdf`. Tamaño máximo por fichero: 5 MB.

| columna | tipo PostgreSQL | restricciones | descripción |
|---|---|---|---|
| `id` | `UUID` | PK | UUID v7 generado en backend |
| `observation_id` | `UUID` | FK → `observation.id` NOT NULL | Observación a la que pertenece el adjunto |
| `filename` | `VARCHAR(255)` | NOT NULL | Nombre original del fichero tal como lo subió el usuario |
| `stored_filename` | `VARCHAR(255)` | NOT NULL | Nombre con el que se almacena en disco (UUID v7 + extensión) |
| `mime_type` | `VARCHAR(100)` | NOT NULL | Tipo MIME validado: `image/jpeg`, `image/png` o `application/pdf` |
| `size_bytes` | `INTEGER` | NOT NULL | Tamaño del fichero en bytes (máximo 5.242.880) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Fecha y hora de subida del fichero |

---

### 6.4 Gestión de Migraciones

Todo cambio en la estructura de la base de datos se gestiona **exclusivamente** mediante Prisma Migrate. Nunca se realizan cambios manuales directamente en la base de datos en ningún entorno (desarrollo, staging ni producción).

#### Prisma como fuente de verdad única

El archivo `prisma/schema.prisma` es la fuente de verdad del modelo de datos. Cualquier modificación en el esquema (añadir una tabla, una columna, un índice o una constraint) se realiza siempre editando este archivo, nunca ejecutando SQL manualmente.

#### Archivos de migración versionados en git

Cada vez que se modifica el schema, Prisma genera un archivo SQL con la migración correspondiente. Estos archivos se versionan en git junto al código de la aplicación, de forma que el historial completo de cambios en la base de datos es rastreable y reproducible.

```
apps/api/prisma/
├── schema.prisma
└── migrations/
    ├── 20260101120000_init/
    │   └── migration.sql
    ├── 20260215093000_add_teams/
    │   └── migration.sql
    └── 20260301090000_add_observation_attachments/
        └── migration.sql
```

Los archivos SQL generados **no se modifican manualmente** una vez creados, salvo casos excepcionales debidamente documentados en el mensaje del commit.

#### Flujo de trabajo en desarrollo

Cuando se necesita un cambio en el esquema:

1. Modificar `prisma/schema.prisma` con los cambios deseados.
2. Ejecutar el comando de migración en desarrollo:
   ```bash
   pnpm prisma migrate dev --name describe_the_change
   ```
3. Prisma genera el archivo SQL en `prisma/migrations/`, aplica la migración sobre la base de datos de desarrollo y regenera el cliente Prisma con los nuevos tipos.
4. Commitear tanto el `schema.prisma` modificado como el archivo de migración generado.

#### Flujo de trabajo en CI / staging / producción

En entornos que no son de desarrollo se usa el comando de despliegue, que **solo aplica** migraciones pendientes sin generar ningún archivo nuevo:

```bash
pnpm prisma migrate deploy
```

Este comando es seguro para producción: es idempotente, consulta la tabla interna `_prisma_migrations` de PostgreSQL para saber qué migraciones ya han sido aplicadas y solo ejecuta las pendientes. Si alguna migración falla, el proceso se detiene y se puede corregir sin dejar la base de datos en un estado inconsistente.

#### Comandos de referencia

| Comando | Entorno | Descripción |
|---|---|---|
| `prisma migrate dev --name <nombre>` | Desarrollo | Genera la migración, la aplica y regenera el cliente |
| `prisma migrate deploy` | CI / Staging / Producción | Solo aplica las migraciones pendientes |
| `prisma migrate status` | Cualquiera | Muestra qué migraciones están aplicadas y cuáles pendientes |
| `prisma migrate reset` | Solo desarrollo | Elimina la BD, vuelve a crearla y aplica todas las migraciones desde cero |
| `prisma generate` | Desarrollo | Regenera el cliente Prisma sin aplicar migraciones |

> `prisma migrate reset` destruye todos los datos. Solo debe usarse en desarrollo local, nunca en staging ni producción.

---

## 7. Estrategia de Testing

### 7.1 Backend (`apps/api`) — Jest

**Tests unitarios**
Cubren servicios y lógica de negocio de forma aislada, con dependencias mockeadas (PrismaService, otros servicios). Casos prioritarios:
- Cálculo de duración en horas y en días laborales (lunes a viernes).
- Validación de límites anuales por tipo de ausencia.
- Validación de antelación mínima (15 días naturales para ausencias retribuidas).
- Detección de solapamiento de fechas entre ausencias.
- Máquina de estados: transiciones válidas e inválidas del flujo de validación.
- Lógica de decisión de validadores (todos aceptan → Aceptada; uno rechaza → Replantear).
- Cancelación: solo posible si la fecha de inicio no ha llegado.

**Tests de integración**
Prueban módulos NestJS completos con una base de datos PostgreSQL real levantada en un contenedor Docker mediante Testcontainers. Esto garantiza que los tests reproducen el comportamiento exacto de PostgreSQL (tipos, constraints, collation, UUID) sin depender de bases de datos en memoria que pueden tener comportamientos distintos. Cada suite de integración levanta y destruye su propio contenedor para garantizar aislamiento.

**Tests e2e**
Prueban los endpoints HTTP más críticos con Supertest contra la aplicación NestJS completa. Cubren el flujo completo de autenticación, creación de ausencias y el ciclo de validación end-to-end.

Umbral mínimo de cobertura: **80%** de líneas y ramas.

### 7.2 Frontend (`apps/web`) — Vitest

**Por qué Vitest en lugar de Jest:**
Vitest comparte el pipeline de transformación de módulos con Vite (esbuild), lo que lo hace significativamente más rápido que Jest en proyectos que usan Vite. Además, la configuración es mínima al compartir `vite.config.ts`.

**Tests de componentes (React Testing Library)**
Filosofía centrada en el comportamiento del usuario, no en detalles de implementación. Los tests interactúan con los componentes como lo haría un usuario: buscando elementos por rol, label o texto, y disparando eventos de usuario. Flujos prioritarios:
- Formulario de creación de ausencia: validaciones, selección de tipo, fechas, validadores.
- Dashboard: renderizado de saldo restante y próximas ausencias.
- Acciones de validación: aceptar y rechazar desde la vista de una ausencia.
- Vista de calendario: renderizado de eventos y navegación entre meses.

**Mock de API (MSW)**
MSW intercepta las peticiones HTTP a nivel de service worker, permitiendo definir handlers que simulan las respuestas de la API sin modificar el código de producción ni levantar un servidor. Los handlers de MSW se reutilizan entre tests unitarios y, en el futuro, para demos o desarrollo sin backend.

Umbral mínimo de cobertura: **70%** de líneas y ramas.

### 7.3 Paquetes compartidos (`packages/types`) — Vitest

Tests unitarios de todos los schemas Zod para verificar que las validaciones compartidas se comportan correctamente: casos válidos, casos inválidos en frontera (duración mínima/máxima, antelación, límites anuales).

### 7.4 Pipeline de Turborepo

La tarea `test` está definida en `turbo.json` con dependencia sobre `build` de los paquetes de los que depende. La cobertura se genera con el flag `--coverage` y Turborepo falla el pipeline si el umbral no se alcanza.

---

## 8. Tooling y Calidad de Código

**ESLint**
Reglas base definidas en `@repo/config/eslint-base.js` y extendidas en cada paquete:
- Backend: reglas adicionales para NestJS (`@darraghor/eslint-plugin-nestjs-typed`).
- Frontend: reglas de React (`eslint-plugin-react`, `eslint-plugin-react-hooks`) y accesibilidad (`eslint-plugin-jsx-a11y`).

**Prettier**
Configuración única en `@repo/config/prettier.config.js` aplicada a todo el monorepo. Parámetros: comillas simples, punto y coma, ancho de línea 100, trailing commas en ES5.

**Husky + lint-staged**
Pre-commit hook que ejecuta lint y format únicamente sobre los archivos modificados en el commit (no sobre todo el proyecto), manteniendo el feedback rápido. Si lint o format fallan, el commit se rechaza.

**Conventional Commits**
Formato estándar de mensajes de commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). Validado con `commitlint` en el hook `commit-msg` de Husky. Facilita la generación automática de changelogs y la comprensión del historial de cambios.

**Pipeline Turbo (`turbo.json`)**

| Tarea | Depende de | Con caché |
|---|---|---|
| `build` | `build` de dependencias | Sí |
| `typecheck` | `build` de dependencias | Sí |
| `lint` | — | Sí |
| `test` | `build` de dependencias | Sí |
| `dev` | — | No |

---

## 9. Variables de Entorno

Todas las variables de entorno del backend se validan al arranque mediante `@nestjs/config`. Si alguna variable obligatoria está ausente o tiene un formato incorrecto, la aplicación lanza un error descriptivo y no arranca, evitando comportamientos inesperados en tiempo de ejecución.

| variable | descripción | obligatoria |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL en formato `postgresql://user:pass@host:port/db` | Sí |
| `JWT_SECRET` | Secreto para firmar y verificar access tokens. Mínimo 32 caracteres aleatorios | Sí |
| `JWT_REFRESH_SECRET` | Secreto para firmar y verificar refresh tokens. Debe ser distinto de `JWT_SECRET` | Sí |
| `JWT_EXPIRES_IN` | Duración del access token en formato vercel/ms (ej. `15m`) | Sí |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token en formato vercel/ms (ej. `7d`) | Sí |
| `SMTP_HOST` | Hostname del servidor SMTP para el envío de emails | Sí |
| `SMTP_PORT` | Puerto del servidor SMTP (habitualmente `465` para SSL o `587` para STARTTLS) | Sí |
| `SMTP_SECURE` | `true` para SSL/TLS, `false` para STARTTLS | Sí |
| `SMTP_USER` | Usuario de autenticación del servidor SMTP | Sí |
| `SMTP_PASS` | Contraseña de autenticación del servidor SMTP | Sí |
| `SMTP_FROM` | Dirección de email remitente (ej. `"Sistema de Ausencias" <no-reply@empresa.com>`) | Sí |
| `CORS_ORIGIN` | URL del frontend permitida por la política CORS (ej. `http://localhost:5173`) | Sí |
| `APP_PORT` | Puerto en el que escucha la API. Por defecto `3000` | No |
