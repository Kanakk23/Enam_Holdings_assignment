import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
  FileText,
  Search,
  SlidersHorizontal,
  Users,
  LayoutList,
  Command,
  ExternalLink,
  RefreshCw,
  Info,
  X,
  Bookmark,
  ShieldCheck,
  Link2,
  AlertCircle,
} from "lucide-react";
import {
  portfolio,
  researchExtras,
  marketSignals,
  people,
  matchPeople,
  connectionFor,
  filterEvents,
  passagesFor,
  validTicker,
} from "./domain.mjs";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./style.css";
import { FinancialAnalysis, RecordEvidence } from "./finance-ui.jsx";
import { sourcePassage } from "./finance.mjs";
const Icon = ({ as: C, ...p }) => <C size={18} strokeWidth={1.7} {...p} />;
const stored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
function Preferences({ onClose, returnFocus, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = returnFocus;
    ref.current.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="settings-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
function Connection({ person }) {
  const connection = connectionFor(person);
  return (
    <>
      <ol className="connection-path" aria-label="Relationship path">
        {connection.path.map((name, i) => (
          <li key={name}>
            <span className="avatar">
              {i === 0
                ? "You"
                : name
                    .split(" ")
                    .map((s) => s[0])
                    .join("")}
            </span>
            <span>{name}</span>
            {i < connection.path.length - 1 && (
              <span
                className={
                  connection.kind === "inferred" && i === 1
                    ? "path-edge inferred"
                    : "path-edge"
                }
                aria-label={i === 0 ? "Known relationship" : "Inferred overlap"}
              />
            )}
          </li>
        ))}
      </ol>
      {connection.kind === "known" ? (
        <p>
          A direct acquaintance explicitly supplied in the synthetic network.
        </p>
      ) : connection.kind === "inferred" ? (
        <>
          <p>
            {connection.bridge.name} is an explicitly known demo contact. Their
            role at {person.company} ({connection.bridge.start}–
            {connection.bridge.end}) overlaps with {person.name} in{" "}
            {connection.overlap.start}–{connection.overlap.end}.
          </p>
          <p className="subtle">
            The dashed segment is an inferred overlap. We have no evidence that
            these two people know each other; ask your contact before assuming
            an introduction.
          </p>
        </>
      ) : (
        <p>No relationship path has been established.</p>
      )}
    </>
  );
}
function App() {
  const [data, setData] = useState({
      documents: [],
      events: [],
      market: {},
      asOf: null,
      errors: [],
    }),
    [financeSelections, setFinanceSelections] = useState({}),
    [localFacts, setLocalFacts] = useState(() => stored("finn-facts", [])),
    [localGuidance, setLocalGuidance] = useState(() =>
      stored("finn-guidance", []),
    ),
    [tab, setTab] = useState("brief"),
    [view, setView] = useState(null),
    [query, setQuery] = useState(""),
    [ticker, setTicker] = useState(""),
    [windowMode, setWindow] = useState("24h"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [routine, setRoutine] = useState(false),
    [settings, setSettings] = useState(false),
    [showReviewed, setShowReviewed] = useState(false),
    [reviewed, setReviewed] = useState(() => stored("finn-reviewed", [])),
    [research, setResearch] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [question, setQuestion] = useState(""),
    [foundSources, setFoundSources] = useState([]),
    [indexing, setIndexing] = useState(false),
    [networkFilter, setNetworkFilter] = useState(""),
    [threshold, setThreshold] = useState(() =>
      stored("finn-threshold", { price: 5, volume: 2 }),
    );
  const stack = useRef([]),
    heading = useRef(null),
    input = useRef(null),
    preferenceTrigger = useRef(null);
  const showPreferences = () => {
    preferenceTrigger.current = document.activeElement;
    setSettings(true);
  };
  useEffect(() => {
    fetch("/data/seed.json")
      .then((r) => {
        if (!r.ok) throw Error("Unable to load the indexed documents.");
        return r.json();
      })
      .then((d) =>
        setData({
          ...d,
          documents: [
            ...d.documents,
            ...stored("finn-documents", []).filter(
              (x) => !d.documents.some((y) => x.id === y.id),
            ),
          ],
        }),
      )
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("finn-reviewed", JSON.stringify(reviewed));
    } catch {}
  }, [reviewed]);
  useEffect(() => {
    try {
      localStorage.setItem("finn-threshold", JSON.stringify(threshold));
    } catch {}
  }, [threshold]);
  const saveRecord = (kind, record) => {
    const setter = kind === "figure" ? setLocalFacts : setLocalGuidance;
    const key = kind === "figure" ? "finn-facts" : "finn-guidance";
    setter((prev) => {
      const next = [...prev, record];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        setError(
          "The record is available for this session, but browser storage is full.",
        );
      }
      return next;
    });
  };
  const removeRecord = (kind, id) => {
    const setter = kind === "figure" ? setLocalFacts : setLocalGuidance;
    const key = kind === "figure" ? "finn-facts" : "finn-guidance";
    setter((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const factEvidence = (record) => {
    const passage = sourcePassage(record, data.documents);
    if (!passage) {
      setError("The original passage is unavailable.");
      return;
    }
    evidence(passage);
  };
  const open = (v) => {
    stack.current.push({ view, scroll: window.scrollY });
    setView(v);
    window.scrollTo(0, 0);
    setTimeout(() => heading.current?.focus(), 20);
  };
  const back = () => {
    const prev = stack.current.pop();
    setView(prev?.view || null);
    setTimeout(() => window.scrollTo(0, prev?.scroll || 0), 20);
  };
  const nav = (t) => {
    setTab(t);
    setView(null);
    stack.current = [];
    setError("");
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        nav("research");
        setTimeout(() => input.current?.focus(), 30);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const company = (t) =>
    [...portfolio, ...researchExtras].find((c) => c.ticker === t) || {
      ticker: t,
      name: t,
      sector: "",
    };
  const docs = (t) => data.documents.filter((d) => d.ticker === t);
  const evidence = (p) =>
    open({
      kind: "source",
      passage: p,
      document: p.document || data.documents.find((d) => d.id === p.documentId),
    });
  const mark = (id) =>
    setReviewed((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  const allEvents = data.events
    .filter((e) => windowMode !== "24h" || !e.historical)
    .map((e) => ({ ...e, reviewed: reviewed.includes(e.id) }));
  const signals = marketSignals(data.market, threshold);
  const liveEvents = filterEvents(allEvents, {
    ticker,
    from: windowMode === "24h" ? "" : from,
    to: windowMode === "24h" ? "" : to,
    since: windowMode === "24h" ? Date.now() - 864e5 : null,
  }).filter((e) => showReviewed || !e.reviewed);
  const important = liveEvents.filter((e) => e.priority !== "Routine"),
    ordinary = liveEvents.filter((e) => e.priority === "Routine");
  async function runResearch(
    t,
    prompt = "What do the primary documents say about growth, margins and cash generation?",
  ) {
    t = t.trim().toUpperCase().replace(/\.NS$/, "");
    if (!validTicker(t)) {
      setError("Enter a valid NSE symbol, such as INFY.");
      return;
    }
    setFoundSources([]);
    setQuery(t);
    setBusy(true);
    nav("research");
    setResearch({
      ticker: t,
      question: prompt,
      status: "Locating original reports and transcripts…",
    });
    try {
      const local = docs(t);
      if (local.length) {
        let result;
        try {
          const r = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker: t, question: prompt }),
          });
          if (r.ok) result = await r.json();
        } catch {}
        setResearch(
          result?.mode === "model"
            ? result
            : {
                ticker: t,
                question: prompt,
                documents: local,
                passages: passagesFor(local, prompt),
                mode: "extractive",
              },
        );
      } else {
        const r = await fetch(`/api/discover?ticker=${encodeURIComponent(t)}`);
        const result = await r.json();
        if (!r.ok)
          throw Error(result.error || "Document discovery is unavailable.");
        setFoundSources(result.sources || []);
        setResearch({
          ticker: t,
          question: prompt,
          documents: [],
          passages: [],
          mode: "discovery",
        });
      }
    } catch (e) {
      setResearch({ ticker: t, question: prompt, error: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function findSources() {
    setBusy(true);
    setResearch((r) => ({
      ...r,
      status: "Checking original report and transcript links…",
    }));
    try {
      const response = await fetch(
        `/api/discover?ticker=${encodeURIComponent(research.ticker)}`,
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setFoundSources(result.sources || []);
      if (!result.sources?.length)
        setError("No additional original PDFs were found in the directory.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function importSource(source) {
    setIndexing(true);
    setError("");
    setResearch((r) => ({ ...r, status: "Downloading the original PDF…" }));
    try {
      const { indexPdf } = await import("./pdf.mjs");
      const d = await indexPdf(source, (status) =>
        setResearch((r) => ({ ...r, status })),
      );
      setData((prev) => ({
        ...prev,
        documents: [...prev.documents.filter((x) => x.id !== d.id), d],
      }));
      const saved = [
        ...stored("finn-documents", []).filter((x) => x.id !== d.id),
        d,
      ];
      try {
        localStorage.setItem("finn-documents", JSON.stringify(saved.slice(-8)));
      } catch {
        setError(
          "This browser could not save the document. It remains available for this session.",
        );
      }
      setResearch((r) => {
        const documents = [
          ...(r.documents || []).filter((x) => x.id !== d.id),
          d,
        ];
        return {
          ...r,
          documents,
          passages: passagesFor(documents, r.question),
          mode: "extractive",
          status: "",
        };
      });
      setFoundSources((v) => v.filter((x) => x.url !== source.url));
    } catch (e) {
      setError(e.message);
    } finally {
      setIndexing(false);
    }
  }
  function PersonStrip({ t }) {
    const c = company(t),
      matches = matchPeople(t, c.sector);
    return (
      <section className="people-strip">
        <div className="section-line">
          <h3>Who could add context?</h3>
          <span className="label">Synthetic network</span>
        </div>
        {!matches.length && (
          <p className="subtle">
            No relevant experience is recorded for this company. Try a broader
            sector in People.
          </p>
        )}
        {matches.slice(0, 2).map((p) => (
          <button
            className="person-row"
            key={p.id}
            onClick={() => open({ kind: "person", person: p, ticker: t })}
          >
            <span className="avatar">
              {p.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.role} · {p.company}
              </small>
              <em>
                {p.company === t
                  ? "First-hand company experience"
                  : "Relevant sector experience"}{" "}
                · {p.start}–{p.end}
              </em>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </section>
    );
  }
  function EventRow({ e, featured = false }) {
    return (
      <article className={"event " + (featured ? "featured" : "")}>
        <div className="event-meta">
          <span className="ticker">{e.ticker}</span>
          <span>{company(e.ticker).sector}</span>
          <span className="dot">·</span>
          <time>
            {e.historical ? "Indexed " : ""}
            {e.date}
          </time>
          <span className={"priority " + e.priority.toLowerCase()}>
            {e.priority}
          </span>
        </div>
        <button
          className="event-title"
          onClick={() => open({ kind: "event", event: e })}
        >
          {e.title}
          <ArrowUpRight size={featured ? 23 : 18} />
        </button>
        <p>{e.description}</p>
        {featured && (
          <div className="research-question">
            <span>QUESTION TO INVESTIGATE</span>
            <strong>{e.question}</strong>
          </div>
        )}
        <div className="event-bottom">
          <button
            className="text-button"
            onClick={() => open({ kind: "event", event: e })}
          >
            <FileText size={15} /> {e.sourceType} <ArrowRight size={15} />
          </button>
          <button
            className={"review-button " + (e.reviewed ? "done" : "")}
            onClick={() => mark(e.id)}
            aria-label={e.reviewed ? "Mark unread" : "Mark reviewed"}
          >
            {e.reviewed ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{e.reviewed ? "Reviewed" : "Mark reviewed"}</span>
          </button>
        </div>
      </article>
    );
  }
  const sourceView = () => {
    const d = view.document,
      p = view.passage;
    return (
      <>
        <div className="page-intro">
          <h1 ref={heading} tabIndex={-1}>
            {d?.title || "Source unavailable"}
          </h1>
          <p>
            {d?.ticker} · {d?.period} · {d?.type}
          </p>
        </div>
        {d ? (
          <>
            <div className="source-toolbar">
              <span>
                <ShieldCheck size={16} /> Original primary document
              </span>
              <a
                className="button primary"
                href={d.url + (d.url.includes(".pdf") ? `#page=${p.page}` : "")}
                target="_blank"
                rel="noreferrer"
              >
                Open original <ExternalLink size={15} />
              </a>
            </div>
            <div className="document-sheet">
              <div className="document-top">
                {d.ticker} <span>PDF page {p.page}</span>
              </div>
              <p className="source-note">
                Source excerpt. PDF layout and table columns may differ; verify
                numerical interpretations in the original document.
              </p>
              {p.section && <p className="source-section">{p.section}</p>}
              <blockquote>{p.text}</blockquote>
            </div>
            <p className="subtle">
              Retrieved {d.retrievedAt?.slice(0, 10)} · Reporting period{" "}
              {d.period}. This archived document is not a current filing alert.
            </p>
            <RecordEvidence
              key={d.id + "-" + p.page}
              document={d}
              passage={p}
              onSave={saveRecord}
            />
          </>
        ) : (
          <p>
            Source could not be found. Return to the research view and retry.
          </p>
        )}
      </>
    );
  };
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => nav("brief")}
          aria-label="FINN home"
        >
          finn
          <span className="brand-dot" />
        </button>
        <div className="workspace">
          <span className="workspace-icon">K</span>
          <div>
            <strong>Kanak’s workspace</strong>
            <small>Demo portfolio</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {[
            ["brief", LayoutList, "Your brief"],
            ["research", Search, "Research"],
            ["people", Users, "People & expertise"],
          ].map(([id, C, label]) => (
            <button
              className={tab === id ? "selected" : ""}
              key={id}
              onClick={() => nav(id)}
            >
              <Icon as={C} />
              {label}
              {id === "brief" && (
                <span className="nav-count">{important.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="portfolio-label">
          <span>YOUR PORTFOLIO</span>
          <span>{portfolio.length}</span>
        </div>
        <div className="portfolio-list">
          {portfolio.slice(0, 7).map((c) => (
            <button
              key={c.ticker}
              onClick={() => {
                nav("research");
                runResearch(c.ticker);
              }}
            >
              <span className="company-square">{c.ticker.slice(0, 2)}</span>
              <span>{c.name}</span>
              <ChevronRight size={12} />
            </button>
          ))}
          <button
            className="all-companies"
            onClick={() => {
              nav("research");
              setQuery("");
            }}
          >
            View all 18 companies <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-foot">
          <span className="availability" /> Primary sources. Clear provenance.
          <small>Public documents · Synthetic contacts</small>
          <button onClick={showPreferences}>
            <SlidersHorizontal size={15} /> Preferences
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-brand"
            onClick={() => nav("brief")}
            aria-label="FINN home"
          >
            finn
            <span />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={12} />{" "}
            <strong>
              {view
                ? view.kind === "source"
                  ? "Source evidence"
                  : view.kind === "person"
                    ? "Network context"
                    : "Company update"
                : tab === "brief"
                  ? "Your brief"
                  : tab === "research"
                    ? "Company research"
                    : "People & expertise"}
            </strong>
          </div>
          <button
            className="top-search"
            onClick={() => {
              nav("research");
              setTimeout(() => input.current?.focus(), 50);
            }}
          >
            <Search size={15} /> Research a company <kbd>⌘ K</kbd>
          </button>
          <span className="user-avatar">KK</span>
        </header>
        <main
          id="main"
          className={view?.kind === "source" ? "wide-content" : "content"}
        >
          {view && (
            <button className="back" onClick={back}>
              <ArrowLeft size={16} /> Back to{" "}
              {stack.current.at(-1)?.view?.kind === "event"
                ? "company update"
                : tab === "research"
                  ? "research"
                  : tab === "people"
                    ? "People"
                    : "your brief"}
            </button>
          )}
          {error && (
            <div role="alert" className="notice error">
              <AlertCircle size={16} />
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {data.asOf && Date.now() - Date.parse(data.asOf) > 36 * 3600000 && (
            <p className="notice">
              This snapshot is more than 36 hours old. Refresh the source index
              before relying on its coverage.
            </p>
          )}
          {from && to && from > to && (
            <p role="alert" className="notice error">
              The start date must be on or before the end date.
            </p>
          )}
          {!data.asOf && !error ? (
            <div className="initial-loading" role="status">
              <h1>Loading your brief</h1>
              <p>Opening the indexed sources and portfolio snapshot…</p>
              <div />
              <div />
              <div />
            </div>
          ) : view?.kind === "source" ? (
            sourceView()
          ) : view?.kind === "event" ? (
            <>
              <div className="page-intro">
                <h1 ref={heading} tabIndex={-1}>
                  {view.event.title}
                </h1>
                <p>
                  {view.event.historical ? "Indexed" : "Published"}{" "}
                  {view.event.date} · {view.event.sourceType}
                  {view.event.historical ? " · Historical document" : ""}
                </p>
              </div>
              <div className="insight-box">
                <span>THE QUESTION</span>
                <h2>{view.event.question}</h2>
                <p>{view.event.description}</p>
              </div>
              <section className="section">
                <h3>Start with the evidence</h3>
                {view.event.url && (
                  <a
                    className="button secondary"
                    href={view.event.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read original BSE filing <ExternalLink size={15} />
                  </a>
                )}
                {docs(view.event.ticker)
                  .flatMap((d) =>
                    d.passages.slice(0, 2).map((p) => ({ ...p, document: d })),
                  )
                  .map((p, i) => (
                    <button
                      className="passage-preview"
                      key={i}
                      onClick={() => evidence(p)}
                    >
                      <div>
                        <span className="label">
                          {p.document.type} · PDF p. {p.page}
                        </span>
                        <p>{p.text.slice(0, 300)}…</p>
                      </div>
                      <ArrowUpRight size={19} />
                    </button>
                  ))}
              </section>
              <button
                className="button primary"
                onClick={() => {
                  setView(null);
                  runResearch(view.event.ticker, view.event.question);
                }}
              >
                Research this question <ArrowRight size={16} />
              </button>
              <PersonStrip t={view.event.ticker} />
              <button
                className="button secondary"
                onClick={() => mark(view.event.id)}
              >
                {reviewed.includes(view.event.id)
                  ? "Mark unread"
                  : "Mark reviewed"}
              </button>
            </>
          ) : view?.kind === "person" ? (
            <>
              <div className="page-intro">
                <h1 ref={heading} tabIndex={-1}>
                  {view.person.name}
                </h1>
                <p>
                  {view.person.role} · {company(view.person.company).name}
                </p>
              </div>
              <div className="insight-box">
                <h2>Why this experience is relevant</h2>
                <p>
                  {view.person.role} in {view.person.sector.toLowerCase()}, with
                  a role at {view.person.company} from {view.person.start} to{" "}
                  {view.person.end}. This is synthetic demonstration data, not a
                  claim about a real person.
                </p>
              </div>
              <section className="section">
                <h3>Your connection</h3>
                <Connection person={view.person} />
                <span className="label">
                  Evidence: versioned synthetic network fixture
                </span>
              </section>
              <section className="section">
                <h3>Questions to take into a conversation</h3>
                <ol className="questions">
                  <li>
                    Which operating indicators would help assess the company’s
                    stated priorities?
                  </li>
                  <li>
                    What industry constraints usually determine the pace of
                    execution?
                  </li>
                  <li>
                    Which disclosures would you compare at the next reporting
                    period?
                  </li>
                </ol>
                <p className="subtle">
                  General preparation prompts, not claims that this person knows
                  unpublished information.
                </p>
              </section>
            </>
          ) : tab === "brief" ? (
            <>
              <div className="page-intro brief-intro">
                <div>
                  <h1>
                    Your brief<span className="heading-period">.</span>
                  </h1>
                  <p>The changes worth a closer look.</p>
                </div>
                <div className="brief-stamp">
                  <BookOpen size={24} />
                  <span>
                    Reports, evidence,
                    <br />
                    people with context.
                  </span>
                </div>
              </div>
              <div className="filter-bar">
                <div className="segmented">
                  <button
                    className={windowMode === "archive" ? "active" : ""}
                    onClick={() => {
                      setWindow("archive");
                      setFrom("");
                      setTo("");
                    }}
                  >
                    Indexed archive
                  </button>
                  <button
                    className={windowMode === "24h" ? "active" : ""}
                    onClick={() => setWindow("24h")}
                  >
                    Last 24 hours
                  </button>
                </div>
                <select
                  aria-label="Filter company"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                >
                  <option value="">All companies</option>
                  {portfolio.map((c) => (
                    <option key={c.ticker}>{c.ticker}</option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  aria-label="Preferences"
                  onClick={showPreferences}
                >
                  <SlidersHorizontal size={17} />
                </button>
              </div>
              <div className="coverage">
                <span className="availability" />
                <span>{data.documents.length} primary documents indexed</span>
                <span className="coverage-divider" />
                <span>
                  {data.filings?.length
                    ? `${data.filings.length} BSE filing links · cached snapshot`
                    : "Archive · filing coverage unavailable"}
                </span>
                <button onClick={() => setShowReviewed((v) => !v)}>
                  {showReviewed ? "Hide reviewed" : "Show reviewed"}
                </button>
              </div>
              <div className="section-line attention-heading">
                <h2>
                  Worth your attention <span>{important.length}</span>
                </h2>
              </div>
              <p className="market-provenance">
                Snapshot checked {data.asOf?.slice(0, 10) || "—"}. Filing dates
                are publication dates; archived report dates show when FINN
                indexed them.
              </p>
              {important.length ? (
                important.map((e, i) => (
                  <EventRow key={e.id} e={e} featured={i === 0} />
                ))
              ) : (
                <div className="empty">
                  <ShieldCheck size={28} />
                  <h2>
                    {windowMode === "24h"
                      ? "No indexed events in the last 24 hours"
                      : "Nothing in this selection"}
                  </h2>
                  <p>
                    This snapshot contains up to five recent filings per
                    company. Missing items or a quiet window do not establish
                    that no new disclosures exist.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setWindow("archive");
                      setTicker("");
                      setShowReviewed(true);
                    }}
                  >
                    Explore indexed documents
                  </button>
                </div>
              )}
              <button
                className="routine-toggle"
                aria-expanded={routine}
                onClick={() => setRoutine((v) => !v)}
              >
                <span>
                  <ChevronDown size={16} className={routine ? "rotated" : ""} />{" "}
                  Other indexed disclosures
                </span>
                <span>{ordinary.length}</span>
              </button>
              {routine && ordinary.map((e) => <EventRow e={e} key={e.id} />)}
              <section className="market-section">
                {signals.length > 0 && (
                  <>
                    <div className="section-line">
                      <h2>Thresholds crossed</h2>
                      <button className="text-button" onClick={showPreferences}>
                        Change thresholds
                      </button>
                    </div>
                    {signals.map((s) => (
                      <div className="signal-row" key={s.ticker}>
                        <div>
                          <strong>{s.ticker}</strong>
                          <p>{s.reasons.join(" · ")}</p>
                          <span className="label">
                            Session {s.session} · Indexed EOD data
                          </span>
                        </div>
                        <button
                          className="button secondary"
                          onClick={() => runResearch(s.ticker)}
                        >
                          Investigate <ArrowRight size={15} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
                <div className="section-line">
                  <h2>Portfolio at last close</h2>
                  <span className="label">END OF DAY</span>
                </div>
                <p className="market-provenance">
                  INR · Yahoo Finance via yfinance · Provider-adjusted close.
                  Each row shows its available session; this is not a live price
                  feed.
                </p>
                <div className="market-table">
                  {portfolio.map((c) => {
                    const m = data.market[c.ticker];
                    return (
                      <button
                        key={c.ticker}
                        onClick={() => runResearch(c.ticker)}
                      >
                        <span>
                          <strong>{c.ticker}</strong>
                          <small>{c.name}</small>
                        </span>
                        <span>
                          {m
                            ? `₹${m.close.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                          <small>{m?.session || "Not fetched"}</small>
                        </span>
                        <span
                          className={m?.change >= 0 ? "positive" : "negative"}
                        >
                          {m?.change != null
                            ? `${m.change > 0 ? "+" : ""}${m.change.toFixed(2)}%`
                            : "Unavailable"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <footer className="page-foot">
                <ShieldCheck size={14} /> Evidence is a starting point. Judgment
                stays with you.
              </footer>
            </>
          ) : tab === "research" ? (
            <>
              <div className="page-intro">
                <h1>
                  A question, with evidence
                  <span className="heading-period">.</span>
                </h1>
                <p>
                  Start with an NSE company. Stay close to what it reported.
                </p>
              </div>
              <form
                className="research-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  runResearch(query);
                }}
              >
                <Search size={21} />
                <input
                  ref={input}
                  aria-label="NSE ticker"
                  placeholder="Enter an NSE ticker, e.g. INFY"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="button primary" disabled={busy}>
                  Research <ArrowRight size={16} />
                </button>
              </form>
              <div className="suggestions">
                {["INFY", "TCS", "COFORGE", "PERSISTENT", "TATACONSUM"].map(
                  (t) => (
                    <button key={t} onClick={() => runResearch(t)}>
                      {t}
                      <ArrowUpRight size={12} />
                    </button>
                  ),
                )}
              </div>
              {research ? (
                <section className="research-result">
                  <div className="section-line">
                    <div>
                      <span className="ticker">{research.ticker}</span>
                      <h2>{company(research.ticker).name}</h2>
                    </div>
                    <span className="label">
                      {busy || indexing
                        ? "IN PROGRESS"
                        : research.error
                          ? "INCOMPLETE"
                          : research.mode === "discovery"
                            ? "DOCUMENT DISCOVERY"
                            : "PRIMARY-SOURCE EXCERPTS"}
                    </span>
                  </div>
                  {busy || indexing ? (
                    <div className="loading" role="status">
                      <RefreshCw size={20} className="spin" />
                      {research.status}
                    </div>
                  ) : research.error ? (
                    <div className="notice error">
                      <AlertCircle size={19} />
                      <div>
                        <strong>Research could not complete</strong>
                        <p>{research.error}</p>
                        <p>
                          Existing indexed evidence remains available. Try an
                          indexed ticker or run the documented ingestion
                          workflow.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="question-display">{research.question}</p>
                      <form
                        className="followup-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          runResearch(research.ticker, question);
                          setQuestion("");
                        }}
                      >
                        <label htmlFor="research-question">
                          Investigate a specific question
                        </label>
                        <div>
                          <input
                            id="research-question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g. What did management say about margins?"
                            required
                          />
                          <button className="button secondary">
                            Find evidence <ArrowRight size={15} />
                          </button>
                        </div>
                      </form>
                      <div className="coverage research-coverage">
                        <ShieldCheck size={15} />
                        {research.documents?.length || 0} indexed documents ·{" "}
                        {research.mode === "discovery"
                          ? "Awaiting document selection"
                          : research.mode === "model"
                            ? "AI synthesis, supported by retrieved passages"
                            : "Exact passages · no model interpretation"}
                      </div>
                      <button className="text-button" onClick={findSources}>
                        Find more reports &amp; transcripts{" "}
                        <RefreshCw size={14} />
                      </button>
                      {research.documents?.some((d) => d.partial) && (
                        <p className="notice">
                          Partial coverage: only the first 300 pages of a large
                          PDF were indexed. Open the original for the full
                          document.
                        </p>
                      )}
                      {research.warning && (
                        <p className="notice">{research.warning}</p>
                      )}
                      {research.mode === "discovery" && (
                        <div className="notice">
                          <Info size={17} />
                          <span>
                            {foundSources.length
                              ? "Original documents found. Choose one to read and index in this browser."
                              : "No original PDFs were found. Try another symbol or use the official-PDF ingestion workflow in the repository."}{" "}
                            Extraction runs locally; no model credits are
                            needed.
                          </span>
                        </div>
                      )}
                      {foundSources.length > 0 && (
                        <section className="source-discovery">
                          <h3>Original documents available</h3>
                          {foundSources.map((source, i) => (
                            <div key={source.url} className="source-choice">
                              <div>
                                <strong>{source.title}</strong>
                                <small>{new URL(source.url).hostname}</small>
                              </div>
                              <button
                                className="button secondary"
                                onClick={() => importSource(source)}
                                disabled={indexing}
                              >
                                Read document <ArrowRight size={15} />
                              </button>
                            </div>
                          ))}
                        </section>
                      )}
                      {research.answer && (
                        <div className="answer">{research.answer}</div>
                      )}
                      <FinancialAnalysis
                        key={research.ticker}
                        ticker={research.ticker}
                        facts={[...(data.facts || []), ...localFacts]}
                        guidance={[...(data.guidance || []), ...localGuidance]}
                        documents={data.documents}
                        onSource={factEvidence}
                        onRemove={removeRecord}
                        context={financeSelections[research.ticker] || {}}
                        onContext={(value) =>
                          setFinanceSelections((prev) => ({
                            ...prev,
                            [research.ticker]: {
                              ...prev[research.ticker],
                              ...value,
                            },
                          }))
                        }
                      />
                      {research.documents?.length > 0 && (
                        <PersonStrip t={research.ticker} />
                      )}{" "}
                      {!research.passages?.length &&
                        research.documents?.length > 0 && (
                          <p className="notice">
                            No matching passage was found for this question. Try
                            a broader term or index another original report.
                          </p>
                        )}
                      {research.passages?.map((p, i) => (
                        <button
                          className="passage-preview"
                          key={i}
                          onClick={() => evidence(p)}
                        >
                          <div>
                            <span className="source-number">[{i + 1}]</span>
                            <span className="label">
                              {p.document.title} · PDF p. {p.page}
                            </span>
                            <p>
                              {p.text.slice(0, 430)}
                              {p.text.length > 430 ? "…" : ""}
                            </p>
                            <span className="text-link">
                              Read the source <ArrowUpRight size={13} />
                            </span>
                          </div>
                        </button>
                      ))}
                      <div className="notice">
                        <Info size={17} />
                        <span>
                          Financial conclusions use the reviewed records shown
                          above. Missing metrics and open target periods remain
                          unresolved.
                        </span>
                      </div>
                    </>
                  )}
                </section>
              ) : (
                <>
                  <div className="section-line section">
                    <h2>Start from your portfolio</h2>
                    <span className="label">18 COMPANIES</span>
                  </div>
                  <div className="company-grid">
                    {portfolio.map((c) => (
                      <button
                        key={c.ticker}
                        onClick={() => runResearch(c.ticker)}
                      >
                        <span className="company-square">
                          {c.ticker.slice(0, 2)}
                        </span>
                        <strong>
                          {c.name}
                          <small>
                            {c.ticker} · {c.sector}
                          </small>
                        </strong>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="page-intro">
                <h1>
                  Who could help you understand?
                  <span className="heading-period" />
                </h1>
                <p>Find relevant experience, with a clear reason to connect.</p>
              </div>
              <div className="research-form">
                <Search size={20} />
                <input
                  aria-label="Find network expertise"
                  placeholder="Company, sector or experience"
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                />
              </div>
              <div className="notice">
                <Users size={17} />
                <span>
                  All 36 profiles and relationships are synthetic. These are
                  demonstration records, not real acquaintances.
                </span>
              </div>
              <div className="people-list">
                {people
                  .filter((p) =>
                    `${p.name} ${p.role} ${p.company} ${p.sector}`
                      .toLowerCase()
                      .includes(networkFilter.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      className="person-row"
                      key={p.id}
                      onClick={() =>
                        open({ kind: "person", person: p, ticker: p.company })
                      }
                    >
                      <span className="avatar">{p.name.slice(0, 1)}</span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.role} · {p.company}
                        </small>
                        <em>
                          {p.sector} · {p.start}–{p.end} · {p.relationship}
                        </em>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
              </div>
              {!people.some((p) =>
                `${p.name} ${p.role} ${p.company} ${p.sector}`
                  .toLowerCase()
                  .includes(networkFilter.toLowerCase()),
              ) && (
                <div className="empty">
                  <h2>No matching experience found</h2>
                  <p>
                    Try a company ticker or a broader sector. No relationship is
                    inferred from an empty result.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <nav className="bottom-nav">
        {[
          ["brief", LayoutList, "Brief"],
          ["research", Search, "Research"],
          ["people", Users, "People"],
        ].map(([t, C, l]) => (
          <button
            className={tab === t ? "selected" : ""}
            onClick={() => nav(t)}
            key={t}
          >
            <C size={21} />
            {l}
          </button>
        ))}
      </nav>
      {settings && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettings(false);
          }}
        >
          <Preferences
            onClose={() => setSettings(false)}
            returnFocus={preferenceTrigger.current}
          >
            <div className="section-line">
              <h2 id="settings-title">Your preferences</h2>
              <button
                className="icon-button"
                autoFocus
                onClick={() => setSettings(false)}
                aria-label="Close preferences"
              >
                <X />
              </button>
            </div>
            <p>
              Thresholds apply to the indexed end-of-day snapshot. Fresh alerts
              require a data refresh.
            </p>
            <label>
              Daily price move (%)
              <input
                type="number"
                min="1"
                max="100"
                value={threshold.price}
                onChange={(e) =>
                  setThreshold({ ...threshold, price: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Volume versus prior 20-session average
              <input
                type="number"
                min="1"
                max="100"
                step=".1"
                value={threshold.volume}
                onChange={(e) =>
                  setThreshold({ ...threshold, volume: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Archive from
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setWindow("archive");
                }}
              />
            </label>
            <label>
              Archive through
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              className="button primary"
              onClick={() => setSettings(false)}
            >
              Save preferences <Check size={16} />
            </button>
          </Preferences>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
