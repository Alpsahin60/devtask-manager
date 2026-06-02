# NPM-Audit — 2026-06-02

Lokaler `npm audit`-Lauf in beiden Workspaces. Kein `npm audit fix --force` ausgefuehrt (Leitplanke der Refactor-Session). Fixes werden separat geplant.

## Backend (`backend/`)

**Befund:** 3 moderate Vulnerabilities, alle transitiv ueber `qs`.

| Paket | Range | Schweregrad | Quelle |
|---|---|---|---|
| `qs` | 6.11.1 - 6.15.1 | moderate | GHSA-q8mj-m7cp-5q26 (DoS in `qs.stringify` mit null/undefined in comma-format Arrays + `encodeValuesOnly`) |
| `body-parser` | 1.20.3 - 1.20.4 / 2.0.0-beta.1 - 2.0.2 | moderate | abhaengig von verwundbarem `qs` |
| `express` | 4.21.0 - 4.22.1 / 5.0.0-alpha.1 - 5.0.1 | moderate | abhaengig von verwundbarem `qs` |

**Vorgeschlagener Fix von npm:** `npm audit fix` (non-breaking laut npm).

**Bewertung:**
- DoS-Vektor erfordert `qs.stringify` mit speziellem Input-Pattern. Backend nutzt `qs` nur via `express`/`body-parser`, ausschliesslich zum Parsen von Request-Bodies — nicht zum Stringifizieren. Direkter Exploit-Pfad daher nicht offensichtlich.
- Trotzdem: minor Patch-Bump auf `qs >= 6.15.2` ist non-breaking. Separater Mini-Commit (z.B. `chore(deps): bump qs to ^6.15.2`) empfohlen.

## Frontend (`frontend/`)

**Befund:** 2 moderate Vulnerabilities, transitiv ueber `postcss` in `next`.

| Paket | Range | Schweregrad | Quelle |
|---|---|---|---|
| `postcss` | < 8.5.10 | moderate | GHSA-qx2v-qp2m-jg93 (XSS via unescaped `</style>` im CSS-Stringify-Output) |
| `next` | 9.3.4-canary.0 - 16.3.0-canary.5 | moderate | nutzt verwundbares `postcss` intern |

**Vorgeschlagener Fix von npm:** `npm audit fix --force` — wuerde `next` auf 9.3.3 **downgraden**. Breaking Change, nicht akzeptabel.

**Bewertung:**
- Aktuelle Next-Version: `^16.2.6`. Das Advisory schliesst `next` 9.3.4 bis 16.3.0-canary.5 ein, weil die fix-PR im Upstream-Canary haengt.
- Korrekter Fix: warten auf Next 16.3.0 stable bzw. Vercel-Patch und dann `npm update next`.
- XSS-Vektor: nur ausnutzbar, wenn user-kontrollierter CSS-Inhalt durch PostCSS-Stringify in eine `<style>`-Bloc gelangt. Aktuell kein User-CSS in der Pipeline → praktisches Risiko gering.

## Empfohlene Folge-Aktionen (separater Commit, nicht Teil dieses Refactors)

1. **Backend**: `cd backend && npm audit fix` (non-breaking) — schliesst alle 3 Findings.
2. **Frontend**: Watching-Position. Sobald Next 16.3.x stable: `cd frontend && npm update next`.
