const request = require("supertest");
const app = require("../index"); // your Express app
const { resetTestDb, pool } = require("../db/test-setup");

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await pool.end();
});

describe("POST /api/login", () => {
  it("should login successfully with valid credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "password" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("should fail with incorrect password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should fail if user does not exist", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "nonexistent", password: "whatever" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
