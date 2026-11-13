import { defineConfig, loadEnv } from "vite";
import { readFile } from "node:fs/promises";
import worker from "./server/worker.mjs";
export default defineConfig(({ mode }) => {
  // Only the development server receives these values. Never use VITE_ for secrets.
  const values = loadEnv(mode, process.cwd(), "");
  const localEnv = Object.fromEntries(["ENABLE_FREE_MODEL", "AI_PROVIDER", "AI_MODEL", "GROQ_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"].map(key => [key, values[key]]));
  return {
  build: { outDir: "dist/client" },
  plugins: [
    {
      name: "finn-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/__qa/phone") {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              '<!doctype html><html><head><title>FINN mobile QA</title><style>body{margin:0;background:#dce2ea;display:grid;place-items:center;min-height:100vh}iframe{border:0;width:390px;height:844px;background:white}</style></head><body><iframe title="FINN at 390 CSS pixels" src="/"></iframe></body></html>',
            );
            return;
          }
          if (!req.url?.startsWith("/api/")) return next();
          try {
            const parts = [];
            for await (const chunk of req) parts.push(chunk);
            const body = Buffer.concat(parts);
            const request = new Request("http://localhost" + req.url, {
              method: req.method,
              headers: req.headers,
              ...(body.length ? { body } : {}),
            });
            const response = await worker.fetch(request, {
              ...localEnv,
              ASSETS: {
                fetch: async () =>
                  new Response(await readFile("public/data/seed.json")),
              },
            });
            res.writeHead(
              response.status,
              Object.fromEntries(response.headers),
            );
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error:
                  "The local research service could not complete this request.",
              }),
            );
          }
        });
      },
    },
  ],
};
});
