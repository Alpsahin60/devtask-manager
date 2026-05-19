# Demo-Modus — Spezifikation

> Erstellt: 2026-05-19
> Status: Spec (kein Code)
> Bezug: devtask-manager #7 [S8] — vorausgefuelltes Showcase-Konto fuer Bewerbungs-Demos

## Problem

Aktuell muss ein Recruiter sich registrieren, um die App zu sehen. Reibung: Registrierung → Email-Eingabe → Passwort-Wahl → Login → leeres Dashboard. Bis dahin ist die Aufmerksamkeit verloren.

## Loesung in einem Satz

Ein vorausgefuelltes Demo-Konto mit Beispiel-Tasks und einem visuellen "Demo-Modus"-Indikator, das jeder mit einem Klick einsehen kann — ohne Registrierung, ohne Daten-Persistenz von Aenderungen ueber den Session-Reset hinaus.

## User-Story

> Als **Recruiter** ohne Account moechte ich **mit einem Klick** in eine vollstaendig befuellte Demo-Version der App gelangen, **damit ich** in 30 Sekunden sehe, ob die App das beworbene Feature-Set tatsaechlich abdeckt.

Akzeptanz: Ein Demo-Login-Button auf der Login-Seite. Nach Klick: direkt im Dashboard, mit 3+ Beispiel-Spalten (z.B. "Backlog / In Progress / Done"), 8+ Beispiel-Tasks. Demo-Banner persistent oben sichtbar.

## Akzeptanzkriterien

### Funktional
- [ ] **AC-1**: Login-Seite zeigt einen "Demo ansehen"-Button neben "Login" / "Registrieren". Visuell ruhiger Style (Outline statt Solid), damit Demo nicht der primaere CTA wird.
- [ ] **AC-2**: Klick auf Demo-Button: kein Login-Form. Direkter Redirect auf `/dashboard` mit Demo-User-Session.
- [ ] **AC-3**: Demo-User existiert mit fixierter Email `demo@devtask-manager.app` und Passwort `Demo2026!Show` (env-overrideable).
- [ ] **AC-4**: Demo-User-Dashboard hat 3 Spalten ("Backlog", "In Progress", "Done") und mind. 8 Tasks verteilt.
- [ ] **AC-5**: Demo-Banner oben auf jeder Seite im Demo-Mode: "Demo-Modus aktiv — Aenderungen werden alle 30 Min. zurueckgesetzt".
- [ ] **AC-6**: Aenderungen (Task-Create, -Edit, -Delete, -Drag-Drop) sind **innerhalb der Session erlaubt**, werden aber **alle 30 Minuten** via Cron oder Lazy-Reset zurueckgesetzt.
- [ ] **AC-7**: Demo-User kann **nicht**: Email aendern, Passwort aendern, anderen User einladen (falls Multi-User-Feature in Zukunft), Account loeschen.

### Nicht-funktional
- [ ] **AC-8**: Demo-Login darf nicht zur normalen Auth-Flow-Rate-Limit-Logik beitragen (sonst koennten Bots die normale Login-Route ueber Demo-Aufruf flooden).
- [ ] **AC-9**: Demo-Mode-Flag muss in JWT-Payload sein (`isDemo: true`), damit Middleware ohne DB-Roundtrip entscheiden kann.
- [ ] **AC-10**: Demo-Seeds sind **idempotent** — Reset-Cron darf das Seed mehrmals laufen lassen, ohne Duplikate zu erzeugen.

## Technisches Design

### Datenbank-Aenderungen

#### `User`-Schema-Erweiterung
```ts
// backend/src/models/User.ts
isDemo: {
  type: Boolean,
  default: false,
  index: true, // schneller Lookup beim Reset-Job
},
```

#### `Task`-Schema-Erweiterung (optional, fuer Reset-Performance)
```ts
// backend/src/models/Task.ts
ownerIsDemo: {
  type: Boolean,
  default: false,
  index: true, // erlaubt schnelle Bulk-Loeschung im Reset-Job
},
```

Alternative: Reset-Job laueft via `User.findOne({ isDemo: true })._id` und `Task.deleteMany({ user: demoUserId })`. Weniger Schema-Aenderung, aber 1 zusaetzlicher DB-Roundtrip pro Reset.

### Seed-Skript

`backend/src/scripts/seed-demo.ts`:
```ts
// Idempotent — kann beliebig oft laufen
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@devtask-manager.app';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'Demo2026!Show';

async function seedDemo() {
  // Upsert Demo-User
  const demoUser = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $setOnInsert: {
        name: 'Demo User',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD, // pre-save hook hasht
        isDemo: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Aktuelle Demo-Tasks loeschen + neu seeden
  await Task.deleteMany({ user: demoUser._id });
  await Task.insertMany(DEMO_TASKS.map((t) => ({ ...t, user: demoUser._id, ownerIsDemo: true })));
}

const DEMO_TASKS = [
  { title: 'Sprint Planning vorbereiten', status: 'backlog', priority: 'high', /* ... */ },
  // ... 7+ weitere
];
```

Ausfuehrung lokal: `ts-node src/scripts/seed-demo.ts`.

### Auth-Route fuer Demo

`backend/src/routes/auth.ts`:
```ts
router.post('/demo-login', authController.demoLogin);
```

`backend/src/controllers/authController.ts`:
```ts
async demoLogin(req, res) {
  const demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) return res.status(503).json({ error: 'Demo not available' });

  const tokens = generateTokens({ userId: demoUser._id, isDemo: true });
  res.cookie('refreshToken', tokens.refresh, secureCookieOpts);
  return res.json({ accessToken: tokens.access, user: demoUser.toJSON() });
}
```

Rate-Limit-Strategie: Demo-Login hat **separate Rate-Limit-Middleware** (z.B. 10/min/IP), damit normale Login-Flows nicht beeinflusst werden.

### Read-Only-Enforcement

Middleware `requireNotDemo` fuer kritische Aktionen:
```ts
// backend/src/middleware/requireNotDemo.ts
export function requireNotDemo(req, res, next) {
  if (req.user?.isDemo) {
    return res.status(403).json({
      error: 'Demo-Account: diese Aktion ist gesperrt.',
      code: 'DEMO_RESTRICTED',
    });
  }
  next();
}
```

Anwendung in Routes:
```ts
router.delete('/users/me', requireAuth, requireNotDemo, userController.deleteAccount);
router.put('/users/me/email', requireAuth, requireNotDemo, userController.updateEmail);
router.put('/users/me/password', requireAuth, requireNotDemo, userController.updatePassword);
```

CRUD auf Tasks bleibt erlaubt — soll ja zeigen, dass die App funktioniert.

### Reset-Cron-Job

Option A (App-internal, einfacher): Node-cron in `backend/src/index.ts`:
```ts
import cron from 'node-cron';
import { seedDemo } from './scripts/seed-demo';

// Jede 30 Min Demo zuruecksetzen
cron.schedule('*/30 * * * *', async () => {
  console.log('[demo-reset] running...');
  await seedDemo();
});
```

Option B (Host-extern, robuster): Railway-Cron oder GitHub-Actions-cron, der `POST /api/admin/reset-demo` triggert. Vermeidet, dass App-Restart den Reset stoppt.

**Empfehlung**: Option A fuer MVP, Option B nach Live-Go falls Production-Reliability noetig.

### Frontend-Aenderungen

#### Login-Seite (`frontend/app/(auth)/login/page.tsx`)
Zusaetzlicher Button:
```tsx
<Link href="/api/auth/demo" prefetch={false}>
  <Button variant="outline">Demo ansehen</Button>
</Link>
```

#### Demo-Banner (`frontend/components/DemoBanner.tsx`)
```tsx
'use client';
import { useAuth } from '@/hooks/useAuth';

export function DemoBanner() {
  const { user } = useAuth();
  if (!user?.isDemo) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-200 backdrop-blur">
      Demo-Modus aktiv. Aenderungen werden alle 30 Min. zurueckgesetzt.
    </div>
  );
}
```

Eingebunden in `frontend/app/layout.tsx` ueber dem Main-Content.

#### Conditional Render fuer Buttons
Account-Settings-Page: Buttons fuer Email/Passwort/Loeschen disabled bei `user.isDemo === true`, plus Tooltip "Im Demo-Modus gesperrt".

## Migrations-Steps (MongoDB)

1. **Schema-Migration**: Mongoose macht das automatisch fuer neue Felder (`isDemo: false` ist Default). Kein Migrations-Skript noetig fuer Bestandsuser.

2. **Demo-User-Seed**: `ts-node src/scripts/seed-demo.ts` einmalig nach Deploy ausfuehren.

3. **Cron-Job aktivieren**: nur in production-env, nicht in dev:
   ```ts
   if (process.env.NODE_ENV === 'production') {
     cron.schedule('*/30 * * * *', seedDemo);
   }
   ```

## Risiken & Edge-Cases

| Risiko | Mitigation |
|---|---|
| Demo-User wird im normalen Login-Form eingegeben, Passwort wird durchprobiert | Demo-Login geht nur via `/api/auth/demo`-Endpoint. Email `demo@devtask-manager.app` ist trotzdem in DB, Brute-Force greift Lock-Mechanismus. |
| Demo-Tasks haben `user: demoUserId` — wenn der Job `Task.deleteMany({ ownerIsDemo: true })` macht, sind alle Demo-Tasks weg, aber `ownerIsDemo` muss bei Inserts gesetzt sein | Insert-Helper im Demo-Controller setzt `ownerIsDemo: true` automatisch. Plus Mongoose-Hook auf Task-Schema: `pre('save')` checked, ob `user.isDemo === true`. |
| Reset-Cron laueft genau waehrend ein Recruiter klickt → Demo plotzlich leer | Akzeptanz: `*/30` ist selten. Visuelles Refresh erscheint als "Loading". Toleranz aufnehmen oder Cron auf nachtsbasis (`0 4 * * *`) verschieben. |
| JWT-Demo-Token wird kopiert und auf normaler Login-Route benutzt | `isDemo`-Claim im JWT, Middleware checked bei jeder Protected-Route. Kein Way around. |

## Aufwandsschaetzung

| Phase | Stunden | Anmerkung |
|---|---|---|
| Schema-Aenderung User + Task | 1 | Mongoose-Schemas + IndexConfig |
| Seed-Skript | 2 | Idempotent, 8+ Tasks-Daten ausdenken |
| Auth-Route + Controller | 2 | Demo-Login + Rate-Limit-Middleware |
| `requireNotDemo`-Middleware + Anwendung | 1 | An den 3-5 kritischen Routes |
| Frontend Demo-Button + Banner + Conditionals | 3 | Login-Seite, Layout, Settings-Page |
| Cron-Job + Env-Switch | 1 | node-cron, NODE_ENV-Check |
| Tests (Unit fuer requireNotDemo, Integration fuer demo-login) | 2 | Vitest oder Jest |
| Smoke-Test + Doku-Update | 1 | README + dieser Spec wird obsolet/archiviert |
| **Total** | **~13** | Solider Mid-Sprint-Block, in 2-3 Tagen machbar |

## Naechster Schritt

Wenn dieses Spec angenommen wird: in Sprint-Board als 4 separate Tasks zerlegen:
1. Backend: User-Schema + Task-Schema + Seed-Script + Auth-Route
2. Backend: requireNotDemo-Middleware + Anwendung + Cron-Job
3. Frontend: Demo-Login-Button + Banner + Settings-Conditionals
4. Tests + Doku

Verifikations-Test:
- [ ] Demo-Button klickbar von der Login-Seite
- [ ] Dashboard zeigt 8+ Tasks
- [ ] Banner sichtbar
- [ ] Task-Create funktioniert
- [ ] Account-Loeschen ist gesperrt mit klarer Fehlermeldung
- [ ] Nach 30 Min: Daten zurueckgesetzt
