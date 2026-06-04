import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Sprint } from '../models/Sprint';
import { StandupEntry } from '../models/StandupEntry';
import { RetroItem } from '../models/RetroItem';

// Idempotent seed for the recruiter-facing showcase account. Running the
// script repeatedly is safe — the demo user is upserted by email, and the
// owned data is wiped and re-inserted in one pass so the demo always starts
// in the same shape. Other users are never touched (owner-isolation).
//
// Usage (from backend/):
//   npm run seed:demo
//
// Env overrides:
//   DEMO_USER_EMAIL     default: demo@devtask-manager.app
//   DEMO_USER_NAME      default: Demo User
//   DEMO_USER_PASSWORD  default: DemoShowcase2026!

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@devtask-manager.app';
const DEMO_NAME = process.env.DEMO_USER_NAME ?? 'Demo User';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'DemoShowcase2026!';

const MS_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_DAY);

interface SeedDemoOptions {
  manageConnection?: boolean;
}

interface SeedDemoResult {
  userId: string;
  tasksCreated: number;
  sprintsCreated: number;
  standupsCreated: number;
  retroItemsCreated: number;
}

// ─── Demo data shape ──────────────────────────────────────────────────────────

const buildTasks = (ownerId: Types.ObjectId) => [
  {
    title: 'Login-Flow ueberarbeiten',
    description: 'Refresh-Token in httpOnly-Cookie verschieben, accessToken im Memory halten.',
    status: 'done',
    priority: 'high',
    owner: ownerId,
  },
  {
    title: 'Kanban-Board mit Drag & Drop',
    description: 'dnd-kit fuer To-Do / In-Progress / Done, optimistic updates.',
    status: 'done',
    priority: 'high',
    owner: ownerId,
  },
  {
    title: 'Scrum-Modul: Sprint anlegen, Status-Maschine',
    description: 'planned -> active -> completed, ein aktiver Sprint pro Nutzer.',
    status: 'in-progress',
    priority: 'high',
    owner: ownerId,
  },
  {
    title: 'Daily-Standup-Ansicht',
    description: 'Gestern / Heute / Blocker pro Sprint-Tag, Upsert-Semantik.',
    status: 'in-progress',
    priority: 'medium',
    owner: ownerId,
  },
  {
    title: 'Retro-Board Mad / Sad / Glad',
    description: 'Drei Spalten, Items pro Sprint, Read-only nach completed.',
    status: 'todo',
    priority: 'medium',
    owner: ownerId,
  },
  {
    title: 'Lighthouse-Audit der Landing-Page',
    description: 'Mobile + Desktop ueber 90, Core Web Vitals dokumentieren.',
    status: 'todo',
    priority: 'low',
    owner: ownerId,
  },
  {
    title: 'OpenAPI-Doku aus Zod-Schemas generieren',
    description: 'Zod -> OpenAPI ueber zod-to-openapi, Swagger-UI unter /api/docs.',
    status: 'todo',
    priority: 'medium',
    owner: ownerId,
  },
  {
    title: 'Bug: Toast-Hook hat Memo-Probleme',
    description: 'useToast triggert react-hooks/preserve-manual-memoization Warnings.',
    status: 'todo',
    priority: 'low',
    owner: ownerId,
  },
];

const seedSprintData = async (ownerId: Types.ObjectId) => {
  // Anchor sprints around today so the active countdown reads naturally.
  const today = startOfUtcDay(new Date());

  // Completed sprint: 14 days that already wrapped up two weeks ago.
  const completedStart = addDays(today, -28);
  const completedEnd = addDays(today, -15);

  const [completedSprint] = await Sprint.create([
    {
      name: 'Sprint 7 — Auth Hardening',
      goal: 'JWT-Refresh-Flow stabilisieren, Login-Brute-Force absichern, Audit-Log live.',
      startDate: completedStart,
      endDate: completedEnd,
      status: 'completed',
      reviewNotes:
        'Lieferung wie geplant: Refresh-Cookie, Lock-Mechanismus, Security-Dashboard. Feedback aus dem Review: Demo-Konto wuerde Recruiter-Onboarding stark vereinfachen.',
      owner: ownerId,
    },
  ]);

  // Active sprint: started 4 days ago, running for 14 days total.
  const activeStart = addDays(today, -4);
  const activeEnd = addDays(today, 10);

  const [activeSprint] = await Sprint.create([
    {
      name: 'Sprint 8 — Scrum-Modul + Demo',
      goal: 'Scrum-MVP (Sprint, Standup, Retro) und seeded Demo-Account fuer Bewerbungs-Showcases.',
      startDate: activeStart,
      endDate: activeEnd,
      status: 'active',
      owner: ownerId,
    },
  ]);

  // Three standups across the active sprint so the timeline looks lived-in.
  const standupDays = [-3, -2, -1].map((offset) => addDays(today, offset));
  const standupsCreated = await StandupEntry.insertMany([
    {
      sprintId: activeSprint._id,
      owner: ownerId,
      date: standupDays[0],
      yesterday: 'Phase 0 Spec abgenommen, Mongoose-Modelle (Sprint / Standup / Retro) angelegt.',
      today: 'Zod-Schemas + Service-Layer mit Statusmaschine schreiben.',
      blockers: 'Keine.',
    },
    {
      sprintId: activeSprint._id,
      owner: ownerId,
      date: standupDays[1],
      yesterday: 'Service-Layer + Controller + Routes fertig, Owner-Isolation per Test belegt.',
      today: 'Frontend-Hooks und UI-Komponenten fuer Scrum-Modul.',
      blockers: 'next lint in Next 16 — eslint flat config migrieren.',
    },
    {
      sprintId: activeSprint._id,
      owner: ownerId,
      date: standupDays[2],
      yesterday: 'Sprint-Detailseite mit Countdown, Standup-Section, Retro-Board.',
      today: 'Demo-Modus: Seed-Skript, requireNotDemo-Middleware, Demo-Login-Button.',
      blockers: 'Keine.',
    },
  ]);

  // Retro items for the completed sprint — read-only by design.
  const completedRetro = await RetroItem.insertMany([
    {
      sprintId: completedSprint._id,
      owner: ownerId,
      category: 'glad',
      content: 'Refresh-Token-Flow fuehlt sich endlich solide an.',
    },
    {
      sprintId: completedSprint._id,
      owner: ownerId,
      category: 'glad',
      content: 'Security-Dashboard war schneller fertig als gedacht.',
    },
    {
      sprintId: completedSprint._id,
      owner: ownerId,
      category: 'sad',
      content: 'Account-Lock-UX braucht eine klarere Fehlermeldung.',
    },
    {
      sprintId: completedSprint._id,
      owner: ownerId,
      category: 'mad',
      content: 'Sleep-Schulden — zu viel Abend-Coding kurz vor Reviews.',
    },
  ]);

  // Retro for the active sprint — fresher entries, still editable.
  const activeRetro = await RetroItem.insertMany([
    {
      sprintId: activeSprint._id,
      owner: ownerId,
      category: 'glad',
      content: 'Test-Setup mit mongodb-memory-server liefert echte Integrationstests.',
    },
    {
      sprintId: activeSprint._id,
      owner: ownerId,
      category: 'sad',
      content: 'Lint-Migration auf eslint 9 hat unerwartet Zeit gefressen.',
    },
  ]);

  return {
    sprintsCreated: 2,
    standupsCreated: standupsCreated.length,
    retroItemsCreated: completedRetro.length + activeRetro.length,
  };
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const seedDemo = async (
  options: SeedDemoOptions = {}
): Promise<SeedDemoResult> => {
  const manageConnection = options.manageConnection ?? false;

  if (manageConnection) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(uri);
  }

  // Upsert the demo user. We avoid findOneAndUpdate for the create path so
  // the pre-save password hash hook runs reliably. If the user already
  // exists, the password is left as-is — recreating it would invalidate any
  // open demo session and is not part of an idempotent reset.
  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) {
    demoUser = await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      isDemo: true,
    });
  } else if (!demoUser.isDemo) {
    // Recover the isDemo flag in case an older revision created the user
    // without it. Owner-isolation is unaffected because the email is unique.
    demoUser.isDemo = true;
    await demoUser.save();
  }

  const ownerId = demoUser._id;

  // Wipe the demo-owned dataset. Owner-isolation: we filter by the demo
  // user id so no other user's data is touched, ever.
  await Promise.all([
    Task.deleteMany({ owner: ownerId }),
    StandupEntry.deleteMany({ owner: ownerId }),
    RetroItem.deleteMany({ owner: ownerId }),
    Sprint.deleteMany({ owner: ownerId }),
  ]);

  // Re-insert in deterministic order.
  const tasks = buildTasks(ownerId);
  await Task.insertMany(tasks);
  const sprintResult = await seedSprintData(ownerId);

  const result: SeedDemoResult = {
    userId: ownerId.toString(),
    tasksCreated: tasks.length,
    sprintsCreated: sprintResult.sprintsCreated,
    standupsCreated: sprintResult.standupsCreated,
    retroItemsCreated: sprintResult.retroItemsCreated,
  };

  if (manageConnection) {
    await mongoose.disconnect();
  }
  return result;
};

// CLI entry: `npm run seed:demo`
const isMain = require.main === module;
if (isMain) {
  seedDemo({ manageConnection: true })
    .then((res) => {
      console.log('✅ Demo seed complete');
      console.log(`   user:           ${DEMO_EMAIL}`);
      console.log(`   tasks:          ${res.tasksCreated}`);
      console.log(`   sprints:        ${res.sprintsCreated}`);
      console.log(`   standups:       ${res.standupsCreated}`);
      console.log(`   retro items:    ${res.retroItemsCreated}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Demo seed failed:', err);
      process.exit(1);
    });
}
