// v1.0.0 — How to spot fake Pokémon cards (2026-10-20)
// Every tip is attributed to the guide(s) it came from (see SOURCES at the bottom).
// DIAGRAMS: all drawn in-house as simple SVGs (no third-party photos, no Pokémon artwork).
// REAL PHOTOS: add your own photos of fakes to R2 (bucket pokebulkcards, key
// `fakes/<name>.jpg`) and list them in FAKE_PHOTOS below — they show up in a gallery
// automatically. Images must be R2 URLs (https://images.pokebulk.co.za/...), never hotlinks.
import Link from "next/link";

export const metadata = {
  title: "How to Spot Fake Pokémon Cards (Plastic & Counterfeit) | Poke Bulk SA",
  description:
    "A visual guide to spotting fake and plastic Pokémon cards: the light test, card back, fonts, energy symbols, holo, texture, size and more.",
};

const CHECKED = "20 October 2026";
const CDN = "https://images.pokebulk.co.za";

// { src: `${CDN}/fakes/example.jpg`, caption: "What's wrong with it" }
const FAKE_PHOTOS: { src: string; caption: string }[] = [];

const C = { bg: "#0e0e16", card: "#16161f", line: "#2a2a3a", text: "#a0a0b0", white: "#fff", orange: "#ff6b35", ok: "#43a047", bad: "#e53935" };

const s = {
  section: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 28, marginBottom: 24 } as React.CSSProperties,
  tag: { display: "inline-block", background: "#ff6b3520", color: C.orange, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 6, marginBottom: 12 } as React.CSSProperties,
  h2: { color: C.white, fontSize: 20, fontWeight: 700, margin: "0 0 12px 0" } as React.CSSProperties,
  p: { color: C.text, fontSize: 15, lineHeight: 1.7, margin: "0 0 12px 0" } as React.CSSProperties,
  note: { color: "#8a8a9a", fontSize: 12, lineHeight: 1.6, margin: "8px 0 0 0" } as React.CSSProperties,
  a: { color: C.orange, textDecoration: "none" } as React.CSSProperties,
};

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={s.a}>{children}</a>;
}

// Two-up comparison: real on the left, fake on the right.
function Compare({ real, fake, realLabel, fakeLabel }: { real: React.ReactNode; fake: React.ReactNode; realLabel: string; fakeLabel: string }) {
  const box = (color: string): React.CSSProperties => ({ flex: "1 1 240px", background: "#0e0e16", border: `2px solid ${color}`, borderRadius: 10, padding: 12, textAlign: "center" });
  const lab = (color: string): React.CSSProperties => ({ color, fontSize: 12, fontWeight: 800, margin: "8px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" });
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "12px 0" }}>
      <div style={box(C.ok)}>{real}<p style={lab(C.ok)}>✓ {realLabel}</p></div>
      <div style={box(C.bad)}>{fake}<p style={lab(C.bad)}>✗ {fakeLabel}</p></div>
    </div>
  );
}

const svgProps = { viewBox: "0 0 220 150", width: "100%", style: { maxWidth: 260, height: "auto" } as React.CSSProperties, role: "img" as const };

// ── Diagrams ────────────────────────────────────────────────────────────────
// Back-colour swatch: real = light blue dappled over dark blue; fake = flat/washed out.
function BackSwatch({ fake }: { fake?: boolean }) {
  const dots: React.ReactNode[] = [];
  if (!fake) {
    for (let i = 0; i < 90; i++) {
      const x = 20 + ((i * 53) % 180), y = 20 + ((i * 37) % 100);
      dots.push(<circle key={i} cx={x} cy={y} r={2 + (i % 3)} fill="#0d2a6b" opacity={0.55} />);
    }
  }
  return (
    <svg {...svgProps} aria-label={fake ? "Flat, washed-out blue" : "Dappled light and dark blue"}>
      <rect x="10" y="10" width="200" height="130" rx="8" fill={fake ? "#7fb2ee" : "#2f6bd0"} />
      {dots}
      {!fake && <rect x="10" y="10" width="200" height="130" rx="8" fill="#6aa6f0" opacity="0.35" />}
    </svg>
  );
}

// Light test cross-section: real = white / dark core / white; fake = single layer lets light through.
function LightTest({ fake }: { fake?: boolean }) {
  return (
    <svg {...svgProps} aria-label={fake ? "Single layer: light passes through" : "Dark core blocks most light"}>
      <defs><linearGradient id={fake ? "bf" : "br"} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffe9a0" /><stop offset="1" stopColor="#ffe9a0" stopOpacity={fake ? 0.9 : 0.15} />
      </linearGradient></defs>
      <circle cx="110" cy="18" r="10" fill="#ffd54f" />
      <rect x="90" y="30" width="40" height="30" fill={`url(#${fake ? "bf" : "br"})`} opacity="0.9" />
      {fake ? (
        <rect x="40" y="62" width="140" height="22" fill="#ddd" />
      ) : (<>
        <rect x="40" y="62" width="140" height="7" fill="#eee" />
        <rect x="40" y="69" width="140" height="8" fill="#333" />
        <rect x="40" y="77" width="140" height="7" fill="#eee" />
      </>)}
      <rect x="90" y="86" width="40" height="40" fill="#ffe9a0" opacity={fake ? 0.85 : 0.12} />
      <text x="110" y="143" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "bright glow behind card" : "faint, even glow only"}</text>
    </svg>
  );
}

// Edge view: real shows a dark line through the middle.
function EdgeView({ fake }: { fake?: boolean }) {
  return (
    <svg {...svgProps} aria-label={fake ? "Solid white edge" : "Dark line through the edge"}>
      <rect x="30" y="35" width="160" height="70" rx="4" fill="#eee" />
      {!fake && <rect x="30" y="66" width="160" height="8" fill="#2a2a2a" />}
      <text x="110" y="128" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "solid white, no core line" : "thin dark core line"}</text>
    </svg>
  );
}

// Text: "Pokémon" with accent + tight kerning vs missing accent + wide inconsistent kerning.
function TextSample({ fake }: { fake?: boolean }) {
  return (
    <svg {...svgProps} aria-label={fake ? "Missing accent, wide spacing" : "Accent present, even spacing"}>
      <text x="110" y="62" textAnchor="middle" fontSize="30" fontWeight="700" fill="#eee" letterSpacing={fake ? 6 : 0}>{fake ? "Pokemon" : "Pokémon"}</text>
      <text x="110" y="95" textAnchor="middle" fontSize="16" fill="#cfcfe0" letterSpacing={fake ? 3 : 0}>{fake ? "Wartortleh  filp  trun" : "Wartortle  flip  turn"}</text>
      <text x="110" y="130" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "no é · odd spacing · typos" : "é present · even spacing"}</text>
    </svg>
  );
}

// Energy symbol: centred symbol vs off-centre / oversized.
function EnergySymbol({ fake }: { fake?: boolean }) {
  return (
    <svg {...svgProps} aria-label={fake ? "Off-centre symbol" : "Centred symbol"}>
      <circle cx="110" cy="65" r="38" fill="#cfcfd8" stroke="#555" strokeWidth="3" />
      <polygon
        points="0,-24 7,-8 24,-8 10,2 15,19 0,9 -15,19 -10,2 -24,-8 -7,-8"
        transform={fake ? "translate(128 80) scale(1.25)" : "translate(110 65)"} fill="#fff" stroke="#555" strokeWidth="2" />
      <text x="110" y="135" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "symbol off-centre / too big" : "symbol centred in the orb"}</text>
    </svg>
  );
}

// Size: real 63×88 vs slightly smaller overlaid.
function SizeCompare({ fake }: { fake?: boolean }) {
  const w = fake ? 54 : 63, h = fake ? 82 : 88;
  return (
    <svg {...svgProps} aria-label={fake ? "Smaller than a real card" : "Matches a real card"}>
      <rect x={110 - 31.5} y={10} width="63" height="88" rx="5" fill="none" stroke="#777" strokeDasharray="4 3" />
      <rect x={110 - w / 2} y={10 + (88 - h) / 2} width={w} height={h} rx="5" fill={fake ? "#e57373" : "#81c784"} opacity="0.85" />
      <text x="110" y="120" textAnchor="middle" fontSize="11" fill="#a0a0b0">dashed = genuine 63 × 88 mm</text>
      <text x="110" y="136" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "this one is visibly smaller" : "lines up exactly"}</text>
    </svg>
  );
}

// Holo: real = layered shifting light; fake = flat uniform rainbow sheen.
function HoloTilt({ fake }: { fake?: boolean }) {
  return (
    <svg {...svgProps} aria-label={fake ? "Flat uniform shimmer" : "Pattern shifts with angle"}>
      <defs>
        <linearGradient id={fake ? "hf" : "hr"} x1="0" x2="1" y1="0" y2="1">
          {fake
            ? (<><stop offset="0" stopColor="#c9a6ff" /><stop offset="1" stopColor="#a6d8ff" /></>)
            : (<><stop offset="0" stopColor="#ff7aa2" /><stop offset="0.35" stopColor="#ffd966" /><stop offset="0.65" stopColor="#6ee7b7" /><stop offset="1" stopColor="#7aa2ff" /></>)}
        </linearGradient>
      </defs>
      <rect x="40" y="12" width="140" height="100" rx="8" fill={`url(#${fake ? "hf" : "hr"})`} />
      {!fake && <><path d="M40 90 Q110 20 180 70" stroke="#fff" strokeOpacity="0.5" strokeWidth="6" fill="none" /><path d="M40 60 Q110 0 180 40" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" fill="none" /></>}
      <text x="110" y="135" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "same flat sheen at every angle" : "shifts and moves as you tilt"}</text>
    </svg>
  );
}

// Texture: real = etched grooves a nail catches on; fake = printed pattern, flat surface.
function TextureView({ fake }: { fake?: boolean }) {
  const bumps: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) bumps.push(<rect key={i} x={30 + i * 11} y={fake ? 66 : 58} width="6" height={fake ? 0 : 8} fill="#bbb" />);
  return (
    <svg {...svgProps} aria-label={fake ? "Flat surface, printed texture" : "Real etched grooves"}>
      <rect x="30" y="66" width="154" height="24" fill="#ddd" />
      {bumps}
      <path d={fake ? "M25 55 L190 55" : "M25 46 Q60 58 190 54"} stroke="#ffd54f" strokeWidth="3" fill="none" />
      <text x="110" y="35" textAnchor="middle" fontSize="11" fill="#cfcfe0">fingernail drag</text>
      <text x="110" y="120" textAnchor="middle" fontSize="11" fill="#a0a0b0">{fake ? "nail glides: texture only printed" : "nail catches: texture is physical"}</text>
    </svg>
  );
}

// ── Checklist data ──────────────────────────────────────────────────────────
const INSTANT = [
  "Hand-gesture \"rock-paper-scissors\" symbols printed on the card (JustInBasil: \"guaranteed fake\").",
  "Silly stats — e.g. 13,000 HP or a huge damage number (JustInBasil).",
  "A misspelt Pokémon name or typos in the attack text (Wargamer, JustInBasil).",
  "The wrong Pokémon art, name, evolution line or typing for that card (JustInBasil).",
  "Japanese set markers on an English card, or a made-up stamp such as \"Edition 3\" (JustInBasil).",
  "A pack or box full of \"GX / EX / Mega\" chase cards for a few rand (JustInBasil).",
];

const SOURCES = [
  { href: "https://www.justinbasil.com/guide/fakes", label: "JustInBasil — Identifying Fake Pokémon Cards" },
  { href: "https://www.wargamer.com/pokemon-trading-card-game/fake-pokemon-cards", label: "Wargamer — How to identify fake Pokémon cards (updated Jan 2025)" },
  { href: "https://pregradecards.com/blog/how-to-tell-if-pokemon-card-is-fake-2026-counterfeit-guide", label: "PreGradeCards — How to Tell If a Pokémon Card Is Fake (Aug 2026)" },
  { href: "https://www.pokemon.com/us/pokemon-tcg/pokemon-cards", label: "Official Pokémon TCG card database (to compare any card)" },
  { href: "https://bulbapedia.bulbagarden.net/wiki/Error_cards", label: "Bulbapedia — Error cards (genuine misprints)" },
  { href: "https://www.psacard.com/cert", label: "PSA certificate verification (for graded slabs)" },
];

export default function FakeCardsPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ color: C.white, fontSize: 32, fontWeight: 800, margin: "0 0 12px 0" }}>How to Spot Fake &amp; Plastic Pokémon Cards</h1>
          <p style={{ color: C.text, fontSize: 16, lineHeight: 1.7, maxWidth: 660, margin: "0 auto" }}>
            Counterfeits are everywhere, and the cheap plastic ones are getting more convincing. Here is what to check,
            with a diagram for each test. Every tip is credited to the guide it comes from.
          </p>
        </div>

        {/* Golden rules */}
        <div style={s.section}>
          <div style={s.tag}>Before you start</div>
          <h2 style={s.h2}>Two rules that beat every test</h2>
          <p style={s.p}>
            <strong style={{ color: C.white }}>1. Always compare against a real card.</strong> Put the suspect card next to a genuine copy of the same
            card — or look up the exact card in the <Ext href="https://www.pokemon.com/us/pokemon-tcg/pokemon-cards">official Pokémon TCG database</Ext> — and
            check it line by line (Wargamer).
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            <strong style={{ color: C.white }}>2. No single test is proof.</strong> Wargamer and PreGradeCards both warn that fakes keep improving and that some
            now copy the dark inner layer. If a card fails two or more checks it is almost certainly fake; for an expensive card, get a trusted dealer
            or grading service to look at it.
          </p>
        </div>

        {/* Instant red flags */}
        <div style={s.section}>
          <div style={s.tag}>Instant red flags</div>
          <h2 style={s.h2}>If you see any of these, stop — it&apos;s fake</h2>
          <ul style={{ color: C.text, fontSize: 15, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
            {INSTANT.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>

        {/* Plastic cards */}
        <div style={s.section}>
          <div style={s.tag}>Plastic cards</div>
          <h2 style={s.h2}>What &ldquo;plastic&rdquo; fakes feel and look like</h2>
          <p style={s.p}>
            JustInBasil says the feel is often the first giveaway: fakes tend to feel either papery or plasticky. Ask yourself whether the card is abnormally
            flimsy, whether the back feels slick &ldquo;as if it were straight out of a new deck of playing cards,&rdquo; or whether it feels thicker or rougher than a
            real card. Wargamer adds that genuine cards usually have a smooth, matte finish while fakes tend to be glossy and shiny — partly because it is cheaper
            and partly to hide printing errors. JustInBasil also notes that fake chase cards (full art, EX/GX/V) often have a reflective <em>back</em> as well as front.
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            <strong style={{ color: C.white }}>Photos only?</strong> Feel can&apos;t be judged from a picture, so use the visual checks below — the card back, text, symbols,
            size and edge. Wargamer recommends asking for original, high-quality photos of both sides, and says remote buying of valuable cards carries real risk.
          </p>
        </div>

        {/* 1 Light */}
        <div style={s.section}>
          <div style={s.tag}>Test 1</div>
          <h2 style={s.h2}>The light test</h2>
          <p style={s.p}>
            Real cards are a sandwich with a thin dark core between the front and back that blocks most light. Hold a phone torch behind the card in a dim room:
            a real card glows faintly and evenly; a cheap fake on single-layer stock lights right up (PreGradeCards, Wargamer).
          </p>
          <Compare real={<LightTest />} fake={<LightTest fake />} realLabel="Real" fakeLabel="Cheap fake" />
          <p style={s.note}>
            Limits: PreGradeCards says 2026 &ldquo;super fakes&rdquo; add a dark middle layer, and Wargamer says holo treatments react to light very differently, so a pass
            doesn&apos;t prove a card is real. Use it as a quick screen only.
          </p>
        </div>

        {/* 2 Edge */}
        <div style={s.section}>
          <div style={s.tag}>Test 2</div>
          <h2 style={s.h2}>The edge</h2>
          <p style={s.p}>
            Look at the cut edge in good light. A genuine card shows a thin dark line through the middle (the core layer). A solid white edge with no dark line is a fake
            (PreGradeCards). Be aware some fakers glue a fake front onto a genuine low-value card, so a dark line alone doesn&apos;t guarantee a real card.
          </p>
          <Compare real={<EdgeView />} fake={<EdgeView fake />} realLabel="Real" fakeLabel="Fake" />
        </div>

        {/* 3 Back */}
        <div style={s.section}>
          <div style={s.tag}>Test 3 — the best one</div>
          <h2 style={s.h2}>The card back</h2>
          <p style={s.p}>
            Compare the back against a real card. The light-blue diagonal sweep next to the Poké Ball should be <strong style={{ color: C.white }}>dappled with darker blue</strong>
            underneath. On fakes it is usually a solid, lighter or washed-out blue, or leans purple (Wargamer, PreGradeCards, JustInBasil). Wargamer quotes one dealer who says
            about 80% of counterfeits can be caught on the back colour alone.
          </p>
          <Compare real={<BackSwatch />} fake={<BackSwatch fake />} realLabel="Real: dappled" fakeLabel="Fake: flat / washed out" />
          <p style={s.note}>Diagram is a simplified swatch to show the pattern, not a reproduction of the card back.</p>
        </div>

        {/* 4 Text */}
        <div style={s.section}>
          <div style={s.tag}>Test 4</div>
          <h2 style={s.h2}>Spelling, accents, fonts and spacing</h2>
          <p style={s.p}>
            Check the name, HP, attack text and copyright line. Typos (a fake Wartortle read &ldquo;Wartortleh&rdquo;, &ldquo;filp&rdquo;, &ldquo;trun&rdquo;), a missing accent on the é in
            Pokémon (often in the copyright line), and abnormally wide or uneven letter-spacing are common tells (JustInBasil). Small text at the bottom of the
            card is often blurrier on fakes (Wargamer).
          </p>
          <Compare real={<TextSample />} fake={<TextSample fake />} realLabel="Real" fakeLabel="Fake" />
        </div>

        {/* 5 Energy */}
        <div style={s.section}>
          <div style={s.tag}>Test 5</div>
          <h2 style={s.h2}>Energy symbols</h2>
          <p style={s.p}>
            Check the type symbol (top), the attack costs, and weakness / resistance / retreat. On fakes they are often misaligned, misshapen, the wrong size, or missing
            (JustInBasil, Wargamer).
          </p>
          <Compare real={<EnergySymbol />} fake={<EnergySymbol fake />} realLabel="Real" fakeLabel="Fake" />
        </div>

        {/* 6 Size */}
        <div style={s.section}>
          <div style={s.tag}>Test 6</div>
          <h2 style={s.h2}>Size</h2>
          <p style={s.p}>
            Genuine English cards are 63 × 88 mm (Wargamer). Stack the suspect card on a known real one, then flip them and check again; any difference suggests a fake,
            though it isn&apos;t proof (JustInBasil). Japanese cards are slightly smaller, about 60 × 86 mm (PreGradeCards), and jumbo or topper cards exist — so compare
            like with like.
          </p>
          <Compare real={<SizeCompare />} fake={<SizeCompare fake />} realLabel="Matches" fakeLabel="Too small" />
        </div>

        {/* 7 Holo */}
        <div style={s.section}>
          <div style={s.tag}>Test 7</div>
          <h2 style={s.h2}>Holo shine</h2>
          <p style={s.p}>
            Tilt the card under a lamp. A real holo has depth and shifts as the angle changes; fakes tend to show a flat, uniform shimmer, sometimes with a brownish,
            yellowish or orange hue (PreGradeCards, JustInBasil). Also check <em>where</em> the foil should be — many fakes cover the whole card with a generic rainbow sheen
            (PreGradeCards).
          </p>
          <Compare real={<HoloTilt />} fake={<HoloTilt fake />} realLabel="Real" fakeLabel="Fake" />
        </div>

        {/* 8 Texture */}
        <div style={s.section}>
          <div style={s.tag}>Test 8</div>
          <h2 style={s.h2}>Texture on modern holos</h2>
          <p style={s.p}>
            Drag a fingernail lightly across a modern holo or full art. Real ones have fine etched grooves you can feel; fakes are smooth, glossy or waxy, and the worst
            ones <em>print</em> the texture instead of making it (PreGradeCards, JustInBasil). Plain non-holos are naturally smoother, so compare with a genuine card of
            the same era.
          </p>
          <Compare real={<TextureView />} fake={<TextureView fake />} realLabel="Real: physical grooves" fakeLabel="Fake: printed only" />
        </div>

        {/* Weak / avoid */}
        <div style={s.section}>
          <div style={s.tag}>Tests to skip</div>
          <h2 style={s.h2}>What not to rely on — or do</h2>
          <p style={s.p}>
            <strong style={{ color: C.white }}>Weight:</strong> a weak test. Wargamer says most modern fakes land close to the right weight, and gives 1.8–2 g for a real
            card while PreGradeCards says about 1.7–1.8 g — the sources don&apos;t agree, which shows how little this proves.
          </p>
          <p style={s.p}>
            <strong style={{ color: C.white }}>Bend test:</strong> Wargamer used to recommend it but now advises against it because of the high risk of permanently
            damaging a card.
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            <strong style={{ color: C.white }}>Rip test:</strong> tearing a card to look for the dark core layer destroys it. Wargamer: &ldquo;Do not do this.&rdquo; If you must, use a
            cheap card from the same lot.
          </p>
        </div>

        {/* Genuine misprints */}
        <div style={s.section}>
          <div style={s.tag}>Careful</div>
          <h2 style={s.h2}>Genuine misprints exist</h2>
          <p style={{ ...s.p, margin: 0 }}>
            If a card passes nearly everything but is slightly off — a border a millimetre thicker, a word out of order — it may be a genuine error card. Check it against
            <Ext href="https://bulbapedia.bulbagarden.net/wiki/Error_cards"> Bulbapedia&apos;s list of error cards</Ext> (Wargamer, JustInBasil) before calling it fake.
          </p>
        </div>

        {/* Real photo gallery (renders only once photos are added) */}
        {FAKE_PHOTOS.length > 0 && (
          <div style={s.section}>
            <div style={s.tag}>Real examples</div>
            <h2 style={s.h2}>Fakes we&apos;ve seen</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {FAKE_PHOTOS.map((p) => (
                <figure key={p.src} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.caption} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}` }} loading="lazy" />
                  <figcaption style={{ color: C.text, fontSize: 12, marginTop: 6 }}>{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Quick checklist */}
        <div style={s.section}>
          <div style={s.tag}>Quick checklist</div>
          <h2 style={s.h2}>60-second check</h2>
          <ol style={{ color: C.text, fontSize: 15, lineHeight: 1.9, paddingLeft: 22, margin: 0 }}>
            <li>Look the exact card up in the official database — do the name, HP, attacks, set number and rarity match?</li>
            <li>Check the back: is the blue sweep dappled, or flat and washed out?</li>
            <li>Read the small print: accents, typos, spacing, copyright line.</li>
            <li>Check the energy symbols and set symbol.</li>
            <li>Compare size against a real card.</li>
            <li>Torch behind the card, then the edge: dark core?</li>
            <li>Tilt for the holo; drag a nail over the texture.</li>
            <li>Two or more fails → treat as fake.</li>
          </ol>
        </div>

        {/* Graded slabs */}
        <div style={s.section}>
          <div style={s.tag}>Graded cards</div>
          <h2 style={s.h2}>Fake slabs exist too</h2>
          <p style={{ ...s.p, margin: 0 }}>
            PreGradeCards reports counterfeit PSA, BGS, CGC and SGC slabs are a growing problem. Always enter the certificate number on the grader&apos;s own site
            (for example <Ext href="https://www.psacard.com/cert">PSA cert verification</Ext>) and make sure the number, card and grade all match.
          </p>
        </div>

        {/* Sources */}
        <div style={s.section}>
          <div style={s.tag}>Sources</div>
          <h2 style={s.h2}>Where this comes from</h2>
          <p style={s.note}>Read {CHECKED}. These are community and retailer guides, not official Pokémon Company guidance — we couldn&apos;t find an official authentication guide. Diagrams are our own simplified illustrations.</p>
          <ul style={{ color: C.text, fontSize: 14, lineHeight: 2, paddingLeft: 20, margin: "8px 0 0" }}>
            {SOURCES.map((x) => <li key={x.href}><Ext href={x.href}>{x.label}</Ext></li>)}
          </ul>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/cards" style={{ display: "inline-block", background: C.orange, color: "#fff", padding: "12px 28px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
            Browse Cards →
          </Link>
        </div>
      </div>
    </div>
  );
}
