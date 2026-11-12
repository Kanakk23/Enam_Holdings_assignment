import { readFile, writeFile } from "node:fs/promises";
import { validateRecord } from "../src/finance.mjs";
const records = JSON.parse(
  await readFile(process.argv[2] || "scripts/reviewed-evidence.json", "utf8"),
);
for (const d of records.documents)
  if (
    !/^https:\/\//.test(d.url) ||
    !["Annual report", "Earnings-call transcript"].includes(d.type) ||
    !/^[a-f0-9]{64}$/.test(d.sha256)
  )
    throw Error("Invalid primary source");
for (const [kind, items] of [
  ["figure", records.facts],
  ["guidance", records.guidance],
])
  for (const item of items) {
    const error = validateRecord(kind, item, records.documents);
    if (error) throw Error(`${item.id}: ${error}`);
  }
const path = "public/data/seed.json",
  seed = JSON.parse(await readFile(path, "utf8"));
const merge = (a, b) => [
  ...(a || []).filter((x) => !b.some((y) => y.id === x.id)),
  ...b,
];
seed.documents = merge(seed.documents, records.documents);
seed.facts = merge(seed.facts, records.facts);
seed.guidance = merge(seed.guidance, records.guidance);
seed.events = merge(
  seed.events,
  records.documents.map((d) => ({
    id: d.id,
    ticker: d.ticker,
    date: d.retrievedAt.slice(0, 10),
    historical: true,
    priority: "Review",
    title: d.title,
    sourceType: d.type,
    description:
      "An archived primary document is available for source-checked investigation. This is an indexing event, not a new exchange announcement.",
    question:
      "How do reported performance and explicit guidance compare on the same basis?",
  })),
);
seed.analysisAsOf = new Date().toISOString();
await writeFile(path, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `Imported ${records.facts.length} reviewed facts and ${records.guidance.length} guidance records with primary-source citations.`,
);
