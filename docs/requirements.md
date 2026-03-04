# Requisitos Funcionales — Sistema de Gestión de Ausencias

## 1. Gestión de Usuarios

### 1.1 Tipos de Usuario

**RF-01** El sistema debe soportar cuatro tipos de usuario: estándar, validador, auditor y administrador.

**RF-02** Solo los usuarios administradores podrán crear nuevos usuarios.

**RF-03** Solo los usuarios administradores podrán acceder al panel de administración de la aplicación.

### 1.2 Capacidades por tipo de usuario

**RF-04** Los usuarios de tipo **estándar** podrán:
- Crear ausencias para sí mismos.
- Solicitar la validación de ausencias a usuarios de tipo validador.
- Consultar únicamente sus propias ausencias.

**RF-05** Los usuarios de tipo **validador** podrán:
- Crear ausencias para sí mismos.
- Solicitar la validación de ausencias a otros usuarios de tipo validador.
- Validar ausencias de otros usuarios en las que hayan sido designados como validadores.
- Consultar sus propias ausencias y aquellas en las que figuren como validadores.
- Un usuario validador no puede validar sus propias ausencias.

**RF-06** Los usuarios de tipo **auditor** podrán:
- Consultar las ausencias de todos los usuarios del sistema.
- No podrán crear, modificar ni validar ausencias.

**RF-07** Los usuarios de tipo **administrador** podrán:
- Crear nuevos usuarios.
- Crear y configurar tipos de ausencia desde el panel de administración.
- No podrán crear ausencias ni actuar como validadores.
- Su rol es exclusivamente administrativo; no disponen de perfil de empleado con ausencias.

---

## 2. Tipos de Ausencia

### 2.1 Configuración desde el panel de administración

**RF-08** Los tipos de ausencia deben ser configurables desde el panel de administración, accesible únicamente para usuarios administradores.

**RF-09** Para cada tipo de ausencia, el administrador podrá configurar:
- Nombre del tipo de ausencia.
- Cantidad máxima de horas o días permitidos por usuario por año natural.
- Si el tipo de ausencia requiere flujo de validación o no.

### 2.2 Tipos de ausencia predefinidos

#### 2.2.1 Ausencia no retribuida planeada

**RF-10** Este tipo de ausencia no requiere flujo de validación.

**RF-11** Solo puede programarse en una fecha futura.

**RF-12** La duración mínima es de 1 hora y la máxima es de 8 horas por ausencia.

**RF-13** Cada usuario dispone de un máximo de 80 horas de este tipo por año natural.

#### 2.2.2 Ausencia no retribuida no planeada

**RF-14** Este tipo de ausencia no requiere flujo de validación.

**RF-15** Puede programarse tanto en fecha futura como en fecha pasada.

**RF-16** La duración mínima es de 1 hora y la máxima es de 8 horas por ausencia.

**RF-17** Cada usuario dispone de un máximo de 24 horas de este tipo por año natural.

#### 2.2.3 Ausencia retribuida

**RF-18** Este tipo de ausencia requiere flujo de validación.

**RF-19** Solo puede programarse en una fecha futura.

**RF-20** La ausencia no puede programarse con menos de 15 días naturales de antelación respecto a la fecha de inicio.

**RF-21** La duración mínima es de 1 día laboral y la máxima es de 12 días laborales.

**RF-22** La duración de este tipo de ausencia se mide en días laborales. A efectos del sistema, se consideran días laborales los días de lunes a viernes. No se tienen en cuenta festivos.

---

## 3. Creación de Ausencias

**RF-23** Para crear una ausencia, el usuario debe proporcionar la siguiente información:
- Tipo de ausencia.
- Fecha y hora de inicio de la ausencia.
- Fecha y hora de fin de la ausencia.
- Usuarios validadores asignados (para ausencias con flujo de validación).

**RF-24** El sistema debe validar que la duración de la ausencia se encuentre dentro de los límites permitidos para el tipo de ausencia seleccionado antes de crear el registro.

**RF-25** El sistema debe verificar que el usuario no supere el límite anual de horas o días disponibles para el tipo de ausencia solicitado en el año natural en curso.

**RF-26** Para ausencias sin flujo de validación, la ausencia quedará registrada directamente al crearla.

**RF-27** Para ausencias con flujo de validación, la ausencia se creará en el estado inicial "Esperando validación".

---

## 4. Flujo de Validación

### 4.1 Estados del flujo

**RF-28** El flujo de validación aplica únicamente a las ausencias que así lo requieran según su configuración.

**RF-29** Los estados posibles de una ausencia con flujo de validación son:
- **Esperando validación** (estado inicial)
- **Replantear**
- **Descartada** (estado final)
- **Aceptada** (estado final)
- **Cancelada** (estado final)

### 4.2 Transiciones de estado

**RF-30** Desde el estado **"Esperando validación"**:
- Si al menos un validador rechaza la ausencia → pasa a **"Replantear"**.
- Si todos los validadores aceptan la ausencia → pasa a **"Aceptada"**.

**RF-31** Desde el estado **"Replantear"**:
- El usuario creador puede reenviar la ausencia a validación → vuelve a **"Esperando validación"**.
- El usuario creador puede decidir no continuar con la solicitud → pasa a **"Descartada"**.

**RF-32** El estado **"Descartada"** es final y no permite transiciones posteriores. El estado **"Aceptada"** se considera final para el flujo de validación ordinario y solo admite una transición excepcional a **"Cancelada"** según lo definido en RF-51 y RF-52.

### 4.3 Acciones de los validadores

**RF-33** Cada validador asignado a una ausencia puede aceptar o rechazar dicha ausencia de forma individual. Todos los validadores actúan en paralelo, sin orden de prioridad entre ellos.

**RF-34** Un validador no puede validar ausencias propias.

---

## 5. Observaciones

**RF-35** Todas las ausencias dispondrán de una sección de observaciones donde cualquier usuario implicado en la ausencia podrá añadir comentarios.

**RF-36** Se considera usuario implicado en una ausencia al usuario creador de la misma y a los usuarios designados como validadores.

**RF-37** Las observaciones pueden usarse, entre otros fines, para indicar el motivo de un rechazo o una aprobación.

---

## 6. Visibilidad de Ausencias

**RF-38** Los usuarios **estándar** solo pueden ver sus propias ausencias.

**RF-39** Los usuarios **validadores** pueden ver sus propias ausencias y aquellas en las que figuren como validadores.

**RF-40** Los usuarios **auditores** pueden ver las ausencias de todos los usuarios del sistema, sin posibilidad de modificarlas.

**RF-41** Los usuarios **administradores** no tienen acceso a la gestión ni visualización de ausencias.

**RF-46** Los usuarios **estándar** y **validadores** dispondrán de una vista de calendario que mostrará todas sus ausencias independientemente del estado. El calendario tendrá el foco en el día y mes actual y será navegable hacia periodos pasados y futuros.

---

## 7. Panel de Administración

**RF-42** El panel de administración es accesible únicamente para usuarios de tipo administrador.

**RF-43** Desde el panel de administración se podrán crear nuevos usuarios indicando su tipo.

**RF-44** Desde el panel de administración se podrán crear, editar y configurar los tipos de ausencia disponibles en el sistema.

**RF-45** La configuración de un tipo de ausencia incluirá: nombre, límite máximo de horas o días por año natural, y si requiere flujo de validación.

---

## 8. Notificaciones

**RF-47** El sistema notificará a cada validador asignado cuando se cree una ausencia que requiere su validación.

**RF-48** El sistema notificará al creador de una ausencia cada vez que esta cambie de estado.

**RF-49** Las notificaciones se enviarán por dos canales: email y notificación in-app.

---

## 9. Integridad de Fechas

**RF-50** El sistema impedirá la creación de una ausencia cuyas fechas se solapen total o parcialmente con una ausencia ya existente del mismo usuario.

---

## 10. Cancelación de Ausencias Aceptadas

**RF-51** El creador de una ausencia en estado "Aceptada" podrá cancelarla siempre que la fecha de inicio de la ausencia no haya llegado todavía.

**RF-52** El estado "Cancelada" es un estado final. Las ausencias canceladas no pueden reactivarse ni modificarse. Este estado se añade al flujo de validación de ausencias retribuidas como transición posible desde el estado "Aceptada".

---

## 11. Histórico de Cambios de Estado

**RF-53** El sistema registrará automáticamente cada cambio de estado de una ausencia, almacenando la marca de tiempo y el usuario que realizó la acción.

**RF-54** El histórico de cambios será visible para todos los usuarios implicados en la ausencia y para los usuarios auditores.

---

## 12. Dashboard

**RF-55** Los usuarios **estándar** y **validadores** dispondrán de una pantalla de inicio (dashboard) que mostrará:
- Saldo restante de horas o días disponibles por cada tipo de ausencia en el año natural en curso.
- Próximas ausencias programadas.
- Ausencias pendientes de ser validadas por el usuario (solo para validadores).

---

## 13. Exportación de Datos

**RF-56** Los usuarios **auditores** podrán exportar el listado completo de ausencias de todos los usuarios en formato CSV.

**RF-57** Los usuarios **estándar** y **validadores** podrán exportar sus propias ausencias en formato CSV.

---

## 14. Ficheros Adjuntos en Observaciones

**RF-58** Cada observación puede tener asociados entre 0 y N ficheros adjuntos.

**RF-59** El usuario podrá adjuntar ficheros al crear una observación en el detalle de una ausencia.

**RF-60** Los tipos de fichero permitidos son: imagen JPEG (`.jpg`, `.jpeg`), imagen PNG (`.png`) y documento PDF (`.pdf`). Cualquier otro tipo de fichero será rechazado por el sistema.

**RF-61** El tamaño máximo por fichero es de 5 MB. Los ficheros que superen este límite serán rechazados.

**RF-62** Los ficheros se almacenan en el sistema de ficheros local del servidor, dado que pueden contener datos sensibles del usuario que no deben salir a proveedores externos.

**RF-63** Los ficheros adjuntos podrán ser descargados por cualquier usuario con acceso a la ausencia.

---

## 15. Equipos

**RF-64** El sistema permitirá crear equipos. Cada equipo tendrá un nombre y un color asociado.

**RF-65** El color del equipo se selecciona al crear el equipo en formato hexadecimal. Pueden existir varios equipos con el mismo color.

**RF-66** Los usuarios de tipo **administrador** y **validador** podrán crear equipos y asignar usuarios a equipos.

**RF-67** Un usuario puede pertenecer a ninguno, uno o varios equipos simultáneamente.

**RF-68** Los usuarios de tipo **auditor** nunca estarán asociados a ningún equipo.

**RF-69** Los usuarios **estándar** y **validadores** verán en su vista de calendario, además de sus propias ausencias, las ausencias de los compañeros que pertenezcan a sus mismos equipos.

**RF-70** Las ausencias propias del usuario se mostrarán en el calendario en un color diferenciado del resto. Las ausencias de compañeros de equipo se mostrarán con el color asociado al equipo al que pertenecen.

**RF-71** La visibilidad de ausencias de compañeros de equipo en el calendario es de solo lectura; no permite realizar ninguna acción sobre ellas.

**RF-72** Los usuarios de tipo **auditor** podrán utilizar los equipos existentes como filtro para visualizar ausencias, pero no estarán asociados a ningún equipo.

**RF-73** Los usuarios de tipo **auditor** podrán consultar el listado de equipos existentes y sus integrantes.
