// v1.0.0 — Card Condition guide (2026-10-20)
// Purpose: one sourced page to settle "what does Near Mint actually mean" arguments.
// Every definition below is quoted/summarised from a named source with its link and the
// date it was read. If a source updates its standard, update this page + the date.
import Link from "next/link";

export const metadata = {
  title: "Card Condition Guide — NM, LP, MP, HP, DMG | Poke Bulk SA",
  description:
    "How Poke Bulk SA conditions cards: the TCGplayer standard, how it compares to PSA and Beckett grading, and how condition affects price.",
};

const CHECKED = "20 October 2026";

const s = {
  section: {
    background: "#16161f", border: "1px solid #2a2a3a",
    borderRadius: "12px", padding: "28px", marginBottom: "24px",
  } as React.CSSProperties,
  tag: {
    display: "inline-block", background: "#ff6b3520", color: "#ff6b35",
    fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.08em", padding: "4px 10px", borderRadius: "6px", marginBottom: "12px",
  },
  h2: { color: "#fff", fontSize: "20px", fontWeight: 700, margin: "0 0 12px 0" },
  h3: { color: "#fff", fontSize: "16px", fontWeight: 700, margin: "18px 0 8px 0" },
  p: { color: "#a0a0b0", fontSize: "15px", lineHeight: "1.7", margin: "0 0 12px 0" },
  th: { textAlign: "left" as const, color: "#fff", fontSize: "12px", padding: "8px 10px", borderBottom: "1px solid #2a2a3a", whiteSpace: "nowrap" as const },
  td: { color: "#c0c0d0", fontSize: "13px", padding: "8px 10px", borderBottom: "1px solid #1f1f2c", verticalAlign: "top" as const },
  note: { color: "#8a8a9a", fontSize: "12px", lineHeight: "1.6", margin: "8px 0 0 0" },
  a: { color: "#ff6b35", textDecoration: "none" },
};

const tableWrap: React.CSSProperties = { overflowX: "auto", margin: "8px 0 4px" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: "520px" };

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={s.a}>{children}</a>;
}

export default function ConditionPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ color: "#fff", fontSize: "32px", fontWeight: 800, margin: "0 0 12px 0" }}>
            Card Condition Guide
          </h1>
          <p style={{ color: "#a0a0b0", fontSize: "16px", lineHeight: "1.7", maxWidth: "640px", margin: "0 auto" }}>
            What Near Mint, Lightly Played and the rest actually mean — in the published
            standards, not in anyone&apos;s opinion — and why a PSA or Beckett &ldquo;Near Mint 7&rdquo;
            is not the same thing as a Near Mint singles listing.
          </p>
        </div>

        {/* 1 — Short version */}
        <div style={s.section}>
          <div style={s.tag}>The short version</div>
          <h2 style={s.h2}>Near Mint on a raw single is not a &ldquo;7 out of 10&rdquo;</h2>
          <p style={s.p}>
            Grading companies (PSA, Beckett) score cards on a numbered scale where &ldquo;Near Mint&rdquo; sits at
            <strong style={{ color: "#fff" }}> 7</strong>, with Mint and Gem Mint grades <em>above</em> it. TCGplayer,
            the standard most TCG singles sellers follow, does not use that scale. It has five labels —
            Near Mint, Lightly Played, Moderately Played, Heavily Played and Damaged — and says plainly that
            <strong style={{ color: "#fff" }}> Mint and Gem Mint cards are not sold</strong> on its marketplace. So on a
            raw single, Near Mint is the top label and covers everything from pack-fresh down to a small,
            measured allowance of wear.
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            TCGplayer itself separates the two ideas: it uses <em>&ldquo;conditioning&rdquo;</em> for a non-numeric label
            and keeps <em>&ldquo;grading&rdquo;</em> for the numeric scores given by professional grading services. They are
            different systems, and neither company publishes an official conversion between them.
          </p>
        </div>

        {/* 2 — TCGplayer standard */}
        <div style={s.section}>
          <div style={s.tag}>The standard we use</div>
          <h2 style={s.h2}>TCGplayer Card Conditioning Standard</h2>
          <p style={s.p}>
            Poke Bulk SA conditions singles against the TCGplayer standard (updated October 2026). Each imperfection
            gets points by severity — <strong style={{ color: "#fff" }}>Slight 1 · Minor 2 · Moderate 4 · Major 8</strong> — and each
            condition allows a maximum total:
          </p>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>
                <th style={s.th}>Condition</th><th style={s.th}>Max points</th><th style={s.th}>TCGplayer&apos;s description</th>
              </tr></thead>
              <tbody>
                <tr><td style={s.td}><strong>Near Mint (NM)</strong></td><td style={s.td}>3</td>
                  <td style={s.td}>Minimal handling or play wear. Nearly unmarked surface, crisp corners, unblemished edges outside a few slight flaws. May have slight edge wear or a couple of minor scratches but looks nearly unplayed.</td></tr>
                <tr><td style={s.td}><strong>Lightly Played (LP)</strong></td><td style={s.td}>6</td>
                  <td style={s.td}>Signs of handling or play. Minor edge wear, scuffs or scratches. No significant imperfections or structural issues.</td></tr>
                <tr><td style={s.td}><strong>Moderately Played (MP)</strong></td><td style={s.td}>12</td>
                  <td style={s.td}>Significant play, use or wear: edge/surface wear, scratching or scuffing, bends with creases, or a mix of moderate examples.</td></tr>
                <tr><td style={s.td}><strong>Heavily Played (HP)</strong></td><td style={s.td}>24</td>
                  <td style={s.td}>Major wear: creasing, whitening and other faults. Must still be authenticatable and structurally sound.</td></tr>
                <tr><td style={s.td}><strong>Damaged (DMG)</strong></td><td style={s.td}>&gt; 24</td>
                  <td style={s.td}>Beyond the other standards: tears, splits, major bends, foreign substances, or anything that affects the card&apos;s structure, playability or authentication.</td></tr>
              </tbody>
            </table>
          </div>

          <h3 style={s.h3}>What Near Mint allows — and doesn&apos;t</h3>
          <p style={s.p}>
            <strong style={{ color: "#fff" }}>Allowed (up to 3 points in total):</strong> slight edgewear (up to 20&nbsp;mm of edge),
            slight scuffing, a single pinpoint indentation, minor scratches (up to 40&nbsp;mm), a slight print defect
            (up to 2.5&nbsp;mm²), and centering up to 70/30.
          </p>
          <p style={s.p}>
            <strong style={{ color: "#fff" }}>Not allowed at Near Mint:</strong> any surface wear (whitening where the card stock shows through),
            grime, bends or creases, faults, or damage. A card with even slight surface wear drops to Lightly Played.
          </p>

          <h3 style={s.h3}>Maximum allowed at each condition</h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>
                <th style={s.th}>Imperfection</th><th style={s.th}>NM</th><th style={s.th}>LP</th><th style={s.th}>MP</th><th style={s.th}>HP</th>
              </tr></thead>
              <tbody>
                <tr><td style={s.td}>Edgewear (continuous length)</td><td style={s.td}>20 mm</td><td style={s.td}>80 mm</td><td style={s.td}>160 mm</td><td style={s.td}>&gt; 160 mm</td></tr>
                <tr><td style={s.td}>Surface wear / whitening (area)</td><td style={s.td}>None</td><td style={s.td}>2.5 mm²</td><td style={s.td}>10 mm²</td><td style={s.td}>40 mm²</td></tr>
                <tr><td style={s.td}>Scratch (length)</td><td style={s.td}>40 mm</td><td style={s.td}>40 mm</td><td style={s.td}>&gt; 40 mm</td><td style={s.td}>Any</td></tr>
                <tr><td style={s.td}>Bend / crease (length)</td><td style={s.td}>None</td><td style={s.td}>10 mm, no crease</td><td style={s.td}>20 mm or a crease</td><td style={s.td}>&gt; 20 mm</td></tr>
                <tr><td style={s.td}>Indentation (area)</td><td style={s.td}>1 pinpoint</td><td style={s.td}>4 mm²</td><td style={s.td}>25 mm²</td><td style={s.td}>&gt; 25 mm²</td></tr>
                <tr><td style={s.td}>Grime / dirt (area)</td><td style={s.td}>None</td><td style={s.td}>2.5 mm²</td><td style={s.td}>27.5 mm²</td><td style={s.td}>Any</td></tr>
                <tr><td style={s.td}>Centering (print shift)</td><td style={s.td} colSpan={4}>Up to 70/30 with no effect on condition (all conditions)</td></tr>
                <tr><td style={s.td}>Curling (lift from flat)</td><td style={s.td} colSpan={4}>Up to 5 mm with no effect on condition; more than 5 mm is Damaged</td></tr>
              </tbody>
            </table>
          </div>
          <p style={s.note}>
            For scale, a Pokémon card is 88 × 63 mm (5,544 mm²) with 302 mm of edge — so 20 mm of slight edgewear is about 6.6% of the
            card&apos;s edge. Source: TCGplayer Card Conditioning Standards (PDF) and Understanding Card Condition Imperfections guide. Read {CHECKED}.
          </p>
        </div>

        {/* 3 — PSA / Beckett */}
        <div style={s.section}>
          <div style={s.tag}>Grading companies</div>
          <h2 style={s.h2}>Why PSA and Beckett call a 7 &ldquo;Near Mint&rdquo;</h2>
          <p style={s.p}>
            Both PSA and Beckett (BGS) grade on a 1–10 scale. The labels sit at fixed points on that scale, and the scale
            has room <em>above</em> Near Mint for the top grades:
          </p>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>
                <th style={s.th}>Grade</th><th style={s.th}>PSA label</th><th style={s.th}>Beckett label</th>
              </tr></thead>
              <tbody>
                <tr><td style={s.td}>10</td><td style={s.td}>Gem Mint</td><td style={s.td}>Pristine (10) / Gem Mint (9.5)</td></tr>
                <tr><td style={s.td}>9</td><td style={s.td}>Mint</td><td style={s.td}>Mint</td></tr>
                <tr><td style={s.td}>8</td><td style={s.td}>Near Mint-Mint</td><td style={s.td}>Near Mint-Mint</td></tr>
                <tr><td style={s.td}><strong style={{ color: "#fff" }}>7</strong></td><td style={s.td}><strong style={{ color: "#fff" }}>Near Mint</strong></td><td style={s.td}><strong style={{ color: "#fff" }}>Near Mint</strong></td></tr>
                <tr><td style={s.td}>6</td><td style={s.td}>Excellent-Mint</td><td style={s.td}>Excellent-Mint</td></tr>
              </tbody>
            </table>
          </div>
          <p style={s.note}>Source: PSA Grading Standards and Beckett Grading Scale (links below).</p>

          <h3 style={s.h3}>What a Beckett Near Mint 7 looks like</h3>
          <p style={s.p}>
            Beckett&apos;s published guideline for a 7: centering 75/25 or better on the front and 95/5 on the back; four slightly
            fuzzy corners, a touch of notching or a minor ding allowed; edges with noticeable roughness but no layering; noticeable print
            spots, minor border discoloration, some gloss lost. Beckett notes these are &ldquo;not rules, only general guidelines.&rdquo;
          </p>
          <p style={s.note}>
            The grade labels were not included in the text we retrieved from Beckett&apos;s page, so the 7 is identified by its position in the
            published list and its centering numbers; check Beckett&apos;s page to confirm.
          </p>

          <h3 style={s.h3}>What a PSA Near Mint 7 looks like</h3>
          <p style={s.p}>
            PSA publishes its grade definitions as images on its Grading Standards page. Its 7 is described by PSA as a card with slight surface wear
            visible on close inspection and slight fraying on some corners, with most original gloss retained. See PSA&apos;s page for the exact
            wording and its centering limit.
          </p>
          <p style={s.note}>
            PSA&apos;s wording above is summarised from its widely-quoted standard; we could not copy the text directly from PSA&apos;s image-based page.
            Check it at psacard.com/gradingstandards.
          </p>
        </div>

        {/* 4 — Comparison */}
        <div style={s.section}>
          <div style={s.tag}>Side by side</div>
          <h2 style={s.h2}>Why the two aren&apos;t interchangeable</h2>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>
                <th style={s.th}></th><th style={s.th}>TCGplayer Near Mint</th><th style={s.th}>PSA / Beckett &ldquo;Near Mint 7&rdquo;</th>
              </tr></thead>
              <tbody>
                <tr><td style={s.td}>Type of label</td><td style={s.td}>Condition label (no number)</td><td style={s.td}>Numeric grade, 1–10</td></tr>
                <tr><td style={s.td}>Is there anything above it?</td><td style={s.td}>No — Mint / Gem Mint are not sold</td><td style={s.td}>Yes — 8, 9 and 10 sit above 7</td></tr>
                <tr><td style={s.td}>Who decides</td><td style={s.td}>Seller / TCGplayer, using measured limits and a 3-point allowance</td><td style={s.td}>Professional grader, using published guidelines plus judgement</td></tr>
                <tr><td style={s.td}>Centering</td><td style={s.td}>Up to 70/30 allowed</td><td style={s.td}>Beckett 7: 75/25 front; PSA sets its own limit</td></tr>
                <tr><td style={s.td}>Surface wear / whitening</td><td style={s.td}>Not allowed</td><td style={s.td}>Slight wear acknowledged at 7 (PSA, Beckett)</td></tr>
                <tr><td style={s.td}>Sealed in a slab</td><td style={s.td}>No — a raw card</td><td style={s.td}>Yes</td></tr>
              </tbody>
            </table>
          </div>
          <p style={s.p}>
            Because the systems measure different things on different scales, a card that qualifies as TCGplayer Near Mint could grade
            anywhere from a 6 to a 10 at a grading company — and a PSA 7 is not automatically a TCGplayer Near Mint. If you want a graded-level
            guarantee, buy slabbed; if you want raw singles, the TCGplayer standard above is the one our listings follow.
          </p>
          <p style={s.note}>
            This comparison is our reading of the published standards. Neither TCGplayer, PSA nor Beckett publishes an official crosswalk.
          </p>
        </div>

        {/* 5 — Pricing */}
        <div style={s.section}>
          <div style={s.tag}>Pricing</div>
          <h2 style={s.h2}>How condition affects our price</h2>
          <p style={s.p}>
            Our prices are based on the Near Mint market price. Lower conditions are priced as a share of the Near Mint price:
          </p>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>
                <th style={s.th}>Condition</th><th style={s.th}>Share of NM price</th>
              </tr></thead>
              <tbody>
                <tr><td style={s.td}>Near Mint</td><td style={s.td}>100%</td></tr>
                <tr><td style={s.td}>Lightly Played</td><td style={s.td}>84%</td></tr>
                <tr><td style={s.td}>Moderately Played</td><td style={s.td}>65%</td></tr>
                <tr><td style={s.td}>Heavily Played</td><td style={s.td}>45%</td></tr>
                <tr><td style={s.td}>Damaged</td><td style={s.td}>30%</td></tr>
              </tbody>
            </table>
          </div>
          <p style={s.note}>
            There is no official fixed percentage. These are set from the middle of the ranges published by several third-party condition
            guides (which disagree with each other), and can be adjusted as the market moves.
          </p>
        </div>

        {/* 6 — Sources */}
        <div style={s.section}>
          <div style={s.tag}>Sources</div>
          <h2 style={s.h2}>Where this comes from</h2>
          <p style={s.note}>All pages read on {CHECKED}. Standards are updated from time to time — follow the links for the current version.</p>
          <ul style={{ color: "#a0a0b0", fontSize: "14px", lineHeight: "2", paddingLeft: "20px", margin: "8px 0 0" }}>
            <li><Ext href="https://mktg-assets.tcgplayer.com/web/seller/guides/Card-Conditioning-Standards.pdf">TCGplayer — Card Conditioning Standards (PDF, updated October 2026)</Ext></li>
            <li><Ext href="https://help.tcgplayer.com/hc/en-us/articles/221430307-Card-Conditioning-Overview">TCGplayer — Card Conditioning Overview</Ext></li>
            <li><Ext href="https://help.tcgplayer.com/hc/en-us/articles/26141121045143-Understanding-Card-Condition-Imperfections-A-Comprehensive-Guide">TCGplayer — Understanding Card Condition Imperfections</Ext></li>
            <li><Ext href="https://www.psacard.com/gradingstandards">PSA — Grading Standards</Ext></li>
            <li><Ext href="https://www.beckett.com/grading/scale">Beckett Grading Services — Grading Scale</Ext></li>
          </ul>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/cards" style={{
            display: "inline-block", background: "#ff6b35", color: "#fff",
            padding: "12px 28px", borderRadius: "10px", textDecoration: "none",
            fontWeight: 700, fontSize: "15px",
          }}>
            Browse Cards →
          </Link>
        </div>
      </div>
    </div>
  );
}
