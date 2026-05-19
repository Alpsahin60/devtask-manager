# Scrum-Modul — Roadmap & Refinement-Vorbereitung

> Erstellt: 2026-05-19
> Bezug: devtask-manager Backlog #8 (Phase 0 — Anforderungen + Datenmodell), #9 (Phase 1 — Backend Schema + APIs), #10 (Phase 2 — Frontend UI + State)
> Zweck: Roadmap-Skizze und Empfehlung zur Zerlegung in S/M-Tasks. **Kein Sprint-Coding** — diese drei Items sind XL und brauchen Refinement.

## Big Picture

Das **Scrum-Modul** ist eine Erweiterung des bestehenden Kanban-Boards um Scrum-spezifische Konzepte:
- **Sprints** mit Start-/End-Datum
- **Sprint-Backlog** vs. **Product-Backlog**
- **Story-Points** + **Velocity-Tracking**
- **Sprint-Reviews** + **Retrospektiven** (mind. Notiz-Funktion)

Das ist eine **substanzielle Erweiterung** — ein Modul, kein Feature. Erfahrungswert: 2-4 Sprints (3-6 Wochen).

## Phasen-Aufteilung pro Item

### Phase 0 (#8) — Anforderungen + Datenmodell

**Was es ist**: Discovery + Spec, kein Code.

**Inhalt**:
- User-Stories sammeln (mind. 5: "Als PO will ich…", "Als Dev will ich…", "Als SM will ich…")
- Datenmodell skizzieren (`Sprint`, `Story`, `Estimation`, `Retrospective` als Mongoose-Schemas)
- Beziehungen zu bestehenden Models (`Task`, `User`) klaeren
- API-Skizze: welche Endpoints (REST oder GraphQL?), welche Permissions
- Wireframes (Excalidraw oder paper) fuer die wichtigsten Screens

**Aufwand-Schaetzung**: 5-8h, Solo
**Definition of Done Phase 0**: 1 Markdown-File `scrum-module-spec.md` mit User-Stories, ERD, API-Liste, Wireframe-Links

### Phase 1 (#9) — Backend Schema + APIs

**Was es ist**: Implementation der Backend-Seite.

**Inhalt**:
- Mongoose-Schemas: `Sprint`, `Story`, `StoryEstimate`, `Retrospective`
- Migration-Skript (falls Bestandsdaten zu migrieren)
- API-Routes: `/api/sprints` (CRUD), `/api/sprints/:id/stories` (CRUD), `/api/sprints/:id/retro` (CRUD)
- Zod-Schemas in `schemas/scrumSchemas.ts` (Single-Source-of-Truth-Pattern, siehe validation-refactor-plan.md)
- Authorization-Middleware: nur Sprint-Members koennen Sprint-Daten sehen/aendern
- Velocity-Endpoint: `GET /api/teams/:id/velocity` mit Berechnung (sum(story.points) / sprint.length)
- Tests: Integration-Tests mind. fuer CRUD + Velocity-Berechnung

**Aufwand-Schaetzung**: 15-20h, in mehreren Sub-Tasks
**Definition of Done Phase 1**: alle Endpoints in Postman-Collection testbar, 80%+ Test-Coverage auf neuen Files

### Phase 2 (#10) — Frontend UI + State

**Was es ist**: Implementation der Frontend-Seite.

**Inhalt**:
- Neue Pages: `/sprints` (Liste), `/sprints/[id]` (Sprint-Detail mit Backlog), `/sprints/[id]/retro` (Retrospective-Board)
- State-Management: Zustand oder React Query (`/sprints` ist server-state — React Query passt besser)
- Komponenten: `SprintCard`, `StoryItem`, `EstimationInput`, `RetroNote`, `VelocityChart` (recharts oder D3?)
- Drag-and-Drop fuer Sprint-Backlog ↔ Product-Backlog (`@dnd-kit` ist bereits installiert)
- Form-Validation: Re-use Zod-Schemas via `@hookform/resolvers/zod`
- Mobile-Responsive: Sprint-Detail muss auf Tablet funktionieren
- Empty-States, Loading-States, Error-States

**Aufwand-Schaetzung**: 20-25h, in mehreren Sub-Tasks
**Definition of Done Phase 2**: 1 Sprint kann komplett im UI durchgespielt werden (anlegen, Stories adden, schaetzen, ziehen, abschliessen, Retro schreiben)

## Empfehlung zur Item-Zerlegung in S/M-Tasks

### Phase 0 (#8) als Single-Task belassen oder in 2 zerlegen

Option A — Single S-Task:
- **#8a**: Scrum-Modul Spec mit User-Stories, ERD, API-Liste

Option B — 2 S-Tasks:
- **#8a**: User-Stories + grobe Akzeptanzkriterien sammeln (2h)
- **#8b**: Datenmodell + API-Skizze + Wireframes (4h)

**Empfehlung**: Option A. Spec-Arbeit hat viel implizite Iteration, harte Trennung waere kuenstlich.

### Phase 1 (#9) in 4 M-Tasks zerlegen

- **#9a**: Mongoose-Schemas + Indexes anlegen (3h)
- **#9b**: API-Routes + Controllers fuer Sprint-CRUD + Story-CRUD (5h)
- **#9c**: Retrospective-API + Velocity-Endpoint (4h)
- **#9d**: Integration-Tests + Postman-Collection (4h)

**Empfehlung**: Diese Zerlegung. Jedes Sub-Item ist atomic, hat klares Done-Kriterium, kann unabhaengig committed werden.

### Phase 2 (#10) in 5 M-Tasks zerlegen

- **#10a**: Sprint-Liste-Page mit React Query Hook (4h)
- **#10b**: Sprint-Detail-Page mit Drag-and-Drop fuer Stories (6h)
- **#10c**: Estimation-Input + Story-Edit-Modal (4h)
- **#10d**: Retro-Board (was-good / was-bad / improve, sticky-note-style) (4h)
- **#10e**: Velocity-Chart + Empty-/Loading-/Error-States polish (4h)

**Empfehlung**: Diese Zerlegung. **#10b ist das risikoreichste Sub-Item** — Drag-and-Drop mit zwei Listen ist fummelig.

## Reihenfolge & Dependencies

```
#8 (Phase 0 Spec)
    │
    ▼
#9a (Schemas) ──► #9b (Sprint+Story API) ──► #9c (Retro+Velocity) ──► #9d (Tests)
                                                                          │
                                                                          ▼
#10a (Sprint-Liste) ──► #10b (Sprint-Detail+DnD) ──► #10c (Estimation) ──► #10d (Retro) ──► #10e (Polish)
```

Phase 1 muss vor Phase 2 anfangen. Aber: **#10a kann starten, sobald #9a + #9b done sind** — Frontend-Listing braucht nur GET-Endpoints. Erlaubt parallele Entwicklung.

## Sprint-Verteilung (Vorschlag)

| Sprint | Items | Geschaetzter Aufwand |
|---|---|---|
| Sprint **001** (current) | weiter wie geplant, kein Scrum-Modul | — |
| Sprint **002** | #8 (Phase 0 Spec komplett) + Demo-Mode (#7 spec) | 8h Spec + 13h Demo-Mode = 21h |
| Sprint **003** | #9a + #9b (Backend Schemas + Sprint/Story API) | ~10h |
| Sprint **004** | #9c + #9d + #10a (Retro/Velocity API + Tests + Sprint-Liste UI) | ~12h |
| Sprint **005** | #10b + #10c (Sprint-Detail + Estimation UI) | ~10h |
| Sprint **006** | #10d + #10e (Retro UI + Polish) | ~8h |

**Total fuer Scrum-Modul ueber 5 Sprints (002-006)**: ~50h. Realistisch ueber 5-10 Wochen, je nach paralleler Bewerbungs-/Schul-Last.

## Risiken

| Risiko | Mitigation |
|---|---|
| Spec wird zu ambitioniert (z.B. Story-Mapping, Burndown-Charts, Multi-Team) | Spec auf MVP begrenzen: 1 Team, 1 Sprint zur Zeit, kein Burndown |
| Drag-and-Drop zwischen zwei Listen ist fummelig | Eigene Spike-Task einplanen: #10b zuerst nur DnD-Spike (2h), dann Production-Code |
| Mongoose-Schemas sind nicht final → Migration-Pain | Spec-Review mit "was, wenn morgen Multi-Team noetig waere?"-Question, Schema entsprechend offen halten |
| Frontend-State-Sync zwischen Sprint-Liste und Sprint-Detail | React Query QueryKey-Invalidation klar definieren, dokumentieren |

## Naechster Schritt

Im naechsten Refinement (Sprint 001 Wochenende oder Sprint 002 Start):

1. Diese Roadmap durchgehen, Phase-0-Aufwand re-validieren.
2. Item #8 als kommittetes Sprint-002-Item ziehen, mit Definition-of-Done "Spec-File reviewed + akzeptiert".
3. Items #9 und #10 in die obigen Sub-Tasks aufteilen (im GitHub Project anlegen) — nicht jetzt, sondern nach #8 Done.

**Dieser File ist Refinement-Vorbereitung, kein Sprint-Coding.**
