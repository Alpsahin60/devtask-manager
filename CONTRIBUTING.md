> **Documentation convention:** this guide is tool-agnostic. No editor- or AI-assistant-specific instructions.

# Contributing zu DevTask Manager

Dieses Dokument beschreibt, wie an diesem Projekt entwickelt wird: Tech-Stack, Setup, Coding-Konventionen, Workflow und Architektur-Hintergründe. Es ist primär als Referenz für mich selbst und für spätere Mitlesende gedacht — als Solo-Lernprojekt gibt es kein klassisches Review-Modell, aber die Standards orientieren sich an dem, was in einem Team-Setting tragfähig wäre.

---

## 1. Project Overview

**DevTask Manager** ist eine Full-Stack-Task-Management-Applikation mit JWT-Authentifizierung und einem Kanban-Board (Drag & Drop). Das Repo ist als **Monorepo via npm workspaces** organisiert und enthält zwei eigenständige Sub-Projekte:

- `frontend/` — Next.js-App (App Router) als Web-UI
- `backend/` — Express-REST-API mit MongoDB-Persistierung

Hauptbranch: `main`. Da das Projekt solo entwickelt wird, gibt es kein Pull-Request-Pflichtmodell — Änderungen landen direkt auf `main`, sobald sie die Definition of Done erfüllen (siehe Sektion 6).

---

## 2. Tech Stack

### Frontend

| Bereich | Wahl |
|---|---|
| Framework | Next.js **14.2.35** (App Router) |
| Sprache | TypeScript 5 |
| UI-Bibliothek | React 18 |
| Styling | Tailwind CSS 3.4 |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Forms | `react-hook-form` + `@hookform/resolvers` |
| Validation | `zod` 4 |
| HTTP-Client | `axios` |
| Linting | `eslint-config-next` |

### Backend

| Bereich | Wahl |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express **4.19.2** |
| Sprache | TypeScript 5.4 |
| ORM | Mongoose **8.4.1** |
| Datenbank | MongoDB 7 (lokal oder Atlas) |
| Auth | `jsonwebtoken`, `bcryptjs`, `cookie-parser` |
| Security | `helmet`, `express-rate-limit`, CORS |
| Validation | `zod` 3 |
| Dev-Tooling | `ts-node-dev` (Live-Reload), ESLint, Prettier |

### Root-Tooling

- npm **workspaces** (`frontend`, `backend`)
- `concurrently` für parallele Dev-Server
- Keine Tests/CI auf Root-Ebene (siehe Sektion 6 für Definition of Done)

---

## 3. Project Structure

```
devtask-manager/
├── package.json              # Workspace-Root, Sammel-Scripts
├── README.md                 # Kurz-Vorstellung
├── DEVELOPMENT.md            # Detailliertes Setup
├── MONGODB_SETUP.md          # MongoDB-Onboarding (Atlas/lokal)
├── SECURITY_IMPLEMENTATION_SUMMARY.md
├── CONTRIBUTING.md           # ← dieses Dokument
│
├── frontend/                 # Next.js-App
│   ├── app/
│   │   ├── (auth)/           # Login/Register-Routes (Group)
│   │   ├── dashboard/        # Kanban-Board
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   ├── board/            # Kanban-Columns, Cards, DnD-Logik
│   │   ├── ui/               # Generische UI-Bausteine
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   ├── lib/
│   │   └── api.ts            # axios-Instanz, Token-Refresh-Interceptor
│   ├── middleware.ts         # Next-Middleware (Route-Protection)
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── backend/                  # Express-API
    ├── src/
    │   ├── index.ts          # App-Bootstrap, Middleware-Chain
    │   ├── config/
    │   │   └── database.ts   # Mongoose-Connection
    │   ├── controllers/
    │   │   ├── authController.ts
    │   │   ├── taskController.ts
    │   │   └── adminSecurityController.ts
    │   ├── middleware/
    │   │   ├── authMiddleware.ts
    │   │   ├── errorMiddleware.ts
    │   │   ├── securityMiddleware.ts
    │   │   └── validationMiddleware.ts
    │   ├── models/
    │   │   ├── User.ts
    │   │   ├── Task.ts
    │   │   ├── BlacklistedToken.ts
    │   │   └── SecurityEvent.ts
    │   ├── routes/
    │   │   ├── authRoutes.ts
    │   │   ├── taskRoutes.ts
    │   │   └── adminRoutes.ts
    │   ├── services/
    │   │   └── SecurityService.ts
    │   ├── types/
    │   └── utils/
    ├── tsconfig.json
    ├── .eslintrc.json
    └── .prettierrc
```

---

## 4. Development Setup

### Voraussetzungen

- **Node.js** 18 oder neuer (`node -v`)
- **npm** (kommt mit Node)
- **Git**
- **MongoDB** — entweder lokal installiert (`mongodb://localhost:27017`) oder ein **MongoDB-Atlas**-Cluster. Details in `MONGODB_SETUP.md`.

### Initiales Setup

```bash
git clone https://github.com/Alpsahin60/devtask-manager.git
cd devtask-manager

# Dependencies für Root, Frontend und Backend installieren
npm run install:all
```

### Environment Variables

Beide Sub-Projekte brauchen eigene `.env`-Files. Es gibt jeweils ein `.env.example` als Template — kopieren und ausfüllen:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**`backend/.env` — erwartete Variablen:**

| Variable | Zweck |
|---|---|
| `MONGODB_URI` | Connection-String (Atlas oder `mongodb://localhost:27017/devtask-manager`) |
| `JWT_SECRET` | Secret für Access-Token-Signatur |
| `JWT_REFRESH_SECRET` | Secret für Refresh-Token-Signatur (muss separat sein) |
| `COOKIE_SECRET` | Secret für signierte Cookies |
| `NODE_ENV` | `development` / `production` |
| `PORT` | API-Port, default `5000` |
| `FRONTEND_URL` | Origin für CORS-Whitelist, lokal `http://localhost:3000` |

**`frontend/.env.local` — erwartete Variablen:**

| Variable | Zweck |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base-URL der API, lokal `http://localhost:5000/api` |

`.env`-Files sind via `.gitignore` ausgeschlossen — niemals committen. Secrets nicht in Code, Tests oder Commit-Messages einfügen.

### Befehle (vom Repo-Root)

```bash
# Entwicklung
npm run dev              # startet Frontend + Backend parallel
npm run dev:frontend     # nur Frontend (Port 3000)
npm run dev:backend      # nur Backend (Port 5000)

# Build
npm run build            # Frontend + Backend
npm run build:frontend
npm run build:backend

# Quality Gates
npm run lint             # ESLint für beide
npm run lint:frontend
npm run lint:backend
npm run format:backend   # Prettier --write für Backend
npm run type-check       # tsc --noEmit für beide

# Datenbank-Smoke-Test
npm run test:db          # verifiziert MongoDB-Connection

# Aufräumen
npm run clean            # entfernt node_modules + Build-Artefakte
```

### Lokale URLs

- Frontend: `http://localhost:3000`
- Backend-API: `http://localhost:5000/api`
- Health-Check: `http://localhost:5000/api/health`

---

## 5. Coding Conventions

### Sprache & Stil

- **UI-Texte und Dokumentation:** Schweizer Hochdeutsch (kein Schweizerdeutsch, kein "ß").
- **Code, Identifier, JSDoc-Kommentare:** Englisch — das ist Industrie-Standard und hält den Code portabel.
- **Commit-Messages:** Englisch (siehe unten).
- **Code-Kommentare:** sparsam einsetzen. Erklären, **warum** etwas so ist (nicht-offensichtliche Constraints, Workarounds, Invarianten) — nicht **was** der Code tut. Gut benannte Identifier ersetzen die meisten Kommentare.

### TypeScript

- **Strict-Mode an** (siehe `tsconfig.json` in beiden Sub-Projekten).
- `any` nur mit explizitem Grund-Kommentar. Bevorzugt `unknown` mit Type-Guard.
- Public Interfaces (Models, API-Payloads) bekommen explizite Types — kein Inference-Spaghetti an System-Grenzen.

### Linter & Formatter

- **ESLint** ist im Frontend (`eslint-config-next`) und Backend (`@typescript-eslint`) konfiguriert. Vor jedem Commit lokal `npm run lint` laufen lassen.
- **Prettier** im Backend (`backend/.prettierrc`). Frontend nutzt den eingebauten Next-Formatter über ESLint-Regeln.

### Naming

| Element | Konvention |
|---|---|
| Variablen, Funktionen | `camelCase` |
| Components, Models, Types, Interfaces | `PascalCase` |
| Konstanten (echte Constants) | `SCREAMING_SNAKE_CASE` |
| Files (Components) | `PascalCase.tsx` |
| Files (sonstige TS-Module) | `camelCase.ts` |
| Mongoose-Models | Singular (`User`, `Task`) |
| API-Routes | Plural-Nomen (`/tasks`, `/auth`) |

### Commit-Messages (Conventional Commits)

Format: `<type>(<scope>): <description>`

| Type | Verwendung |
|---|---|
| `feat` | Neues Feature |
| `fix` | Bugfix |
| `refactor` | Code-Restructuring ohne Behaviour-Change |
| `style` | Formatierung, Whitespace |
| `test` | Tests hinzugefügt oder angepasst |
| `docs` | Dokumentation |
| `chore` | Build, Dependencies, Configs |
| `perf` | Performance |
| `security` | Security-Fix oder -Verbesserung |

Beispiele:

```
feat(auth): add refresh-token rotation on login
fix(board): correct drop-zone detection on touch devices
security(api): tighten CSP for inline scripts
refactor(tasks): extract owner-scoped query helper
docs(readme): correct Next.js version
```

### Branch-Strategie

- **Solo-Standard:** direkt auf `main` arbeiten, kleine kohärente Commits.
- **Feature-Branch optional:** bei grösseren Umbauten (Auth-Flow-Änderung, Datenmodell-Migration) ein Branch `feat/<kurzbeschreibung>`, dann Merge oder Squash zurück auf `main`.
- Kein force-push auf `main`.

### Tool-Agnostik

Das Repo bleibt frei von editor- oder assistant-spezifischen Files (keine `*.cursor`, keine `CLAUDE.md` im Repo, keine "Co-Authored-By"-Trailer von Assistenten). Editor-Settings, die nur lokal nützlich sind, gehören in die globale Config, nicht ins Repo.

---

## 6. Workflow

### Pull statt Push

Arbeit wird in kleinen, **gezogenen** Schritten erledigt: lieber einen Task vollständig zu Ende bringen, als drei Tasks halbfertig stehen lassen. Das spiegelt die Kanban-Idee dieses Projekts auch in der Entwicklung wider.

### WIP-Limit: 2

Maximal **zwei Tasks** dürfen gleichzeitig "in progress" sein. Wenn ein dritter Task aufgenommen würde, zuerst einen bestehenden abschliessen oder bewusst zurück auf "todo" zu schieben.

### Definition of Done

Ein Task gilt erst dann als erledigt, wenn:

1. **Funktionalität läuft lokal** — manueller Smoke-Test der goldenen Pfade (z. B. Login → Task anlegen → Drag-and-Drop → Logout).
2. **`npm run lint` ist grün** auf beiden Workspaces.
3. **`npm run type-check` ist grün** auf beiden Workspaces.
4. **Keine `.env`-Files oder Secrets staged** — vor jedem `git add` kurz prüfen.
5. **Keine offenen `TODO`/`FIXME`-Kommentare** im neuen Code (entweder direkt lösen oder als Issue tracken).
6. **Doku aktualisiert**, wenn sich Setup, API-Contract oder Datenmodell geändert hat (README, DEVELOPMENT.md, dieses Dokument).
7. **Conventional-Commit-Nachricht** geschrieben.

---

## 7. Architecture Notes

### Frontend-Architektur

- **Next.js App Router** (`frontend/app/`) — Server-Components als Default, Client-Components nur dort, wo Interaktivität, State oder Browser-APIs nötig sind (alle DnD- und Form-Komponenten).
- **Route-Gruppen:** `app/(auth)` bündelt Login/Register ohne URL-Segment. `app/dashboard` enthält das geschützte Kanban-Board.
- **Route-Protection:** `frontend/middleware.ts` prüft Auth-Cookies und leitet unauthentifizierte Requests zur Login-Seite um.
- **HTTP-Layer:** `lib/api.ts` exportiert eine zentrale `axios`-Instanz mit:
  - Base-URL aus `NEXT_PUBLIC_API_URL`,
  - Request-Interceptor zum Anhängen des Access-Tokens,
  - Response-Interceptor, der bei `401` einen Refresh-Token-Roundtrip versucht und die Original-Request wiederholt.
- **State:** keine globale Library — React Context für Auth-State, lokales `useState`/`useReducer` für UI-State. Server-State (Tasks) wird beim Page-Load gefetcht und im Board-Component gehalten.
- **Styling:** Tailwind mit Dark-Mode (`class`-Strategie). Keine CSS-in-JS-Bibliothek.
- **Validation:** `react-hook-form` + `zod`-Resolver — Schemas werden mit dem Backend-Vertrag abgeglichen, sind aber separat definiert (Frontend-Schemas sind Untermengen der Backend-Schemas, weil das Frontend nur die für die UX nötigen Regeln kennt).

### Backend-Architektur

Layered-Express-Setup, bewusst klassisch gehalten:

```
HTTP-Request
    ↓
[security-middleware]  helmet, CORS, rate-limit, HTTPS-redirect
    ↓
[body-parser, cookie-parser]
    ↓
[route]                /api/auth, /api/tasks, /api/admin
    ↓
[validation-middleware]  zod-Schemas pro Endpoint
    ↓
[auth-middleware]        JWT-Verify + Blacklist-Check (für geschützte Routes)
    ↓
[controller]             Request-Handling, Response-Shaping
    ↓
[service]                Domain-Logik (z. B. SecurityService)
    ↓
[model]                  Mongoose-Operationen
    ↓
[error-middleware]       zentrale Error-Konvertierung → JSON
```

Trennlinie: **Controllers** kennen `req`/`res`, **Services** nicht. Damit bleibt Domain-Logik testbar, ohne Express zu mocken.

### Datenmodell

**`User`** (`backend/src/models/User.ts`)
- `name`, `email` (unique, lowercase), `password` (bcrypt-Hash, `select: false`)
- Security-Felder: `isLocked`, `lockedUntil`, `loginAttempts`, `lastFailedLogin`, `passwordChangedAt`
- 2FA-Stubs vorbereitet: `twoFactorSecret`, `twoFactorEnabled`, `backupCodes` (noch nicht aktiv genutzt)
- Instance-Methoden: `comparePassword`, `incLoginAttempts`, `isAccountLocked`, `resetLoginAttempts`, `unlockAccount`

**`Task`** (`backend/src/models/Task.ts`)
- `title` (1–100), `description` (≤ 500, optional)
- `status`: `todo` | `in-progress` | `done` (default `todo`)
- `priority`: `low` | `medium` | `high` (default `medium`)
- `deadline` (Date, optional)
- `owner`: `ObjectId` → `User` (required, indexed) — erzwingt Daten-Isolation pro User
- **Compound-Index** `{ owner: 1, createdAt: -1 }` für schnelle Owner-Queries
- `timestamps: true` → automatische `createdAt`/`updatedAt`

**`BlacklistedToken`** (`backend/src/models/BlacklistedToken.ts`)
- Speichert revoked Tokens (Logout, Force-Logout durch Admin)
- TTL-Index entfernt abgelaufene Einträge automatisch
- Wird in jeder JWT-Verifikation als erstes geprüft

**`SecurityEvent`** (`backend/src/models/SecurityEvent.ts`)
- Audit-Trail: Login-Success/-Failure, Registration, Account-Locks, Suspicious-Activity
- Felder: Event-Typ, User-Ref (optional), IP, User-Agent, Timestamp, freier `meta`-Block
- Indizes für schnelle Abfragen im Admin-Dashboard

### Auth-Flow

1. **Register:** `POST /api/auth/register` — zod-Validation (Komplexitätsanforderungen: 8+ Zeichen, Mix aus Gross/Klein/Zahl/Sonderzeichen), bcrypt-Hash, User-Insert.
2. **Login:** `POST /api/auth/login` — Email lookup, `comparePassword`, bei Erfolg: Access-Token (kurzlebig, JWT im Response-Body) + Refresh-Token (langlebig, **HttpOnly-Cookie** mit `SameSite=Strict`, `Secure` in Production, `Path`-Restriction). Bei Fehlversuch: `incLoginAttempts` — ab 5 Fehlern progressiver Lockout (5 min → 15 min → 30 min → 24 h).
3. **Protected Request:** Access-Token im `Authorization`-Header → `authMiddleware` verifiziert Signatur **und** prüft Blacklist → User in `req.user` verfügbar.
4. **Refresh:** `POST /api/auth/refresh` — liest Refresh-Token aus Cookie, blacklistet altes, gibt neues Access-Token aus.
5. **Logout:** `POST /api/auth/logout` — blacklisted aktuelles Access- und Refresh-Token, löscht Cookie.

### Security-Layer

- **`helmet`** mit explizit gesetzter CSP, HSTS (Production), `X-Frame-Options`, Referrer-Policy.
- **CORS** mit Origin-Whitelist aus `FRONTEND_URL`; `credentials: true` für Cookie-Auth.
- **Mehrstufiges Rate-Limiting** (`express-rate-limit`):
  - Generelle API: 100 Requests / 15 min / IP
  - Auth-Endpoints: 8 Requests / 8 min / IP
  - Password-Reset: 3 Requests / 1 h / IP
  - Aktiv nur in Production (kein Reibungsverlust in Dev).
- **Validation** mit `zod` an jedem Endpoint — sowohl Body, Query als auch Params.
- **MongoDB-Schutz:** Mongoose-Schema-Validation, keine String-Konkatenation in Queries, Schema-`enum` für kontrollierte Wertebereiche.
- **HTTPS-Enforcement** in Production via Redirect-Middleware.

---

*Letzte Aktualisierung: 2026-05-15*
