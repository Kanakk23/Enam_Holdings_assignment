import test from "node:test";
import assert from "node:assert/strict";
import { publicUrl, sourceLinks } from "../server/sources.mjs";
import worker from "../server/worker.mjs";
import { readFile } from "node:fs/promises";

test("discovery selects original annual reports and raw transcripts, excluding summaries", () => {
  const html = `<a href="https://issuer.example/ar2026.pdf">Annual Report 2026</a><a href="/summary/7">AI Summary</a><a href="https://issuer.example/call.pdf" title="Raw Transcript">Transcript</a><a href="https://broker.example/notes.pdf">Broker note</a><a href="http://127.0.0.1/secret.pdf">Annual Report 2025</a>`;
  assert.deepEqual(
    sourceLinks(html, "UNSEEN").map((s) => s.url),
    ["https://issuer.example/ar2026.pdf", "https://issuer.example/call.pdf"],
  );
  assert.equal(sourceLinks(html, "UNSEEN")[0].ticker, "UNSEEN");
});
test("document proxy rejects local addresses, ports, credentials and non-HTTPS schemes", () => {
  for (const url of [
    "http://example.com/x.pdf",
    "https://127.0.0.1/x",
    "https://[::1]/x",
    "https://localhost/x",
    "https://a.internal/x",
    "https://user:pass@example.com/x",
    "https://example.com:8080/x",
  ])
    assert.equal(publicUrl(url), false, url);
  assert.equal(publicUrl("https://www.infosys.com/investors/report.pdf"), true);
});
const fixture = {
  documents: [
    {
      id: "doc",
      ticker: "TEST",
      title: "Issuer report",
      passages: [
        {
          page: 12,
          text: "Cash generation and operating margin are discussed in the issuer report.",
        },
      ],
    },
  ],
};
const env = { ASSETS: { fetch: async () => Response.json(fixture) } };
test("research returns exact passages with provenance without a model key", async () => {
  const response = await worker.fetch(
    new Request("https://finn.example/api/research", {
      method: "POST",
      body: JSON.stringify({ ticker: "TEST", question: "cash" }),
    }),
    env,
  );
  const data = await response.json();
  assert.equal(data.mode, "extractive");
  assert.equal(data.passages[0].text, fixture.documents[0].passages[0].text);
  assert.equal(data.passages[0].document.id, "doc");
  assert.equal(data.passages[0].page, 12);
});
test("unindexed research reports missing evidence instead of inventing a company answer", async () => {
  const response = await worker.fetch(
    new Request("https://finn.example/api/research", {
      method: "POST",
      body: JSON.stringify({ ticker: "UNSEEN" }),
    }),
    env,
  );
  assert.equal(response.status, 422);
  const data = await response.json();
  assert.equal(data.answer, undefined);
});
test("invalid ticker and malformed request fail before any source fetch", async () => {
  let reads = 0;
  const noRead = {
    ASSETS: {
      fetch: async () => {
        reads++;
        throw Error("Must not fetch");
      },
    },
  };
  for (const body of [
    "{",
    "null",
    "[]",
    JSON.stringify({ ticker: "../../secret" }),
  ])
    assert.equal(
      (
        await worker.fetch(
          new Request("https://finn.example/api/research", {
            method: "POST",
            body,
          }),
          noRead,
        )
      ).status,
      400,
    );
  assert.equal(reads, 0);
});
test("shipped snapshot is strict JSON with valid finite prices and distinct document dates", async () => {
  const data = JSON.parse(
    await readFile(
      new URL("../public/data/seed.json", import.meta.url),
      "utf8",
    ),
  );
  for (const m of Object.values(data.market)) {
    assert.ok(Number.isFinite(m.close));
    assert.ok(Number.isFinite(m.change));
    assert.match(m.session, /^\d{4}-\d{2}-\d{2}$/);
  }
  for (const d of data.documents) {
    assert.ok(d.passages.length > 0);
    for (const p of d.passages) {
      assert.ok(p.page > 0);
      assert.ok(p.text.length > 0);
    }
  }
});
