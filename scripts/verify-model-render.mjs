import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: "custom" });
try {
  const { AiSetup, ModelAnswer } = await server.ssrLoadModule("/src/model-ui.jsx");
  const fakeKey = "test-only-placeholder-key";
  for (const provider of ["groq", "openrouter", "gemini"]) {
    const html = renderToStaticMarkup(React.createElement(AiSetup, { active: { provider, apiKey: fakeKey }, onConnect() {}, onClose() {} }));
    for (const text of ["Connect AI research", "Test &amp; connect", "type=\"password\"", "Reloading clears it.", "Network profiles are excluded."])
      assert.ok(html.includes(text), text);
    assert.ok(!html.includes(fakeKey));
    assert.match(html, /aria-labelledby="ai-title"/);
  }
  const html = renderToStaticMarkup(React.createElement(ModelAnswer, { research: { provider: "groq", model: "openai/gpt-oss-120b", answer: "Illustrative claim. [1]", passages: [{ page: 7 }] }, onSource() {} }));
  assert.match(html, /Open source passage 1/);
  assert.match(html, /Check the cited originals/);
  console.log("AI markup verified: three providers, password entry, no rendered key, session/privacy copy and source-reference button. This is not visual or browser verification.");
} finally { await server.close(); }
