# Scrum-Modul - Phase 0: Anforderungen + Datenmodell

> Erstellt: 2026-06-02
> Bezug: Backlog #8 (Phase 0). Vorgaenger-Dokument: `scrum-module-roadmap.md`.
> Zweck: Fachliche und datenseitige Spezifikation fuer das Scrum-Modul, bevor in Phase 1 die Backend-Logik gebaut wird.

## 1. Scope dieser Phase

Phase 0 deckt das **MVP** des Scrum-Moduls ab. Die Roadmap nennt zusaetzlich Story-Points, Velocity-Tracking, Drag-and-Drop-Backlogs und Burndown-Charts - das alles ist **explizit nicht Teil dieses MVP** und kommt erst nach Phase 2.

MVP-Umfang:
- Ein Nutzer kann **Sprints anlegen, planen und abschliessen**.
- Ein Nutzer kann **Daily-Standup-Eintraege** pro Sprint-Tag erfassen (gestern / heute / Blocker).
- Die UI zeigt einen **Sprint-Countdown** (Restzeit bis Sprint-Ende).
- Am Ende des Sprints koennen **Review-Notizen** und eine **Retrospektive im Mad/Sad/Glad-Format** erfasst werden.
- Jeder Nutzer sieht ausschliesslich seine eigenen Sprints und alle daran haengenden Standup-/Retro-Eintraege (**Owner-Isolation**).

Nicht im Scope:
- Multi-User-Teams, Team-Membership-Rollen (Scrum-Master, Product-Owner, Dev).
- Story-Points-Schaetzung, Velocity-Berechnung, Burndown.
- Drag-and-Drop zwischen Product-Backlog und Sprint-Backlog (bestehende Tasks koennen per Referenz zugeordnet werden - Drag-and-Drop ist Phase 2).

## 2. User Stories + Akzeptanzkriterien

### US-1 - Sprint anlegen und planen

> Als angemeldeter Nutzer moechte ich einen neuen Sprint mit Name, Ziel, Start- und Enddatum anlegen, damit ich eine klare Zeitbox fuer meine Arbeit habe.

Akzeptanzkriterien:
- [ ] Pflichtfelder: `name` (1-100 Zeichen), `startDate`, `endDate`.
- [ ] Optionale Felder: `goal` (bis 500 Zeichen).
- [ ] `endDate` muss strikt nach `startDate` liegen.
- [ ] Sprint-Dauer darf 30 Tage nicht ueberschreiten (Schweiz-typische 2-4-Wochen-Sprints, harte Obergrenze gegen Eingabefehler).
- [ ] Initialer Status: `planned`.
- [ ] Nach Anlegen ist der Sprint in der Sprint-Liste des Nutzers sichtbar - bei anderen Nutzern nicht.
- [ ] Aenderung von `startDate` ist nur erlaubt, solange der Sprint im Status `planned` ist.

### US-2 - Sprint starten und abschliessen

> Als angemeldeter Nutzer moechte ich einen geplanten Sprint starten und am Ende abschliessen koennen, damit der Status sich von `planned` ueber `active` zu `completed` bewegt.

Akzeptanzkriterien:
- [ ] Statusuebergaenge: `planned -> active -> completed`. Zusaetzlich `planned -> cancelled` und `active -> cancelled`.
- [ ] Ein Nutzer hat zu einem Zeitpunkt **maximal einen** Sprint im Status `active` - der Versuch, einen zweiten zu starten, liefert einen 409-Konflikt.
- [ ] Abgeschlossene (`completed`) und abgebrochene (`cancelled`) Sprints sind read-only.

### US-3 - Daily Standup erfassen

> Als angemeldeter Nutzer moechte ich jeden Werktag waehrend des Sprints einen Standup-Eintrag mit "Gestern", "Heute", "Blocker" erfassen, damit ich meinen Fortschritt nachverfolgen kann.

Akzeptanzkriterien:
- [ ] Felder: `date` (Pflicht, normalisiert auf Tagesgrenze), `yesterday` (0-500 Zeichen), `today` (0-500 Zeichen), `blockers` (0-500 Zeichen).
- [ ] Standup-Eintraege sind nur fuer Sprints im Status `active` erlaubt.
- [ ] `date` muss innerhalb von `[startDate, endDate]` des referenzierten Sprints liegen.
- [ ] **Eindeutigkeit**: pro `(owner, sprintId, date)` darf es nur einen Eintrag geben - ein zweiter PUT am selben Tag aktualisiert den bestehenden Eintrag (Upsert-Semantik).
- [ ] Der Eintrag wird automatisch dem aktuell eingeloggten Nutzer als `owner` zugeordnet - clientseitig uebergebene `owner`-Werte werden ignoriert.

### US-4 - Sprint-Countdown anzeigen

> Als angemeldeter Nutzer moechte ich auf dem Dashboard sehen, wie viele Tage bis zum Sprint-Ende verbleiben, damit ich Aufwand und Prioritaeten anpassen kann.

Akzeptanzkriterien:
- [ ] Der Countdown wird nur fuer den **aktuell aktiven** Sprint angezeigt.
- [ ] Berechnung: `daysRemaining = ceil((endDate - now) / 1 Tag)`, minimum 0.
- [ ] Bei `daysRemaining <= 2` wird der Countdown visuell als "kritisch" markiert (UI-Detail Phase 2, hier nur als Anforderung dokumentiert).
- [ ] Die Berechnung erfolgt serverseitig in der UTC-Zone, damit Client-Zeitzonen die Anzeige nicht verfaelschen. (Akzeptiert: leichte Abweichungen je nach Client-TZ - Genauigkeit auf Tag genug.)
- [ ] Wenn kein aktiver Sprint existiert, ist der Countdown ausgeblendet.

### US-5 - Sprint-Review erfassen

> Als angemeldeter Nutzer moechte ich beim Abschluss eines Sprints freie Review-Notizen hinterlegen koennen, damit ich Lieferung und Feedback dokumentiere.

Akzeptanzkriterien:
- [ ] Beim Statuswechsel `active -> completed` kann (nicht muss) `reviewNotes` (0-2000 Zeichen) gesetzt werden.
- [ ] Review-Notizen sind nachtraeglich nicht editierbar (bewusste Einschraenkung gegen "Geschichtsumschreibung"). Korrekturen erfolgen ueber einen neuen Sprint oder Retro-Item.
- [ ] Im Frontend werden Review-Notizen auf der Sprint-Detail-Seite gerendert (Phase 2).

### US-6 - Retrospektive im Mad/Sad/Glad-Format

> Als angemeldeter Nutzer moechte ich am Ende eines Sprints Retro-Items in den Kategorien Mad / Sad / Glad festhalten, damit ich strukturierte Erkenntnisse mitnehme.

Akzeptanzkriterien:
- [ ] Pflichtfelder pro Item: `category` (`mad` / `sad` / `glad`), `content` (1-500 Zeichen).
- [ ] Retro-Items koennen waehrend `active` und nach `completed` erstellt werden, aber **nicht mehr aenderbar/loeschbar**, sobald der Sprint `completed` ist (lessons-learned-Integritaet).
- [ ] Pro Sprint sind beliebig viele Items pro Kategorie erlaubt.
- [ ] Listen-Ansicht gruppiert Items nach Kategorie.

### US-7 - Owner-Isolation (Querschnittsanforderung)

> Als angemeldeter Nutzer moechte ich sicher sein, dass nur ich meine Sprint-, Standup- und Retro-Daten sehen und veraendern kann.

Akzeptanzkriterien:
- [ ] Alle Lese-Endpoints filtern serverseitig mit `owner = req.user.userId`. Eine zufaellige oder geratene `sprintId`/`standupId`/`retroItemId` eines fremden Nutzers liefert **404 Not Found** (nicht 403, um Existenz nicht zu leaken).
- [ ] Alle Schreib-Endpoints (POST/PATCH/DELETE) pruefen Owner vor jeder Aenderung.
- [ ] `owner`-Feld wird beim Anlegen aus dem JWT abgeleitet, niemals aus dem Request-Body.
- [ ] Cascading bei Sprint-Loeschung: zugehoerige `StandupEntry`- und `RetroItem`-Dokumente werden mitgeloescht. (Implementierung Phase 1, hier als Anforderung dokumentiert.)

## 3. Datenmodell - Uebersicht

Drei neue Mongoose-Modelle, je mit Owner-Referenz auf `User`:

```
User (existiert) ──┬─ owns ─► Sprint ──┬─ owns ─► StandupEntry
                   │                    │
                   │                    └─ owns ─► RetroItem
                   │
                   └─ owns ─► StandupEntry (direkt, fuer Owner-Filter ohne Sprint-Lookup)
                   └─ owns ─► RetroItem    (dito)
```

Bewusste Entscheidung: `StandupEntry` und `RetroItem` halten **zusaetzlich** zum `sprintId`-Verweis auch ein eigenes `owner`-Feld. Begruendung:
- Owner-Filter laeuft direkt ueber den Index, ohne Join auf `Sprint`.
- Bei einer fremden `sprintId` greift der Owner-Filter sofort und liefert 404.
- Redundanz ist akzeptabel - der Owner aendert sich nicht.

### 3.1 Sprint

| Feld          | Typ                                              | Pflicht | Default     | Notes                            |
|---------------|--------------------------------------------------|---------|-------------|----------------------------------|
| `name`        | `string` (1-100)                                 | ja      | -           | trim                             |
| `goal`        | `string` (0-500)                                 | nein    | -           | trim                             |
| `startDate`   | `Date`                                           | ja      | -           |                                  |
| `endDate`     | `Date`                                           | ja      | -           | > `startDate`, Diff <= 30 Tage   |
| `status`      | `'planned' \| 'active' \| 'completed' \| 'cancelled'` | ja      | `'planned'` | Statusmaschine in Service-Layer  |
| `reviewNotes` | `string` (0-2000)                                | nein    | -           | nur beim Abschluss schreibbar    |
| `owner`       | `ObjectId -> User`                               | ja      | -           | indexed                          |
| `createdAt`   | `Date`                                           | auto    | -           | `timestamps: true`               |
| `updatedAt`   | `Date`                                           | auto    | -           | `timestamps: true`               |

Indexe:
- `{ owner: 1, status: 1 }` - Liste der Sprints des Nutzers nach Status.
- `{ owner: 1, startDate: -1 }` - chronologische Sprint-Liste.

### 3.2 StandupEntry

| Feld         | Typ                  | Pflicht | Notes                                                |
|--------------|----------------------|---------|------------------------------------------------------|
| `sprintId`   | `ObjectId -> Sprint` | ja      | indexed                                              |
| `owner`      | `ObjectId -> User`   | ja      | indexed (Querschnittsfilter)                         |
| `date`       | `Date`               | ja      | auf 00:00:00 UTC normalisiert (Service-Layer-Pflicht)|
| `yesterday`  | `string` (0-500)     | nein    | trim                                                 |
| `today`      | `string` (0-500)     | nein    | trim                                                 |
| `blockers`   | `string` (0-500)     | nein    | trim                                                 |
| `createdAt`  | `Date`               | auto    |                                                      |
| `updatedAt`  | `Date`               | auto    |                                                      |

Indexe:
- `{ owner: 1, sprintId: 1, date: 1 }` als **unique compound index** - garantiert "ein Standup pro Tag pro Sprint pro Nutzer".
- `{ owner: 1, date: -1 }` - juengste Standups des Nutzers (Dashboard).

### 3.3 RetroItem

| Feld         | Typ                              | Pflicht | Notes                          |
|--------------|----------------------------------|---------|--------------------------------|
| `sprintId`   | `ObjectId -> Sprint`             | ja      | indexed                        |
| `owner`      | `ObjectId -> User`               | ja      | indexed                        |
| `category`   | `'mad' \| 'sad' \| 'glad'`       | ja      | Pflicht-Enum                   |
| `content`    | `string` (1-500)                 | ja      | trim                           |
| `createdAt`  | `Date`                           | auto    |                                |
| `updatedAt`  | `Date`                           | auto    |                                |

Indexe:
- `{ owner: 1, sprintId: 1, category: 1 }` - gruppierte Retro-Ansicht.
- `{ sprintId: 1, createdAt: -1 }` - chronologische Retro-Sicht.

## 4. API-Skizze (Phase 1)

Nur als Vorschau - die finalen Routes werden in Phase 1 zusammen mit Zod-Schemas definiert.

| Methode | Pfad                                      | Zweck                                   |
|---------|-------------------------------------------|-----------------------------------------|
| GET     | `/api/sprints`                            | Liste aller eigenen Sprints (opt. `?status=`) |
| GET     | `/api/sprints/active`                     | aktueller aktiver Sprint + `daysRemaining` |
| POST    | `/api/sprints`                            | neuen Sprint anlegen (`planned`)        |
| PATCH   | `/api/sprints/:id`                        | Sprint aendern oder Status setzen       |
| DELETE  | `/api/sprints/:id`                        | Sprint loeschen (Cascade)               |
| GET     | `/api/sprints/:id/standups`               | Standups eines Sprints                  |
| PUT     | `/api/sprints/:id/standups`               | Upsert per `date`                       |
| GET     | `/api/sprints/:id/retro`                  | gruppierte Retro-Items                  |
| POST    | `/api/sprints/:id/retro`                  | Retro-Item anlegen                      |
| DELETE  | `/api/sprints/:id/retro/:itemId`          | Retro-Item loeschen (nur `active`)      |

Alle Endpoints liegen hinter dem bestehenden `authMiddleware` und nutzen `req.user.userId` als Owner-Filter.

## 5. Definition of Done - Phase 0

- [x] Spec-Dokument vorhanden mit User-Stories + Akzeptanzkriterien.
- [x] Owner-Isolation explizit als Querschnittsanforderung dokumentiert.
- [x] Drei Mongoose-Modelle (`Sprint`, `StandupEntry`, `RetroItem`) angelegt, TypeScript-Build gruen.
- [ ] (Phase 1) Zod-Schemas, Controller, Routes, Tests.

## 6. Offene Fragen fuer Phase 1

- Cascade-Delete: in Mongoose ueber `pre('deleteOne')`-Hook oder im Service-Layer? Tendenz: Service-Layer, um die Logik nahe an der Authorisierung zu halten.
- Soll der Status-Uebergang `active -> completed` automatisch erfolgen, sobald `endDate` ueberschritten ist (Cron-Job)? Vorerst: nein - Nutzer setzt manuell, das ist Teil der Scrum-Disziplin.
- Sprint-Loeschung "soft" (Flag) oder "hard"? MVP: hard - Daten gehoeren dem Nutzer, GDPR-konform.
