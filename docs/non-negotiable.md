# Non-Negotiable Rules

Estas reglas no son sugerencias ni buenas prácticas opcionales. Son restricciones absolutas que aplican a todo el código de este proyecto, sin excepciones. Cualquier Pull Request que viole una de estas reglas será bloqueado hasta que se corrija. En los casos marcados como críticos para la seguridad, la violación puede constituir un incidente de seguridad y requerirá revisión obligatoria del equipo antes de continuar.

---

## 1. Seguridad

**1.1.** Nunca incluyas credenciales, secretos, claves de API, tokens o contraseñas hardcodeadas en el código fuente ni en archivos de configuración versionados. Un secreto en el historial de git compromete el sistema aunque se elimine en un commit posterior; la única solución es rotar el secreto.

**1.2.** Nunca subas archivos `.env` al repositorio, ni siquiera con valores de ejemplo o ficticios. Usa `.env.example` sin valores reales y documenta ahí qué variables son necesarias.

**1.3.** Nunca deshabilites la validación SSL/TLS en clientes HTTP, conexiones a bases de datos ni en ningún otro cliente de red, ni siquiera en entornos de desarrollo o testing. Desactivarla en desarrollo normaliza una práctica que expone el sistema en producción.

**1.4.** Nunca expongas stack traces, mensajes de error internos ni detalles de la infraestructura en las respuestas HTTP de producción. Los detalles de error internos son vectores de información para un atacante; el `ExceptionFilter` global es responsable de filtrarlos.

**1.5.** Nunca uses `eval()`, `new Function()`, `setTimeout(string)` ni ninguna otra forma de ejecución dinámica de código a partir de strings. Son vectores directos de inyección de código.

**1.6.** Nunca almacenes el access token o el refresh token JWT en `localStorage`, `sessionStorage` ni en ninguna variable accesible desde JavaScript. Los tokens deben vivir exclusivamente en cookies `httpOnly` gestionadas por el servidor, inmunes a ataques XSS. En despliegue cross-site, las cookies deben usar `SameSite=None` y `Secure=true`; en despliegue same-site se puede usar `SameSite=Strict`.

**1.7.** Nunca registres en los logs contraseñas, hashes de contraseñas, tokens JWT ni datos personales sensibles como el contenido de observaciones o nombres de ficheros adjuntos. Los logs son frecuentemente accesibles a más personas que la base de datos.

**1.8.** Nunca almacenes ficheros adjuntos con el nombre de archivo original proporcionado por el usuario ni en un directorio servido públicamente por URL. Los ficheros se almacenan con un nombre generado (UUID v7 + extensión) fuera del directorio público del servidor.

**1.9.** Nunca confíes en el tipo MIME declarado por el cliente al subir ficheros. Verifica siempre el tipo real del fichero inspeccionando sus magic bytes con la librería `file-type`.

**1.10.** Nunca tomes decisiones de autorización en el frontend basándote en el rol del usuario para operaciones que afecten a datos. El rol en el frontend es únicamente para mostrar u ocultar elementos de la interfaz; el backend es siempre la fuente de verdad y valida el rol de forma independiente.

---

## 2. Arquitectura y Diseño

**2.1.** Nunca importes directamente desde el módulo de otro dominio cruzando los límites de la capa de aplicación. Los módulos se comunican exclusivamente a través de eventos de dominio (`EventBus`) o puertos bien definidos, nunca mediante importaciones directas entre `CommandHandler`s o servicios de distintos módulos.

**2.2.** Nunca coloques lógica de negocio en controllers, guards, middlewares ni interceptors. Los controllers solo mapean la petición HTTP a un Command o Query y delegan; la lógica de negocio pertenece a los `CommandHandler`s y a las entidades de dominio.

**2.3.** Nunca coloques lógica de negocio en la capa de aplicación que debería estar en el dominio. Las reglas que definen si una operación es válida (transiciones de estado, invariantes de entidad, solapamiento de fechas) viven en las entidades de dominio, no en los handlers.

**2.4.** Nunca introduzcas dependencias circulares entre módulos. Una dependencia circular es síntoma de que los límites entre módulos están mal definidos; la solución es rediseñar los límites o usar eventos de dominio.

**2.5.** Nunca hagas que el dominio importe desde la capa de aplicación ni desde la infraestructura. La dirección de las dependencias es siempre hacia adentro: infraestructura → aplicación → dominio.

**2.6.** Nunca devuelvas modelos de Prisma directamente desde los controllers ni desde los repositorios hacia las capas superiores. Cada módulo tiene un `Mapper` que transforma entre el modelo de Prisma, la entidad de dominio y el DTO de respuesta HTTP.

**2.7.** Nunca crees una interfaz o puerto con más responsabilidades de las necesarias. Los puertos son pequeños y específicos; una interfaz con muchos métodos es una señal de que debe dividirse.

---

## 3. Base de Datos

**3.1.** Nunca realices cambios manuales al schema de la base de datos (DDL directo, modificar tablas desde un cliente SQL). Todos los cambios al schema se realizan exclusivamente a través de migraciones de Prisma (`prisma migrate dev` en desarrollo, `prisma migrate deploy` en CI/staging/producción).

**3.2.** Nunca ejecutes `prisma migrate reset` fuera de un entorno de desarrollo local. En staging o producción destruye los datos irreversiblemente.

**3.3.** Nunca almacenes contraseñas en texto plano en la base de datos. Las contraseñas se almacenan siempre como hash generado con `bcrypt` (mínimo 12 rondas).

**3.4.** Nunca construyas queries SQL mediante concatenación de strings con datos provenientes del usuario. Usa siempre los métodos tipados de Prisma; si excepcionalmente necesitas SQL crudo, usa `prisma.$queryRaw` con `Prisma.sql` y parámetros interpolados, nunca concatenación de strings.

**3.5.** Nunca modifiques más de una tabla en una sola operación sin envolver las operaciones en una transacción (`prisma.$transaction()`). Una operación parcialmente completada deja el sistema en un estado inconsistente.

**3.6.** Nunca uses enteros autoincrement como claves primarias. Todas las claves primarias son UUID v7 generados en el backend con la librería `uuidv7`.

---

## 4. Código y Calidad

**4.1.** Nunca hagas commit con el flag `--no-verify`. Los hooks de pre-commit existen para proteger la calidad del código; saltárselos introduce problemas que otros desarrolladores tendrán que corregir.

**4.2.** Nunca uses `@ts-ignore` ni `as any` sin un comentario inmediatamente encima que explique por qué es necesario y qué condición permitiría eliminarlo. El uso sin justificación anula las garantías del tipado estático.

**4.3.** Nunca uses `// eslint-disable` ni `/* eslint-disable */` sin un comentario inmediatamente asociado que explique la razón concreta. Las deshabilitaciones genéricas ocultan problemas reales.

**4.4.** Nunca dejes sentencias `console.log`, `console.error` ni `console.warn` en código que se ejecute en producción. En el backend usa el `Logger` de NestJS; en el frontend usa herramientas de observabilidad adecuadas.

**4.5.** Nunca superes las 400 líneas de código efectivo por archivo (sin contar comentarios, imports y líneas en blanco). Un archivo que supera este límite tiene más de una responsabilidad y debe dividirse.

**4.6.** Nunca referencees `process.env.VARIABLE` directamente en el código del backend. Todas las variables de entorno se acceden a través del `ConfigService` de NestJS, que garantiza validación al arranque y tipado.

**4.7.** Nunca uses `new Date()` directamente en lógica de negocio del backend. Inyecta y usa `ClockService` para que el tiempo sea controlable en los tests.

---

## 5. Testing

**5.1.** Nunca añadas nueva lógica de negocio sin tests que la cubran. El código sin tests es deuda técnica inmediata; los casos de uso del dominio, las entidades y los handlers deben tener cobertura de tests unitarios antes de hacer merge.

**5.2.** Nunca mockees el sistema bajo prueba. Solo se mockean las dependencias externas del componente que se está testeando (repositorios, servicios de email, reloj); mockear el propio componente invalida el test.

**5.3.** Nunca dejes `it.only`, `test.only`, `describe.only`, `fit` o `fdescribe` en código que se vaya a hacer commit. Estas directivas hacen que el resto de la suite de tests no se ejecute, ocultando regresiones.

**5.4.** Nunca conectes a una base de datos real en tests unitarios. Los tests unitarios usan mocks del repositorio; los tests de integración usan Testcontainers con una base de datos aislada y efímera.

**5.5.** Nunca testees detalles de implementación como el estado interno de un hook, nombres de clases CSS o que un componente llama a una función concreta. Testea comportamiento observable: lo que el usuario ve y puede hacer.

---

## 6. Git y Control de Versiones

**6.1.** Nunca hagas push directamente a `main` o `master`. Todo cambio entra a través de un Pull Request revisado por al menos otro miembro del equipo.

**6.2.** Nunca hagas force push (`git push --force`) a ramas compartidas (incluyendo `main`, `master` y cualquier rama de larga duración). Reescribir el historial en ramas compartidas rompe el trabajo de otros desarrolladores.

**6.3.** Nunca hagas commit de archivos listados en `.gitignore`, especialmente directorios de dependencias (`node_modules/`), archivos de build (`dist/`, `.next/`) y archivos de entorno (`.env`).

**6.4.** Nunca uses mensajes de commit que no sigan el formato Conventional Commits (`type(scope): description`). Mensajes como "fix", "wip", "cambios" o "asdf" impiden entender el historial y generan changelogs inútiles.

**6.5.** Nunca dejes una rama abierta sin actividad durante más de 7 días sin actualizar su descripción o estado en la issue asociada. Las ramas abandonadas acumulan conflictos y generan confusión sobre el estado del trabajo.

---

## 7. Accesibilidad, Rendimiento y UX

**7.1.** Nunca bloquees el hilo principal de JavaScript con operaciones síncronas pesadas (parseo de ficheros grandes, cálculos intensivos en bucles). Si una operación puede tardar más de unos pocos milisegundos, delégala al backend o usa un Web Worker.

**7.2.** Nunca uses elementos no semánticos (`<div>`, `<span>`) para acciones interactivas que deberían ser `<button>` o `<a>`. Los elementos no semánticos no son accesibles por teclado ni para tecnologías asistivas por defecto.

**7.3.** Nunca uses `dangerouslySetInnerHTML` para renderizar contenido generado por el usuario. El contenido de texto libre (observaciones, nombres) se renderiza siempre como texto plano, controlando el formato con CSS (`white-space: pre-wrap`).

**7.4.** Nunca apliques `React.memo`, `useMemo` o `useCallback` de forma preventiva sin que el profiler de React haya confirmado un problema real de rendimiento. La optimización prematura añade complejidad sin beneficio medible y puede introducir bugs sutiles.

**7.5.** Nunca uses colores de equipo que no superen el ratio de contraste mínimo WCAG AA (4.5:1 para texto normal) contra el fondo del calendario. Informa al administrador en el selector de color si el contraste es insuficiente.
