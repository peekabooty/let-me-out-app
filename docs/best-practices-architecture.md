# Buenas Prácticas — Arquitectura Global

## 1. Arquitectura Hexagonal (Puertos y Adaptadores)

La arquitectura hexagonal, también conocida como arquitectura de puertos y adaptadores, sitúa la lógica de dominio en el centro de la aplicación, completamente aislada de frameworks, bases de datos y cualquier tecnología de infraestructura. El objetivo es que el dominio pueda probarse y razonarse de forma independiente, sin necesidad de levantar una base de datos ni un servidor HTTP.

### Capas

```
┌─────────────────────────────────────────────┐
│              Infraestructura                │
│  (Controllers, PrismaRepository, Nodemailer)│
│  ┌───────────────────────────────────────┐  │
│  │           Aplicación                  │  │
│  │  (Commands, Queries, Event Handlers)  │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │           Dominio               │  │  │
│  │  │  (Entidades, Puertos, Reglas)   │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Dominio:** Entidades de negocio, reglas de negocio y puertos (interfaces). No depende de nada externo. Es el núcleo de la aplicación.
- **Aplicación:** Casos de uso (Commands y Queries en CQRS). Orquesta el dominio y llama a los puertos de salida. No conoce HTTP ni Prisma.
- **Infraestructura:** Adaptadores que implementan los puertos. Controllers HTTP (adaptadores de entrada), repositorios Prisma (adaptadores de salida), Nodemailer (adaptador de salida), sistema de ficheros (adaptador de salida).

### Estructura de carpetas por módulo

Cada módulo de negocio replica la misma estructura de capas:

```
src/modules/absence/
├── domain/
│   ├── absence.entity.ts           # Entidad de dominio con reglas de negocio
│   ├── absence-status.enum.ts      # Enumeraciones de dominio
│   └── ports/
│       ├── absence.repository.port.ts   # Puerto de salida (interfaz)
│       └── notification.port.ts         # Puerto de salida (interfaz)
├── application/
│   ├── commands/
│   │   ├── create-absence.command.ts
│   │   ├── create-absence.handler.ts
│   │   ├── validate-absence.command.ts
│   │   └── validate-absence.handler.ts
│   ├── queries/
│   │   ├── get-absence.query.ts
│   │   ├── get-absence.handler.ts
│   │   ├── get-user-balance.query.ts
│   │   └── get-user-balance.handler.ts
│   └── events/
│       ├── absence-created.event.ts
│       └── absence-status-changed.event.ts
├── infrastructure/
│   ├── absence.controller.ts        # Adaptador de entrada HTTP
│   ├── absence.prisma.repository.ts # Adaptador de salida (implementa el puerto)
│   └── absence.mapper.ts            # Mapeo entre entidad de dominio y modelo Prisma
└── absence.module.ts
```

### Reglas de dependencia

- El dominio **nunca** importa desde aplicación ni desde infraestructura.
- La aplicación **nunca** importa desde infraestructura.
- La infraestructura puede importar desde aplicación y dominio.
- Los módulos de NestJS inyectan las implementaciones concretas de los puertos mediante tokens de inyección de dependencias.

```typescript
// domain/ports/absence.repository.port.ts
export interface AbsenceRepositoryPort {
  findById(id: string): Promise<Absence | null>;
  findByUserId(userId: string): Promise<Absence[]>;
  save(absence: Absence): Promise<void>;
  checkOverlap(userId: string, startAt: Date, endAt: Date): Promise<boolean>;
}

// absence.module.ts — inyección de la implementación concreta
{
  provide: ABSENCE_REPOSITORY_PORT,
  useClass: AbsencePrismaRepository,
}
```

---

## 2. SOLID en TypeScript y NestJS

### S — Single Responsibility Principle

Cada clase, servicio o módulo tiene una única razón para cambiar.

- Un `Controller` solo gestiona el mapeo HTTP → Command/Query. No contiene lógica de negocio.
- Un `CommandHandler` solo ejecuta un caso de uso concreto.
- Un `PrismaRepository` solo se encarga de la persistencia de una entidad.
- Un `Mapper` solo se encarga de transformar entre representaciones de datos.

**Mal:**
```typescript
// AbsenceService hace demasiado: valida, persiste, notifica y calcula saldo
class AbsenceService {
  async create(dto: CreateAbsenceDto) {
    // validar solapamiento
    // calcular duración
    // guardar en BD
    // enviar email
    // crear notificación in-app
    // actualizar saldo anual
  }
}
```

**Bien:** Cada responsabilidad en su propio handler o servicio de dominio, orquestados por el `CommandHandler`.

### O — Open/Closed Principle

Las clases están abiertas a extensión pero cerradas a modificación. Se logra dependiendo de interfaces (puertos) en lugar de implementaciones concretas.

Al añadir un nuevo canal de notificación (ej. Slack), no se modifica el `NotificationService` existente; se crea un nuevo adaptador que implementa `NotificationPort` y se registra en el módulo.

### L — Liskov Substitution Principle

Cualquier implementación de un puerto debe poder sustituir a cualquier otra sin alterar el comportamiento del sistema. Los tests de integración deben poder ejecutarse con un repositorio en memoria que implemente el mismo puerto que el repositorio Prisma.

```typescript
class InMemoryAbsenceRepository implements AbsenceRepositoryPort {
  // implementación en memoria para tests
}
```

### I — Interface Segregation Principle

Las interfaces son pequeñas y específicas. No se crea una interfaz `IAbsenceService` con 20 métodos; se crean puertos específicos por caso de uso.

```typescript
// Mal: una interfaz dios
interface AbsenceServiceInterface {
  create(dto: CreateAbsenceDto): Promise<void>;
  validate(id: string, decision: string): Promise<void>;
  cancel(id: string): Promise<void>;
  getBalance(userId: string): Promise<Balance>;
  // ...10 métodos más
}

// Bien: puertos específicos y cohesivos
interface AbsenceRepositoryPort { ... }
interface AbsenceValidationPort { ... }
interface AbsenceBalancePort { ... }
```

### D — Dependency Inversion Principle

Los módulos de alto nivel (aplicación) no dependen de módulos de bajo nivel (infraestructura). Ambos dependen de abstracciones (puertos).

```typescript
// CommandHandler depende del puerto (abstracción), no de PrismaRepository
@CommandHandler(CreateAbsenceCommand)
export class CreateAbsenceHandler {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    @Inject(NOTIFICATION_PORT)
    private readonly notificationService: NotificationPort,
  ) {}
}
```

---

## 3. CQRS con `@nestjs/cqrs`

CQRS (Command Query Responsibility Segregation) separa las operaciones que modifican estado (Commands) de las que solo leen (Queries). Esto simplifica la lógica, facilita el testing unitario y abre la puerta a optimizaciones de rendimiento independientes en lectura y escritura.

### Commands

Un Command representa una intención de cambiar el estado del sistema. Lleva los datos necesarios para ejecutar la operación y no devuelve datos de negocio (solo confirmación o el ID del recurso creado).

```typescript
// application/commands/create-absence.command.ts
export class CreateAbsenceCommand {
  constructor(
    public readonly userId: string,
    public readonly absenceTypeId: string,
    public readonly startAt: Date,
    public readonly endAt: Date,
    public readonly validatorIds: string[],
  ) {}
}
```

### Queries

Una Query representa una solicitud de lectura. No modifica estado. Puede devolver DTOs optimizados para la vista, distintos de las entidades de dominio.

```typescript
// application/queries/get-user-balance.query.ts
export class GetUserBalanceQuery {
  constructor(
    public readonly userId: string,
    public readonly year: number,
  ) {}
}
```

### Domain Events

Los eventos de dominio desacoplan módulos entre sí. El módulo de ausencias no conoce el módulo de notificaciones; simplemente emite un evento y el módulo de notificaciones lo consume.

```typescript
// application/events/absence-status-changed.event.ts
export class AbsenceStatusChangedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly fromStatus: AbsenceStatus | null,
    public readonly toStatus: AbsenceStatus,
    public readonly changedBy: string,
  ) {}
}
```

### Flujo completo de un Command

```
HTTP Request
    ↓
Controller (valida DTO, construye Command)
    ↓
CommandBus.execute(command)
    ↓
CommandHandler (lógica de aplicación, llama al dominio)
    ↓
Entidad de dominio (aplica reglas de negocio)
    ↓
RepositoryPort.save(entity)
    ↓
EventBus.publish(AbsenceStatusChangedEvent)
    ↓
EventHandler en NotificationsModule (envía email + notificación in-app)
```

---

## 4. Contratos de API

### DTOs de entrada y salida siempre distintos

El DTO de entrada (`CreateAbsenceDto`) valida los datos que llegan del cliente. El DTO de salida (`AbsenceResponseDto`) define exactamente qué campos se devuelven al cliente. Nunca se devuelve la entidad de Prisma directamente.

```typescript
// Mal: exponer el modelo de Prisma directamente
async findById(id: string): Promise<Absence> {
  return this.prisma.absence.findUniqueOrThrow({ where: { id } });
}

// Bien: mapear a un DTO de salida explícito
async findById(id: string): Promise<AbsenceResponseDto> {
  const absence = await this.prisma.absence.findUniqueOrThrow({ where: { id } });
  return AbsenceMapper.toResponseDto(absence);
}
```

### Mappers explícitos

Cada módulo tiene un `Mapper` que centraliza las transformaciones entre capas:

- Modelo Prisma → Entidad de dominio
- Entidad de dominio → DTO de respuesta HTTP
- DTO de entrada → Command

Esto evita que la lógica de transformación esté dispersa por el código.

---

## 5. Gestión Global de Errores

### Excepciones de dominio propias

El dominio lanza excepciones específicas con semántica de negocio:

```typescript
export class AbsenceOverlapException extends DomainException {}
export class AnnualLimitExceededException extends DomainException {}
export class InvalidAbsenceDurationException extends DomainException {}
export class InsufficientAdvanceNoticeException extends DomainException {}
```

### ExceptionFilter global

Un filtro global en NestJS intercepta todas las excepciones y las mapea a respuestas HTTP con formato consistente:

```typescript
// Formato estándar de error en toda la API
{
  "statusCode": 422,
  "error": "ABSENCE_OVERLAP",
  "message": "Ya existe una ausencia en ese periodo de tiempo"
}
```

El filtro distingue entre excepciones de dominio (errores esperados con código HTTP específico) y errores no controlados (HTTP 500).

---

## 6. Principios Generales de Diseño

### Ley de Demeter

Un objeto solo debe hablar con sus colaboradores directos, nunca con los colaboradores de sus colaboradores.

```typescript
// Mal
user.getTeam().getMembers().filter(m => m.isActive());

// Bien
teamService.getActiveMembers(user.teamId);
```

### Inmutabilidad en el dominio

Las entidades de dominio no mutan directamente sus propiedades; exponen métodos que aplican las reglas de negocio y devuelven el nuevo estado o lanzan una excepción si la operación no es válida.

```typescript
class Absence {
  accept(): void {
    if (this.status !== AbsenceStatus.WAITING_VALIDATION) {
      throw new InvalidStatusTransitionException(this.status, AbsenceStatus.ACCEPTED);
    }
    this.status = AbsenceStatus.ACCEPTED;
  }
}
```

### No asumir, validar

Nunca asumir que los datos que llegan a una función son correctos, incluso si vienen de otras partes del sistema. Cada capa valida lo que le corresponde validar.

### Nombres que expresan intención

Los nombres de clases, métodos y variables deben expresar claramente su intención. Evitar abreviaciones, nombres genéricos (`data`, `info`, `manager`, `helper`) y nombres técnicos donde debería haber nombres de negocio.

```typescript
// Mal
const d = calcD(u, t);

// Bien
const remainingDays = calculateRemainingAnnualBalance(userId, absenceType);
```
