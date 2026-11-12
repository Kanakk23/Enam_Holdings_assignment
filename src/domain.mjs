export const portfolio = [
  ["RELIANCE", "Reliance Industries", "Energy"],
  ["TCS", "Tata Consultancy Services", "Technology"],
  ["INFY", "Infosys", "Technology"],
  ["HDFCBANK", "HDFC Bank", "Financials"],
  ["ICICIBANK", "ICICI Bank", "Financials"],
  ["SBIN", "State Bank of India", "Financials"],
  ["ITC", "ITC", "Consumer"],
  ["HINDUNILVR", "Hindustan Unilever", "Consumer"],
  ["TITAN", "Titan Company", "Consumer"],
  ["LT", "Larsen & Toubro", "Industrials"],
  ["BEL", "Bharat Electronics", "Industrials"],
  ["ULTRACEMCO", "UltraTech Cement", "Materials"],
  ["TATASTEEL", "Tata Steel", "Materials"],
  ["SUNPHARMA", "Sun Pharmaceutical", "Healthcare"],
  ["DRREDDY", "Dr. Reddy’s Laboratories", "Healthcare"],
  ["MARUTI", "Maruti Suzuki", "Automotive"],
  ["BHARTIARTL", "Bharti Airtel", "Telecom"],
  ["NTPC", "NTPC", "Utilities"],
].map(([ticker, name, sector]) => ({ ticker, name, sector }));
export const researchExtras = [
  { ticker: "COFORGE", name: "Coforge", sector: "Technology" },
  { ticker: "PERSISTENT", name: "Persistent Systems", sector: "Technology" },
  { ticker: "TATACONSUM", name: "Tata Consumer Products", sector: "Consumer" },
];
const names = [
  "Mira Shah",
  "Arjun Mehta",
  "Nisha Rao",
  "Dev Kapoor",
  "Rhea Sen",
  "Kabir Desai",
  "Aditi Sethi",
  "Rohan Iyer",
  "Leena Bose",
  "Kunal Joshi",
  "Sana Malhotra",
  "Vivek Nair",
  "Anika Bansal",
  "Aman Dutta",
  "Isha Patel",
  "Neel Agarwal",
  "Tara Menon",
  "Aditya Sinha",
  "Priya Khanna",
  "Varun Rao",
  "Meera Prasad",
  "Dhruv Kulkarni",
  "Zoya Bhat",
  "Rajat Jain",
  "Shruti Das",
  "Samar Verma",
  "Pooja Ghosh",
  "Manav Arora",
  "Anjali Pillai",
  "Nikhil Sen",
  "Kavya Narang",
  "Aarav Sood",
  "Sonal Chopra",
  "Rishi Reddy",
  "Diya Mathur",
  "Harsh Saxena",
];
export const people = Array.from({ length: 36 }, (_, i) => {
  const company = portfolio[i % 18];
  return {
    id: `p${i}`,
    name: names[i],
    company: company.ticker,
    sector: company.sector,
    role: [
      "Operations lead",
      "Finance controller",
      "Enterprise sales director",
      "Supply-chain manager",
      "Industry analyst",
      "Product director",
    ][i % 6],
    start: 2016 + (i % 5),
    end: 2020 + (i % 5),
    relationship:
      i % 4 === 0 ? "Employment overlap only" : "Known demo contact",
    synthetic: true,
  };
});
export function marketSignals(market, threshold) {
  return Object.entries(market)
    .filter(([, m]) => Number.isFinite(m.close))
    .flatMap(([ticker, m]) => {
      const reasons = [];
      if (Number.isFinite(m.change) && Math.abs(m.change) >= threshold.price)
        reasons.push(
          `${m.change > 0 ? "+" : ""}${m.change.toFixed(2)}% close-to-close move`,
        );
      if (Number.isFinite(m.volumeRatio) && m.volumeRatio >= threshold.volume)
        reasons.push(`${m.volumeRatio.toFixed(2)}× prior 20-session volume`);
      return reasons.length ? [{ ticker, ...m, reasons }] : [];
    });
}
export function matchPeople(ticker, sector, all = people) {
  return all
    .map((p) => ({
      ...p,
      score:
        (p.company === ticker ? 4 : 0) +
        (p.sector === sector ? 2 : 0) +
        (p.relationship === "Known demo contact" ? 1 : 0),
    }))
    .filter((p) => p.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
export function growth(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0)
    return null;
  return ((current - previous) / previous) * 100;
}
export function overlaps(a, b) {
  return a.start <= b.end && b.start <= a.end;
}
export function volumeRatio(values) {
  if (values.length < 21) return null;
  const prior = values.slice(-21, -1);
  const mean = prior.reduce((a, b) => a + b, 0) / 20;
  return mean > 0 ? values.at(-1) / mean : null;
}
export function validTicker(v) {
  return /^[A-Z0-9][A-Z0-9&-]{0,24}$/.test(v);
}
export function filterEvents(
  events,
  { ticker = "", from = "", to = "", since = null } = {},
) {
  return events
    .filter(
      (e) =>
        (!ticker || e.ticker === ticker) &&
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (since == null ||
          (Date.parse(e.publishedAt || e.date) >= since &&
            Date.parse(e.publishedAt || e.date) <= Date.now())),
    )
    .sort(
      (a, b) =>
        (a.rank ?? (a.priority === "Review" ? 4 : 9)) -
          (b.rank ?? (b.priority === "Review" ? 4 : 9)) ||
        b.date.localeCompare(a.date),
    );
}
export { passagesFor } from "./retrieval.mjs";
export function connectionFor(person, all = people) {
  if (person.relationship === "Known demo contact")
    return { kind: "known", path: ["You", person.name] };
  const bridge = all.find(
    (p) =>
      p.company === person.company &&
      p.relationship === "Known demo contact" &&
      overlaps(p, person),
  );
  return bridge
    ? {
        kind: "inferred",
        bridge,
        overlap: {
          start: Math.max(bridge.start, person.start),
          end: Math.min(bridge.end, person.end),
        },
        path: ["You", bridge.name, person.name],
      }
    : { kind: "unknown", path: [person.name] };
}
