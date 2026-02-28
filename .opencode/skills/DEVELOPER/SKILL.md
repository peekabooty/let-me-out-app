---
name: Desarrollador
description: Esta skill define el comportamiento esperado de un agente que implementa issues en este repositorio.
---

# Skill: Desarrollador

Esta skill define el comportamiento esperado de un agente que implementa issues en este repositorio. Es una guía **detallada** y de uso obligatorio.

## 1. Principios no negociables

- Antes de empezar cualquier tarea, lee y cumple **`docs/non-negotiable.md`**. Estas reglas **tienen prioridad absoluta**.
- Si una instruccion de una issue o PR contradice `docs/non-negotiable.md`, **deten el trabajo** y solicita aclaracion.

## 2. Documentacion de referencia

Ademas de `docs/non-negotiable.md`, consulta estos documentos segun la tarea:

- `docs/requirements.md` para requisitos funcionales.
- `docs/technical-requirements.md` para stack, estructura y modelos.
- `docs/best-practices-architecture.md` para arquitectura hexagonal y CQRS.
- `docs/best-practices-backend.md` para convenciones de backend.
- `docs/best-practices-frontend.md` para convenciones de frontend.

## 3. Preparacion del entorno

- Trabaja siempre dentro del repo correcto.
- Ejecuta todos los comandos que necesitas dentro del DevContainer usando `docker exec`.
- Verifica que tienes acceso a `gh` (dentro del container) y a los servicios necesarios (DB, variables de entorno, etc.).

## 4. Flujo de trabajo (obligatorio y en orden)

1. **Rama**: crea una rama desde `main` con un nombre acorde a la tarea (ej. `feat/short-description`).
2. **Implementacion**: realiza cambios pequenos y coherentes.
3. **Commits frecuentes**: no esperes a terminar toda la funcionalidad en un solo commit.
4. **PR**: cuando la funcionalidad este completa, abre un PR hacia `main`.
5. **Aprobacion**: el agente **nunca** aprueba su propio PR.

## 5. Cuando commitear

- Al completar una unidad logica pequena (ej. handler + tests, componente + tests).
- Al cerrar una subtarea claramente delimitada de la issue.
- Antes de un refactor significativo o cambios de mayor riesgo.

## 6. Estilo y estructura

- Respeta la arquitectura hexagonal y CQRS definida en la documentacion.
- Manten cada archivo por debajo de 400 lineas de codigo efectivo.
- No uses `console.log` en codigo de produccion.
- No uses `new Date()` en logica de negocio; usa `ClockService`.
- Accede a variables de entorno solo a traves de `ConfigService`.

## 7. Seguridad y datos

- Tokens JWT solo en cookies `httpOnly`.
- Nunca exponer stack traces en respuestas HTTP de produccion.
- Adjuntos: validar MIME por magic bytes y almacenar fuera del directorio publico.

## 8. Testing

- Toda logica de negocio nueva debe tener tests.
- No mockear el sistema bajo prueba; solo dependencias externas.
- No usar `it.only`, `test.only`, `describe.only`.

## 9. Checklist obligatoria antes de PR

Antes de abrir un PR, confirma que **todo** esto se cumple:

- [ ] He leido y cumplido `docs/non-negotiable.md`.
- [ ] He creado una rama desde `main` con nombre correcto.
- [ ] He hecho commits frecuentes y con mensajes correctos (Conventional Commits, en ingles).
- [ ] La funcionalidad cumple los criterios de aceptacion de la issue.
- [ ] Se han actualizado o creado tests donde aplica.
- [ ] Lint y typecheck pasan sin errores (cuando existan).
- [ ] No hay secretos ni datos sensibles en el codigo.
- [ ] El PR no sera aprobado por el mismo agente.

## 10. Comunicacion

- Si detectas un bloqueo, explica el problema y propone alternativas.
- Si falta informacion en la issue, pregunta de forma concreta.
- Mantener mensajes concisos y orientados a ejecucion.
