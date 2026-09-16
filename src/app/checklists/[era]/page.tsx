'use client';
// New 2026-09-16 -- level 2 of the mobile-first "My Collection" drill-down
// Michael asked for: home (/checklists, era logo cards) -> HERE (one era's
// sets, as image-forward cards with a progress bar) -> a specific set
// (unchanged /checklists?set=CODE, the existing feature-rich Checklist
// screen with leaderboard/exports/image grid). Reference: his 6 "Gengar
// Games" screenshots -- this page matches the second one (tapping "Mega
// Evolution" on the home screen lists PBL/CRI/POR/ASC/PFL/MEG as their own
// logo-image cards with inline progress).
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { SET_INDEX, ERA_COLORS, ERA_ORDER, TIER_COLORS, TIER_LABELS_FE } from '@/lib/checklistData';
import type { SetMeta } from '@/lib/checklistData';
import {
  API_BASE, normalizeEraName, ensureChecklistData, getProgress, fmt, eraFromSlug,
} from '@/lib/checklistShared';

const SPECIAL_SLUG = 'special';

export default function EraPage() {
  const router = useRouter();
  const params = useParams<{ era: string }>();
  const slugParam = decodeURIComponent(params.era || '');
  const isSpecial = slugParam === SPECIAL_SLUG;
  const eraName = isSpecial ? null : eraFromSlug(slugParam, ERA_ORDER.filter(e => !e.startsWith('Special - ')));

  const [ready, setReady] = useState(false);
  useEffect(() => { ensureChecklistData().then(() => setReady(true)); }, []);

  const [logos, setLogos] = useState<Record<string, { logo_url: string; symbol_url: string; release_date?: string }>>({});
  useEffect(() => {
    fetch(`${API_BASE}/api/sets/`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, { logo_url: string; symbol_url: string; release_date?: string }> = {};
        (data.results || data).forEach((s: { code: string; logo_url: string; symbol_url: string; release_date?: string }) => {
          map[s.code] = { logo_url: s.logo_url, symbol_url: s.symbol_url, release_date: s.release_date };
        });
        setLogos(map);
      })
      .catch(() => {});
  }, []);

  const [eraLogoUrl, setEraLogoUrl] = useState('');
  useEffect(() => {
    if (isSpecial || !eraName) return;
    fetch(`${API_BASE}/api/eras/`)
      .then(r => r.json())
      .then(data => {
        const match = (data.results || []).find((e: { name: string }) => normalizeEraName(e.name) === normalizeEraName(eraName));
        if (match?.logo_url) setEraLogoUrl(match.logo_url);
      })
      .catch(() => {});
  }, [isSpecial, eraName]);

  const [myCompletions, setMyCompletions] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === 'undefined' || !localStorage.getItem('access_token')) return;
    authFetch('/api/checklists/my-completions/')
      .then(r => (r.ok ? r.json() : {}))
      .then(data => setMyCompletions(data || {}))
      .catch(() => setMyCompletions({}));
  }, []);

  if (!isSpecial && !eraName) {
    return (
      <div style={{ minHeight: '100vh', background: '#12121a', color: '#e0e0e0', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#a0a0b0', marginBottom: '14px' }}>Couldn&apos;t find that era.</div>
        <button onClick={() => router.push('/checklists')}
          style={{ background: '#ff6b35', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>← Back to My Collection</button>
      </div>
    );
  }

  const color = isSpecial ? '#37474F' : (ERA_COLORS[eraName as string] || '#555');
  const label = isSpecial ? 'Special Sets' : (eraName as string);

  // For "Special Sets" the underlying data still splits by product line
  // (Trick or Trade, Prize Pack, etc, e.g. era = "Special - Trick or Trade")
  // -- group those as sub-sections on this one page instead of giving each
  // its own top-level era on the home screen.
  const groups: { heading: string | null; sets: SetMeta[] }[] = isSpecial
    ? ERA_ORDER.filter(e => e.startsWith('Special - ')).map(e => ({
        heading: e.replace('Special - ', ''),
        sets: SET_INDEX.filter(s => s.era === e),
      })).filter(g => g.sets.length > 0)
    : [{ heading: null, sets: SET_INDEX.filter(s => s.era === eraName) }];

  const sortSets = (sets: SetMeta[]) => sets.slice().sort((a, b) => {
    const dA = logos[a.code]?.release_date;
    const dB = logos[b.code]?.release_date;
    if (dA && dB) return dB.localeCompare(dA);
    if (dA) return -1;
    if (dB) return 1;
    return a.code.localeCompare(b.code);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#12121a', color: '#e0e0e0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <button onClick={() => router.push('/checklists')}
            style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 12px', borderRadius: '7px', fontSize: '15px', cursor: 'pointer', lineHeight: 1 }}>←</button>
          {!isSpecial && eraLogoUrl ? (
            <img src={eraLogoUrl} alt={label} style={{ height: '32px', maxWidth: '200px', objectFit: 'contain', background: 'transparent' }} />
          ) : (
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{label}</div>
          )}
        </div>

        {!ready ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#555', fontSize: '13px' }}>Loading your progress...</div>
        ) : (
          groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: '22px' }}>
              {g.heading && <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{g.heading}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortSets(g.sets).map(s => {
                  const prog = getProgress(s.code);
                  const completedTier = myCompletions[s.code];
                  const tierColor = completedTier ? (TIER_COLORS[completedTier] || color) : null;
                  return (
                    <div key={s.code} onClick={() => router.push(`/checklists?set=${s.code}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        background: '#1a1a24', border: `${tierColor ? 2 : 1}px solid ${tierColor || (prog.owned > 0 ? color : '#2a2a3a')}`,
                        borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', position: 'relative',
                      }}
                      className="pb-set-row">
                      <div style={{ width: '64px', height: '64px', flexShrink: 0, background: '#12121a', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {logos[s.code]?.logo_url ? (
                          <img src={logos[s.code].logo_url} alt={s.name} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#555' }}>{s.code}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          {tierColor && <span title={`${TIER_LABELS_FE[completedTier] || completedTier} complete`} style={{ fontSize: '13px', flexShrink: 0 }}>🏆</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>{s.code} · {s.cards} cards · {fmt(s.set_zar)} full set</div>
                        <div style={{ height: '6px', background: '#12121a', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${prog.pct}%`, background: tierColor || color, borderRadius: '3px', transition: 'width .3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginTop: '4px' }}>
                          <span>{prog.owned}/{prog.total} · {prog.pct}%</span>
                          {prog.owned > 0 && <span style={{ color: '#ff6b35' }}>{fmt(prog.collectionZar)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <style>{`
        .pb-set-row:hover { border-color: #ff6b35 !important; }
      `}</style>
    </div>
  );
}
