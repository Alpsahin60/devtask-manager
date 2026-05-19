# Backend Deployment-Options — DevTask Manager

> Erstellt: 2026-05-19
> Stack: Node.js + Express 4 + Mongoose 8 + MongoDB Atlas
> Zweck: Vergleich der drei kuratierten Hosting-Optionen fuer den Backend-Service, plus Empfehlung. **Kein aktives Deployment** — User-Konten und Env-Vars sind separat zu konfigurieren.

## Aktueller Zustand

- `.env.example` vorhanden mit allen relevanten Vars (`PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLIENT_URL`)
- **Keine Deployment-Configs** vorhanden: kein `Procfile`, kein `railway.json`, kein `vercel.json`, kein `render.yaml`
- Build-Skript funktioniert: `npm run build` → `tsc` → `dist/index.js`
- Start-Skript: `npm start` → `node dist/index.js`

Das Backend ist also stack-seitig deployment-ready, braucht aber einen Host und (optional) eine Hosting-Config-Datei.

## Vergleich der Optionen

### 1. Render.com (Free Tier)

| Kriterium | Wert |
|---|---|
| **Kosten** | Free: 750h/Monat Compute (1 Web Service in einer Region 24/7 = 720h, passt knapp) |
| **Cold Start** | **30-60 Sekunden** nach 15min Idle (Killer fuer Recruiter-Demos) |
| **MongoDB** | Externes Atlas (Free M0 Cluster) |
| **Config-File** | `render.yaml` optional, alles ueber Web-UI moeglich |
| **Deploy-Trigger** | Auto bei `git push origin main` |
| **HTTPS** | Auto via Let's Encrypt |
| **Logs** | 7-Tage-Retention im Free Tier |
| **Build-Time** | unbegrenzt aber langsam (vCPU geteilt) |

**Pro**: Komplett kostenlos, GitHub-Integration trivial, eingebaute HTTPS.

**Contra**: Cold-Start ist die Hauptlimitierung. Demo-Link kann fuer den ersten Klick eines Recruiters 30-60s laden — viele Recruiter brechen vorher ab.

**Sample `render.yaml`**:
```yaml
services:
  - type: web
    name: devtask-manager-backend
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: CLIENT_URL
        sync: false
```

### 2. Railway.app

| Kriterium | Wert |
|---|---|
| **Kosten** | $5 USD/Monat Hobby-Plan (kein Free Tier mehr seit 2023, $5 ist quasi unvermeidbar) |
| **Cold Start** | **kein Cold Start** (Service bleibt warm) |
| **MongoDB** | Eingebaute MongoDB-Plugin oder externes Atlas |
| **Config-File** | `railway.json` optional |
| **Deploy-Trigger** | Auto bei `git push origin main` |
| **HTTPS** | Auto |
| **Logs** | Live-Streaming im Dashboard |
| **Build-Time** | schnell (dedicated vCPU) |

**Pro**: Kein Cold-Start, schneller Build, integrierte DB-Add-Ons (kein separates Atlas noetig wenn man will).

**Contra**: kostet $5/Monat (Hobby-Plan), das laeppert sich bei mehreren Side-Projects.

**Sample `railway.json`**:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. Fly.io (Free Tier mit Limits)

| Kriterium | Wert |
|---|---|
| **Kosten** | Free Tier: bis zu 3 shared-cpu-1x VMs mit je 256MB RAM, 3GB persistent storage. Genug fuer DevTask. |
| **Cold Start** | **kein Cold Start** wenn 1 VM 24/7 laueft (eats Free-Quota, aber moeglich) |
| **MongoDB** | Externes Atlas (Fly hat kein Managed-MongoDB) |
| **Config-File** | **`fly.toml` mandatory** (CLI generiert es: `fly launch`) |
| **Deploy-Trigger** | Nicht auto via Git — `flyctl deploy` muss laufen (manuell oder via GitHub Actions) |
| **HTTPS** | Auto via certificates |
| **Logs** | `flyctl logs` CLI, 24h-Retention |
| **Build-Time** | schnell (Docker-basiert) |

**Pro**: Kostenlos bei korrektem Sizing, kein Cold-Start, weltweite Edge-Regions.

**Contra**: `fly.toml` + Docker-Setup ist Lernkurve. Kein Push-Auto-Deploy ohne extra CI-Setup.

**Sample `fly.toml`**:
```toml
app = "devtask-manager-backend"
primary_region = "fra"

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["paketobuildpacks/nodejs"]

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 5000
```

## Empfehlung

### Fuer Bewerbungs-Demos (jetzt): **Railway.app** ($5/Monat)

**Begruendung**:
- Kein Cold-Start ist der entscheidende Faktor. Ein Recruiter klickt nicht 60 Sekunden auf einen "loading"-Spinner — er ist weg.
- $5/Monat ist trivial im Verhaeltnis zu einer Bewerbung. Pro Monat eine Bewerbung amortisiert das hundertfach.
- Git-Push-Auto-Deploy ist Standard, kein zusaetzlicher CI-Code noetig.

### Fuer langfristige Eigennutzung (in 6+ Monaten): **Fly.io**

**Begruendung**:
- Wenn du dich mit Docker + IaC anfreundest: dauerhaft kostenlos, mehr Kontrolle, Edge-Regions.
- Lehrwert: Docker, fly.toml, GitHub Actions sind transferierbare Skills.
- Risiko: 1-2 Tage initialer Setup-Aufwand.

### Nicht empfohlen (fuer dieses Backend): **Render.com**

**Begruendung**:
- Cold-Start killt Demo-Erfahrung
- Free-Tier ist verlockend, aber Recruiter-Klick-Konversion ist wichtiger als $5 sparen

## Naechste Schritte (Backlog, nicht jetzt)

1. **MongoDB Atlas Free M0 Cluster** anlegen (https://www.mongodb.com/cloud/atlas/register) und Connection-String in eine sichere Quelle (PowerShell-Profile, Bitwarden, etc.) ablegen.
2. **Railway-Account** mit GitHub-OAuth-Login. Repo `Alpsahin60/devtask-manager` verbinden. Env-Vars im Railway-Dashboard setzen (NICHT in Git).
3. **`railway.json`** im Backend-Root anlegen mit obigem Sample.
4. **Live-Test**: 1 Test-User registrieren, 1 Task anlegen, im Demo-Mode dann mit Showcase-Account ersetzen (siehe `demo-mode-spec.md` — separates Item).
5. **CORS-Whitelist** anpassen: `CLIENT_URL` auf den Vercel-Frontend-URL setzen (frontend deployt auf Vercel, backend auf Railway → unterschiedliche Origins).

## Kostentabelle (Jahres-Hochrechnung)

| Option | $/Monat | $/Jahr | Setup-Stunden | Wartung |
|---|---|---|---|---|
| Render Free | 0 | 0 | 1-2 | gering, aber Cold-Start-Notice fuer Recruiter |
| Railway Hobby | 5 | 60 | 1-2 | minimal |
| Fly.io (Free, korrekt gesized) | 0 | 0 | 4-8 | mittel (Docker, CI) |

Bei einer einzigen erfolgreichen Bewerbung mit $5k+ Salary-Differenz amortisiert Railway sich in unter einer Stunde.
