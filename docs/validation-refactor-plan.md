# Validation-Refactor — Befund + Plan

> Erstellt: 2026-05-19
> Bezug: devtask-manager #12 [S7] — einheitliche Validation zwischen Route und Controller
> Status: Befund + Plan + **1 Beispiel-Refactor schon implementiert** (Schema-Extraktion)

## Befund

### 1. Industrie-Standard-Pattern bereits in place

Die `validate`-Middleware in `backend/src/middleware/validationMiddleware.ts` (23 Zeilen) macht **schon das Richtige**:

```ts
export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
```

Sie ist eingebaut in:
- `authRoutes.ts`: `validate(registerSchema)`, `validate(loginSchema)`
- `taskRoutes.ts`: `validate(createTaskSchema)`, `validate(updateTaskSchema)`
- `adminRoutes.ts`: `validate(userActionSchema)`

### 2. Konkrete Doppelung: `userActionSchema` doppelt definiert und doppelt geparst

Vor Refactor:

**`routes/adminRoutes.ts` Zeilen 49-53**:
```ts
const userActionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
router.post('/user-action', validate(userActionSchema), performUserAction);
```

**`controllers/adminSecurityController.ts` Zeilen 61-65**:
```ts
const userActionSchema = z.object({  // <-- separate Definition, Fehlermeldungen wichen ab!
  userId: z.string(),                 // <-- ohne min(1) und ohne Custom-Message
  action: z.enum(['unlock', 'lock', 'reset-attempts', 'force-logout']),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
```

Plus Doppel-Parsing in **Zeile 214**:
```ts
const { userId, action, reason } = userActionSchema.parse(req.body);
// req.body wurde bereits von validate() geparsed — diese Zeile macht es zum 2. Mal!
```

**Konsequenzen vor Refactor**:
- Ein Schema-Update muss an **zwei Stellen** angewendet werden — typischer DRY-Bruch.
- Die zwei Schemas haben **abweichende Fehlermeldungen** (`'User ID is required'` vs. nichts) — Endpoint kann je nachdem inkonsistente Fehler werfen.
- Doppel-Parsing verschwendet CPU (klein, aber unnoetig).

### 3. Asymmetrie: Query-Parameter werden NICHT von `validate` abgedeckt

In `adminSecurityController.ts`:
```ts
const securityQuerySchema = z.object({ /* ... */ });
const blacklistQuerySchema = z.object({ /* ... */ });

// Im Controller (nicht Middleware):
const query = securityQuerySchema.parse(req.query);
const query = blacklistQuerySchema.parse(req.query);
```

Das ist **keine Doppelung**, aber **architektonische Inkonsistenz**: Body-Validation laeuft in Middleware, Query-Validation laeuft im Controller. Saubere Architektur waere: alles in Middleware.

## Strategie: Zod-Schema-First mit Schema-Files als Single Source of Truth

### Industrie-Pattern (referenziert von z.B. tRPC, Hono, modern Express-Apps)

1. **Schemas leben in `backend/src/schemas/*.ts`** — getrennt von Routes und Controllers.
2. **Routes** importieren das Schema und uebergeben es an `validate()`.
3. **Controllers** importieren nur den Inferred-Type (`type X = z.infer<typeof schema>`) — kein erneutes Parsen.
4. **Middleware** wird so erweitert, dass sie auch `req.query` und `req.params` validieren kann.

### Soll-Struktur

```
backend/src/
  schemas/
    authSchemas.ts        // registerSchema, loginSchema
    taskSchemas.ts        // createTaskSchema, updateTaskSchema
    adminSchemas.ts       // userActionSchema, securityQuerySchema, blacklistQuerySchema
  middleware/
    validationMiddleware.ts  // erweitert: validate(schema, source = 'body')
  routes/
    authRoutes.ts          // imports from schemas/
    taskRoutes.ts
    adminRoutes.ts
  controllers/
    authController.ts      // imports type Inferred from schemas/, kein Parsing
    taskController.ts
    adminSecurityController.ts
```

### Erweiterung der `validate`-Middleware (optional, Phase 2)

```ts
type ValidationSource = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, source: ValidationSource = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next(error);
    }
  };
```

Anwendung:
```ts
router.get(
  '/events',
  validate(securityQuerySchema, 'query'),
  getSecurityEvents
);
```

## Schon implementiert (Beispiel-Refactor)

Im selben Commit wie dieser Plan:

1. **Neuer File `backend/src/schemas/adminSchemas.ts`** — extrahierte `userActionSchema` + Type-Export `UserActionInput`.
2. **`adminSecurityController.ts`**:
   - Lokale `userActionSchema`-Definition entfernt.
   - `userActionSchema.parse(req.body)` in Zeile 214 ersetzt durch `req.body as UserActionInput`.
   - Import des Types hinzugefuegt: `import type { UserActionInput } from '../schemas/adminSchemas';`.
3. **`adminRoutes.ts`**:
   - Lokale Definition entfernt.
   - `import { userActionSchema } from '../schemas/adminSchemas';`.
4. **Build verifiziert** mit `npm run build` (TypeScript clean).

Effekt: ein Schema, eine Definition, eine Validierung. Single Source of Truth.

## Naechste Schritte (nicht in diesem Commit)

### Phase 2 — Schema-Extraktion fuer Auth + Task

| Datei | Aufgabe | Aufwand |
|---|---|---|
| `schemas/authSchemas.ts` | `registerSchema` + `loginSchema` aus `authController.ts` extrahieren | 30 min |
| `schemas/taskSchemas.ts` | `createTaskSchema` + `updateTaskSchema` aus `taskController.ts` extrahieren | 30 min |
| Controllers anpassen | `z.infer`-Type importieren, kein Parsing im Controller | 30 min |
| Routes anpassen | Schemas aus `schemas/` importieren statt aus Controllers | 15 min |

**Total Phase 2: ~2h**, low-risk Refactor.

### Phase 3 — `validate`-Middleware fuer Query/Params

| Datei | Aufgabe | Aufwand |
|---|---|---|
| `validationMiddleware.ts` | `source`-Parameter ergaenzen | 15 min |
| `adminSecurityController.ts` | `securityQuerySchema`, `blacklistQuerySchema` extrahieren | 30 min |
| `adminRoutes.ts` | `validate(schema, 'query')` einbauen | 30 min |
| Tests | Edge-Cases: Body + Query gemeinsam, Type-Coercion (`z.coerce.number`) | 1h |

**Total Phase 3: ~2-3h**, medium-risk wegen Query-Parsing-Edge-Cases.

### Phase 4 — Frontend-Schemas wiederverwenden (Stretch)

Da Frontend bereits `zod` und `@hookform/resolvers` nutzt: Schemas in einem geteilten `shared/`-Folder ablegen, von Backend und Frontend importieren. Verhindert Schema-Drift.

Anforderungen:
- Monorepo-Setup (das ist schon vorhanden — npm-Workspace mit `frontend` + `backend`).
- Neues Workspace `shared/` mit `schemas/`.
- Beide Apps importieren via `@devtask/shared`.

**Aufwand**: ~4h, aber dauerhaft hoher ROI (kein Frontend-Backend-Schema-Drift mehr).

## Risiken

- **Phase 2-3 sind low-risk** — reine Code-Verschiebung, kein Logik-Wechsel.
- **Phase 4** brauche Monorepo-Refactoring, sollte erst nach erfolgreichem Deployment und einer Bestandsaufnahme der `package.json`-Scripts angegangen werden.

## Verifikation des Beispiel-Refactors

Manuell pruefen (lokal):
```bash
cd backend
npm run build                  # TypeScript-Check
npm run dev                    # Server starten
# In separater Shell:
curl -X POST http://localhost:5000/api/admin/security/user-action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"userId":"x","action":"unlock","reason":"too short"}'
# Expected: 400 mit "Reason must be at least 5 characters"
```

Wenn die Fehlermeldung **vor und nach** dem Refactor identisch ist → Refactor war non-breaking. Schema-Definition ist identisch zu der bisherigen Route-Variante (die strengere von beiden).
