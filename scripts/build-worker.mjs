import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
const files = {};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(file);
    else
      files[
        "/" + path.relative("dist/client", file).split(path.sep).join("/")
      ] = [
        (await readFile(file)).toString("base64"),
        mime[path.extname(file)] || "application/octet-stream",
      ];
  }
}
await collect("dist/client");
const serve = `const files=${JSON.stringify(files)};function serveAsset(request){const u=new URL(request.url);const file=files[u.pathname==='/'?'/index.html':u.pathname];if(!file)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(file[0]),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':file[1],'Cache-Control':u.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':\"default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\"}})};`;
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
const entry = path.resolve("dist/.worker-entry.mjs");
await writeFile(entry, `import handler from "../server/worker.mjs";\n${serve}\nexport default {fetch(request,env,ctx){return handler.fetch(request,{...env,ASSETS:{fetch:serveAsset}},ctx)}};`);
const { build } = await import("vite");
await build({configFile:false,logLevel:"error",ssr:{noExternal:true},build:{ssr:entry,target:"es2022",outDir:"dist/server",emptyOutDir:true,minify:false,rollupOptions:{output:{entryFileNames:"index.js",inlineDynamicImports:true}}}});
console.log(`Worker bundled with ${Object.keys(files).length} self-contained assets and resolved ESM dependencies.`);
