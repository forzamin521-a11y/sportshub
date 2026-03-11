import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { appendSheetData, ensureSheetHeaders, getSheetData, updateSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";

interface AdminCredentialState {
  username: string;
  passwordHash: string;
}

const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DEFAULT_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const globalState = globalThis as typeof globalThis & {
  __adminCredentialState?: AdminCredentialState;
};

const ADMIN_USERNAME_KEY = "admin_username";
const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const candidateHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(originalHash, "hex");

  if (candidateHash.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, storedBuffer);
}

function getInitialState(): AdminCredentialState {
  if (globalState.__adminCredentialState) {
    return globalState.__adminCredentialState;
  }

  const state: AdminCredentialState = {
    username: DEFAULT_USERNAME,
    passwordHash: DEFAULT_PASSWORD_HASH || hashPassword(DEFAULT_PASSWORD),
  };

  globalState.__adminCredentialState = state;
  return state;
}

async function readStoredCredentials() {
  try {
    const rows = await getSheetData(SHEET_NAMES.CONFIG);
    const usernameRow = rows.find((row) => String(row.key) === ADMIN_USERNAME_KEY);
    const passwordHashRow = rows.find((row) => String(row.key) === ADMIN_PASSWORD_HASH_KEY);

    return {
      username: usernameRow?.value ? String(usernameRow.value) : undefined,
      passwordHash: passwordHashRow?.value ? String(passwordHashRow.value) : undefined,
      rows,
    };
  } catch {
    return {
      username: undefined,
      passwordHash: undefined,
      rows: [] as Array<Record<string, string | number | boolean>>,
    };
  }
}

async function persistConfigValue(
  rows: Array<Record<string, string | number | boolean>>,
  key: string,
  value: string
) {
  await ensureSheetHeaders(SHEET_NAMES.CONFIG, ["key", "value", "updated_at"]);

  const rowIndex = rows.findIndex((row) => String(row.key) === key);
  const payload = [[key, value, new Date().toISOString()]];

  if (rowIndex >= 0) {
    await updateSheetData(SHEET_NAMES.CONFIG, `A${rowIndex + 2}:C${rowIndex + 2}`, payload);
  } else {
    await appendSheetData(SHEET_NAMES.CONFIG, payload);
  }
}

export async function getAdminCredentials() {
  const state = getInitialState();
  const stored = await readStoredCredentials();
  const username = stored.username || state.username;
  const passwordHash = stored.passwordHash || state.passwordHash;

  const nextState = {
    username,
    passwordHash,
  };

  globalState.__adminCredentialState = nextState;

  if (!stored.username || !stored.passwordHash) {
    await persistConfigValue(stored.rows, ADMIN_USERNAME_KEY, username);
    await persistConfigValue(stored.rows, ADMIN_PASSWORD_HASH_KEY, passwordHash);
  }

  return nextState;
}

export async function validateAdminCredentials(username: string, password: string) {
  const state = await getAdminCredentials();
  return state.username === username && verifyPassword(password, state.passwordHash);
}

export async function updateAdminPassword(newPassword: string) {
  const state = await getAdminCredentials();
  const passwordHash = hashPassword(newPassword);
  const stored = await readStoredCredentials();

  await persistConfigValue(stored.rows, ADMIN_PASSWORD_HASH_KEY, passwordHash);

  state.passwordHash = passwordHash;
  globalState.__adminCredentialState = state;
}

export async function verifyAdminPassword(password: string) {
  return verifyPassword(password, (await getAdminCredentials()).passwordHash);
}
