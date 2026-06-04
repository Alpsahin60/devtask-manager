import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testApp';
import { createTestUser, inDays } from './helpers';

const app = buildTestApp();

const createActiveSprint = async (token: string) => {
  const created = await request(app)
    .post('/api/sprints')
    .set('Authorization', token)
    .send({
      name: 'Active Sprint',
      startDate: inDays(0),
      endDate: inDays(14),
    });
  await request(app)
    .patch(`/api/sprints/${created.body.data._id}`)
    .set('Authorization', token)
    .send({ status: 'active' });
  return created.body.data._id as string;
};

describe('Standup API', () => {
  describe('PUT /api/sprints/:id/standups', () => {
    it('creates a new standup entry', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);

      const res = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date: inDays(1), yesterday: 'a', today: 'b', blockers: 'c' });

      expect(res.status).toBe(201);
      expect(res.body.data.owner).toBe(user.id);
      expect(res.body.data.yesterday).toBe('a');
    });

    it('upserts on the same day instead of creating a duplicate', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      const date = inDays(2);

      await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date, today: 'first' });
      const second = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date, today: 'second' });

      expect(second.status).toBe(200);
      expect(second.body.data.today).toBe('second');

      const list = await request(app)
        .get(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader);
      expect(list.body.data).toHaveLength(1);
    });

    it('rejects when the sprint is still planned', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send({ name: 'Planned', startDate: inDays(0), endDate: inDays(10) });

      const res = await request(app)
        .put(`/api/sprints/${created.body.data._id}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date: inDays(1), today: 'work' });
      expect(res.status).toBe(409);
    });

    it('rejects a date outside the sprint window', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      const res = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date: inDays(60), today: 'too far' });
      expect(res.status).toBe(422);
    });

    it('rejects validation errors for long fields', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      const res = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', user.authHeader)
        .send({ date: inDays(1), today: 'x'.repeat(501) });
      expect(res.status).toBe(422);
    });

    it('ignores client-supplied owner and stamps the authenticated user', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const sprintId = await createActiveSprint(alice.authHeader);

      const res = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', alice.authHeader)
        .send({ date: inDays(1), today: 'work', owner: bob.id } as Record<string, unknown>);
      expect(res.status).toBe(201);
      expect(res.body.data.owner).toBe(alice.id);
    });

    it('blocks foreign users via 404 (owner isolation)', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const sprintId = await createActiveSprint(alice.authHeader);

      const res = await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', bob.authHeader)
        .send({ date: inDays(1), today: 'intruder' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sprints/:id/standups', () => {
    it('returns only the authenticated user entries', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const sprintId = await createActiveSprint(alice.authHeader);

      await request(app)
        .put(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', alice.authHeader)
        .send({ date: inDays(1), today: 'alice' });

      const res = await request(app)
        .get(`/api/sprints/${sprintId}/standups`)
        .set('Authorization', bob.authHeader);
      expect(res.status).toBe(404);
    });
  });
});
