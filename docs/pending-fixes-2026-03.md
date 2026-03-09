# Pending fixes — March 2026

Four issues identified during manual testing. Each section describes the root cause,
the exact files affected, and the implementation plan.

---

## 1. Cerrar sesión (logout)

### Situación actual

No existe ningún botón ni enlace de logout en la interfaz. El usuario no puede cerrar sesión
de forma deliberada.

- `AuthLayout.tsx` muestra el nombre del usuario en la cabecera pero sin ninguna acción asociada.
- `api-client.ts:77` tiene la función `logout()` que llama a `POST /auth/logout`, pero
  nunca se invoca desde el frontend.
- El backend no tiene el endpoint `POST /auth/logout` — `auth.controller.ts` solo expone
  `POST /auth/login` y `POST /auth/refresh`.

### Plan de implementación

**Backend — `apps/api/src/modules/auth/auth.controller.ts`**

Añadir un nuevo handler:

```
@Public()
@Post('logout')
@HttpCode(HttpStatus.NO_CONTENT)
async logout(@Res({ passthrough: true }) response: Response): Promise<void>
```

El handler debe:

1. Llamar a `response.clearCookie('access_token', { path: '/' })` con las mismas opciones
   de `sameSite` y `secure` que se usaron al crear la cookie (leer de `buildAuthCookieOptions`).
2. Llamar a `response.clearCookie('refresh_token', { path: '/auth/refresh' })` — es crítico
   especificar `path: '/auth/refresh'` o el navegador no borrará la cookie.
3. No requiere autenticación (`@Public()`), porque el access token puede haber expirado.

**Frontend — `AuthLayout.tsx`**

Añadir un botón "Cerrar sesión" en la zona derecha de la cabecera (junto al nombre del usuario).
Al pulsarlo:

1. Llamar a `logout()` de `api-client.ts` (ya existe).
2. Llamar a `useAuthStore.getState().clearSession()` para limpiar el estado Zustand.
3. Navegar a `/login` con `useNavigate`.

El botón debe ser un `<Button variant="ghost" size="sm">` para no romper el diseño de la cabecera.
Internamente puede encapsularse en un componente `LogoutButton` en
`apps/web/src/components/layout/LogoutButton.tsx` para mantener `AuthLayout` limpio.

**Archivos a modificar:**

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/web/src/layouts/AuthLayout.tsx`
- `apps/web/src/components/layout/LogoutButton.tsx` (nuevo)

---

## 2. Borrar usuarios

### Situación actual

La tabla de usuarios en `AdminPage.tsx` solo permite desactivar usuarios (marcarlos como
inactivos). No existe un botón de borrado definitivo.

Además, el borrado en el backend (`DELETE /users/:id`) está actualmente mal nombrado: ejecuta
`DeactivateUserCommand` y solo marca al usuario como inactivo. Para implementar el borrado
físico se necesita un nuevo comando y un nuevo endpoint, o reutilizar el endpoint con semántica
diferente.

Decisión de diseño a tomar: ¿borrado físico (hard delete) o borrado lógico ya cubierto por
desactivación? Se recomienda **borrado físico** porque el usuario ya puede desactivar
separadamente. Si hay ausencias asociadas, el backend debe decidir si lanzar error o eliminar
en cascada (según el schema de Prisma).

**Nota:** El hook `useDeactivateUser` no existe — `AdminPage` llama `deactivateUser()` de
`api-client` directamente sin pasar por `useMutation`. Esto es inconsistente con el patrón
del resto de la app (ver `useDeleteTeam`).

### Plan de implementación

**Backend**

1. Crear `DeleteUserCommand` en
   `apps/api/src/modules/users/application/commands/delete-user.command.ts`.
2. Crear `DeleteUserHandler` que llame a `userRepository.delete(id)` (borrado físico).
   Si existen ausencias activas asociadas, lanzar `ConflictException`.
3. Añadir un nuevo endpoint `DELETE /users/:id/permanent` en `users.controller.ts`.
4. Registrar el handler en el módulo de usuarios.

**Frontend — hooks**

Añadir `useDeleteUser()` en `apps/web/src/hooks/use-users.ts` siguiendo el patrón de
`useDeleteTeam`:

```typescript
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId), // nueva fn en api-client
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: usersKeys.list() }),
  });
}
```

Añadir también `useDeactivateUser()` para sustituir la llamada directa a `api-client` en
`AdminPage` y unificar el patrón.

**Frontend — AdminPage.tsx**

1. Importar `useDeleteUser` y `useDeactivateUser`.
2. Añadir estado `deletingUserId` y `userDeleteError`.
3. Añadir un botón "Eliminar" en la fila del usuario (solo visible si el usuario está inactivo,
   para forzar el flujo desactivar → eliminar), con un diálogo de confirmación igual al de
   `TeamsTable`.
4. El botón "Desactivar" debe pasar a usar `useDeactivateUser` en lugar de `deactivateUser`
   directo.

**Archivos a modificar/crear:**

- `apps/api/src/modules/users/application/commands/delete-user.command.ts` (nuevo)
- `apps/api/src/modules/users/application/commands/delete-user.handler.ts` (nuevo)
- `apps/api/src/modules/users/infrastructure/users.controller.ts`
- `apps/api/src/modules/users/users.module.ts` (registro del handler)
- `apps/web/src/lib/api-client.ts` (añadir `deleteUser`)
- `apps/web/src/hooks/use-users.ts` (añadir `useDeleteUser`, `useDeactivateUser`)
- `apps/web/src/pages/admin/AdminPage.tsx`

---

## 3. Reenviar invitación a usuarios inactivos

### Situación actual

Cuando un administrador crea un nuevo usuario desde el panel de administración (`AdminPage.tsx`), el sistema envía automáticamente un email de activación con un token que expira en 48 horas. Si el usuario:

- No recibe el email (por problemas de spam, correo incorrecto, etc.)
- Deja pasar las 48 horas sin activar la cuenta

…el administrador **no tiene forma de reenviar la invitación** desde la interfaz.

El backend ya tiene la funcionalidad completa implementada:

- Endpoint: `POST /users/:id/resend-activation` en `users.controller.ts:65-69`
- Handler: `ResendActivationHandler` que valida que el usuario esté inactivo, genera un nuevo token de 48h, y envía el email de activación
- Validación: lanza `BadRequestException` si el usuario ya está activo

Sin embargo, el frontend no expone esta funcionalidad:

- No existe botón "Reenviar invitación" en la tabla de usuarios
- No existe `resendActivation()` en `api-client.ts`
- No existe hook `useResendActivation()` en `use-users.ts`

### Plan de implementación

**Frontend — `apps/web/src/lib/api-client.ts`**

Añadir una nueva función que llame al endpoint:

```typescript
export async function resendActivation(userId: string): Promise<void> {
  await client.post(`/users/${userId}/resend-activation`).json();
}
```

**Frontend — `apps/web/src/hooks/use-users.ts`**

Añadir un hook de mutación siguiendo el mismo patrón que `useDeactivateUser` (que se debe implementar en issue #2):

```typescript
export function useResendActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => resendActivation(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: usersKeys.list() }),
  });
}
```

**Frontend — `apps/web/src/pages/admin/AdminPage.tsx`**

1. Importar el nuevo hook:

   ```typescript
   import { useUsers, useResendActivation } from '../../hooks/use-users';
   ```

2. Añadir estado para manejar el loading y errores del reenvío:

   ```typescript
   const [resendingUserId, setResendingUserId] = useState<string | null>(null);
   const [userResendError, setUserResendError] = useState<string | null>(null);
   ```

3. Añadir el hook de mutación:

   ```typescript
   const { mutateAsync: resendActivation } = useResendActivation();
   ```

4. Añadir handler para reenviar invitación:

   ```typescript
   const handleResendActivation = async (user: User) => {
     setResendingUserId(user.id);
     setUserResendError(null);
     try {
       await resendActivation(user.id);
       // Opcional: mostrar mensaje de éxito con toast o alert temporal
     } catch (error) {
       const message =
         isAxiosError(error) && error.response?.status === 404
           ? 'Usuario no encontrado.'
           : isAxiosError(error) && error.response?.status === 400
             ? 'El usuario ya ha activado su cuenta.'
             : 'Error al reenviar la invitación. Inténtalo de nuevo.';
       setUserResendError(message);
     } finally {
       setResendingUserId(null);
     }
   };
   ```

5. Añadir el botón con icono en la columna de Acciones de la tabla de usuarios (línea 233-253).
   El botón debe mostrarse **solo para usuarios inactivos** (`!user.isActive`), junto al botón "Editar":

   ```tsx
   <td className="px-4 py-3 text-right">
     <div className="flex justify-end gap-2">
       <Button
         variant="ghost"
         size="sm"
         onClick={() => handleEditUser(user)}
         aria-label={`Editar usuario ${user.name}`}
       >
         <Pencil className="h-4 w-4" />
       </Button>
       {user.isActive ? (
         <Button
           variant="ghost"
           size="sm"
           disabled={deactivatingUserId === user.id}
           onClick={() => void handleDeactivateUser(user)}
           aria-label={`Desactivar usuario ${user.name}`}
         >
           <UserX className="h-4 w-4" />
         </Button>
       ) : (
         <Button
           variant="ghost"
           size="sm"
           disabled={resendingUserId === user.id}
           onClick={() => void handleResendActivation(user)}
           aria-label={`Reenviar invitación a ${user.name}`}
         >
           <RotateCw className="h-4 w-4" />
         </Button>
       )}
     </div>
   </td>
   ```

6. Añadir mensaje de error de reenvío en la sección de usuarios, debajo de `userDeactivateError` (línea 168-176):

   ```tsx
   {
     userResendError && (
       <div
         role="alert"
         aria-live="assertive"
         className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
       >
         {userResendError}
       </div>
     );
   }
   ```

**Imports necesarios**

Añadir al inicio de `AdminPage.tsx`:

```typescript
import { Pencil, UserX, RotateCw } from 'lucide-react';
```

**Tests**

Añadir test en `AdminPage.test.tsx`:

- Verificar que el botón con icono `RotateCw` aparece solo para usuarios inactivos
- Verificar que el botón con icono `UserX` aparece solo para usuarios activos
- Simular click en reenviar invitación y verificar que llama a `resendActivation()` con el ID correcto
- Verificar el manejo de errores (404, 400, genérico)
- Verificar el estado de loading (botón deshabilitado mientras `resendingUserId === user.id`)
- Verificar que el `aria-label` contiene el nombre del usuario

### Archivos a modificar

- `apps/web/src/lib/api-client.ts` — añadir `resendActivation()`
- `apps/web/src/hooks/use-users.ts` — añadir `useResendActivation()`
- `apps/web/src/pages/admin/AdminPage.tsx` — añadir botón con icono y lógica de reenvío
- `apps/web/src/pages/admin/AdminPage.test.tsx` — añadir tests

### Dependencias

Esta issue tiene **dependencia parcial** con la issue #2 (Borrar usuarios):

- Issue #2 introduce el patrón de `useDeactivateUser()` que actualmente no existe
- Sin embargo, esta issue puede implementarse de forma independiente si se crea `useDeactivateUser()` primero o en conjunto

Esta issue tiene **dependencia total** con la issue #4 (Iconos en botones), ya que ambas modifican la misma columna de acciones en la tabla de usuarios. Se recomienda implementar ambas en la misma rama (`feat/admin-improvements`).

---

## 4. Reemplazar botones de texto por iconos en panel de administración

### Situación actual

Las tres pestañas del panel de administración (`AdminPage.tsx`) utilizan botones con texto para las acciones de cada fila:

**Pestaña Usuarios (líneas 233-252):**

- Botón "Editar" — permite editar nombre y rol
- Botón "Desactivar" — marca usuario como inactivo (solo visible si `user.isActive === true`)

**Pestaña Tipos de Ausencia (`AbsenceTypesTable.tsx`, líneas 80-100):**

- Botón "Editar" — permite editar configuración del tipo
- Botón "Desactivar" — marca tipo como inactivo (solo visible si `absenceType.isActive === true`)

**Pestaña Equipos (`TeamsTable.tsx`, líneas 86-98):**

- Botón "Gestionar miembros" — abre diálogo de asignación de usuarios al equipo
- Botón "Eliminar" — borra el equipo (con confirmación previa)

Estos botones ocupan considerable espacio horizontal en la columna "Acciones", especialmente en pantallas pequeñas o cuando hay muchas filas. Además, el texto "Gestionar miembros" es particularmente largo.

### Lo que se quiere

Reemplazar todos los botones de texto por **botones de solo icono** en las tres pestañas del panel de administración, manteniendo:

- La funcionalidad actual sin cambios
- Accesibilidad mediante atributos `aria-label` descriptivos
- Variante `ghost` para un diseño más limpio
- Los mismos estados de loading y disabled

Esto reducirá el ancho de la columna "Acciones" y mejorará la densidad de información en las tablas.

### Plan de implementación

#### **Selección de iconos**

La aplicación ya utiliza `lucide-react v0.575.0` como librería de iconos. Los iconos seleccionados son:

| Acción                      | Icono | Componente lucide-react | Razón                                           |
| --------------------------- | ----- | ----------------------- | ----------------------------------------------- |
| Editar                      | ✏️    | `Pencil`                | Icono estándar de edición                       |
| Desactivar usuario          | 👤❌  | `UserX`                 | Usuario con marca X (concepto de desactivación) |
| Desactivar tipo de ausencia | 🚫    | `Ban`                   | Símbolo de prohibición (desactivar tipo)        |
| Eliminar equipo             | 🗑️    | `Trash2`                | Icono estándar de eliminación                   |
| Gestionar miembros          | 👥    | `Users`                 | Grupo de usuarios (gestión de equipo)           |
| Reenviar invitación         | ↷     | `RotateCw`              | Flecha circular (renovar/reenviar)              |

#### **Patrón de implementación**

Todos los botones seguirán este patrón:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleAction}
  disabled={isLoading}
  aria-label="Descripción clara de la acción con contexto (incluir nombre del item)"
>
  <IconoCorrespondiente className="h-4 w-4" />
</Button>
```

**Consideraciones de accesibilidad:**

- Cada botón debe tener un `aria-label` descriptivo que incluya:
  - La acción ("Editar", "Eliminar", "Desactivar", etc.)
  - El tipo de entidad ("usuario", "tipo de ausencia", "equipo")
  - El nombre del item específico (ej. `${user.name}`, `${team.name}`)
- Ejemplo: `aria-label="Editar usuario Juan Pérez"`
- Los iconos deben tener `className="h-4 w-4"` (tamaño estándar del proyecto)
- No usar `aria-hidden="true"` en los iconos, ya que son el único contenido visual del botón

#### **Cambios por archivo**

**1. `apps/web/src/pages/admin/AdminPage.tsx` (Pestaña Usuarios)**

Importar iconos al inicio del archivo:

```typescript
import { Pencil, UserX, RotateCw } from 'lucide-react';
```

Reemplazar los botones en la columna de Acciones (líneas 233-252):

```tsx
<td className="px-4 py-3 text-right">
  <div className="flex justify-end gap-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleEditUser(user)}
      aria-label={`Editar usuario ${user.name}`}
    >
      <Pencil className="h-4 w-4" />
    </Button>
    {user.isActive ? (
      <Button
        variant="ghost"
        size="sm"
        disabled={deactivatingUserId === user.id}
        onClick={() => void handleDeactivateUser(user)}
        aria-label={`Desactivar usuario ${user.name}`}
      >
        <UserX className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        disabled={resendingUserId === user.id}
        onClick={() => void handleResendActivation(user)}
        aria-label={`Reenviar invitación a ${user.name}`}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
    )}
  </div>
</td>
```

**Nota:** El botón con icono `RotateCw` solo debe incluirse si la issue #3 se implementa primero o en conjunto. Si no, mantener solo `Pencil` y `UserX`.

**2. `apps/web/src/components/admin/AbsenceTypesTable.tsx` (Pestaña Tipos de Ausencia)**

Importar iconos al inicio del archivo:

```typescript
import { Pencil, Ban } from 'lucide-react';
```

Reemplazar los botones en la columna de Acciones (líneas 80-100):

```tsx
<td className="px-4 py-3 text-right">
  <div className="flex justify-end gap-2">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onEdit(absenceType)}
      aria-label={`Editar tipo de ausencia ${absenceType.name}`}
    >
      <Pencil className="h-4 w-4" />
    </Button>
    {absenceType.isActive && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onDeactivate(absenceType)}
        disabled={deactivatingId === absenceType.id}
        aria-label={`Desactivar tipo de ausencia ${absenceType.name}`}
      >
        <Ban className="h-4 w-4" />
      </Button>
    )}
  </div>
</td>
```

**3. `apps/web/src/components/admin/TeamsTable.tsx` (Pestaña Equipos)**

Importar iconos al inicio del archivo:

```typescript
import { Users, Trash2 } from 'lucide-react';
```

Reemplazar los botones en la columna de Acciones (líneas 86-98):

```tsx
<td className="px-4 py-3 text-right">
  <div className="flex justify-end gap-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onManageMembers(team)}
      aria-label={`Gestionar miembros del equipo ${team.name}`}
    >
      <Users className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTeamToDelete(team)}
      aria-label={`Eliminar equipo ${team.name}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</td>
```

**Nota:** En `TeamsTable.tsx`, el botón de eliminar tiene un diálogo de confirmación que se activa con `setTeamToDelete(team)`. Este comportamiento se mantiene sin cambios.

#### **Tests**

**`AdminPage.test.tsx`:**

- Verificar que los botones renderizen solo iconos (sin texto visible)
- Verificar que cada botón tiene un `aria-label` correcto que incluye el nombre del usuario
- Verificar que el icono `Pencil` está presente en todos los botones de editar
- Verificar que el icono `UserX` está presente solo para usuarios activos
- Verificar que el icono `RotateCw` está presente solo para usuarios inactivos (si issue #3 implementada)
- Simular click y verificar que las funciones se llaman correctamente

**`AbsenceTypesTable.test.tsx`:**

- Verificar que los botones renderizen solo iconos
- Verificar `aria-label` correctos con nombre del tipo de ausencia
- Verificar iconos `Pencil` y `Ban` presentes
- Verificar que `Ban` solo aparece para tipos activos

**`TeamsTable.test.tsx`:**

- Verificar que los botones renderizen solo iconos
- Verificar `aria-label` correctos con nombre del equipo
- Verificar iconos `Users` y `Trash2` presentes
- Verificar que click en `Trash2` abre el diálogo de confirmación

#### **Consideraciones adicionales**

**Variante de botones:**

- Se usa `variant="ghost"` en lugar de `variant="outline"` (actual) para reducir el ruido visual
- Los botones ghost tienen menos peso visual, apropiado para acciones secundarias en tablas
- Mantienen hover states y están claramente clickables

**Ancho de columna:**

- Con iconos, la columna "Acciones" será significativamente más estrecha
- Se mantiene `text-right` para alineación a la derecha
- El `gap-2` entre botones proporciona espacio suficiente para evitar clicks accidentales

**Estados de loading:**

- Los botones mantienen el atributo `disabled` cuando una acción está en progreso
- El estado visual de `disabled` en la variante `ghost` reduce la opacidad del icono
- No se muestra texto "Desactivando…" — el estado disabled es suficiente feedback visual

**Compatibilidad con issue #3:**

- Si la issue #3 (Reenviar invitación) se implementa primero o en conjunto, el botón con icono `RotateCw` debe incluirse
- Si se implementa esta issue primero, dejar espacio para añadir `RotateCw` posteriormente

### Archivos a modificar

- `apps/web/src/pages/admin/AdminPage.tsx` — reemplazar botones de usuarios por iconos
- `apps/web/src/components/admin/AbsenceTypesTable.tsx` — reemplazar botones de tipos de ausencia por iconos
- `apps/web/src/components/admin/TeamsTable.tsx` — reemplazar botones de equipos por iconos
- `apps/web/src/pages/admin/AdminPage.test.tsx` — actualizar tests
- `apps/web/src/components/admin/AbsenceTypesTable.test.tsx` — actualizar tests
- `apps/web/src/components/admin/TeamsTable.test.tsx` — actualizar tests

### Dependencias

Esta issue tiene **dependencia con la issue #3** (Reenviar invitación):

- Ambas modifican la misma sección de código (columna de Acciones en la tabla de usuarios)
- Se recomienda implementar ambas en la **misma rama** (`feat/admin-improvements`) para evitar conflictos
- Alternativamente, implementar issue #4 primero y luego issue #3 añade el botón `RotateCw`

---

## 5. Textos en inglés en la vista de calendario

### Situación actual

`CalendarView.tsx:104` pasa `locale="en"` a FullCalendar. Esto hace que todos los textos
generados por la librería aparezcan en inglés: nombres de días (Sun, Mon…), nombres de meses
(January, February…), botones de la toolbar ("today", "month"), y el texto de eventos
desbordados ("+N more").

Adicionalmente, los textos propios del componente (loading y error) también están en inglés:

- Línea 72: `aria-label="Loading calendar"`
- Línea 74: `Loading calendar...`
- Línea 83: `Error loading calendar:`
- Línea 85: `'Unknown error'`

FullCalendar v6 incluye todos los locales dentro de `@fullcalendar/core` — no es necesario
instalar ningún paquete adicional.

### Plan de implementación

**`apps/web/src/components/calendar/CalendarView.tsx`**

1. Añadir el import del locale español:
   ```typescript
   import esLocale from '@fullcalendar/core/locales/es';
   ```
2. Cambiar `locale="en"` por `locale={esLocale}`.
3. Traducir los textos propios del componente:
   - `aria-label="Loading calendar"` → `aria-label="Cargando calendario"`
   - `Loading calendar...` → `Cargando calendario...`
   - `Error loading calendar:` → `Error al cargar el calendario:`
   - `'Unknown error'` → `'Error desconocido'`

Esto cubre automáticamente nombres de días, meses, botones de toolbar y el texto "+N más".

**Archivos a modificar:**

- `apps/web/src/components/calendar/CalendarView.tsx`

---

## 6. Sidebar de navegación colapsable

### Situación actual

La navegación vive en un `<header>` horizontal mediante `<AppNav>`. No existe sidebar.

- `AuthLayout.tsx` renderiza `<AppNav user={user} />` dentro del `<header>`, con el nombre
  del usuario en la esquina derecha. No hay ningún componente de sidebar.
- `AppNav.tsx` define los links por rol mediante `getNavLinks()`:
  - `STANDARD` / `VALIDATOR`: Dashboard, Calendario, Solicitar ausencia.
  - `ADMIN`: Dashboard, Usuarios, Tipos de ausencia, Equipos.
  - `AUDITOR`: Dashboard, Auditoría.
- "Solicitar ausencia" aparece en `AppNav.tsx:22` **y** como botón CTA en
  `DashboardPage.tsx:69-75` (enlace con estilos de botón primario). La intención es que
  solo quede en el dashboard.

### Lo que se quiere

1. Los links de navegación se mueven del `<header>` a un **sidebar lateral izquierdo**
   colapsable/expandible con un click.
2. **Colapsado:** solo iconos (con `title` y `aria-label` para accesibilidad).
   **Expandido:** icono + etiqueta de texto.
3. El estado colapsado/expandido se persiste en `localStorage` con la clave
   `'sidebar-collapsed'`.
4. "Solicitar ausencia" desaparece del sidebar y del nav en general. Solo vive en el
   dashboard como botón CTA (`DashboardPage.tsx:69`), donde no se toca.
5. El nombre del usuario se mueve al **pie del sidebar**. Cuando el sidebar está colapsado
   se muestra solo un avatar o icono de usuario. El `<header>` actual se elimina o se
   simplifica a solo el logo/nombre de la app.

### Plan de implementación

**`apps/web/src/components/layout/AppNav.tsx`**

Eliminar `{ to: '/absences/new', label: 'Solicitar ausencia' }` de `getNavLinks()` para
los roles `STANDARD` y `VALIDATOR`. Añadir un icono a cada entrada de nav (p. ej. usando
`lucide-react`, que ya es dependencia transitiva de `shadcn/ui`).

**Nuevo `apps/web/src/components/layout/AppSidebar.tsx`**

Componente nuevo con la siguiente lógica:

```typescript
const [collapsed, setCollapsed] = useState<boolean>(
  () => localStorage.getItem('sidebar-collapsed') === 'true'
);

const toggle = () => {
  setCollapsed((prev) => {
    localStorage.setItem('sidebar-collapsed', String(!prev));
    return !prev;
  });
};
```

Estructura JSX:

```
<aside aria-label="Menú principal" className={collapsed ? 'w-16' : 'w-56'}>
  <button onClick={toggle} aria-expanded={!collapsed} aria-controls="sidebar-nav">
    {/* icono hamburguesa / chevron */}
  </button>
  <nav id="sidebar-nav">
    {links.map(link => (
      <Link to={link.to} title={collapsed ? link.label : undefined} aria-label={link.label}>
        <link.icon />
        {!collapsed && <span>{link.label}</span>}
      </Link>
    ))}
  </nav>
  <div className="mt-auto">
    {/* pie: avatar/icono si colapsado, nombre completo si expandido */}
    {collapsed ? <UserIcon /> : <span>{user.name}</span>}
  </div>
</aside>
```

La transición de ancho debe hacerse con `transition-all duration-200` de Tailwind para
que sea suave. Los iconos de cada link se definen junto a la definición del link, en la
misma función `getNavLinks` o en un mapa paralelo.

**`apps/web/src/layouts/AuthLayout.tsx`**

- El `div.auth-layout` pasa de layout de columna a fila: `flex flex-row h-screen`.
- `<AppSidebar user={user} />` a la izquierda.
- `<main>` ocupa el resto con `flex-1 overflow-auto`.
- El `<header>` actual se elimina (el nombre de usuario se mueve al pie del sidebar).
- El enlace "Saltar al contenido principal" se mantiene como primer elemento del DOM.

**Tests**

- `AppNav.test.tsx`: actualizar para reflejar que "Solicitar ausencia" ya no aparece en
  el nav de ningún rol.
- `AppSidebar.test.tsx` (nuevo): verificar renderizado colapsado/expandido, persistencia
  en `localStorage`, y presencia de atributos ARIA correctos.

### Archivos a modificar/crear

- `apps/web/src/components/layout/AppNav.tsx`
- `apps/web/src/components/layout/AppSidebar.tsx` (nuevo)
- `apps/web/src/components/layout/AppSidebar.test.tsx` (nuevo)
- `apps/web/src/layouts/AuthLayout.tsx`
- `apps/web/src/components/layout/AppNav.test.tsx`

---

---

## 7. Foto de perfil de usuario

### Situación actual

El modelo `user` no tiene ningún campo para foto de perfil
(`apps/api/prisma/schema.prisma:10-28`). El sidebar (issue #6) mostrará el nombre del
usuario en el pie, pero sin imagen. El calendario renderiza ausencias como bloques de
color sin ningún elemento visual del usuario (`CalendarView.tsx:93-113` — no hay
`eventContent` ni `eventDidMount`; los eventos usan únicamente `eventDisplay="block"`).

La infraestructura de subida de ficheros ya existe y está completamente implementada en
el módulo `observations`:

- `FileInterceptor` + `ParseFilePipe` con `MaxFileSizeValidator` (5 MB) y
  `FileTypeValidator` en `observation-attachments.controller.ts:47-58`.
- Validación por magic bytes con `file-type` en
  `file-validation.service.ts:19`.
- `LocalFileStorageService` (`local-file-storage.service.ts`) con `saveFile`,
  `getFile` y `deleteFile`, configurado vía `UPLOADS_DIR` en `ConfigService`.

Todo esto es reutilizable para la foto de perfil.

### Lo que se quiere

1. **En la activación de cuenta** (`/activate`): tras introducir la contraseña, el
   usuario puede subir una foto de perfil o elegir una de 6 imágenes stock incluidas
   en el frontend. Este paso es opcional — si se omite se usa un avatar genérico.
2. **Desde el sidebar** (issue #6): en cualquier momento, el usuario puede actualizar
   su foto de perfil clickando sobre su avatar en el pie del sidebar.
3. **En el calendario**: los eventos de ausencia muestran la foto de perfil del usuario
   (thumbnail pequeño) dentro del bloque de evento.

### Imágenes stock

Incluir 6 imágenes en `apps/web/public/avatars/` (p. ej. `avatar-1.png` …
`avatar-6.png`). El usuario puede elegir una de ellas como alternativa a subir una foto.
Cuando se selecciona una imagen stock, el frontend la envía al backend como un upload
normal (fetch de la URL pública → Blob → FormData), de modo que el backend no necesita
distinguir entre foto propia e imagen stock.

### Plan de implementación

#### Backend

**1. Migración de base de datos**

Añadir el campo `avatar_url` al modelo `user` en
`apps/api/prisma/schema.prisma`:

```prisma
avatar_url String? @db.VarChar(500)
```

Generar y aplicar la migración:

```bash
pnpm --filter @repo/api prisma:migrate
```

**2. Endpoint de subida — `PATCH /users/me/avatar`**

Añadir un nuevo controlador o endpoint en
`apps/api/src/modules/users/infrastructure/users.controller.ts` (o un controlador
dedicado `user-avatar.controller.ts`):

```
@Patch('me/avatar')
@UseInterceptors(FileInterceptor('file'))
@HttpCode(HttpStatus.OK)
async uploadAvatar(
  @CurrentUser() user: JwtPayload,
  @UploadedFile(new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
      new FileTypeValidator({ fileType: /image\/(jpeg|png)/ }),
    ],
  }))
  file: Express.Multer.File,
): Promise<{ avatarUrl: string }>
```

Solo se permiten JPEG y PNG (no PDF). Validación adicional por magic bytes reutilizando
`FileValidationService`. El handler:

1. Valida magic bytes.
2. Genera nombre `uuidv7() + ext` con `LocalFileStorageService.saveFile()`.
3. Si el usuario ya tenía `avatar_url`, borra el fichero anterior con `deleteFile()`.
4. Persiste la nueva `avatar_url` en la tabla `user` (ruta relativa, p. ej.
   `/users/me/avatar/serve`).
5. Devuelve `{ avatarUrl: string }`.

**3. Endpoint de descarga — `GET /users/:id/avatar`**

Sirve el fichero desde disco con el `Content-Type` correcto. Autenticado pero accesible
para cualquier rol (necesario para que el calendario pueda mostrar avatares de otros
usuarios). Similar a
`attachments.controller.ts:28` (`GET /observations/attachments/:id/download`).

**4. Comando CQRS**

- `UpdateUserAvatarCommand` + `UpdateUserAvatarHandler` en
  `apps/api/src/modules/users/application/commands/`.
- El handler usa `UserRepository` para actualizar `avatar_url` y
  `LocalFileStorageService` para guardar/borrar ficheros.
- Registrar en `users.module.ts`.

#### Frontend

**5. `ActivatePage.tsx` — paso opcional de foto de perfil**

Después de que el formulario de contraseña sea enviado con éxito (actualmente en
`ActivatePage.tsx:75-162`), mostrar un segundo paso (o sección inferior) con:

- Grid de 6 imágenes stock (`/avatars/avatar-1.png` … `/avatars/avatar-6.png`)
  seleccionables.
- Botón "Subir foto" que abre un `<input type="file" accept="image/jpeg,image/png">`.
- Botón "Omitir" para saltarse el paso.
- Al confirmar la selección, llama a `PATCH /users/me/avatar` con un `FormData`.

Encapsular la UI en un componente
`apps/web/src/components/profile/AvatarPicker.tsx` reutilizable (también se usará
en el sidebar).

**6. `AppSidebar.tsx` — actualización de avatar (depende de issue #6)**

En el pie del sidebar, el avatar del usuario es clickable y abre el componente
`AvatarPicker` en un `<Dialog>`. Al confirmar, invalida la query del usuario actual
para que el avatar se refresque en el sidebar y en el calendario.

El avatar se obtiene del endpoint `GET /users/me/avatar` (o de la `avatar_url` devuelta
por `GET /auth/me`). Si `avatar_url` es `null`, mostrar un avatar genérico con las
iniciales del usuario (usando `shadcn/ui Avatar` + `AvatarFallback`).

**7. `CalendarView.tsx` — foto en eventos de ausencia**

Usar el render prop `eventContent` de FullCalendar para personalizar el contenido de
cada evento:

```tsx
eventContent={(arg) => (
  <div className="flex items-center gap-1 px-1 truncate">
    <img
      src={arg.event.extendedProps.avatarUrl}
      alt=""
      aria-hidden="true"
      className="w-4 h-4 rounded-full object-cover shrink-0"
    />
    <span className="truncate text-xs">{arg.event.title}</span>
  </div>
)}
```

La `avatarUrl` debe incluirse en `extendedProps` dentro de `mapAbsenceToEvent()`
(`CalendarView.tsx:23-42`). El endpoint `GET /calendar/absences` (o el que corresponda)
debe devolver la `avatar_url` de cada ausencia junto con los datos actuales.

Si `avatarUrl` es `null`, mostrar solo el título (o las iniciales como fallback inline).

**8. `api-client.ts`**

Añadir:

```typescript
export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  return client.patch('/users/me/avatar', form).json();
}

export async function getAvatarUrl(userId: string): string {
  return `${API_BASE_URL}/users/${userId}/avatar`;
}
```

**9. `@repo/types`**

Añadir `avatar_url?: string | null` a la interfaz `User` y al schema Zod correspondiente.

#### Tests

- `UpdateUserAvatarHandler` — tests unitarios con mock de `UserRepository` y
  `LocalFileStorageService`.
- `AvatarPicker.test.tsx` — verifica selección de stock, selección de fichero, y llamada
  a `uploadAvatar`.
- `CalendarView.test.tsx` — verificar que `eventContent` renderiza el thumbnail cuando
  `avatarUrl` está presente.

### Dependencias entre issues

- La parte del sidebar (punto 6 arriba) **depende de la issue #6** (sidebar). Puede
  implementarse en la misma rama `feat/sidebar-nav` o en una rama posterior
  `feat/avatar` que se ramifique desde `feat/sidebar-nav`.
- El backend (puntos 1–4) y el paso de activación (punto 5) no tienen dependencias
  con el sidebar y pueden implementarse en paralelo.

### Archivos a modificar/crear

**Backend**

- `apps/api/prisma/schema.prisma` — añadir `avatar_url`
- `apps/api/src/modules/users/application/commands/update-user-avatar.command.ts` (nuevo)
- `apps/api/src/modules/users/application/commands/update-user-avatar.handler.ts` (nuevo)
- `apps/api/src/modules/users/infrastructure/users.controller.ts` — añadir endpoints
- `apps/api/src/modules/users/users.module.ts` — registrar handler

**Frontend**

- `apps/web/public/avatars/` — añadir 6 imágenes stock (nuevo directorio)
- `apps/web/src/components/profile/AvatarPicker.tsx` (nuevo)
- `apps/web/src/components/profile/AvatarPicker.test.tsx` (nuevo)
- `apps/web/src/pages/activate/ActivatePage.tsx`
- `apps/web/src/components/layout/AppSidebar.tsx` (depende de issue #6)
- `apps/web/src/components/calendar/CalendarView.tsx`
- `apps/web/src/lib/api-client.ts`

**Compartido**

- `packages/types/src/` — añadir `avatar_url` a la interfaz `User`

---

## Orden de implementación sugerido

| #   | Issue                 | Complejidad | Rama sugerida             | Estado    |
| --- | --------------------- | ----------- | ------------------------- | --------- |
| 1   | Logout                | S           | `feat/logout`             | Pendiente |
| 2   | Borrar usuarios       | M           | `feat/delete-user`        | Pendiente |
| 3   | Reenviar invitación   | S           | `feat/admin-improvements` | Pendiente |
| 4   | Iconos en botones     | M           | `feat/admin-improvements` | Pendiente |
| 5   | Calendario i18n       | XS          | `fix/calendar-i18n`       | Pendiente |
| 6   | Sidebar de navegación | M           | `feat/sidebar-nav`        | Pendiente |
| 7   | Foto de perfil        | L           | `feat/avatar`             | Pendiente |

**Notas sobre implementación:**

- **Issues #3 y #4** deben implementarse juntas en la misma rama (`feat/admin-improvements`) porque ambas modifican la columna de Acciones de la tabla de usuarios. Issue #4 reemplaza botones de texto por iconos en las tres pestañas del admin, e issue #3 añade el botón de reenviar invitación (con icono `RotateCw`) a usuarios inactivos.
- **Issue #5** (calendario i18n) es un cambio de una sola línea y no tiene dependencias. Puede implementarse en cualquier momento.
- **Issue #1** (logout) requiere un endpoint nuevo en backend + UI en frontend.
- **Issue #2** (borrar usuarios) es extenso por implicar un nuevo comando CQRS, handler, endpoint, hook y UI.
- **Issue #6** (sidebar) requiere un componente nuevo y cambios en el layout principal; no tiene dependencias de backend.
- **Issue #7** (foto de perfil) es la tarea más amplia: implica migración de BD, nuevos endpoints, infraestructura de subida reutilizada del módulo de observations, un componente `AvatarPicker` reutilizable, cambios en activación, sidebar y calendario. La parte del sidebar del avatar depende de la issue #6.

**Issues completadas:**

- ✅ **Tipo de ausencia en dropdown** — Completada en PR #267 (fix/absence-type-roles)
