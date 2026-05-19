# Future-Items — Bewusst auf Eis gelegt

> Erstellt: 2026-05-19
> Zweck: Backlog-Items, die mit Label `[Future]` markiert sind und **nicht jetzt** angegangen werden. Statt sie zu vergessen, hier dokumentieren — mit Begruendung warum sie warten.

## Aktuell auf Eis

### devtask-manager #11 [Future] Monitoring Service Integration

**Was es waere**: Integration eines Application-Monitoring-Services (z.B. Sentry, Datadog APM, New Relic, oder Open-Source: Grafana + Prometheus). Ziel: produktive Fehler, Latenz und Resource-Usage zentral sichtbar.

**Warum nicht jetzt — Premature Optimization**:

1. **Kein Production-Traffic**: Die App ist aktuell nicht deployed (siehe `backend/docs/deployment-options.md`). Monitoring eines Services, der noch keine Nutzer hat, misst Hintergrundrauschen. Faustregel (Site Reliability Engineering): erst messen, was es zu messen gibt.

2. **Toolwahl haengt von Hosting-Entscheid ab**: Vercel hat eingebautes Observability (Logs + Speed Insights). Railway hat eingebaute Logs. Fly.io braucht externes Monitoring. Solange das Hosting-Setup nicht steht, ist die Tool-Entscheidung verfrueht.

3. **Kosten-Risiko**: APM-Tools wie Datadog rechnen pro Host. Bei einem Side-Project kann eine Karteileiche schnell 50-100 USD/Monat kosten. Sentry hat einen Free Tier (5k Errors/Monat), aber erst sinnvoll wenn Errors entstehen.

4. **Lehrwert-Kosten-Verhaeltnis ist niedrig**: Monitoring-Integration ist 80% Boilerplate (SDK installieren, Env-Var setzen, Sentry.init in index.ts). Wenig differenzierter Skill-Gain pro Stunde.

5. **Bessere Investitionen jetzt**: Demo-Modus (#7), Scrum-Modul (#8/#9/#10), Backend-Deployment selbst sind alle mit hoeherem ROI fuer das Portfolio.

**Wann es relevant wird**:
- Sobald die App **deployed** ist und mind. ein realer Nutzer (auch nur Test-Recruiter) Traffic erzeugt.
- Sobald **erste Fehler** in Production auftreten, die ohne Stacktrace nicht reproduzierbar sind.
- Sobald **Performance-Klagen** auftreten (Latenz > 500ms, Cold-Starts > 3s).

**Empfohlene Tool-Reihenfolge wenn Zeit gekommen ist**:
1. **Sentry Free Tier** fuer Error-Tracking (Frontend + Backend) — 1h Setup, sofort ROI.
2. **Vercel/Railway eingebautes Logging** fuer Request-Logs — 0h, einfach Dashboard anklicken.
3. **Spaeter, falls Traffic > 100 RPS**: APM mit Open-Source-Stack (Grafana + Prometheus + Loki). Selber zusammenbauen, lerne entsprechende Skills.

## Triage-Regel fuer kuenftige [Future]-Items

Wenn ein Item das Label `[Future]` traegt, gilt:

| Frage | Wenn Antwort = Ja | Wenn Antwort = Nein |
|---|---|---|
| Ist es **technisch jetzt machbar**? | weiter zur naechsten Frage | warten + Begruendung hier |
| Bringt es **messbaren Recruiter-Wert**? (Portfolio-Karte staerker, Skill-Signal klarer, Code-Review-Highlight) | weiter zur naechsten Frage | warten + Begruendung hier |
| Ist die **Voraussetzung** erfuellt? (z.B. Live-Deployment fuer Monitoring) | jetzt angehen, Label entfernen | warten + Begruendung hier |
| Ist der **Aufwand verhaeltnismaessig**? (Stunden pro Recruiter-Signal-Punkt) | jetzt angehen, Label entfernen | warten + Begruendung hier |

Wenn 4x Ja: Label entfernen, in naechsten Sprint ziehen. Wenn ein Nein: hier dokumentieren, nicht vergessen.

## Naechster Review

Dieser File sollte **alle 2 Sprints** (also ca. monatlich) durchgegangen werden:
- Ist die Begruendung "Premature Optimization" noch wahr?
- Hat sich die Voraussetzung erfuellt?
- Falls ja: Item zurueck in Sprint-Refinement holen.

Sonst: einfach hier liegen lassen. Backlog-Hygiene ist wichtiger als Item-Volumen.
