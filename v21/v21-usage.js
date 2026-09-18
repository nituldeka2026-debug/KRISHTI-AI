/**
 * Krishti AI V21 — server-side usage ledger.
 * JSON storage is suitable for a small deployment/test environment.
 * For production scale, move this ledger to Firestore/PostgreSQL.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
const USAGE_FILE = path.join(DATA_DIR, "v21-usage.json");

const DEFAULT_LIMITS = {
  free: { messages: 50, images: 5, voice: 10, pdf: 5, webSearch: 20, premiumModels: 0 },
  pro_monthly: { messages: 2000, images: 100, voice: 300, pdf: 100, webSearch: 500, premiumModels: 300 },
  pro_yearly: { messages: 2000, images: 100, voice: 300, pdf: 100, webSearch: 500, premiumModels: 300 }
};

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USAGE_FILE)) fs.writeFileSync(USAGE_FILE, "{}");
}
function readStore() {
  ensureStore();
  try { return JSON.parse(fs.readFileSync(USAGE_FILE, "utf8") || "{}"); }
  catch { return {}; }
}
function writeStore(data) {
  ensureStore();
  const tmp = `${USAGE_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, USAGE_FILE);
}
function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
}
function getPlan(user) {
  return String(user?.plan || process.env.DEFAULT_PLAN || "free").toLowerCase();
}
function getUsage(user) {
  const uid = String(user?.uid || "anonymous");
  const month = monthKey();
  const store = readStore();
  const row = store[uid];
  if (!row || row.month !== month) {
    return { uid, month, plan: getPlan(user), used: {messages:0,images:0,voice:0,pdf:0,webSearch:0,premiumModels:0} };
  }
  return { ...row, plan: getPlan(user), used: {...row.used} };
}
function checkAndConsume(user, type, amount = 1) {
  const plan = getPlan(user);
  const limits = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
  if (!(type in limits)) throw new Error("Unknown usage type.");
  const current = getUsage(user);
  const next = (current.used[type] || 0) + amount;
  if (next > limits[type]) {
    const e = new Error(`Monthly ${type} limit reached. Please upgrade your plan.`);
    e.statusCode = 429;
    e.usage = { type, used: current.used[type] || 0, limit: limits[type], plan };
    throw e;
  }
  current.used[type] = next;
  current.plan = plan;
  writeStore({ ...readStore(), [current.uid]: current });
  return { used: next, limit: limits[type], plan, remaining: Math.max(0, limits[type] - next) };
}
function setPlan(uid, plan) {
  const data = readStore();
  const current = getUsage({uid, plan});
  current.plan = plan;
  data[String(uid)] = current;
  writeStore(data);
  return current;
}
module.exports = { getUsage, checkAndConsume, setPlan, DEFAULT_LIMITS };
