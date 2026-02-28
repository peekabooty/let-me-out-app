# Buenas Prácticas — Backend (NestJS + Prisma + PostgreSQL)

## 1. Límite de Líneas y Responsabilidad Única por Archivo

Ningún archivo de código debe superar las 400 líneas de código efectivas (sin contar comentarios, imports, líneas en blanco y decoradores simples). Un archivo que crece por encima de este límite es una señal de que tiene demasiadas responsabilidades.

### Cómo dividir un servicio que crece

Si un `CommandHandler` o `Service` empieza a crecer, las estrategias de división son:

- **Extraer un servicio de dominio:** lógica de cálculo reutilizable (ej. `AbsenceBalanceCalculator`, `WorkingDaysCalculator`, `AbsenceOverlapChecker`).
- **Extraer un sub-handler:** si un handler orquesta demasiados pasos, algunos pueden convertirse en handlers de eventos de dominio.
- **Extraer un mapper:** si la transformación de datos es compleja, moverla a su propio archivo `absence.mapper.ts`.

---

## 2. Validación en Capas

Cada capa valida lo que le corresponde. No se mezclan responsabilidades de validación entre capas.

| Capa | Qué valida | Cómo |
|---|---|---|
| HTTP (Controller) | Formato y tipos de los datos de entrada | `class-validator` + `ValidationPipe` |
| Aplicación (Handler) | Reglas de negocio (solapamiento, límites anuales, antelación) | Llamadas a servicios de dominio o puertos |
| Dominio (Entidad) | Invariantes de la entidad (transiciones de estado válidas) | Métodos de la entidad que lanzan excepciones |
| Infraestructura (Repository) | Integridad referencial | Constraints de PostgreSQL |

### `ValidationPipe` global

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // descarta propiedades no declaradas en el DTO
    forbidNonWhitelisted: true, // lanza error si llegan propiedades no permitidas
    transform: true,            // transforma tipos automáticamente (string → number, etc.)
  }),
);
```

### Nunca confiar en el tipo MIME del cliente

Al subir ficheros adjuntos, el tipo MIME declarado por el cliente puede ser manipulado. El backend debe verificar el tipo MIME real inspeccionando los bytes del fichero (magic bytes), no solo la extensión o el `Content-Type` de la petición.

```typescript
// Usar la librería 'file-type' para verificar el tipo real del buffer
import { fileTypeFromBuffer } from 'file-type';

const detected = await fileTypeFromBuffer(file.buffer);
if (!ALLOWED_MIME_TYPES.includes(detected?.mime)) {
  throw new InvalidFileTypeException();
}
```

---

## 3. Transacciones con Prisma

Usar `prisma.$transaction()` siempre que una operación modifique más de una tabla. Esto garantiza que el sistema nunca queda en un estado inconsistente si una operación falla a mitad.

### Cuándo usar transacciones

- Crear una ausencia y registrar la transición de estado inicial en `absence_status_history`.
- Cambiar el estado de una ausencia y crear la notificación correspondiente.
- Subir un fichero: crear el registro en `observation_attachment` y escribir el fichero en disco solo si la transacción de BD tiene éxito.

### Transacción interactiva vs. batch

```typescript
// Batch: todas las operaciones se ejecutan en una sola transacción atómica
await this.prisma.$transaction([
  this.prisma.absence.create({ data: absenceData }),
  this.prisma.absenceStatusHistory.create({ data: historyData }),
]);

// Interactiva: necesaria cuando el resultado de una operación condiciona la siguiente
await this.prisma.$transaction(async (tx) => {
  const absence = await tx.absence.create({ data: absenceData });
  await tx.absenceStatusHistory.create({
    data: { absenceId: absence.id, ...historyData },
  });
});
```

---

## 4. Seguridad

### Cabeceras HTTP con Helmet

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

Helmet configura cabeceras de seguridad HTTP estándar: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, entre otras.

### Rate Limiting

```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,  // ventana de 60 segundos
  limit: 30,   // máximo 30 peticiones por ventana por IP
}]),
```

Protege los endpoints de login y de subida de ficheros con límites más estrictos usando el decorador `@Throttle()`.

### Tokens JWT en `httpOnly` cookies

Los tokens JWT **nunca** se devuelven en el cuerpo de la respuesta para que el frontend los almacene en `localStorage` o `sessionStorage`. Se envían como cookies con los atributos de seguridad correctos:

```typescript
// auth.controller.ts — después de un login exitoso
response.cookie('access_token', accessToken, {
  httpOnly: true,    // inaccesible desde JavaScript, inmune a XSS
  secure: true,      // solo se envía por HTTPS
  sameSite: 'none', // usar 'none' en despliegue cross-site
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutos en ms
});

response.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'none', // usar 'none' en despliegue cross-site
  path: '/auth/refresh', // el refresh token solo se envía al endpoint de refresco
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
});
```

En despliegue cross-site, `SameSite=None` es obligatorio para que el navegador envíe las cookies. En despliegue same-site se usa `SameSite=Strict` manteniendo `Secure=true`.

La estrategia JWT de Passport debe configurarse para extraer el token de la cookie en lugar de la cabecera `Authorization`:

```typescript
JwtModule.register({
  secretOrKey: configService.get('JWT_SECRET'),
  jwtFromRequest: ExtractJwt.fromExtractors([
    (request) => request?.cookies?.access_token,
  ]),
})
```

### CORS restringido

```typescript
app.enableCors({
  origin: configService.get('CORS_ORIGIN'),
  credentials: true, // necesario para que el navegador envíe cookies en peticiones cross-origin
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

### Nunca loggear datos sensibles

```typescript
// Mal
this.logger.log(`Login attempt for ${email} with password ${password}`);

// Bien
this.logger.log(`Login attempt for user: ${email}`);
```

Nunca registrar: contraseñas, hashes de contraseñas, tokens JWT, datos personales sensibles (contenido de observaciones, nombres de ficheros adjuntos).

### Almacenamiento seguro de ficheros

Los ficheros adjuntos se almacenan en disco con un nombre generado (UUID v7 + extensión), nunca con el nombre original proporcionado por el usuario. El directorio de almacenamiento debe estar fuera del directorio público del servidor para que no sean accesibles directamente por URL.

```
/app/
├── src/              # código fuente
├── uploads/          # directorio de ficheros adjuntos (NO accesible públicamente)
│   └── attachments/
└── public/           # solo archivos estáticos del frontend
```

---

## 5. Logging Estructurado

### Logger de NestJS

Usar el `Logger` de NestJS con el nombre del módulo como contexto. Esto permite filtrar logs por módulo fácilmente.

```typescript
@Injectable()
export class CreateAbsenceHandler {
  private readonly logger = new Logger(CreateAbsenceHandler.name);

  async execute(command: CreateAbsenceCommand): Promise<void> {
    this.logger.log(`Creating absence for user ${command.userId}`);
    // ...
    this.logger.log(`Absence created successfully: ${absenceId}`);
  }
}
```

### Niveles de log

| Nivel | Cuándo usarlo |
|---|---|
| `log` | Operaciones normales relevantes del negocio |
| `warn` | Situaciones inesperadas pero recuperables |
| `error` | Errores que impiden completar una operación |
| `debug` | Información detallada útil solo en desarrollo |
| `verbose` | Información muy detallada para diagnóstico |

### Correlación de requests

Añadir un `request-id` único a cada petición HTTP y propagarlo en todos los logs de esa petición. Facilita el diagnóstico de problemas en producción.

```typescript
// middleware de correlación
app.use((req, res, next) => {
  req.headers['x-request-id'] ??= uuidv7();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});
```

---

## 6. Manejo de Fechas

### Siempre con zona horaria

Todas las fechas se almacenan en PostgreSQL como `TIMESTAMPTZ` (timestamp with time zone). Internamente PostgreSQL las convierte y almacena en UTC. Esto garantiza consistencia independientemente de la zona horaria del servidor.

### Usar `date-fns` para cálculos

`date-fns` es una librería funcional y tree-shakeable para manipulación de fechas. Preferida sobre `moment.js` (deprecada) y sobre manipulación manual con `new Date()`.

```typescript
import { addDays, differenceInCalendarDays, isWeekend, eachDayOfInterval } from 'date-fns';

// Calcular días laborales entre dos fechas (lunes a viernes, sin festivos)
function calculateWorkingDays(startAt: Date, endAt: Date): number {
  return eachDayOfInterval({ start: startAt, end: endAt })
    .filter(day => !isWeekend(day))
    .length;
}

// Verificar antelación mínima de 15 días naturales
function meetsMinimumAdvanceNotice(startAt: Date, minimumDays: number): boolean {
  return differenceInCalendarDays(startAt, new Date()) >= minimumDays;
}
```

### Inyectar un `ClockService`

Nunca usar `new Date()` directamente en lógica de negocio. En su lugar, inyectar un servicio que devuelva la fecha actual. Esto permite controlar el tiempo en los tests sin necesidad de librerías de mocking de fechas.

```typescript
// common/clock.service.ts
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }
}

// En tests
const mockClockService = { now: () => new Date('2026-01-15T10:00:00Z') };
```

---

## 7. Índices y Rendimiento en PostgreSQL

### Índices en claves foráneas

PostgreSQL no crea automáticamente índices en las columnas de clave foránea (a diferencia de MySQL). Es necesario crearlos manualmente en el schema de Prisma para todas las FKs que se usen en queries frecuentes.

```prisma
model Absence {
  id            String   @id
  userId        String
  absenceTypeId String

  @@index([userId])
  @@index([absenceTypeId])
  @@index([userId, startAt, endAt]) // para detección de solapamiento
}
```

### Índices compuestos para queries frecuentes

- `absence(userId, startAt, endAt)`: para la query de detección de solapamiento y cálculo de saldo anual.
- `absenceValidationHistory(absenceId, validatorId, decidedAt)`: para obtener la última decisión de cada validador.
- `notification(userId, read, createdAt)`: para obtener notificaciones no leídas de un usuario.

### Paginación con cursor

Para listados de ausencias (especialmente en la vista de auditor que puede ver todas las ausencias), usar paginación basada en cursor en lugar de `OFFSET/LIMIT`. La paginación por offset degrada en rendimiento a medida que crece el offset.

```typescript
// Paginación por cursor usando el UUID v7 (ordenable cronológicamente)
const absences = await this.prisma.absence.findMany({
  take: pageSize,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});
```

---

## 8. Variables de Entorno

### Validación al arranque

Usar `@nestjs/config` con un schema de validación (Joi) que se ejecuta al iniciar la aplicación. Si alguna variable obligatoria falta o tiene un formato incorrecto, la aplicación no arranca.

```typescript
// config/env.validation.ts
export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().required(),
  CORS_ORIGIN: Joi.string().uri().required(),
});
```

### Nunca en código

Las variables de entorno nunca se referencian directamente con `process.env.VARIABLE`. Se accede siempre a través del `ConfigService` de NestJS, que garantiza el tipado y la validación previa.

---

## 9. Pruebas en el Backend

### Estructura AAA (Arrange, Act, Assert)

Todos los tests siguen la misma estructura para maximizar la legibilidad:

```typescript
it('should throw AnnualLimitExceededException when user exceeds annual hours', async () => {
  // Arrange
  const userId = 'user-id';
  const usedHours = 78;
  absenceRepositoryMock.getUsedHoursByYear.mockResolvedValue(usedHours);

  // Act
  const execute = () => handler.execute(new CreateAbsenceCommand(userId, ...));

  // Assert
  await expect(execute()).rejects.toThrow(AnnualLimitExceededException);
});
```

### Mock de PrismaService

En tests unitarios, el `PrismaService` se mockea completamente. Nunca se conecta a una base de datos real en tests unitarios.

```typescript
const mockPrismaService = {
  absence: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

### Tests de integración con Testcontainers

Los tests de integración levantan un contenedor PostgreSQL real para verificar que las queries, los índices y los constraints funcionan correctamente. Cada suite de integración usa su propia base de datos aislada.

```typescript
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  // ejecutar migraciones de Prisma sobre el contenedor
});

afterAll(async () => {
  await container.stop();
});
```

### Qué testear en cada capa

| Capa | Tipo de test | Qué se testea |
|---|---|---|
| Entidades de dominio | Unitario | Reglas de negocio, transiciones de estado, invariantes |
| Command/Query Handlers | Unitario | Lógica de aplicación, llamadas a puertos mockeados |
| Controllers | Unitario | Mapeo HTTP → Command/Query, validación de DTOs |
| Repositories | Integración | Queries SQL, índices, constraints de BD |
| Endpoints críticos | E2E | Flujo completo autenticación, creación de ausencias, validación |
