import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testApp';
import { createTestUser, inDays } from './helpers';
import { User } from '../src/models/User';
import { Task } from '../src/models/Task';
import { Sprint } from '../src/models/Sprint';
import { StandupEntry } from '../src/models/StandupEntry';
import { RetroItem } from '../src/models/RetroItem';
import { seedDemo } from '../src/scripts/seedDemo';
import { generateAccessToken } from '../src/utils/jwt';

const app = buildTestApp();

describe('Demo seed', () => {
  it('creates a demo user with realistic data', async () => {
    const result = await seedDemo();
    expect(result.tasksCreated).toBeGreaterThan(0);
    expect(result.sprintsCreated).toBeGreaterThanOrEqual(2);
    expect(result.standupsCreated).toBeGreaterThan(0);
    expect(result.retroItemsCreated).toBeGreaterThan(0);

    const demoUser = await User.findOne({ isDemo: true });
    expect(demoUser).not.toBeNull();
    expect(demoUser?.email).toBeTruthy();

    const sprints = await Sprint.find({ owner: demoUser!._id });
    expect(sprints.some((s) => s.status === 'active')).toBe(true);
    expect(sprints.some((s) => s.status === 'completed')).toBe(true);
  });

  it('is idempotent — repeated runs do not duplicate data', async () => {
    const first = await seedDemo();
    const second = await seedDemo();
    expect(second.tasksCreated).toBe(first.tasksCreated);
    expect(second.sprintsCreated).toBe(first.sprintsCreated);
    expect(second.standupsCreated).toBe(first.standupsCreated);

    const demoUser = await User.findOne({ isDemo: true });
    const taskCount = await Task.countDocuments({ owner: demoUser!._id });
    const sprintCount = await Sprint.countDocuments({ owner: demoUser!._id });
    const standupCount = await StandupEntry.countDocuments({ owner: demoUser!._id });
    const retroCount = await RetroItem.countDocuments({ owner: demoUser!._id });

    expect(taskCount).toBe(first.tasksCreated);
    expect(sprintCount).toBe(first.sprintsCreated);
    expect(standupCount).toBe(first.standupsCreated);
    expect(retroCount).toBe(first.retroItemsCreated);
  });

  it('does not touch other users data (owner isolation)', async () => {
    const other = await createTestUser();
    await Task.create({
      title: 'Real user task',
      status: 'todo',
      priority: 'medium',
      owner: other.id,
    });
    await Sprint.create({
      name: 'Real user sprint',
      startDate: new Date(inDays(0)),
      endDate: new Date(inDays(10)),
      status: 'planned',
      owner: other.id,
    });

    await seedDemo();
    await seedDemo();

    const realTasks = await Task.countDocuments({ owner: other.id });
    const realSprints = await Sprint.countDocuments({ owner: other.id });
    expect(realTasks).toBe(1);
    expect(realSprints).toBe(1);
  });
});

describe('Demo login + read-only enforcement', () => {
  const ensureDemoUser = async () => {
    await seedDemo();
    return User.findOne({ isDemo: true });
  };

  it('issues an access token without credentials', async () => {
    await ensureDemoUser();
    const res = await request(app).post('/api/auth/demo-login').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.isDemo).toBe(true);
  });

  it('returns 503 when no demo user is seeded yet', async () => {
    const res = await request(app).post('/api/auth/demo-login').send({});
    expect(res.status).toBe(503);
  });

  it('blocks task creation for demo accounts (403)', async () => {
    const demoUser = await ensureDemoUser();
    const token = generateAccessToken({
      userId: demoUser!._id.toString(),
      email: demoUser!.email,
      isDemo: true,
    });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Should be blocked', priority: 'low', status: 'todo' });
    expect(res.status).toBe(403);
  });

  it('blocks sprint creation for demo accounts (403)', async () => {
    const demoUser = await ensureDemoUser();
    const token = generateAccessToken({
      userId: demoUser!._id.toString(),
      email: demoUser!.email,
      isDemo: true,
    });
    const res = await request(app)
      .post('/api/sprints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Blocked',
        startDate: inDays(0),
        endDate: inDays(7),
      });
    expect(res.status).toBe(403);
  });

  it('still allows demo accounts to read', async () => {
    const demoUser = await ensureDemoUser();
    const token = generateAccessToken({
      userId: demoUser!._id.toString(),
      email: demoUser!.email,
      isDemo: true,
    });
    const tasks = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(tasks.status).toBe(200);
    expect(tasks.body.data.length).toBeGreaterThan(0);

    const sprints = await request(app)
      .get('/api/sprints')
      .set('Authorization', `Bearer ${token}`);
    expect(sprints.status).toBe(200);
    expect(sprints.body.data.length).toBeGreaterThan(0);
  });
});
