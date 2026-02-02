import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 3001;
const baseURL = `http://127.0.0.1:${PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpDir = path.join(__dirname, '.tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      // Make the app deterministic and self-contained in E2E.
      USE_SQLITE: 'true',
      SQLITE_PATH: path.join(tmpDir, 'e2e.sqlite'),
      AUTH_DB_PATH: path.join(tmpDir, 'auth.e2e.db'),

      // Seed a dedicated test user (avoid real credentials in the repo)
      AUTH_SEED_USERS: 'e2e@example.com',
      AUTH_SEED_PASSWORD: 'e2e-password',
      AUTH_SEED_MUST_CHANGE_PASSWORD: '0',

      NODE_ENV: 'test',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
