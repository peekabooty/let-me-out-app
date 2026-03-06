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

## 3. Desplegable de tipo de ausencia vacío en el formulario de nueva ausencia

### Situación actual

Cuando un usuario con rol `STANDARD` o `VALIDATOR` abre el formulario de nueva ausencia
(`AbsenceFormDialog.tsx:37`), este llama a `useAbsenceTypes(true)` → `GET /absence-types?onlyActive=true`.

El endpoint `GET /absence-types` en `absence-types.controller.ts:26` está decorado con
`@Roles(UserRole.ADMIN)` a nivel de controlador, lo que hace que el guard devuelva `403 Forbidden`
para cualquier usuario que no sea administrador. El hook recibe el error, `absenceTypes` queda
vacío, y el `<Select>` no muestra ninguna opción.

### Plan de implementación

**Backend — `apps/api/src/modules/absence-types/infrastructure/absence-types.controller.ts`**

El decorador `@Roles(UserRole.ADMIN)` está aplicado a nivel de clase, afectando a todos los
endpoints. La operación de lectura (`GET /absence-types`) debe estar disponible para todos los
usuarios autenticados, no solo para admins.

Mover el decorador `@Roles(UserRole.ADMIN)` de la clase a los métodos de escritura
(`@Post`, `@Patch`, `@Delete`) individualmente. Los métodos `@Get()` y `@Get(':id')` solo
necesitan estar autenticados (el guard JWT global ya lo garantiza), sin restricción de rol.

Cambio mínimo y no invasivo: no se toca ninguna lógica de negocio, solo la configuración
del guard.

**Archivos a modificar:**

- `apps/api/src/modules/absence-types/infrastructure/absence-types.controller.ts`

---

## 4. Textos en inglés en la vista de calendario

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

---

## 5. Sidebar de navegación colapsable

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

## Orden de implementación sugerido

| #   | Issue                        | Complejidad | Rama sugerida            |
| --- | ---------------------------- | ----------- | ------------------------ |
| 1   | Calendario i18n              | XS          | `fix/calendar-i18n`      |
| 2   | Tipo de ausencia en dropdown | XS          | `fix/absence-type-roles` |
| 3   | Logout                       | S           | `feat/logout`            |
| 4   | Borrar usuarios              | M           | `feat/delete-user`       |
| 5   | Sidebar de navegación        | M           | `feat/sidebar-nav`       |

Los dos primeros son cambios de una sola línea cada uno y no tienen dependencias.
El logout requiere un endpoint nuevo en backend + UI en frontend.
El borrado de usuarios es el más extenso por implicar un nuevo comando CQRS, handler,
endpoint, hook y UI.
El sidebar requiere un componente nuevo y cambios en el layout principal; no tiene
dependencias de backend.
