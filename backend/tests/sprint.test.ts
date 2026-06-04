import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testApp';
import { createTestUser, inDays } from './helpers';

const app = buildTestApp();

const validSprintPayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Sprint 1',
  goal: 'Ship MVP',
  startDate: inDays(0),
  endDate: inDays(14),
  ...overrides,
});

describe('Sprint API', () => {
  describe('POST /api/sprints', () => {
    it('creates a sprint for the authenticated user', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sprint 1');
      expect(res.body.data.status).toBe('planned');
      expect(res.body.data.owner).toBe(user.id);
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app).post('/api/sprints').send(validSprintPayload());
      expect(res.status).toBe(401);
    });

    it('rejects sprints longer than 30 days', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ startDate: inDays(0), endDate: inDays(40) }));
      expect(res.status).toBe(422);
    });

    it('rejects when endDate is not after startDate', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ startDate: inDays(5), endDate: inDays(3) }));
      expect(res.status).toBe(422);
    });

    it('rejects missing required fields', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send({ goal: 'no name no dates' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/sprints', () => {
    it('returns only the authenticated user sprints (owner isolation)', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();

      await request(app)
        .post('/api/sprints')
        .set('Authorization', alice.authHeader)
        .send(validSprintPayload({ name: 'Alice Sprint' }));

      await request(app)
        .post('/api/sprints')
        .set('Authorization', bob.authHeader)
        .send(validSprintPayload({ name: 'Bob Sprint' }));

      const res = await request(app)
        .get('/api/sprints')
        .set('Authorization', alice.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice Sprint');
    });

    it('filters by ?status=', async () => {
      const user = await createTestUser();
      await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ name: 'A' }));
      await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ name: 'B' }));

      const res = await request(app)
        .get('/api/sprints?status=active')
        .set('Authorization', user.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/sprints/:id', () => {
    it('returns 404 for another user sprint (owner isolation)', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();

      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', alice.authHeader)
        .send(validSprintPayload());

      const res = await request(app)
        .get(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', bob.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('Status machine', () => {
    const activate = async (token: string, sprintId: string) =>
      request(app)
        .patch(`/api/sprints/${sprintId}`)
        .set('Authorization', token)
        .send({ status: 'active' });

    it('allows planned -> active -> completed', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());

      const start = await activate(user.authHeader, created.body.data._id);
      expect(start.status).toBe(200);
      expect(start.body.data.status).toBe('active');

      const finish = await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'completed', reviewNotes: 'all done' });
      expect(finish.status).toBe(200);
      expect(finish.body.data.status).toBe('completed');
      expect(finish.body.data.reviewNotes).toBe('all done');
    });

    it('rejects planned -> completed (invalid transition)', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());

      const res = await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'completed' });
      expect(res.status).toBe(409);
    });

    it('rejects starting a second sprint while one is active', async () => {
      const user = await createTestUser();
      const first = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ name: 'A' }));
      const second = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ name: 'B' }));

      await activate(user.authHeader, first.body.data._id);
      const res = await activate(user.authHeader, second.body.data._id);
      expect(res.status).toBe(409);
    });

    it('refuses to modify completed sprints', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());
      await activate(user.authHeader, created.body.data._id);
      await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'completed' });

      const res = await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ name: 'rename after done' });
      expect(res.status).toBe(409);
    });

    it('rejects startDate change once the sprint is no longer planned', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());
      await activate(user.authHeader, created.body.data._id);

      const res = await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ startDate: inDays(1) });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/sprints/active', () => {
    it('returns the active sprint with daysRemaining', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload({ startDate: inDays(0), endDate: inDays(10) }));
      await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'active' });

      const res = await request(app)
        .get('/api/sprints/active')
        .set('Authorization', user.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.sprint).toBeTruthy();
      expect(res.body.data.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(res.body.data.daysRemaining).toBeLessThanOrEqual(10);
    });

    it('returns null when no active sprint exists', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .get('/api/sprints/active')
        .set('Authorization', user.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('DELETE /api/sprints/:id', () => {
    it('cascades to standups and retro items', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send(validSprintPayload());
      await request(app)
        .patch(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'active' });

      await request(app)
        .put(`/api/sprints/${created.body.data._id}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date: inDays(1), today: 'work' });
      await request(app)
        .post(`/api/sprints/${created.body.data._id}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'shipped' });

      const del = await request(app)
        .delete(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', user.authHeader);
      expect(del.status).toBe(200);

      // Confirmed via the cascade: the secondary endpoints can no longer find
      // anything for that sprint id.
      const standups = await request(app)
        .get(`/api/sprints/${created.body.data._id}/standups`)
        .set('Authorization', user.authHeader);
      expect(standups.status).toBe(404);
    });

    it('refuses to delete another user sprint', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', alice.authHeader)
        .send(validSprintPayload());

      const res = await request(app)
        .delete(`/api/sprints/${created.body.data._id}`)
        .set('Authorization', bob.authHeader);
      expect(res.status).toBe(404);
    });
  });
});
