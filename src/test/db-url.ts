/**
 * The Postgres database the test suite runs against — a dedicated database on
 * the local docker instance (docker-compose.yml), kept separate from the dev
 * database so `resetDb()` never touches real data. Override in CI.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://creatorhub:creatorhub@localhost:5432/creatorhub_test?schema=public";
