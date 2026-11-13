import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: "custom" });
try {
  const { ModelAnswer, AiSetup } = await server.ssrLoadModule("/src/model-ui.jsx");
  assert.equal(AiSetup, undefined);
  for (const kind of ["analysis", "selected-evidence"]) {
    const html = renderToStaticMarkup(React.createElement(ModelAnswer, { research: { provider: "groq", model: "openai/gpt-oss-120b", answerKind: kind, answer: "Illustrative claim. [1]", passages: [{ page: 7 }] }, onSource() {} }));
    assert.match(html, /Open source passage 1/); assert.match(html, /Check the cited originals/);
    assert.doesNotMatch(html, /groq|gemini|openrouter|gpt-oss|API key|AI setup/i);
  }
  const source = await readFile("src/main.jsx", "utf8");
  assert.doesNotMatch(source, /apiKey|showAiSetup|aiOpen|serverAi|AI setup|api\/model\/test/);
  for (const file of await readdir("dist/client/assets")) {
    if (!file.endsWith(".js") && !file.endsWith(".mjs")) continue;
    const text = await readFile(`dist/client/assets/${file}`, "utf8");
    assert.doesNotMatch(text, /Groq|Gemini|OpenRouter|GROQ_API_KEY|GEMINI_API_KEY|OPENROUTER_API_KEY|gpt-oss-|gemini-3\.|AI setup|\/api\/model\/test/);
  }
  console.log("Client verified: source-reference buttons remain; provider names, model IDs, secrets and key-setup controls are absent from rendered notes and all client scripts. This is not interactive browser verification.");
} finally { await server.close(); }
