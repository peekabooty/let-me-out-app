# Buenas Prácticas — Frontend (React + Vite + TanStack)

## 1. Límite de Líneas y Responsabilidad Única por Archivo

Ningún archivo de código debe superar las 400 líneas de código efectivas (sin contar comentarios, imports y líneas en blanco). Un componente o hook que crece por encima de este límite tiene demasiadas responsabilidades.

### Cómo dividir un componente que crece

- **Extraer subcomponentes:** si una sección del JSX tiene lógica propia y se puede nombrar claramente, merece su propio componente.
- **Extraer custom hooks:** si el componente gestiona estado o efectos complejos, ese código va a un hook dedicado.
- **Extraer constantes y tipos:** moverlos a archivos `*.types.ts` y `*.constants.ts` dentro de la misma carpeta.

### Estructura de carpetas por funcionalidad (colocation)

Los archivos relacionados con una funcionalidad viven juntos, no separados por tipo:

```
src/pages/absences/
├── AbsencesPage.tsx              # Componente página (contenedor)
├── AbsencesPage.test.tsx         # Tests del contenedor
├── components/
│   ├── AbsenceList.tsx           # Componente de presentación
│   ├── AbsenceList.test.tsx
│   ├── AbsenceCard.tsx
│   └── AbsenceCard.test.tsx
└── hooks/
    ├── use-absences.ts           # Query hook
    └── use-cancel-absence.ts     # Mutation hook
```

Esta estructura facilita mover o eliminar una funcionalidad completa: todos sus archivos están en el mismo lugar.

---

## 2. Separación de Responsabilidades en Componentes

### Componentes de presentación

Reciben datos por props y renderizan UI. No hacen llamadas a la API, no acceden a stores globales, no contienen lógica de negocio. Son los más fáciles de testear y reutilizar.

```typescript
// Bien: componente de presentación puro
interface AbsenceCardProps {
  absence: AbsenceResponseDto;
  onCancel: (id: string) => void;
}

export function AbsenceCard({ absence, onCancel }: AbsenceCardProps) {
  return (
    <div>
      <span>{absence.absenceType.name}</span>
      <span>{formatDateRange(absence.startAt, absence.endAt)}</span>
      <button onClick={() => onCancel(absence.id)}>Cancelar</button>
    </div>
  );
}
```

### Componentes contenedor / página

Orquestan queries, mutations y estado. Obtienen los datos y los pasan hacia abajo a los componentes de presentación. Una página no debería tener apenas JSX propio; su responsabilidad es coordinar.

```typescript
// Bien: componente contenedor que coordina
export function AbsencesPage() {
  const { absences, isLoading } = useAbsences();
  const { cancelAbsence } = useCancelAbsence();

  if (isLoading) return <AbsenceListSkeleton />;

  return <AbsenceList absences={absences} onCancel={cancelAbsence} />;
}
```

### Custom hooks como capa de lógica

Toda la lógica que no es renderizado (llamadas a la API, transformaciones de datos, estado local complejo) va en custom hooks. Un componente que necesita un hook con más de 50 líneas probablemente necesita extraerlo.

```typescript
// hooks/use-absences.ts
export function useAbsences() {
  const {
    data: absences = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: absenceKeys.list(),
    queryFn: () => absenceApi.getMyAbsences(),
  });

  return { absences, isLoading, isError };
}
```

---

## 3. TanStack Query: Buenas Prácticas

### Query keys como constantes tipadas

Las query keys nunca son strings sueltos definidos en cada componente. Se centralizan en un objeto de fábrica por recurso:

```typescript
// lib/query-keys/absence.keys.ts
export const absenceKeys = {
  all: ['absences'] as const,
  list: () => [...absenceKeys.all, 'list'] as const,
  detail: (id: string) => [...absenceKeys.all, 'detail', id] as const,
  balance: (userId: string, year: number) => [...absenceKeys.all, 'balance', userId, year] as const,
};
```

Esto garantiza que la invalidación de caché es precisa y consistente en toda la aplicación.

### Invalidación precisa tras mutaciones

```typescript
export function useCancelAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => absenceApi.cancel(id),
    onSuccess: (_, id) => {
      // invalidar solo lo necesario, no toda la caché
      queryClient.invalidateQueries({ queryKey: absenceKeys.list() });
      queryClient.invalidateQueries({ queryKey: absenceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: absenceKeys.balance(...) });
    },
  });
}
```

### Gestión explícita de estados de carga y error

Cada componente que consume una query debe gestionar explícitamente los estados `isLoading` e `isError`. No se asume que los datos siempre estarán disponibles.

```typescript
// Bien: gestión explícita de los tres estados
if (isLoading) return <Skeleton />;
if (isError) return <ErrorMessage />;
return <AbsenceList absences={absences} />;
```

### `staleTime` según la naturaleza del dato

No todos los datos tienen la misma frecuencia de cambio. Configurar `staleTime` de forma apropiada reduce peticiones innecesarias al servidor.

```typescript
// Tipos de ausencia: cambian poco, staleTime alto
useQuery({
  queryKey: absenceTypeKeys.list(),
  queryFn: absenceTypeApi.getAll,
  staleTime: 5 * 60 * 1000, // 5 minutos
});

// Notificaciones: cambian frecuentemente, staleTime bajo
useQuery({
  queryKey: notificationKeys.unread(),
  queryFn: notificationApi.getUnread,
  staleTime: 30 * 1000, // 30 segundos
  refetchInterval: 60 * 1000, // polling cada 60 segundos
});
```

---

## 4. Seguridad en el Frontend

### Tokens en `httpOnly` cookies

El access token y el refresh token viajan en cookies `httpOnly` gestionadas por el servidor. El frontend **nunca** accede al token directamente desde JavaScript.

```typescript
// lib/axios.ts — withCredentials: true para que el navegador envíe las cookies
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // imprescindible para enviar cookies en peticiones cross-origin
});
```

### Sesión desde `/me`

El frontend obtiene el estado de sesión y el rol del usuario llamando a un endpoint protegido (`GET /auth/me`), que devuelve el perfil mínimo necesario (id, nombre, rol). La sesión en Zustand se alimenta de esa respuesta, nunca de un JWT decodificado.

### El backend es la única fuente de verdad

El rol del usuario en el frontend se usa **únicamente** para mostrar u ocultar elementos de la interfaz. Nunca para tomar decisiones de seguridad. Cualquier acción no permitida para un rol debe ser rechazada por el backend, independientemente de lo que muestre el frontend.

```typescript
// Bien: el rol solo controla la visibilidad de la UI
{user.role === UserRole.VALIDATOR && (
  <Button onClick={handleValidate}>Validar ausencia</Button>
)}
// El endpoint de validación en el backend también verificará el rol
```

### Sanitización de contenido de usuario

El contenido de las observaciones (que puede incluir texto libre) nunca se renderiza con `dangerouslySetInnerHTML`. Se usa siempre renderizado de texto plano, gestionando los saltos de línea con CSS (`white-space: pre-wrap`).

---

## 5. Formularios con React Hook Form + Zod

En este repositorio se aceptan dos excepciones para controles nativos:

- `input[type="hidden"]` para transportar datos no editables del formulario.
- `input[type="color"]` en los flujos de administración de equipos, donde el selector nativo ofrece el comportamiento más consistente.

### Schemas siempre desde `@repo/types`

Los schemas Zod nunca se redefinen en el frontend. Se importan directamente desde el paquete compartido:

```typescript
import { CreateAbsenceSchema } from '@repo/types';

const form = useForm<CreateAbsenceInput>({
  resolver: zodResolver(CreateAbsenceSchema),
});
```

### Errores en el campo, no solo en toast

Cada campo del formulario muestra su error de validación inline. Los toasts se reservan para errores de la API o confirmaciones de acciones exitosas, no para errores de validación de formulario.

```typescript
<FormField
  control={form.control}
  name="startAt"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>Fecha de inicio</FormLabel>
      <FormControl>
        <DatePicker {...field} />
      </FormControl>
      <FormMessage>{fieldState.error?.message}</FormMessage>
    </FormItem>
  )}
/>
```

### Reset tras mutación exitosa

Tras una mutación exitosa, el formulario siempre se resetea a su estado inicial para evitar reenvíos accidentales.

```typescript
const { mutate, isPending } = useMutation({
  mutationFn: absenceApi.create,
  onSuccess: () => {
    form.reset();
    queryClient.invalidateQueries({ queryKey: absenceKeys.list() });
    toast.success('Ausencia creada correctamente');
  },
});
```

---

## 6. Routing con TanStack Router

### Guards de navegación por rol

Las rutas protegidas verifican el rol del usuario en `beforeLoad`. Si el usuario no tiene acceso, se redirige antes de que el componente se renderice.

```typescript
export const adminRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/admin',
  beforeLoad: ({ context }) => {
    if (context.user.role !== UserRole.ADMIN) {
      throw redirect({ to: '/unauthorized' });
    }
  },
  component: AdminPage,
});
```

### Lazy loading de rutas

Las rutas se cargan de forma diferida para reducir el bundle inicial. Solo se carga el código de una ruta cuando el usuario navega a ella.

```typescript
export const absencesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/absences',
  component: lazyRouteComponent(() => import('../pages/absences/AbsencesPage')),
});
```

---

## 7. Accesibilidad (a11y)

### Usar componentes de Radix UI / shadcn/ui

Los componentes de shadcn/ui están construidos sobre Radix UI, que implementa los patrones ARIA correctos por defecto: diálogos, menús desplegables, tooltips, comboboxes. No hay que añadir atributos ARIA manualmente a estos componentes salvo que el caso de uso lo requiera explícitamente.

### Elementos interactivos semánticamente correctos

```typescript
// Mal: div no es interactivo por defecto para tecnologías asistivas
<div onClick={handleClick}>Cancelar ausencia</div>

// Bien: button es interactivo, focusable y activable con teclado
<button onClick={handleClick}>Cancelar ausencia</button>
```

### Iconos sin texto visible

Los iconos usados sin texto visible deben tener un `aria-label` descriptivo:

```typescript
// Mal
<TrashIcon onClick={handleDelete} />

// Bien
<button aria-label="Eliminar ausencia" onClick={handleDelete}>
  <TrashIcon aria-hidden="true" />
</button>
```

### Contraste WCAG AA obligatorio en toda la UI

El estándar mínimo obligatorio para esta aplicación es **WCAG AA**. El contraste no aplica solo al calendario o a los colores de equipo, sino a toda la interfaz.

Reglas mínimas:

- Texto normal (< 24px, o < 18.66px en negrita): **mínimo 4.5:1**
- Texto grande (>= 24px, o >= 18.66px en negrita): **mínimo 3:1**
- Componentes UI y estados interactivos (bordes de inputs, iconos funcionales, indicadores de foco): **mínimo 3:1**

Superficies obligatorias donde aplicar estas reglas:

- Formularios (labels, placeholders, ayudas, errores)
- Tablas y listados
- Badges, alerts y toasts
- Botones, links y acciones secundarias
- Modales, dropdowns y popovers
- Cabeceras, menús y navegación lateral

### Tokens semánticos de color (sin hardcode en componentes)

No se deben usar colores hardcodeados (`#xxxxxx`) directamente en componentes de producto, salvo casos excepcionales documentados (ej. picker de color).

Usar siempre tokens semánticos para foreground/background:

- `--color-text-primary`, `--color-text-secondary`
- `--color-bg-surface`, `--color-bg-muted`
- `--color-action-primary`, `--color-action-primary-foreground`
- `--color-border-default`, `--color-focus-ring`
- `--color-error`, `--color-warning`, `--color-success`

Esto evita combinaciones ilegibles y facilita auditorías de accesibilidad.

### Estados interactivos accesibles

Los estados `hover`, `focus-visible`, `active` y `disabled` deben seguir siendo legibles y distinguibles.

- El foco visible debe ser perceptible y consistente.
- El foco no puede depender únicamente de un cambio de color sutil.
- Un botón `disabled` debe seguir siendo legible (texto y borde/fondo con contraste suficiente).

### Verificación de accesibilidad en Pull Requests

Checklist mínima obligatoria en revisiones frontend:

- Contraste de texto y elementos UI conforme a WCAG AA.
- Navegación por teclado funcional (`Tab`, `Shift+Tab`, `Enter`, `Space`).
- Foco visible en todas las acciones interactivas.
- Inputs con label accesible y mensajes de error asociables.
- Iconos sin texto visible con `aria-label` correcto.

### Contraste de color en equipos

Los colores de equipo seleccionados en la aplicación deben tener suficiente contraste con el fondo del calendario para ser legibles. Informar al administrador en el selector de color si el contraste es insuficiente (ratio mínimo WCAG AA: 4.5:1 para texto normal), según la regla no negociable 7.5.

---

## 8. Rendimiento

### `React.memo`, `useMemo` y `useCallback` con criterio

Estas optimizaciones tienen un coste (complejidad, memoria para memoización). Solo se aplican cuando el profiler de React confirma un problema real de rendimiento, no de forma preventiva.

```typescript
// Solo memorizar si el componente se re-renderiza frecuentemente
// con las mismas props y el renderizado es costoso
export const AbsenceCard = React.memo(function AbsenceCard({ absence, onCancel }) {
  // ...
});
```

### Lazy loading de imágenes y PDFs

Los adjuntos (imágenes) en las observaciones se cargan de forma diferida usando el atributo `loading="lazy"` en las etiquetas `<img>`.

### Virtualización de listas largas

La vista de auditor puede mostrar un gran número de ausencias. Para listas que superen los 100 elementos, usar virtualización con `@tanstack/react-virtual` para renderizar solo los elementos visibles en pantalla.

---

## 9. Pruebas en el Frontend

### Filosofía: testear comportamiento, no implementación

Los tests interactúan con los componentes como lo haría un usuario real: buscando elementos por su rol accesible, label o texto visible. No se testean detalles de implementación como el estado interno de un hook o los nombres de las clases CSS.

```typescript
// Mal: testea detalles de implementación
expect(component.state.isLoading).toBe(false);
expect(wrapper.find('.absence-card')).toHaveLength(3);

// Bien: testea comportamiento observable por el usuario
expect(screen.getByRole('list')).toBeInTheDocument();
expect(screen.getAllByRole('listitem')).toHaveLength(3);
```

### Selectores preferidos (de más a menos preferido)

1. `getByRole` — busca por rol ARIA (button, heading, listitem, etc.)
2. `getByLabelText` — busca campos de formulario por su label
3. `getByText` — busca por texto visible
4. `getByTestId` — último recurso cuando no hay otra opción semántica

### MSW para mockear la API

Los handlers de MSW se organizan por módulo y se reutilizan entre tests:

```typescript
// mocks/handlers/absence.handlers.ts
export const absenceHandlers = [
  http.get('/api/absences', () => {
    return HttpResponse.json(mockAbsences);
  }),
  http.post('/api/absences', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-id', ...body }, { status: 201 });
  }),
];
```

### Qué testear en el frontend

| Qué testear                         | Cómo                               |
| ----------------------------------- | ---------------------------------- |
| Formularios: validación y envío     | RTL + MSW                          |
| Navegación y guards de rol          | RTL + TanStack Router en modo test |
| Estados de carga y error en queries | RTL + MSW con respuestas de error  |
| Flujo de validación de ausencias    | RTL + MSW                          |
| Componentes de presentación         | RTL (sin MSW, solo props)          |

### Qué NO testear

- Detalles internos de implementación de hooks.
- Librerías de terceros (TanStack Query, FullCalendar, shadcn/ui).
- Estilos CSS (el comportamiento visual se valida con snapshots o pruebas manuales).
- Que un componente llama a una función específica (testear el efecto, no la llamada).

### Pruebas de accesibilidad mínimas (a11y)

Para cada vista nueva o modificada de forma relevante (formularios, tablas administrativas, modales, navegación), incluir validación mínima de accesibilidad:

- Al menos una prueba de teclado para el flujo principal (`Tab`, `Enter`, `Space`).
- Al menos una prueba de roles/labels accesibles con React Testing Library (`getByRole`, `getByLabelText`).
- Recomendado: ejecutar `axe`/`jest-axe` en componentes críticos y corregir violaciones graves.

```typescript
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

it('no tiene violaciones graves de accesibilidad', async () => {
  const { container } = render(<CreateUserForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Estas pruebas no sustituyen la revisión visual manual de contraste, pero ayudan a prevenir regresiones en PR.
