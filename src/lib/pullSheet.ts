// pokemart-frontend: src/lib/pullSheet.ts
//
// Shared branded, landscape, multi-column printable "pull sheet" builder.
// Extracted 2026-09-11 out of checklists/page.tsx (where it originated,
// Michael 2026-09-02: "must it be changed to pdf to match My Pull Sheets?",
// then "make all printable ... presentable ... compact, maybe Landscape
// and have 2 or 3 columns of pokemon") so the new /staff/bundles Bundle
// Opportunities page can reuse the exact same look for its post-Accept
// printout instead of duplicating ~150 lines. checklists/page.tsx now
// imports from here too -- this file is the single source of truth, kept
// deliberately generic (just rows of num/name/variant + a title/set/
// customer header) so neither caller needs to know about the other's data
// shape.
//
// Same visual language as the staff order Pull Sheet / packing slip
// (orders/views.py print_order): a PokeBulk SA header, context line, a
// Print button so it can be saved as a PDF via the browser's own print
// dialog -- landscape, card list split into 2-4 side-by-side columns (not
// a CSS multi-column table, which doesn't repeat headers per column) so a
// full 150-250 row sheet stays compact instead of one long scroll.

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Splits a list into N side-by-side columns, filled contiguously (col 1
// gets the first chunk, col 2 the next, etc.) so a printed sheet reads
// top-to-bottom then left-to-right, the way a paper checklist normally
// does -- not round-robin, which would scatter consecutive card numbers
// across every column.
export function splitIntoColumns<T>(items: T[], columns: number): T[][] {
  const perCol = Math.ceil(items.length / columns);
  const cols: T[][] = [];
  for (let i = 0; i < items.length; i += perCol) cols.push(items.slice(i, i + perCol));
  while (cols.length < columns) cols.push([]);
  return cols;
}

export interface PullSheetRow { num: string; name: string; variant: string; highlighted?: boolean }

// Opens the built HTML (see buildPullSheetHtml below) in a new tab via a
// Blob URL -- Michael, 2026-09-02: "must it be changed to pdf to match My
// Pull Sheets?" -- so it matches the staff Pull Sheet look and can be
// saved as a PDF via the browser's own Print dialog, same as every other
// printable page on the site.
export function openPullSheet(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function buildPullSheetHtml(opts: {
  title: string; setName: string; setCode: string;
  customerName: string; customerEmail: string;
  rows: PullSheetRow[]; showHighlighted: boolean;
}): string {
  const { title, setName, setCode, customerName, customerEmail, rows, showHighlighted } = opts;
  // Michael, 2026-09-02: "is there a way to limit print only on 2 pages,
  // for any set... you don't want people printing too many pages, then
  // damaging the format to reduce the printing?" -- typical sheets (up to
  // ~140 rows -- most Needed Lists and mid-size Full Lists) keep the
  // original 1-3 column / 10px look untouched; only genuinely huge Full
  // Lists (a set's cards times every variant) step up to 4 columns and a
  // slightly smaller -- still legible -- font so the whole sheet keeps
  // fitting on 2 printed pages instead of spilling onto a 3rd.
  const tier =
    rows.length > 260 ? { cols: 4, name: 8,  variant: 7, num: 7, chk: 8,  head: 7, padY: 1, line: 1.1,  numW: 26, varW: 44 } :
    rows.length > 140 ? { cols: 4, name: 9,  variant: 7, num: 8, chk: 9,  head: 7, padY: 1, line: 1.15, numW: 30, varW: 50 } :
    rows.length > 60  ? { cols: 3, name: 10, variant: 8, num: 9, chk: 10, head: 8, padY: 2, line: 1.2,  numW: 34, varW: 58 } :
    rows.length > 20  ? { cols: 2, name: 10, variant: 8, num: 9, chk: 10, head: 8, padY: 2, line: 1.2,  numW: 34, varW: 58 } :
                         { cols: 1, name: 10, variant: 8, num: 9, chk: 10, head: 8, padY: 2, line: 1.2,  numW: 34, varW: 58 };
  const columns = splitIntoColumns(rows, tier.cols);
  // Michael, 2026-09-02: "Can change the missing cards with Red writing,
  // just to highlight them" -- only meaningful in showHighlighted mode (the
  // Full List), where a row can actually be either owned or missing; every
  // row on the Needed List is already missing by definition, so it stays
  // plain black there instead of turning the whole sheet red.
  const rowHtml = (r: PullSheetRow) => {
    const missing = showHighlighted && !r.highlighted;
    const status = showHighlighted ? (r.highlighted ? '✓' : '–') : '[ ]';
    return `<div class="row${missing ? ' missing' : ''}"><span class="num">${escapeHtml(r.num)}</span><span class="name">${escapeHtml(r.name)}</span><span class="variant">${escapeHtml(r.variant)}</span><span class="chk">${status}</span></div>`;
  };
  const colHeadHtml = `<div class="head-row"><span class="num">#</span><span class="name">Card Name</span><span class="variant">Variant</span><span class="chk">${showHighlighted ? 'Have' : 'Done'}</span></div>`;
  const columnsHtml = columns.map(col => `<div class="col">${colHeadHtml}${col.map(rowHtml).join('')}</div>`).join('');
  const generated = new Date().toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const countLabel = `${rows.length} card${rows.length !== 1 ? 's' : ''}${showHighlighted ? ' total' : ' needed'}`;
  const pdfFilename = `PokeBulk-${(setCode || setName).replace(/[^A-Za-z0-9]+/g, '-')}-${title.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`.replace(/-+/g, '-');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — ${escapeHtml(setName)} - PokeBulk SA</title>
<style>
* { margin:0;padding:0;box-sizing:border-box }
body { font-family:Arial,sans-serif;font-size:11px;color:#000;padding:14px;line-height:${tier.line} }
.cols { display:flex; gap:16px; align-items:flex-start; margin-top:8px }
.col { flex:1; min-width:0 }
.row { display:flex; align-items:center; gap:5px; padding:${tier.padY}px 0; border-bottom:1px solid #eee }
.row .num { width:${tier.numW}px; flex-shrink:0; color:#888; font-size:${tier.num}px }
.row .name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:${tier.name}px }
.row .variant { width:${tier.varW}px; flex-shrink:0; text-align:right; font-size:${tier.variant}px; text-transform:uppercase; color:#666 }
.row .chk { width:20px; flex-shrink:0; text-align:right; font-size:${tier.chk}px; font-weight:bold }
.row.missing .name, .row.missing .chk { color:#c0392b }
.head-row { display:flex; gap:5px; padding:2px 0; border-bottom:2px solid #ccc; margin-bottom:2px; font-size:${tier.head}px; font-weight:bold; text-transform:uppercase; color:#888 }
.head-row .num { width:${tier.numW}px; flex-shrink:0 } .head-row .name { flex:1 } .head-row .variant { width:${tier.varW}px; flex-shrink:0; text-align:right } .head-row .chk { width:20px; flex-shrink:0; text-align:right }
@media print { .no-print { display:none } @page { margin:10mm; size:A4 landscape } }
</style>
</head><body>
<div class="no-print" style="margin-bottom:14px">
  <button onclick="window.print()" style="background:#ff6b35;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:14px;cursor:pointer">Print</button>
  <button onclick="downloadSheetPdf(this)" style="margin-left:8px;background:#2a7de1;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:14px;cursor:pointer">⬇ Download PDF</button>
  <button onclick="window.close()" style="margin-left:8px;padding:8px 20px;border-radius:6px;border:1px solid #ccc;cursor:pointer">Close</button>
</div>
<div id="sheet" data-filename="${escapeHtml(pdfFilename)}">
<div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:2px solid #000;padding-bottom:6px">
  <div>
    <h1 style="font-size:18px">${escapeHtml(title)}</h1>
    <div style="font-size:10px;color:#ff6b35;font-weight:bold;letter-spacing:.5px">pokebulk.co.za</div>
    <div style="font-size:11px;color:#444;margin-top:2px">${escapeHtml(setName)} [${escapeHtml(setCode)}] · ${countLabel}</div>
    <div style="font-size:11px;color:#444">Customer: <strong>${escapeHtml(customerName)}</strong>${customerEmail ? ` (${escapeHtml(customerEmail)})` : ''}</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#444">Generated ${generated}</div>
</div>
<div class="cols">${columnsHtml}</div>
<div style="margin-top:14px;border-top:1px solid #ccc;padding-top:6px;font-size:9px;color:#666;text-align:center">
  Proudly brought to you by Poke Bulk SA · <a href="https://www.pokebulk.co.za" style="color:#ff6b35;text-decoration:none">www.pokebulk.co.za</a> · enquiries@pokebulk.co.za
</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.14.0/html2pdf.bundle.min.js"></script>
<script>
function downloadSheetPdf(btn) {
  if (typeof html2pdf === 'undefined') {
    alert("PDF download isn't available right now (the PDF library did not load) -- please use Print, then choose 'Save as PDF' instead.");
    return;
  }
  var el = document.getElementById('sheet');
  var filename = el.getAttribute('data-filename') || 'PokeBulk-my-collection.pdf';
  var original = btn.textContent;
  btn.textContent = 'Preparing...';
  btn.disabled = true;
  html2pdf().set({
    margin: 5,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'] }
  }).from(el).save().then(function () {
    btn.textContent = original;
    btn.disabled = false;
  }).catch(function () {
    btn.textContent = original;
    btn.disabled = false;
    alert('Sorry, the PDF download failed -- please use Print, then choose "Save as PDF" instead.');
  });
}
</script>
</body></html>`;
}
