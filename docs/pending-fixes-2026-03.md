# Pending fixes — March 2026

Ten issues identified during manual testing and analysis. Each section describes the root cause,
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

## 8. Desplegables con fondo transparente

### Situación actual

Los componentes Select (`apps/web/src/components/ui/select.tsx:78`) utilizan las clases CSS `bg-popover` y `text-popover-foreground` para el fondo del menú desplegable. Estas clases dependen de las variables CSS `--color-popover` y `--color-popover-foreground` respectivamente.

**El problema:** Estas variables CSS **no están definidas** en `apps/web/src/styles.css`. Sin ellas, Tailwind no puede resolver las clases, resultando en un fondo transparente que hace difícil leer el texto del desplegable, especialmente cuando se superpone sobre contenido oscuro (como el overlay de los Dialogs).

**Componentes afectados:**

- `AbsenceFormDialog.tsx` — selects de tipo de ausencia y validadores
- `UserFormDialog.tsx` — select de rol de usuario
- `AbsenceTypeFormDialog.tsx` — select de unidad (días/horas)
- `AuditFilters.tsx` — selects de equipo y estado en la auditoría

Todos estos componentes usan el componente Select de shadcn/ui que referencia `bg-popover`.

### Plan de implementación

**`apps/web/src/styles.css`**

Agregar dos nuevas variables CSS en la sección `@theme`, después de la línea 26 (tras `--color-destructive-foreground`):

```css
--color-popover: #f5f3f0; /* Light Linen — dropdown backgrounds */
--color-popover-foreground: #4a4a4a; /* Soft Slate — consistent with main text */
```

**Justificación de los colores:**

- `#f5f3f0` (Light Linen) — proporciona suficiente contraste con el fondo principal (`#fffdf9` Cream White) para diferenciar claramente el desplegable del contenido de fondo
- Es especialmente visible sobre el overlay oscuro de los Dialogs
- Se integra naturalmente con la paleta pastel cálida actual de la aplicación
- `#4a4a4a` (Soft Slate) — mantiene consistencia con `--color-foreground` para el texto

**Resultado esperado:**

Los desplegables tendrán un fondo sólido y claramente visible, mejorando la legibilidad y la experiencia de usuario en todos los formularios que utilizan Selects.

### Archivos a modificar

- `apps/web/src/styles.css` — agregar las dos variables CSS

### Tests

No se requieren tests automatizados. Verificación manual:

1. Abrir el formulario de crear ausencia (`/absences/new`)
2. Clickar en el select "Tipo de ausencia"
3. Verificar que el desplegable tiene fondo sólido `#f5f3f0` y texto legible
4. Repetir para los selects de "Validadores", formulario de usuarios (rol), tipos de ausencia (unidad), y filtros de auditoría

### Notas

Esta issue será **automáticamente resuelta** cuando se implemente la **Issue #10 (Sistema de temas)**, ya que todos los temas definirán estas variables. Sin embargo, este fix proporciona una solución inmediata y puede implementarse independientemente en cualquier momento.

---

## 9. Error "Invalid date" al crear ausencias

### Situación actual

Al intentar crear una nueva ausencia desde el formulario (`AbsenceFormDialog.tsx`), el sistema arroja un error de validación: **"Invalid date"** en los campos `startAt` y `endAt`.

**Causa raíz — incompatibilidad de formatos:**

1. **Input HTML:** El formulario usa `<input type="datetime-local">` (líneas 129 y 145 de `AbsenceFormDialog.tsx`). Este tipo de input devuelve un string en formato `YYYY-MM-DDTHH:MM` **sin segundos ni información de timezone**.
   - Ejemplo: `"2026-03-09T14:30"`

2. **Validación Zod:** El schema `CreateAbsenceSchema` en `packages/types/src/schemas.ts` (líneas 93-103) define los campos `startAt` y `endAt` como `z.string().datetime()`, que **requiere formato ISO 8601 completo** con segundos y timezone: `YYYY-MM-DDTHH:MM:SSZ`
   - Ejemplo esperado: `"2026-03-09T14:30:00Z"`

3. **Backend:** Espera timestamps UTC en formato ISO 8601 y los almacena en PostgreSQL como `@db.Timestamptz(6)` (Prisma schema líneas 50-51).

**Resultado:** La validación de Zod falla porque el formato del input no coincide con el formato esperado por el schema.

### Plan de implementación

#### **Frontend — Conversión en el submit**

**Modificar:** `apps/web/src/components/absences/AbsenceFormDialog.tsx` línea 63

Actualmente el `onSubmit` envía los datos directamente:

```typescript
const onSubmit = (data: CreateAbsenceInput) => {
  createAbsence(data); // Los datos de datetime-local van sin conversión
};
```

**Cambiar a:**

```typescript
const onSubmit = (data: CreateAbsenceInput) => {
  createAbsence({
    ...data,
    startAt: new Date(data.startAt).toISOString(),
    endAt: new Date(data.endAt).toISOString(),
  });
};
```

**Explicación:**

- `new Date(data.startAt)` crea un objeto Date desde el string `datetime-local` (interpreta como hora local del navegador)
- `.toISOString()` convierte a formato ISO 8601 UTC completo: `"2026-03-09T13:30:00.000Z"`
- El backend almacena en UTC, el timezone local se convierte automáticamente

#### **Frontend — Tests**

**Modificar:** `apps/web/src/components/absences/AbsenceFormDialog.test.tsx`

Actualizar los tests que simulan el submit del formulario para verificar:

1. Que los valores de `startAt` y `endAt` enviados estén en formato ISO 8601
2. Que la conversión `.toISOString()` se aplique correctamente
3. Mock de la función `createAbsence` para capturar los valores enviados

Ejemplo de asserción:

```typescript
expect(mockCreateAbsence).toHaveBeenCalledWith(
  expect.objectContaining({
    startAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    endAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  })
);
```

#### **Frontend — Verificación de display**

**Verificar (sin modificar):**

Los siguientes componentes ya muestran fechas de ausencias al usuario. Verificar que la conversión **UTC → timezone local** se esté realizando correctamente:

1. **`CalendarView.tsx`** — Los eventos en el calendario deben mostrar las fechas en el timezone local del navegador
   - FullCalendar maneja automáticamente la conversión si recibe ISO 8601
   - Verificar que `mapAbsenceToEvent()` (línea 23-42) no necesita cambios

2. **`DashboardPage.tsx`** — La tabla de ausencias pendientes debe mostrar fechas locales
   - Verificar que el formateo de fechas usa el timezone del navegador
   - Puede requerir uso de `new Date(absence.startAt).toLocaleString()` o librería como `date-fns`

**Si se detectan problemas de visualización:** Crear formatters consistentes en un archivo utilitario (ej. `apps/web/src/lib/date-utils.ts`) para centralizar la conversión UTC → local en toda la aplicación.

### Archivos a modificar

- `apps/web/src/components/absences/AbsenceFormDialog.tsx` — línea 63 (función `onSubmit`)
- `apps/web/src/components/absences/AbsenceFormDialog.test.tsx` — actualizar tests de submit

### Archivos a verificar (sin modificar, a menos que se encuentren problemas)

- `apps/web/src/components/calendar/CalendarView.tsx` — conversión UTC → local en eventos
- `apps/web/src/pages/dashboard/DashboardPage.tsx` — display de fechas en tabla

### Tests

**Tests automatizados:**

- Actualizar `AbsenceFormDialog.test.tsx` con verificación de formato ISO 8601

**Tests manuales:**

1. Crear una ausencia con fechas específicas
2. Verificar que se crea correctamente sin errores de validación
3. Verificar que aparece en el calendario con las fechas correctas (hora local)
4. Verificar que aparece en el dashboard con formato de fecha legible

### Contexto técnico

**¿Por qué almacenar en UTC?**

- Evita ambigüedades con cambios de horario de verano (DST)
- Facilita comparaciones y cálculos de duración
- Estándar en aplicaciones con usuarios en múltiples timezones (aunque esta app es interna, es una buena práctica)

**¿Por qué usar `.toISOString()`?**

- Formato estándar reconocido universalmente
- Compatible con PostgreSQL `timestamptz`
- Prisma y Zod lo esperan por defecto
- Incluye milisegundos y timezone (`Z` = UTC)

---

## 10. Sistema de temas de visualización

### Situación actual

La aplicación actualmente tiene un único tema visual con paleta pastel cálida definida en `apps/web/src/styles.css` (líneas 4-34). No existe forma de que los usuarios cambien la apariencia visual de la aplicación según sus preferencias personales.

El tema actual será renombrado como **"Claro"** y se mantendrá como el tema por defecto.

### Lo que se quiere

Implementar un sistema de **4 temas visuales completos** que el usuario pueda seleccionar:

1. **Claro** (actual) — Paleta pastel cálida clara (crema, melocotón, lavanda)
2. **Oscuro** (nuevo) — Contraparte oscura del tema Claro con colores adaptados para fondo oscuro
3. **Caramelo** (nuevo) — Paleta cálida clara con tonos dulces (naranjas caramelo, amarillos suaves)
4. **Chocolate** (nuevo) — Paleta cálida oscura con tonos marrones intensos

**Características del sistema:**

- **Selector visual:** Grid de 4 tarjetas en el sidebar (cada una con preview de colores y nombre del tema)
- **Persistencia híbrida:**
  - **localStorage** como caché local (carga inmediata sin esperar backend)
  - **Backend** (`user.theme_preference`) como fuente de verdad para sincronización entre dispositivos
- **Aplicación dinámica:** Cambio de tema sin recarga de página mediante CSS variables y data attributes

### Paletas de color

#### **Tema Claro (actual — por defecto)**

Mantener los colores actuales de `styles.css`:

- Background: `#fffdf9` (Cream White)
- Foreground: `#4a4a4a` (Soft Slate)
- Primary: `#ffdab9` (Soft Peach)
- Secondary: `#e6e6fa` (Pale Lavender)
- Accent: `#f4c2c2` (Dusty Rose)
- Muted: `#f0f2f5` (Cloud Gray)
- Popover: `#f5f3f0` (Light Linen — de Issue #8)

#### **Tema Oscuro**

Contraparte oscura con alta legibilidad:

- Background: `#1a1a1a` (carbón suave)
- Foreground: `#e5e5e5` (blanco suave)
- Primary: `#ff9966` (melocotón más intenso)
- Secondary: `#9b87f5` (lavanda vibrante)
- Accent: `#ff6b9d` (rosa más intenso)
- Muted: `#2a2a2a` (gris oscuro)
- Popover: `#262626` (gris carbón claro)

#### **Tema Caramelo**

Paleta cálida clara tipo dulce:

- Background: `#fff8f0` (crema muy clara)
- Foreground: `#4a3f35` (marrón suave para texto)
- Primary: `#ffcc99` (naranja caramelo)
- Secondary: `#ffd9b3` (amarillo caramelo)
- Accent: `#ffb380` (naranja fuerte)
- Muted: `#fff0e6` (crema anaranjada)
- Popover: `#ffe6cc` (naranja muy claro)

#### **Tema Chocolate**

Paleta cálida oscura tipo marrón rico:

- Background: `#2d1f1a` (marrón muy oscuro)
- Foreground: `#f5e6d3` (beige claro)
- Primary: `#8b4513` (marrón chocolate)
- Secondary: `#a0522d` (siena)
- Accent: `#cd853f` (marrón dorado)
- Muted: `#3d2b20` (marrón oscuro medio)
- Popover: `#4a3426` (marrón oscuro claro)

Todos los temas incluyen también:

- `border`, `input`, `ring`, `card`, `destructive` y variantes `-foreground` adaptadas al esquema de color

### Plan de implementación

#### **1. Backend — Persistencia del tema**

**Migración de base de datos:**

Agregar el campo `theme_preference` al modelo `user` en `apps/api/prisma/schema.prisma`:

```prisma
theme_preference String? @default("light") @db.VarChar(20)
```

Valores válidos: `'light'`, `'dark'`, `'caramel'`, `'chocolate'`

Generar y aplicar la migración:

```bash
pnpm --filter @repo/api prisma:migrate
```

**Nuevo endpoint — `PATCH /users/me/theme`**

Agregar en `apps/api/src/modules/users/infrastructure/users.controller.ts`:

```typescript
@Patch('me/theme')
@HttpCode(HttpStatus.OK)
async updateTheme(
  @CurrentUser() user: JwtPayload,
  @Body() body: { theme: 'light' | 'dark' | 'caramel' | 'chocolate' },
): Promise<{ theme: string }> {
  await this.commandBus.execute(
    new UpdateUserThemeCommand(user.sub, body.theme)
  );
  return { theme: body.theme };
}
```

Validación del body con class-validator:

```typescript
export class UpdateThemeDto {
  @IsIn(['light', 'dark', 'caramel', 'chocolate'])
  theme: string;
}
```

**Comando CQRS:**

Crear `UpdateUserThemeCommand` + `UpdateUserThemeHandler` en `apps/api/src/modules/users/application/commands/`:

```typescript
export class UpdateUserThemeCommand {
  constructor(
    public readonly userId: string,
    public readonly theme: string
  ) {}
}
```

Handler:

```typescript
@CommandHandler(UpdateUserThemeCommand)
export class UpdateUserThemeHandler implements ICommandHandler<UpdateUserThemeCommand> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateUserThemeCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.update(command.userId, {
      themePreference: command.theme,
    });
  }
}
```

Registrar en `apps/api/src/modules/users/users.module.ts` en el array de `CommandHandlers`.

**Modificar endpoint existente — `GET /auth/me`**

Actualizar el mapper o la query para incluir `themePreference` en la respuesta del usuario autenticado.

#### **2. Frontend — Definición de temas**

**Nuevo archivo:** `apps/web/src/themes/theme-definitions.ts`

```typescript
export type ThemeName = 'light' | 'dark' | 'caramel' | 'chocolate';

export interface ThemeColors {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  popover: string;
  popoverForeground: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
  previewColors: [string, string, string]; // Para mostrar en tarjeta de preview
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    label: 'Claro',
    previewColors: ['#ffdab9', '#e6e6fa', '#f4c2c2'],
    colors: {
      background: '#fffdf9',
      foreground: '#4a4a4a',
      // ... resto de colores actuales
    },
  },
  dark: {
    name: 'dark',
    label: 'Oscuro',
    previewColors: ['#ff9966', '#9b87f5', '#ff6b9d'],
    colors: {
      background: '#1a1a1a',
      foreground: '#e5e5e5',
      // ... resto de paleta oscura
    },
  },
  caramel: {
    name: 'caramel',
    label: 'Caramelo',
    previewColors: ['#ffcc99', '#ffd9b3', '#ffb380'],
    colors: {
      background: '#fff8f0',
      foreground: '#4a3f35',
      // ... resto de paleta caramelo
    },
  },
  chocolate: {
    name: 'chocolate',
    label: 'Chocolate',
    previewColors: ['#8b4513', '#a0522d', '#cd853f'],
    colors: {
      background: '#2d1f1a',
      foreground: '#f5e6d3',
      // ... resto de paleta chocolate
    },
  },
};
```

#### **3. Frontend — Zustand store**

**Nuevo archivo:** `apps/web/src/store/theme.store.ts`

```typescript
import { create } from 'zustand';
import type { ThemeName } from '../themes/theme-definitions';
import { themes } from '../themes/theme-definitions';

interface ThemeState {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  initTheme: (theme: ThemeName) => void;
}

function applyTheme(theme: ThemeName): void {
  const themeColors = themes[theme].colors;
  const root = document.documentElement;

  // Aplicar data-theme attribute
  root.setAttribute('data-theme', theme);

  // Aplicar color-scheme para scrollbars nativos
  root.style.colorScheme = theme === 'dark' || theme === 'chocolate' ? 'dark' : 'light';

  // Aplicar todas las CSS variables
  Object.entries(themeColors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'light',

  setTheme: (theme) => {
    set({ currentTheme: theme });
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  },

  initTheme: (theme) => {
    set({ currentTheme: theme });
    applyTheme(theme);
  },
}));
```

#### **4. Frontend — Componente selector**

**Nuevo archivo:** `apps/web/src/components/theme/ThemeSelector.tsx`

```typescript
import { useState } from 'react';
import { themes, type ThemeName } from '../../themes/theme-definitions';
import { useThemeStore } from '../../store/theme.store';
import { useUpdateTheme } from '../../hooks/use-users';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';

export function ThemeSelector() {
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const { mutateAsync: updateTheme, isPending } = useUpdateTheme();
  const [error, setError] = useState<string | null>(null);

  const handleThemeChange = async (theme: ThemeName) => {
    if (theme === currentTheme) return;

    setError(null);
    setTheme(theme); // Cambio inmediato en UI

    try {
      await updateTheme(theme); // Persistir en backend
    } catch (err) {
      setError('Error al guardar el tema. Se aplicará solo en este dispositivo.');
      // El tema ya está aplicado localmente, solo falla la sincronización
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Seleccionar tema de visualización"
        className="grid grid-cols-2 gap-3"
      >
        {Object.values(themes).map((theme) => {
          const isActive = currentTheme === theme.name;

          return (
            <button
              key={theme.name}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={isPending}
              onClick={() => void handleThemeChange(theme.name)}
              className={`
                relative flex flex-col items-center gap-2 p-3 rounded-lg border-2
                transition-all cursor-pointer
                ${isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Preview de colores */}
              <div className="flex gap-1">
                {theme.previewColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Nombre del tema */}
              <span className="text-sm font-medium">{theme.label}</span>

              {/* Checkmark si está activo */}
              {isActive && (
                <Check
                  className="absolute top-2 right-2 w-4 h-4 text-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div
          role="alert"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}
    </div>
  );
}
```

**Nuevo archivo:** `apps/web/src/components/theme/ThemeSelector.test.tsx`

Tests a incluir:

- Renderiza las 4 tarjetas con nombres correctos
- Marca el tema activo con checkmark y estilo correcto
- Al hacer click, cambia el tema y llama a `updateTheme()`
- Maneja errores de red mostrando mensaje de error
- Deshabilita botones durante la petición (isPending)
- Atributos ARIA correctos (role="radiogroup", aria-checked)
- Navegación por teclado (Enter/Space activa el tema)

#### **5. Frontend — Integración con sidebar**

**Modificar:** `apps/web/src/components/layout/AppSidebar.tsx`

En el pie del sidebar (debajo del avatar/nombre del usuario), agregar:

```typescript
import { Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ThemeSelector } from '../theme/ThemeSelector';

// ... dentro del render del sidebar:

<div className="mt-auto border-t border-border pt-3">
  {/* Avatar/nombre del usuario (ya existente) */}

  {/* Botón de tema */}
  <Dialog>
    <DialogTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2"
        aria-label="Cambiar tema de visualización"
      >
        <Palette className="h-4 w-4" />
        {!collapsed && <span>Tema</span>}
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Seleccionar tema</DialogTitle>
      </DialogHeader>
      <ThemeSelector />
    </DialogContent>
  </Dialog>
</div>
```

**Comportamiento:**

- **Sidebar expandido:** Muestra icono de paleta + texto "Tema"
- **Sidebar colapsado:** Solo muestra icono de paleta
- Al hacer click, abre Dialog con el grid de temas

#### **6. Frontend — Inicialización al arrancar la app**

**Modificar:** Componente raíz de la app (probablemente `apps/web/src/App.tsx` o donde se inicializa la autenticación)

```typescript
import { useEffect } from 'react';
import { useThemeStore } from './store/theme.store';
import { useAuthStore } from './store/auth.store';
import type { ThemeName } from './themes/theme-definitions';

// ... dentro del componente raíz:

useEffect(() => {
  // 1. Leer tema de localStorage (carga inmediata)
  const cachedTheme = localStorage.getItem('theme') as ThemeName | null;

  // 2. Aplicar tema en caché o por defecto
  const initialTheme = cachedTheme || 'light';
  useThemeStore.getState().initTheme(initialTheme);

  // 3. Cuando se cargue el usuario, sincronizar con backend
  const user = useAuthStore.getState().user;
  if (user?.themePreference && user.themePreference !== initialTheme) {
    // El backend tiene una preferencia diferente (usuario en otro dispositivo)
    useThemeStore.getState().setTheme(user.themePreference as ThemeName);
  }
}, []); // Solo al montar
```

**Flujo de inicialización:**

1. Lee localStorage → aplica inmediatamente (sin flash)
2. Cuando llega respuesta de `GET /auth/me` → si `themePreference` difiere, actualiza
3. De esta forma hay carga instantánea + sincronización en segundo plano

#### **7. Frontend — Aplicación de CSS**

**Modificar:** `apps/web/src/styles.css`

Cambiar de variables estáticas en `@theme` a variables dinámicas con data attributes:

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@400;600&display=swap');
@import 'tailwindcss';

/* Tema Claro (por defecto) */
[data-theme='light'] {
  --font-sans: 'Manrope', 'Sora', 'Avenir Next', sans-serif;
  --color-background: #fffdf9;
  --color-foreground: #4a4a4a;
  --color-muted: #f0f2f5;
  --color-muted-foreground: #7a7a7a;
  --color-border: #e0e0e0;
  --color-input: #e0e0e0;
  --color-ring: #ffdab9;
  --color-card: #fffdf9;
  --color-card-foreground: #4a4a4a;
  --color-primary: #ffdab9;
  --color-primary-foreground: #4a4a4a;
  --color-secondary: #e6e6fa;
  --color-secondary-foreground: #4a4a4a;
  --color-accent: #f4c2c2;
  --color-accent-foreground: #4a4a4a;
  --color-destructive: #dc2626;
  --color-destructive-foreground: #ffffff;
  --color-popover: #f5f3f0;
  --color-popover-foreground: #4a4a4a;
  --color-vacation: #ffdab9;
  --color-personal: #e6e6fa;
  --color-medical: #f4c2c2;
  --radius: 0.5rem;
}

/* Tema Oscuro */
[data-theme='dark'] {
  --font-sans: 'Manrope', 'Sora', 'Avenir Next', sans-serif;
  --color-background: #1a1a1a;
  --color-foreground: #e5e5e5;
  --color-muted: #2a2a2a;
  --color-muted-foreground: #a0a0a0;
  --color-border: #3a3a3a;
  --color-input: #3a3a3a;
  --color-ring: #ff9966;
  --color-card: #1f1f1f;
  --color-card-foreground: #e5e5e5;
  --color-primary: #ff9966;
  --color-primary-foreground: #1a1a1a;
  --color-secondary: #9b87f5;
  --color-secondary-foreground: #1a1a1a;
  --color-accent: #ff6b9d;
  --color-accent-foreground: #1a1a1a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-popover: #262626;
  --color-popover-foreground: #e5e5e5;
  --color-vacation: #ff9966;
  --color-personal: #9b87f5;
  --color-medical: #ff6b9d;
  --radius: 0.5rem;
}

/* Tema Caramelo */
[data-theme='caramel'] {
  --font-sans: 'Manrope', 'Sora', 'Avenir Next', sans-serif;
  --color-background: #fff8f0;
  --color-foreground: #4a3f35;
  --color-muted: #fff0e6;
  --color-muted-foreground: #7a6f65;
  --color-border: #ffe0cc;
  --color-input: #ffe0cc;
  --color-ring: #ffcc99;
  --color-card: #fff8f0;
  --color-card-foreground: #4a3f35;
  --color-primary: #ffcc99;
  --color-primary-foreground: #4a3f35;
  --color-secondary: #ffd9b3;
  --color-secondary-foreground: #4a3f35;
  --color-accent: #ffb380;
  --color-accent-foreground: #4a3f35;
  --color-destructive: #dc2626;
  --color-destructive-foreground: #ffffff;
  --color-popover: #ffe6cc;
  --color-popover-foreground: #4a3f35;
  --color-vacation: #ffcc99;
  --color-personal: #ffd9b3;
  --color-medical: #ffb380;
  --radius: 0.5rem;
}

/* Tema Chocolate */
[data-theme='chocolate'] {
  --font-sans: 'Manrope', 'Sora', 'Avenir Next', sans-serif;
  --color-background: #2d1f1a;
  --color-foreground: #f5e6d3;
  --color-muted: #3d2b20;
  --color-muted-foreground: #b89f8f;
  --color-border: #4a3426;
  --color-input: #4a3426;
  --color-ring: #8b4513;
  --color-card: #332419;
  --color-card-foreground: #f5e6d3;
  --color-primary: #8b4513;
  --color-primary-foreground: #f5e6d3;
  --color-secondary: #a0522d;
  --color-secondary-foreground: #f5e6d3;
  --color-accent: #cd853f;
  --color-accent-foreground: #2d1f1a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-popover: #4a3426;
  --color-popover-foreground: #f5e6d3;
  --color-vacation: #8b4513;
  --color-personal: #a0522d;
  --color-medical: #cd853f;
  --radius: 0.5rem;
}

:root {
  color-scheme: light;
  font-family: var(--font-sans);
}

/* ... resto del CSS sin cambios (FullCalendar, etc.) */
```

**Nota:** El `@theme` de Tailwind no existe como directiva estándar. Si Tailwind v4 usa `@theme`, verificar la sintaxis correcta. Si no, usar `:root` y selectores de data-attribute como se muestra arriba.

#### **8. Tipos compartidos**

**Modificar:** `packages/types/src/entities.ts`

Agregar a la interfaz `User`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  themePreference?: 'light' | 'dark' | 'caramel' | 'chocolate' | null;
  createdAt: string;
  updatedAt: string;
}
```

**Agregar:** `packages/types/src/enums.ts`

```typescript
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  CARAMEL = 'caramel',
  CHOCOLATE = 'chocolate',
}
```

Exportar en `packages/types/src/index.ts`:

```typescript
export { Theme } from './enums';
```

#### **9. API Client**

**Modificar:** `apps/web/src/lib/api-client.ts`

Agregar nueva función:

```typescript
export async function updateUserTheme(
  theme: 'light' | 'dark' | 'caramel' | 'chocolate'
): Promise<{ theme: string }> {
  return client.patch('/users/me/theme', { json: { theme } }).json();
}
```

#### **10. Hooks**

**Modificar:** `apps/web/src/hooks/use-users.ts`

Agregar nuevo hook:

```typescript
import { updateUserTheme } from '../lib/api-client';
import type { ThemeName } from '../themes/theme-definitions';

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (theme: ThemeName) => updateUserTheme(theme),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
```

### Dependencias

**Dependencia TOTAL con Issue #6 (Sidebar de navegación):**

- El selector de tema se ubica en el pie del sidebar
- No tiene sentido implementar el sistema de temas sin el sidebar

**Resuelve automáticamente Issue #8 (Desplegables con fondo transparente):**

- Todos los temas definirán `--color-popover` y `--color-popover-foreground`
- Sin embargo, Issue #8 puede implementarse antes como fix temporal

### Orden de implementación recomendado

Dado el tamaño de esta feature, se recomienda este orden:

1. **Fase 1 — Backend** (puede hacerse en paralelo con Issue #6)
   - Migración de BD (`theme_preference`)
   - Comando CQRS (`UpdateUserThemeCommand` + Handler)
   - Endpoint `PATCH /users/me/theme`
   - Modificar `GET /auth/me` para devolver `themePreference`

2. **Fase 2 — Tipos compartidos**
   - Agregar `themePreference` a `User` en `@repo/types`
   - Agregar enum `Theme`

3. **Fase 3 — Frontend base** (DESPUÉS de Issue #6 completada)
   - `theme-definitions.ts` con las 4 paletas completas
   - `theme.store.ts` con Zustand
   - Modificar `styles.css` con data-attributes
   - Inicialización en `App.tsx`

4. **Fase 4 — Componentes UI**
   - `ThemeSelector.tsx` con grid de tarjetas
   - Integración en `AppSidebar.tsx`
   - `api-client.ts` + hook `useUpdateTheme()`

5. **Fase 5 — Tests**
   - `ThemeSelector.test.tsx`
   - Tests de integración en `AppSidebar.test.tsx`
   - Tests E2E del endpoint

### Archivos a crear

**Backend:**

- `apps/api/src/modules/users/application/commands/update-user-theme.command.ts`
- `apps/api/src/modules/users/application/commands/update-user-theme.handler.ts`
- `apps/api/src/modules/users/dto/update-theme.dto.ts` (validación)
- Migración de Prisma (auto-generada por `prisma migrate dev`)

**Frontend:**

- `apps/web/src/themes/theme-definitions.ts`
- `apps/web/src/store/theme.store.ts`
- `apps/web/src/components/theme/ThemeSelector.tsx`
- `apps/web/src/components/theme/ThemeSelector.test.tsx`

### Archivos a modificar

**Backend:**

- `apps/api/prisma/schema.prisma` (agregar `theme_preference` al modelo `user`)
- `apps/api/src/modules/users/infrastructure/users.controller.ts` (nuevo endpoint)
- `apps/api/src/modules/users/users.module.ts` (registrar handler)
- `apps/api/src/modules/auth/infrastructure/auth.controller.ts` o el mapper de `/auth/me` (devolver `themePreference`)

**Frontend:**

- `apps/web/src/styles.css` (convertir a data-attributes con 4 temas)
- `apps/web/src/components/layout/AppSidebar.tsx` (agregar botón de tema)
- `apps/web/src/App.tsx` o componente raíz (inicialización híbrida)
- `apps/web/src/lib/api-client.ts` (nueva función `updateUserTheme`)
- `apps/web/src/hooks/use-users.ts` (nuevo hook `useUpdateTheme`)
- `apps/web/src/components/layout/AppSidebar.test.tsx` (verificar botón de tema)

**Compartido:**

- `packages/types/src/entities.ts` (agregar `themePreference` a `User`)
- `packages/types/src/enums.ts` (agregar enum `Theme`)
- `packages/types/src/index.ts` (exportar `Theme`)

### Tests requeridos

**Backend:**

- `UpdateUserThemeHandler` — tests unitarios con mock de `UserRepository`
- E2E: `PATCH /users/me/theme` valida correctamente los valores permitidos
- E2E: `PATCH /users/me/theme` rechaza valores inválidos con 400
- E2E: `GET /auth/me` devuelve `themePreference` correctamente

**Frontend:**

- `theme.store.test.ts` — lógica del store Zustand (setTheme, initTheme, localStorage)
- `ThemeSelector.test.tsx` — renderizado, interacción, loading, errores, accesibilidad
- `AppSidebar.test.tsx` — botón de tema presente, abre Dialog
- E2E: flujo completo de cambio de tema (UI → backend → persistencia → recarga)

### Consideraciones adicionales

**Accesibilidad:**

- El selector usa `role="radiogroup"` y `aria-checked` para screen readers
- Navegación por teclado (Tab + Enter/Space) funciona correctamente
- Los temas oscuros tienen suficiente contraste (verificar con herramientas como Axe)

**Rendimiento:**

- El cambio de tema es instantáneo (solo actualiza CSS variables)
- No requiere recarga de página
- localStorage evita flash de tema incorrecto al recargar

**Sincronización:**

- Si el backend falla, el tema se aplica localmente pero no se sincroniza
- Se muestra mensaje de error al usuario sin revertir el cambio
- En próximas sesiones, el tema del backend prevalece

**Extensibilidad futura:**

- Fácil agregar más temas (solo agregar entrada en `theme-definitions.ts` y bloque CSS)
- Posible migrar a generación dinámica de CSS con Tailwind plugins

---

## Orden de implementación sugerido

| #   | Issue                           | Complejidad | Rama sugerida             | Estado    |
| --- | ------------------------------- | ----------- | ------------------------- | --------- |
| 1   | Logout                          | S           | `feat/logout`             | Pendiente |
| 2   | Borrar usuarios                 | M           | `feat/delete-user`        | Pendiente |
| 3   | Reenviar invitación             | S           | `feat/admin-improvements` | Pendiente |
| 4   | Iconos en botones               | M           | `feat/admin-improvements` | Pendiente |
| 5   | Calendario i18n                 | XS          | `fix/calendar-i18n`       | Pendiente |
| 6   | Sidebar de navegación           | M           | `feat/sidebar-nav`        | Pendiente |
| 7   | Foto de perfil                  | L           | `feat/avatar`             | Pendiente |
| 8   | Desplegables fondo transparente | XS          | `fix/select-popover-bg`   | Pendiente |
| 9   | Error "Invalid date" ausencias  | S           | `fix/absence-date-format` | Pendiente |
| 10  | Sistema de temas visualización  | XL          | `feat/theme-system`       | Pendiente |

**Notas sobre implementación:**

- **Issues #3 y #4** deben implementarse juntas en la misma rama (`feat/admin-improvements`) porque ambas modifican la columna de Acciones de la tabla de usuarios. Issue #4 reemplaza botones de texto por iconos en las tres pestañas del admin, e issue #3 añade el botón de reenviar invitación (con icono `RotateCw`) a usuarios inactivos.
- **Issue #5** (calendario i18n) es un cambio de una sola línea y no tiene dependencias. Puede implementarse en cualquier momento.
- **Issue #8** (desplegables fondo transparente) es un fix CSS simple de **2 líneas**: agregar `--color-popover: #f5f3f0` y `--color-popover-foreground: #4a4a4a` en la sección `@theme` de `styles.css` (después de línea 26). No tiene dependencias y puede implementarse en cualquier momento. **Será automáticamente resuelta por Issue #10** cuando se implemente el sistema de temas completo.
- **Issue #9** (error "Invalid date" ausencias) requiere modificar la función `onSubmit` en `AbsenceFormDialog.tsx` (línea 63) para convertir las fechas de `datetime-local` a formato ISO 8601 UTC usando `.toISOString()`. También requiere verificar que la conversión UTC→local funcione correctamente en `CalendarView.tsx` y `DashboardPage.tsx`. No tiene dependencias de backend y puede implementarse independientemente.
- **Issue #1** (logout) requiere un endpoint nuevo en backend + UI en frontend.
- **Issue #2** (borrar usuarios) es extenso por implicar un nuevo comando CQRS, handler, endpoint, hook y UI.
- **Issue #6** (sidebar) requiere un componente nuevo y cambios en el layout principal; no tiene dependencias de backend.
- **Issue #7** (foto de perfil) es la tarea más amplia: implica migración de BD, nuevos endpoints, infraestructura de subida reutilizada del módulo de observations, un componente `AvatarPicker` reutilizable, cambios en activación, sidebar y calendario. La parte del sidebar del avatar depende de la issue #6.
- **Issue #10** (sistema de temas) **depende TOTALMENTE de Issue #6** (sidebar), ya que el selector de tema se ubica en el pie del sidebar. Es la issue más compleja (XL) e implica: migración de BD para `theme_preference`, nuevo endpoint `PATCH /users/me/theme`, comando CQRS, definición de 4 paletas completas (Claro, Oscuro, Caramelo, Chocolate), Zustand store, conversión de `styles.css` a data-attributes, componente `ThemeSelector` con grid de tarjetas, persistencia híbrida (localStorage + backend), y tests completos. Se recomienda implementar en fases: backend → tipos compartidos → frontend base → componentes UI → tests. **Esta issue resuelve automáticamente Issue #8** porque todos los temas definirán las variables `--color-popover`.

**Issues completadas:**

- ✅ **Tipo de ausencia en dropdown** — Completada en PR #267 (fix/absence-type-roles)
