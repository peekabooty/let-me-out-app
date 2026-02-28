# Commit Conventions

All commit messages in this repository must be written in **English**, without exception.

---

## Structure

A commit message has three parts. The first is mandatory; the second and third are optional.

```
type(scope): Short description starting with a verb in third person singular.

Extended explanation of why this change was made. This paragraph can be as
long as needed. Focus on the motivation and context, not on what the diff
already shows. Use plain prose; no bullet points required.

Refs: #42
See: https://...
```

### 1. Subject line (mandatory)

Format: `type(scope): Verb + brief description.`

Rules:
- The description **must start with a verb in third person singular**: `Adds`, `Removes`, `Fixes`, `Extracts`, `Renames`, `Updates`, `Introduces`, `Replaces`, `Moves`, `Deletes`, etc.
- Keep it under 72 characters.
- No period at the end of the subject line is necessary, but it is acceptable.
- The `(scope)` is optional within the subject line but encouraged when the change is clearly scoped to one module or area.

### 2. Body (optional)

- Separated from the subject line by **one blank line**.
- Explain **why** the change is necessary, not what it does (the diff shows that).
- No length limit. Use as many paragraphs as needed.
- Written in plain prose. Focus on motivation, trade-offs, and context.

### 3. References (optional)

- Separated from the body (or subject line if no body) by **one blank line**.
- Use a label followed by a colon: `Refs:`, `See:`, `Closes:`, `Related:`, `Fixes:`.
- One reference per line.

---

## Valid types

| Type | When to use |
|---|---|
| `feat` | Adds a new feature or capability |
| `fix` | Fixes a bug or incorrect behavior |
| `refactor` | Restructures existing code without changing behavior |
| `test` | Adds or updates tests |
| `docs` | Changes to documentation only |
| `chore` | Tooling, configuration, dependencies, CI |
| `perf` | Improves performance without changing behavior |

---

## When to commit

- Commit when **one logical unit of work is complete**: a feature, a bug fix, a refactor, a test suite.
- Each commit should leave the codebase in a working state.
- Do not commit half-finished work. Do not use "WIP" commits on shared branches.
- Do not mix unrelated changes in a single commit. If two changes are independent, they deserve two commits.

## When NOT to commit

- Never use `--no-verify`. Pre-commit hooks exist for a reason.
- Never commit directly to `main` or `master`. All changes go through a Pull Request.
- Never commit files listed in `.gitignore`.
- Never commit with a message that does not follow this format.

---

## Examples

### Minimal — subject line only

```
docs(non-negotiable): Adds rule against using eval() in production code
```

```
chore: Adds .gitignore with node_modules and pnpm-store entries
```

```
fix(auth): Corrects refresh token cookie path to restrict it to /auth/refresh
```

### With body

```
feat(absence): Adds overlap validation in the create absence handler

Without this check, two absences for the same user could be created for
overlapping date ranges if requests arrived concurrently. The validation
now runs inside the same transaction as the insert to prevent race conditions.
```

```
refactor(user): Extracts user mapper to a dedicated file

The mapping logic between the Prisma model and the domain entity was
growing inside the repository. Moving it to absence.mapper.ts keeps each
file under the 400-line limit and makes the transformation logic easier
to test in isolation.
```

### With body and references

```
feat(attachment): Adds MIME type verification using magic bytes

The previous implementation trusted the Content-Type header sent by the
client, which can be easily spoofed. This change uses the file-type library
to inspect the actual bytes of the uploaded file before accepting it.
Only JPEG, PNG, and PDF are allowed.

Refs: #87
See: https://github.com/sindresorhus/file-type
```

---

## Examples of invalid messages

```
# Wrong: no type, no verb in third person, too vague
fixed bug

# Wrong: verb not in third person singular
feat(absence): Add overlap validation

# Wrong: written in Spanish
feat(absence): Añade validación de solapamiento

# Wrong: describes what, not structured correctly, past tense
feat(absence): Added the overlap check to the handler

# Wrong: mixes unrelated changes (should be two commits)
feat(absence): Adds overlap validation and fixes auth cookie path
```
