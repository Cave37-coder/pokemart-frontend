"use client";
// Poke-Trade (2026-11-07) -- Michael: "a trading app, keep 2 collections of
// selected cards, so you can see relative values, based purely on current tcg
// price ... cellphone based with link from our website to install on your
// phone. It must make making trades easy on trade day!"
//
// One screen: "You give" and "You get" piles, a balance bar that always shows
// who is up, and a search sheet that stays open so cards can be added fast.
// Everything is kept on the phone (localStorage) -- no login needed. Values
// come from /api/trade/ (TCG market price in Rand, no shop markup) and the
// site's own condition multipliers.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

type Side = "give" | "get";
type Cond = "NM" | "LP" | "MP" | "HP" | "DMG";
const COND_MULT: Record<Cond, number> = { NM: 1, LP: 0.84, MP: 0.65, HP: 0.45, DMG: 0.3 };
const CONDS: Cond[] = ["NM", "LP", "MP", "HP", "DMG"];

interface Item {
  key: string;
  kind: "card" | "cash" | "other";
  id?: number;
  name: string;
  set_code?: string;
  number?: string;
  variant_label?: string;
  image?: string;
  unit: number | null; // NM value per card, Rand
  cond: Cond;
  qty: number;
}
interface Trade {
  id: string;
  partner: string;
  created: number;
  updated: number;
  give: Item[];
  get: Item[];
}
interface Result {
  id: number;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  variant: string;
  variant_label: string;
  rarity: string;
  image: string;
  tcg_zar: number | null;
}
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CURRENT_KEY = "pt-current";
const HISTORY_KEY = "pt-history";
const FAIR_PCT = 5; // within 5% of the bigger side counts as even

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const newTrade = (): Trade => ({ id: uid(), partner: "", created: Date.now(), updated: Date.now(), give: [], get: [] });

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the trade still works for this session */
  }
}

const money = (n: number) =>
  "R" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const itemValue = (it: Item) => (it.unit ?? 0) * (it.kind === "card" ? COND_MULT[it.cond] : 1) * it.qty;
const sideTotal = (items: Item[]) => items.reduce((s, it) => s + itemValue(it), 0);
const cards = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;
const sideCount = (items: Item[]) => items.reduce((s, it) => s + (it.kind === "cash" ? 0 : it.qty), 0);

export default function PokeTradePage() {
  const [trade, setTrade] = useState<Trade>(newTrade);
  const [history, setHistory] = useState<Trade[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Side>("give");
  const [sheet, setSheet] = useState<null | "add" | "saved" | "install">(null);
  const [toast, setToast] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  // True only when running as the installed Poke-Trade app itself. Opened
  // from inside the installed PokeBulk app, /trade is also "standalone" but
  // is NOT Poke-Trade's own install -- so the Install button must still show.
  const [ownApp, setOwnApp] = useState(false);

  // Load from the phone on first open.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setTrade(load<Trade>(CURRENT_KEY, newTrade()));
      setHistory(load<Trade[]>(HISTORY_KEY, []));
      const sa = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      setStandalone(sa);
      setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      setIsAndroid(/Android/i.test(navigator.userAgent));
      // The installed Poke-Trade app always starts at /trade?app=1 (its manifest
      // start_url); remember that for the rest of this app session.
      let own = false;
      try {
        if (new URLSearchParams(window.location.search).get("app") === "1") sessionStorage.setItem("pt-own-app", "1");
        own = sessionStorage.getItem("pt-own-app") === "1";
      } catch { /* ignore */ }
      setOwnApp(sa && own);
      setReady(true);
    }, 0);
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstallEvt(null); setOwnApp(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => { if (ready) save(CURRENT_KEY, trade); }, [trade, ready]);
  useEffect(() => { if (ready) save(HISTORY_KEY, history); }, [history, ready]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(t => (t === msg ? "" : t)), 1600);
  }, []);

  const update = useCallback((fn: (t: Trade) => Trade) => {
    setTrade(t => ({ ...fn(t), updated: Date.now() }));
  }, []);

  const addItem = useCallback((side: Side, item: Item) => {
    update(t => {
      const list = t[side];
      const same = item.kind === "card" ? list.find(i => i.kind === "card" && i.id === item.id && i.cond === item.cond) : undefined;
      const next = same ? list.map(i => (i === same ? { ...i, qty: i.qty + 1 } : i)) : [...list, item];
      return { ...t, [side]: next };
    });
  }, [update]);

  const changeItem = (side: Side, key: string, patch: Partial<Item>) =>
    update(t => ({ ...t, [side]: t[side].map(i => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (side: Side, key: string) =>
    update(t => ({ ...t, [side]: t[side].filter(i => i.key !== key) }));

  const give = sideTotal(trade.give);
  const get = sideTotal(trade.get);
  const diff = get - give; // > 0: you get more than you give
  const bigger = Math.max(give, get);
  const even = bigger === 0 || Math.abs(diff) <= Math.max(bigger * (FAIR_PCT / 100), 5);
  const pct = bigger > 0 ? Math.round((Math.abs(diff) / bigger) * 100) : 0;
  const giveShare = give + get > 0 ? (give / (give + get)) * 100 : 50;

  const anyTbc = [...trade.give, ...trade.get].some(i => i.kind === "card" && i.unit == null);

  // Re-price every card from today's market (prices change nightly).
  const refreshPrices = useCallback(async (quiet = false) => {
    const ids = Array.from(new Set([...trade.give, ...trade.get].filter(i => i.kind === "card" && i.id).map(i => i.id as number)));
    if (!ids.length) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/trade/prices/?ids=${ids.join(",")}`);
      if (!res.ok) throw new Error();
      const data: { prices: Record<string, number | null> } = await res.json();
      const fix = (list: Item[]) => list.map(i => (i.kind === "card" && i.id && String(i.id) in data.prices ? { ...i, unit: data.prices[String(i.id)] } : i));
      update(t => ({ ...t, give: fix(t.give), get: fix(t.get) }));
      if (!quiet) flash("Prices updated to today's market");
    } catch {
      if (!quiet) flash("No connection. Prices not updated");
    } finally {
      setRefreshing(false);
    }
  }, [trade.give, trade.get, update, flash]);

  const startNew = () => {
    if ((trade.give.length || trade.get.length) && !window.confirm("Start a new trade? Save this one first if you want to keep it.")) return;
    setTrade(newTrade());
    setTab("give");
  };

  const saveTrade = () => {
    if (!trade.give.length && !trade.get.length) { flash("Add cards first"); return; }
    setHistory(h => [{ ...trade, updated: Date.now() }, ...h.filter(x => x.id !== trade.id)].slice(0, 100));
    flash("Trade saved");
  };

  const openSaved = (t: Trade) => {
    setTrade(t);
    setSheet(null);
    window.setTimeout(() => refreshPrices(true), 50);
  };

  const swapSides = () => {
    update(t => ({ ...t, give: t.get, get: t.give }));
    flash("Sides swapped");
  };

  const shareText = useMemo(() => {
    const line = (i: Item) =>
      i.kind === "cash" ? `  Cash ${money(i.unit ?? 0)}`
        : `  ${i.qty > 1 ? i.qty + "x " : ""}${i.name}${i.set_code ? ` (${i.set_code} ${i.number ?? ""}${i.variant_label ? ", " + i.variant_label : ""})` : ""}${i.kind === "card" && i.cond !== "NM" ? " " + i.cond : ""}: ${i.unit == null ? "TBC" : money(itemValue(i))}`;
    const who = trade.partner ? ` with ${trade.partner}` : "";
    return [
      `Poke-Trade${who}`,
      `I give: ${money(give)}`, ...trade.give.map(line),
      `I get: ${money(get)}`, ...trade.get.map(line),
      even ? "Even trade" : diff > 0 ? `I'm up ${money(diff)}` : `I'm down ${money(-diff)}`,
      "Valued at TCG market price - pokebulk.co.za/trade",
    ].join("\n");
  }, [trade, give, get, diff, even]);

  const share = async () => {
    if (!trade.give.length && !trade.get.length) { flash("Add cards first"); return; }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: "Poke-Trade", text: shareText }); return; } catch { /* cancelled */ return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const install = async () => {
    if (installEvt && !standalone) {
      await installEvt.prompt();
      setInstallEvt(null);
    } else {
      setSheet("install");
    }
  };

  const list = trade[tab];

  return (
    <div className="pt">
      <style>{CSS}</style>

      <header className="pt-top">
        <div className="pt-brand">
          <span className="pt-logo" aria-hidden>
            <i className="a1" /><i className="a2" />
          </span>
          <span>Poke-Trade</span>
        </div>
        <div className="pt-top-actions">
          {!ownApp && <button className="pt-ghost" onClick={install}>Install</button>}
          <button className="pt-ghost" onClick={() => setSheet("saved")}>Saved{history.length ? ` (${history.length})` : ""}</button>
          <button className="pt-ghost" onClick={startNew}>New</button>
        </div>
      </header>

      <section className={`pt-balance ${even ? "is-even" : diff > 0 ? "is-up" : "is-down"}`} aria-live="polite">
        <div className="pt-verdict">
          {bigger === 0 ? "Add cards to both sides"
            : even ? "Even trade"
            : diff > 0 ? `You're up ${money(diff)}`
            : `You're down ${money(-diff)}`}
          {!even && bigger > 0 && <small>{pct}%</small>}
          {even && bigger > 0 && Math.abs(diff) >= 0.01 && <small>{diff > 0 ? "you're up" : "you're down"} {money(Math.abs(diff))}</small>}
        </div>
        <div className="pt-bar" role="img" aria-label={`You give ${money(give)}, you get ${money(get)}`}>
          <div className="pt-bar-give" style={{ width: `${giveShare}%` }} />
          <div className="pt-bar-get" />
          <div className="pt-bar-mid" />
        </div>
        <div className="pt-totals">
          <button className={tab === "give" ? "on" : ""} onClick={() => setTab("give")}>
            <span>You give</span><b>{money(give)}</b><em>{cards(sideCount(trade.give))}</em>
          </button>
          <button className={tab === "get" ? "on" : ""} onClick={() => setTab("get")}>
            <span>You get</span><b>{money(get)}</b><em>{cards(sideCount(trade.get))}</em>
          </button>
        </div>
        {!even && bigger > 0 && (
          <p className="pt-hint">
            {diff > 0
              ? `To even it up, add ${money(diff)} to your side, or take a card off theirs.`
              : `To even it up, ask for ${money(-diff)} more from them, in cash or another card.`}
          </p>
        )}
        {anyTbc && <p className="pt-hint warn">Some cards have no market price yet (TBC) and count as R0.</p>}
      </section>

      <input
        className="pt-partner"
        placeholder="Trading with (optional name)"
        value={trade.partner}
        onChange={e => update(t => ({ ...t, partner: e.target.value }))}
      />

      <main className="pt-list">
        {list.length === 0 && (
          <div className="pt-empty">
            <p>{tab === "give" ? "Add the cards you're handing over." : "Add the cards you're getting."}</p>
            <button className="pt-primary" onClick={() => setSheet("add")}>Add a card</button>
          </div>
        )}
        {list.map(it => (
          <ItemRow
            key={it.key}
            item={it}
            onCond={c => changeItem(tab, it.key, { cond: c })}
            onQty={q => (q <= 0 ? removeItem(tab, it.key) : changeItem(tab, it.key, { qty: q }))}
            onRemove={() => removeItem(tab, it.key)}
          />
        ))}
      </main>

      <footer className="pt-dock">
        <button className={`pt-primary pt-add ${tab}`} onClick={() => setSheet("add")}>
          Add to {tab === "give" ? "You give" : "You get"}
        </button>
        <div className="pt-dock-row">
          <button onClick={swapSides}>Swap sides</button>
          <button onClick={() => refreshPrices()} disabled={refreshing}>{refreshing ? "Pricing..." : "Re-price"}</button>
          <button onClick={saveTrade}>Save</button>
          <button onClick={share}>Share</button>
        </div>
        <p className="pt-note">Values are the TCG market price in Rand, updated nightly. Played cards use the PokeBulk condition guide (LP 84%, MP 65%, HP 45%, DMG 30%).</p>
      </footer>

      {sheet === "add" && (
        <AddSheet
          side={tab}
          onSide={setTab}
          onClose={() => setSheet(null)}
          onAdd={(side, item, label) => { addItem(side, item); flash(label); }}
        />
      )}

      {sheet === "saved" && (
        <Sheet title="Saved trades" onClose={() => setSheet(null)}>
          {history.length === 0 && <p className="pt-muted">Trades you save show up here.</p>}
          {history.map(h => {
            const g = sideTotal(h.give), r = sideTotal(h.get);
            return (
              <div key={h.id} className="pt-saved">
                <button className="pt-saved-main" onClick={() => openSaved(h)}>
                  <b>{h.partner || "Trade"}</b>
                  <span>{new Date(h.updated).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>Give {money(g)} / Get {money(r)}</span>
                </button>
                <button className="pt-x" aria-label="Delete saved trade" onClick={() => {
                  if (window.confirm("Delete this saved trade?")) setHistory(x => x.filter(y => y.id !== h.id));
                }}>✕</button>
              </div>
            );
          })}
        </Sheet>
      )}

      {sheet === "install" && (
        <Sheet title="Put Poke-Trade on your phone" onClose={() => setSheet(null)}>
          {standalone && (
            <div className="pt-inapp">
              <p>You opened Poke-Trade inside the PokeBulk app, where it works as a normal page. To get it as its own app with its own icon, open it in your phone&apos;s browser first:</p>
              {isAndroid ? (
                <a className="pt-primary pt-link" href="intent://www.pokebulk.co.za/trade#Intent;scheme=https;package=com.android.chrome;end">Open in Chrome</a>
              ) : (
                <button className="pt-primary" onClick={async () => {
                  try { await navigator.clipboard.writeText("https://www.pokebulk.co.za/trade"); flash("Link copied. Paste it in Safari"); }
                  catch { flash("Go to pokebulk.co.za/trade in Safari"); }
                }}>Copy the link for Safari</button>
              )}
              <p className="pt-muted">Then follow these steps there:</p>
            </div>
          )}
          {isIos ? (
            <ol className="pt-steps">
              <li>Open this page in Safari.</li>
              <li>Tap the Share button at the bottom of the screen.</li>
              <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            </ol>
          ) : (
            <ol className="pt-steps">
              <li>Open this page in Chrome.</li>
              <li>Tap the ⋮ menu at the top right.</li>
              <li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li>
            </ol>
          )}
          <p className="pt-muted">Poke-Trade then opens from its own icon, full screen, and keeps your trades on the phone.</p>
        </Sheet>
      )}

      {toast && <div className="pt-toast" role="status">{toast}</div>}
    </div>
  );
}

function ItemRow({ item, onCond, onQty, onRemove }: {
  item: Item;
  onCond: (c: Cond) => void;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  if (item.kind === "cash") {
    return (
      <div className="pt-row">
        <div className="pt-thumb cash">R</div>
        <div className="pt-info"><b>Cash</b></div>
        <div className="pt-val">{money(item.unit ?? 0)}</div>
        <button className="pt-x" aria-label="Remove cash" onClick={onRemove}>✕</button>
      </div>
    );
  }
  return (
    <div className="pt-row">
      {item.image ? <img className="pt-thumb" src={item.image} alt="" loading="lazy" /> : <div className="pt-thumb other">?</div>}
      <div className="pt-info">
        <b>{item.name}</b>
        {item.kind === "card" && <span>{item.set_code} {item.number}{item.variant_label ? ` · ${item.variant_label}` : ""}</span>}
        <div className="pt-ctrls">
          {item.kind === "card" && (
            <select value={item.cond} onChange={e => onCond(e.target.value as Cond)} aria-label="Condition">
              {CONDS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="pt-qty">
            <button aria-label="One less" onClick={() => onQty(item.qty - 1)}>−</button>
            <span>{item.qty}</span>
            <button aria-label="One more" onClick={() => onQty(item.qty + 1)}>+</button>
          </div>
        </div>
      </div>
      <div className="pt-val">
        {item.unit == null ? "TBC" : money(itemValue(item))}
        {item.qty > 1 && item.unit != null && <small>{money(itemValue(item) / item.qty)} each</small>}
      </div>
      <button className="pt-x" aria-label={`Remove ${item.name}`} onClick={onRemove}>✕</button>
    </div>
  );
}

function AddSheet({ side, onSide, onClose, onAdd }: {
  side: Side;
  onSide: (s: Side) => void;
  onClose: () => void;
  onAdd: (side: Side, item: Item, label: string) => void;
}) {
  const [mode, setMode] = useState<"card" | "cash" | "other">("card");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const listTop = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [cash, setCash] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherVal, setOtherVal] = useState("");
  const [pulse, setPulse] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => { if (mode === "card") inputRef.current?.focus(); }, [mode]);

  // New search words always start again at page 1.
  const onQuery = (v: string) => { setQ(v); setPage(1); };

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`${API}/api/trade/search/?q=${encodeURIComponent(term)}&page=${page}`);
        if (!res.ok) throw new Error();
        const data: { results: Result[]; total_matches: number; page?: number; pages?: number } = await res.json();
        if (mine !== seq.current) return;
        setResults(data.results);
        setTotal(data.total_matches);
        setPages(data.pages ?? 1);
        setState("idle");
        listTop.current?.scrollIntoView({ block: "nearest" });
      } catch {
        if (mine === seq.current) setState("error");
      }
    }, page > 1 ? 0 : 300);
    return () => window.clearTimeout(t);
  }, [q, page]);

  const PAGE = 40;
  const from = total ? (page - 1) * PAGE + 1 : 0;
  const to = Math.min(page * PAGE, total);
  const pager = showPager();
  function showPager() {
    if (q.trim().length < 2 || pages <= 1) return null;
    return (
      <div className="pt-pager">
        <button disabled={page <= 1 || state === "loading"} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages || state === "loading"} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
      </div>
    );
  }

  const sideName = side === "give" ? "You give" : "You get";

  const pick = (r: Result) => {
    onAdd(side, {
      key: uid(), kind: "card", id: r.id, name: r.name, set_code: r.set_code, number: r.number,
      variant_label: r.variant_label, image: r.image, unit: r.tcg_zar, cond: "NM", qty: 1,
    }, `Added to ${sideName}`);
    setPulse(r.id);
    window.setTimeout(() => setPulse(p => (p === r.id ? null : p)), 600);
  };

  const addCash = () => {
    const v = parseFloat(cash.replace(",", "."));
    if (!(v > 0)) return;
    onAdd(side, { key: uid(), kind: "cash", name: "Cash", unit: v, cond: "NM", qty: 1 }, `Cash added to ${sideName}`);
    setCash("");
  };
  const addOther = () => {
    const v = parseFloat(otherVal.replace(",", "."));
    if (!otherName.trim() || !(v >= 0)) return;
    onAdd(side, { key: uid(), kind: "other", name: otherName.trim(), unit: v, cond: "NM", qty: 1 }, `Added to ${sideName}`);
    setOtherName(""); setOtherVal("");
  };

  const showResults = q.trim().length >= 2;

  return (
    <Sheet title="Add to trade" onClose={onClose} tall>
      <div className="pt-seg" role="tablist" aria-label="Which side">
        <button className={side === "give" ? "on give" : ""} onClick={() => onSide("give")}>You give</button>
        <button className={side === "get" ? "on get" : ""} onClick={() => onSide("get")}>You get</button>
      </div>
      <div className="pt-modes">
        <button className={mode === "card" ? "on" : ""} onClick={() => setMode("card")}>Card</button>
        <button className={mode === "cash" ? "on" : ""} onClick={() => setMode("cash")}>Cash</button>
        <button className={mode === "other" ? "on" : ""} onClick={() => setMode("other")}>Other item</button>
      </div>

      {mode === "card" && (
        <>
          <input
            ref={inputRef}
            className="pt-search"
            type="search"
            inputMode="search"
            placeholder="Card name, then set or number, e.g. charizard bs 4"
            value={q}
            onChange={e => onQuery(e.target.value)}
          />
          <div className="pt-results" ref={listTop}>
            {q.trim().length >= 2 && total > 0 && (
              <p className="pt-count">{from}–{to} of {total} cards{state === "loading" ? " · loading..." : ""}</p>
            )}
            {pager}
            {showResults && state === "loading" && results.length === 0 && <p className="pt-muted">Searching...</p>}
            {showResults && state === "error" && <p className="pt-muted">No connection. Check your signal and try again.</p>}
            {showResults && state === "idle" && results.length === 0 && <p className="pt-muted">No cards match. Try fewer words, or add it under Other item.</p>}
            {!showResults && <p className="pt-muted">Type at least 2 letters. Tap a card to add it; tap again to add another copy.</p>}
            {showResults && results.map(r => (
              <button key={r.id} className={`pt-result ${pulse === r.id ? "pulse" : ""}`} onClick={() => pick(r)}>
                {r.image ? <img src={r.image} alt="" loading="lazy" /> : <span className="pt-thumb other">?</span>}
                <span className="pt-result-info">
                  <b>{r.name}</b>
                  <span>{r.set_code} {r.number}</span>
                  <span className="v">{r.variant_label}</span>
                </span>
                <span className="pt-result-val">{r.tcg_zar == null ? "TBC" : money(r.tcg_zar)}</span>
              </button>
            ))}
            {pager}
            {showResults && pages > 1 && (
              <p className="pt-muted">Tip: add the set code or card number to jump straight to it, e.g. &quot;pikachu bs&quot; or &quot;pikachu 58&quot;.</p>
            )}
          </div>
        </>
      )}

      {mode === "cash" && (
        <form className="pt-form" onSubmit={e => { e.preventDefault(); addCash(); }}>
          <label>Cash amount (Rand)
            <input inputMode="decimal" placeholder="e.g. 150" value={cash} onChange={e => setCash(e.target.value)} />
          </label>
          <button className="pt-primary" type="submit">Add cash to {sideName}</button>
        </form>
      )}

      {mode === "other" && (
        <form className="pt-form" onSubmit={e => { e.preventDefault(); addOther(); }}>
          <label>What is it
            <input placeholder="e.g. graded card, booster pack, sleeves" value={otherName} onChange={e => setOtherName(e.target.value)} />
          </label>
          <label>Agreed value (Rand)
            <input inputMode="decimal" placeholder="e.g. 300" value={otherVal} onChange={e => setOtherVal(e.target.value)} />
          </label>
          <button className="pt-primary" type="submit">Add to {sideName}</button>
        </form>
      )}
    </Sheet>
  );
}

function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="pt-scrim" onClick={onClose}>
      <div className={`pt-sheet ${tall ? "tall" : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="pt-sheet-head">
          <h2>{title}</h2>
          <button className="pt-ghost" onClick={onClose}>Done</button>
        </div>
        <div className="pt-sheet-body">{children}</div>
      </div>
    </div>
  );
}

const CSS = `
.pt{--bg:#15151f;--panel:#1e1e2b;--line:#2e2e40;--ink:#ededf4;--mute:#9b9bb2;--give:#4f9dff;--get:#ff6b35;--even:#2fbf71;--warn:#f5c04a;
  position:fixed;inset:0;z-index:10000;overflow-y:auto;background:var(--bg);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.4;
  padding:env(safe-area-inset-top) 0 0;-webkit-tap-highlight-color:transparent}
.pt *{box-sizing:border-box}
.pt button{font:inherit;color:inherit;cursor:pointer}
.pt button:focus-visible,.pt input:focus-visible,.pt select:focus-visible{outline:2px solid var(--give);outline-offset:2px}
.pt-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;max-width:640px;margin:0 auto}
.pt-brand{white-space:nowrap;display:flex;align-items:center;gap:10px;font-family:var(--pt-display),system-ui,sans-serif;font-weight:700;font-size:22px;letter-spacing:.2px}
.pt-logo{position:relative;width:30px;height:24px;display:inline-block}
.pt-logo i{position:absolute;left:0;right:0;height:5px;border-radius:3px}
.pt-logo .a1{top:5px;background:var(--give)}
.pt-logo .a2{bottom:5px;background:var(--get)}
.pt-top-actions{display:flex;gap:6px}
.pt-ghost{background:none;border:1px solid var(--line);border-radius:999px;padding:6px 11px;font-size:13px;white-space:nowrap}
@media(max-width:360px){.pt-brand{font-size:19px}.pt-ghost{padding:6px 8px}}
.pt-balance{max-width:640px;margin:4px auto 0;padding:14px 16px 12px;background:var(--panel);border-block:1px solid var(--line);position:sticky;top:0;z-index:2}
@media(min-width:660px){.pt-balance{border:1px solid var(--line);border-radius:14px}}
.pt-verdict{font-family:var(--pt-display),system-ui,sans-serif;font-weight:700;font-size:30px;line-height:1.1;display:flex;align-items:baseline;flex-wrap:wrap;column-gap:10px}
.pt-verdict small{font-size:16px;font-weight:600;color:var(--mute)}
.is-even .pt-verdict{color:var(--even)}
.is-up .pt-verdict{color:var(--even)}
.is-down .pt-verdict{color:var(--warn)}
.pt-bar{position:relative;display:flex;height:14px;border-radius:7px;overflow:hidden;margin:12px 0 10px;background:var(--get)}
.pt-bar-give{background:var(--give);transition:width .35s ease}
.pt-bar-get{flex:1}
.pt-bar-mid{position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;background:var(--bg);transform:translateX(-1px)}
@media(prefers-reduced-motion:reduce){.pt-bar-give{transition:none}}
.pt-totals{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pt-totals button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:8px 10px;border-radius:10px;border:1.5px solid var(--line);background:transparent;text-align:left}
.pt-totals button span{font-size:13px;color:var(--mute)}
.pt-totals button b{font-family:var(--pt-display),system-ui,sans-serif;font-size:21px;font-weight:700}
.pt-totals button em{font-style:normal;font-size:12px;color:var(--mute)}
.pt-totals button:first-child b{color:var(--give)}
.pt-totals button:last-child b{color:var(--get)}
.pt-totals button:first-child.on{border-color:var(--give);background:rgba(79,157,255,.08)}
.pt-totals button:last-child.on{border-color:var(--get);background:rgba(255,107,53,.08)}
.pt-hint{margin:10px 0 0;font-size:13px;color:var(--mute)}
.pt-hint.warn{color:var(--warn)}
.pt-partner{display:block;width:calc(100% - 32px);max-width:608px;margin:12px auto 0;background:transparent;border:none;border-bottom:1px solid var(--line);color:var(--ink);padding:8px 2px;font-size:15px}
.pt-list{max-width:640px;margin:0 auto;padding:6px 16px 0}
.pt-empty{text-align:center;padding:36px 12px;color:var(--mute)}
.pt-empty p{margin:0 0 14px}
.pt-row{display:grid;grid-template-columns:52px 1fr auto 30px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.pt-thumb{width:52px;height:72px;object-fit:cover;border-radius:4px;background:#2a2a3a;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--mute)}
.pt-thumb.cash{height:52px;border-radius:50%;background:#27402f;color:var(--even);font-family:var(--pt-display),sans-serif;font-size:22px}
.pt-info{min-width:0;display:flex;flex-direction:column;gap:2px}
.pt-info b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-info>span{font-size:12.5px;color:var(--mute)}
.pt-ctrls{display:flex;gap:8px;align-items:center;margin-top:4px}
.pt-ctrls select{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px 6px;font-size:13px}
.pt-qty{display:flex;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.pt-qty button{background:none;border:none;width:34px;height:30px;font-size:18px}
.pt-qty span{min-width:22px;text-align:center;font-size:14px}
.pt-val{text-align:right;font-family:var(--pt-display),system-ui,sans-serif;font-weight:600;font-size:17px;display:flex;flex-direction:column}
.pt-val small{font-family:system-ui,sans-serif;font-weight:400;font-size:11px;color:var(--mute)}
.pt-x{background:none;border:none;color:var(--mute);font-size:15px;width:30px;height:30px;border-radius:50%}
.pt-dock{max-width:640px;margin:0 auto;padding:16px 16px calc(24px + env(safe-area-inset-bottom))}
.pt-primary{background:var(--get);border:none;border-radius:12px;padding:13px 18px;font-weight:700;font-size:16px;color:#fff}
.pt-add{width:100%}
.pt-add.give{background:var(--give)}
.pt-dock-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.pt-dock-row button{white-space:nowrap;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 4px;font-size:13px}
.pt-dock-row button:disabled{opacity:.6}
.pt-note{font-size:12px;color:var(--mute);margin:14px 0 0}
.pt-scrim{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
.pt-sheet{width:100%;max-width:640px;max-height:80vh;background:var(--bg);border:1px solid var(--line);border-bottom:none;border-radius:18px 18px 0 0;display:flex;flex-direction:column;animation:ptUp .22s ease-out}
.pt-sheet.tall{height:92vh;max-height:92vh}
@keyframes ptUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
@media(prefers-reduced-motion:reduce){.pt-sheet{animation:none}}
.pt-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px}
.pt-sheet-head h2{margin:0;font-family:var(--pt-display),system-ui,sans-serif;font-size:21px;font-weight:700}
.pt-sheet-body{overflow-y:auto;padding:4px 16px calc(20px + env(safe-area-inset-bottom));flex:1}
.pt-seg{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.pt-seg button{background:none;border:none;padding:10px;font-weight:600;color:var(--mute)}
.pt-seg button.on.give{background:var(--give);color:#fff}
.pt-seg button.on.get{background:var(--get);color:#fff}
.pt-modes{display:flex;gap:16px;margin:12px 2px 8px}
.pt-modes button{background:none;border:none;padding:4px 0;color:var(--mute);border-bottom:2px solid transparent;font-size:14px}
.pt-modes button.on{color:var(--ink);border-bottom-color:var(--ink)}
.pt-search,.pt-form input{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--ink);font-size:16px}
.pt-results{margin-top:8px}
.pt-result{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;width:100%;background:none;border:none;border-bottom:1px solid var(--line);padding:8px 2px;text-align:left}
.pt-result img,.pt-result .pt-thumb{width:44px;height:61px;object-fit:cover;border-radius:3px}
.pt-result-info{display:flex;flex-direction:column;min-width:0}
.pt-result-info b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-result-info span{font-size:12.5px;color:var(--mute)}
.pt-result-info .v{color:#c9c9da}
.pt-result-val{font-family:var(--pt-display),system-ui,sans-serif;font-weight:600;font-size:16px}
.pt-result.pulse{background:rgba(47,191,113,.16)}
.pt-form{display:flex;flex-direction:column;gap:12px;margin-top:6px}
.pt-form label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--mute)}
.pt-muted{color:var(--mute);font-size:13.5px;margin:12px 2px}
.pt-saved{display:flex;align-items:center;border-bottom:1px solid var(--line)}
.pt-saved-main{flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:none;border:none;padding:12px 2px;text-align:left}
.pt-saved-main span{font-size:13px;color:var(--mute)}
.pt-steps{padding-left:20px;line-height:1.9}
.pt-inapp{display:flex;flex-direction:column;gap:10px}
.pt-inapp p{margin:0}
.pt-link{display:block;text-align:center;text-decoration:none}
.pt-count{margin:10px 2px 2px;font-size:13px;color:var(--mute)}
.pt-pager{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0}
.pt-pager span{font-size:14px;font-weight:600}
.pt-pager button{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 16px;font-size:14px;min-width:96px}
.pt-pager button:disabled{opacity:.4}
.pt-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10002;background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:999px;font-weight:600;font-size:14px;white-space:nowrap}
`;
