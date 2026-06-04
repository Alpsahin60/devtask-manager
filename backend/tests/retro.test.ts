import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testApp';
import { createTestUser, inDays } from './helpers';

const app = buildTestApp();

const createActiveSprint = async (token: string) => {
  const created = await request(app)
    .post('/api/sprints')
    .set('Authorization', token)
    .send({ name: 'S', startDate: inDays(0), endDate: inDays(14) });
  await request(app)
    .patch(`/api/sprints/${created.body.data._id}`)
    .set('Authorization', token)
    .send({ status: 'active' });
  return created.body.data._id as string;
};

describe('Retro API', () => {
  describe('POST /api/sprints/:id/retro', () => {
    it('creates a retro item under an active sprint', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);

      const res = await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'mad', content: 'too many meetings' });

      expect(res.status).toBe(201);
      expect(res.body.data.category).toBe('mad');
      expect(res.body.data.owner).toBe(user.id);
    });

    it('rejects items on a planned sprint', async () => {
      const user = await createTestUser();
      const created = await request(app)
        .post('/api/sprints')
        .set('Authorization', user.authHeader)
        .send({ name: 'planned', startDate: inDays(0), endDate: inDays(10) });
      const res = await request(app)
        .post(`/api/sprints/${created.body.data._id}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'nope' });
      expect(res.status).toBe(409);
    });

    it('rejects items on a completed sprint', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      await request(app)
        .patch(`/api/sprints/${sprintId}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'completed' });

      const res = await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'late' });
      expect(res.status).toBe(409);
    });

    it('validates the category enum', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      const res = await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'happy', content: 'bad enum' });
      expect(res.status).toBe(422);
    });

    it('returns 404 to a foreign user (owner isolation)', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const sprintId = await createActiveSprint(alice.authHeader);

      const res = await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', bob.authHeader)
        .send({ category: 'sad', content: 'foreign' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sprints/:id/retro', () => {
    it('groups items by Mad / Sad / Glad', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);

      await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'mad', content: 'm1' });
      await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'g1' });
      await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'g2' });

      const res = await request(app)
        .get(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.mad).toHaveLength(1);
      expect(res.body.data.sad).toHaveLength(0);
      expect(res.body.data.glad).toHaveLength(2);
    });

    it('returns 404 to a foreign user', async () => {
      const alice = await createTestUser();
      const bob = await createTestUser();
      const sprintId = await createActiveSprint(alice.authHeader);
      const res = await request(app)
        .get(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', bob.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/sprints/:id/retro/:itemId', () => {
    it('refuses to delete on completed sprint', async () => {
      const user = await createTestUser();
      const sprintId = await createActiveSprint(user.authHeader);
      const item = await request(app)
        .post(`/api/sprints/${sprintId}/retro`)
        .set('Authorization', user.authHeader)
        .send({ category: 'glad', content: 'keep' });

      await request(app)
        .patch(`/api/sprints/${sprintId}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'completed' });

      const res = await request(app)
        .delete(`/api/sprints/${sprintId}/retro/${item.body.data._id}`)
        .set('Authorization', user.authHeader);
      expect(res.status).toBe(409);
    });
  });
});
