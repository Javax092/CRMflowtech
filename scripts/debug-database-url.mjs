import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { config as loadDotenv } from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
const parsed = loadDotenv({ path: envPath });

function mask(value) {
  if (value == null) return "<undefined>";
  if (value === "") return "<empty>";
  const visibleStart = value.slice(0, 18);
  const visibleEnd = value.slice(-12);
  return `${visibleStart}${"*".repeat(Math.min(24, Math.max(8, value.length - 30)))}${visibleEnd}`;
}

function inspectUrl(name, value) {
  const result = {
    name,
    exists: value !== undefined,
    empty: value === "",
    length: value?.length ?? 0,
    masked: mask(value),
    startsWithPostgres: /^postgres(ql)?:\/\//.test(value ?? ""),
    hasLeadingOrTrailingWhitespace: value !== undefined && value !== value.trim(),
    hasNewline: /[\r\n]/.test(value ?? ""),
    hasWhitespace: /\s/.test(value ?? ""),
    parseableByURL: false,
    protocol: null,
    host: null,
    path: null,
    connectionHint: null,
    error: null,
  };

  try {
    const url = new URL(value);
    result.parseableByURL = true;
    result.protocol = url.protocol;
    result.host = url.host;
    result.path = url.pathname;
    result.connectionHint = classifySupabase(url);
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

function classifySupabase(url) {
  const host = url.hostname;
  const port = url.port;

  if (host.includes("pooler.supabase.com")) {
    if (port === "6543") return "Supabase transaction pooler";
    if (port === "5432") return "Supabase session pooler";
    return "Supabase pooler";
  }

  if (host.endsWith(".supabase.co")) {
    return "Supabase direct connection";
  }

  return "unknown";
}

function duplicateEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const counts = new Map();
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) return;
    const key = match[1];
    const entries = counts.get(key) ?? [];
    entries.push(index + 1);
    counts.set(key, entries);
  });

  return [...counts.entries()]
    .filter(([, linesForKey]) => linesForKey.length > 1)
    .map(([key, linesForKey]) => ({ key, lines: linesForKey }));
}

console.log("dotenv loaded:", !parsed.error);
if (parsed.error) console.log("dotenv error:", parsed.error.message);
console.log(".env path:", envPath);
console.log("duplicate keys:", duplicateEnvKeys(envPath));
console.log("DATABASE_URL:", inspectUrl("DATABASE_URL", process.env.DATABASE_URL));
console.log("DIRECT_URL:", inspectUrl("DIRECT_URL", process.env.DIRECT_URL));

if (process.env.SHOW_DATABASE_URL === "1") {
  console.log("RAW_DATABASE_URL:", process.env.DATABASE_URL);
  console.log("RAW_DIRECT_URL:", process.env.DIRECT_URL);
}
