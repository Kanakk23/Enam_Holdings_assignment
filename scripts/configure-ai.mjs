import { readFile, writeFile, rename, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = fileURLToPath(new URL("../.env.local", import.meta.url));
if (!process.stdin.isTTY) {
  console.error("Run npm run configure:ai in an interactive terminal. Keys are entered without echo.");
  process.exit(1);
}
try { execFileSync("git", ["check-ignore", "--quiet", ".env.local"], { cwd: root, stdio: "ignore" }); }
catch { console.error("Setup stopped: .env.local must be ignored by Git first."); process.exit(1); }
async function secret(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.removeListener("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n");
      if (error) reject(error); else resolve(value.trim());
    };
    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === "\u0003" || char === "\u0004") { finish(new Error("Setup cancelled.")); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 512) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}
try {
  const groq = await secret("Groq API key (hidden; Enter keeps the existing value): ");
  const gemini = await secret("Gemini API key (hidden; Enter keeps the existing value): ");
  if ([groq, gemini].some(v => v && !/^[A-Za-z0-9_-]{10,512}$/.test(v))) throw new Error("A key has an invalid format. No configuration was changed.");
  let previous = "";
  try { previous = await readFile(target, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
  const updates = { ENABLE_FREE_MODEL: "true", ...(groq ? { GROQ_API_KEY: groq } : {}), ...(gemini ? { GEMINI_API_KEY: gemini } : {}) };
  const lines = previous.split(/\r?\n/).filter(line => !Object.keys(updates).some(key => new RegExp(`^\\s*${key}\\s*=`).test(line)));
  const text = [...lines.filter((line, i) => line || i < lines.length - 1), ...Object.entries(updates).map(([key, value]) => `${key}=${value}`), ""].join("\n");
  await writeFile(target + ".tmp", text, { mode: 0o600 }); await rename(target + ".tmp", target); await chmod(target, 0o600);
  console.log("Saved backend configuration. Restart npm run dev. Hosted runtime secrets must be configured separately; no key was sent to a service.");
} catch (error) {
  console.error(error.message?.startsWith("Setup cancelled") || error.message?.startsWith("A key") ? error.message : "Backend configuration could not be saved.");
  process.exitCode = 1;
}
