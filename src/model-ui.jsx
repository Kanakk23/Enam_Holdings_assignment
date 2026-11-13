import React, { useEffect, useRef, useState } from "react";
import { X, Check, RefreshCw, ExternalLink } from "lucide-react";
import { modelProviders, allowedModel } from "./model-config.mjs";

export function AiSetup({ active, server, onConnect, onClose, returnFocus }) {
  const dialog = useRef(null);
  const pending = useRef(null);
  const initial = active?.provider && active.provider !== "off" ? active.provider : "groq";
  const [provider, setProvider] = useState(initial);
  const [model, setModel] = useState(active?.model || modelProviders[initial].defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current.showModal();
    return () => { pending.current?.abort(); returnFocus?.focus(); };
  }, []);
  async function connect(e) {
    e.preventDefault();
    setBusy(true); setError(""); setStatus("");
    const ai = { provider, model: model.trim(), apiKey: apiKey.trim() };
    const controller = new AbortController(); pending.current = controller;
    try {
      const response = await fetch("/api/model/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai }), signal: controller.signal, cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Error(result.error || "Connection check failed. Try again.");
      onConnect(ai);
      setApiKey("");
      setStatus(`${modelProviders[provider].label} connected. Return to Research and run your question to generate a cited answer.`);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const current = active?.provider === "off" ? "AI disabled for this tab" : active?.provider ? `${modelProviders[active.provider].label} · ${active.model}` : server?.provider ? `Server configured · ${modelProviders[server.provider]?.label || server.provider}` : "No provider connected";
  return <dialog className="ai-dialog" ref={dialog} aria-labelledby="ai-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="section-line">
      <h2 id="ai-title">Connect AI research</h2>
      <button className="icon-button" onClick={onClose} aria-label="Close AI setup"><X size={20} /></button>
    </div>
    <p>Add concise synthesis to the original passages. Financial calculations continue to use the evidence ledger.</p>
    <p className="ai-status" aria-live="polite">{current}</p>
    <form onSubmit={connect}>
      <label htmlFor="ai-provider">Provider</label>
      <select id="ai-provider" value={provider} disabled={busy} onChange={e => {
        const value = e.target.value; setProvider(value); setModel(modelProviders[value].defaultModel);
        setApiKey(""); setStatus(""); setError("");
      }}>
        {Object.entries(modelProviders).map(([value, p]) => <option key={value} value={value}>{p.label}</option>)}
      </select>
      <label htmlFor="ai-model">Model</label>
      {modelProviders[provider].models ? <select id="ai-model" value={model} disabled={busy} onChange={e => { setModel(e.target.value); setStatus(""); }}>
        {modelProviders[provider].models.map(m => <option key={m} value={m}>{m}</option>)}
      </select> : <input id="ai-model" value={model} disabled={busy} maxLength={120} onChange={e => setModel(e.target.value)} required aria-describedby="ai-cost" />}
      <p id="ai-cost" className="subtle">{modelProviders[provider].note}</p>
      <label htmlFor="ai-key">API key</label>
      <input id="ai-key" type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={apiKey} disabled={busy} onChange={e => setApiKey(e.target.value)} minLength={10} maxLength={512} required placeholder="Paste your key here" aria-describedby="ai-key-use" />
      <a className="text-button" href={modelProviders[provider].keyUrl} target="_blank" rel="noreferrer">Get a {modelProviders[provider].label} key <ExternalLink size={13} /></a>
      <p id="ai-key-use" className="subtle">Your key stays in this tab’s memory. It is sent over HTTPS to FINN’s server and the selected provider, and is not saved to browser storage or the repository. Reloading clears it.</p>
      <p className="subtle">Testing makes one short API request. Research sends your question and retrieved annual-report or transcript passages to this provider. Network profiles are excluded.</p>
      <button className="button primary" disabled={busy || !allowedModel(provider, model.trim())}>
        {busy ? <><RefreshCw size={15} className="spin" /> Testing connection…</> : <>Test &amp; connect <Check size={15} /></>}
      </button>
    </form>
    {error && <p className="notice error" role="alert">{error}</p>}
    {status && <p className="notice" role="status">{status}</p>}
    <div className="ai-actions">
      <button className="text-button" disabled={busy} onClick={() => { onConnect({ provider: "off" }); setApiKey(""); setStatus("AI disconnected. Research will show exact source passages."); setError(""); }}>Disconnect AI</button>
      <button className="button secondary" onClick={onClose}>Done</button>
    </div>
  </dialog>;
}

export function ModelAnswer({ research, onSource }) {
  return <section className="model-answer" aria-labelledby="model-answer-title">
    <div className="section-line"><h3 id="model-answer-title">AI research note</h3><span className="label">{modelProviders[research.provider]?.label || "AI"}</span></div>
    <p className="subtle">{research.model} · Generated from the passages below. Check the cited originals before relying on a claim.</p>
    <div className="answer">{research.answer.split(/(\[\d+\])/g).map((text, i) => {
      const ref = /^\[(\d+)\]$/.exec(text);
      const passage = ref && research.passages[Number(ref[1]) - 1];
      return passage ? <button key={i} className="inline-citation" onClick={() => onSource(passage)} aria-label={`Open source passage ${ref[1]}`}>{text}</button> : <React.Fragment key={i}>{text}</React.Fragment>;
    })}</div>
  </section>;
}
