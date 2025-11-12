// ===============================================
// lib/harmony/matchVoiceLeading.ts
// Minimal-motion voice-leading mapping for Shape of Harmony
// ===============================================

export function circDist(a: number, b: number) {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

export function buildMinimalMotionMapping(A: number[], B: number[]) {
  const shared = A.filter(p => B.includes(p));
  const locks = shared.map(p => ({ from: p, to: p }));
  const U = A.filter(p => !shared.includes(p));
  const V = B.filter(p => !shared.includes(p));

  const pairs: { from?: number; to?: number }[] = [...locks];
  const usedV = new Set<number>();

  for (const u of U) {
    let best: { to: number; cost: number } | null = null;
    for (const v of V) {
      if (usedV.has(v)) continue;
      const c = circDist(u, v) + (v === B[0] ? -0.05 : 0);
      if (!best || c < best.cost) best = { to: v, cost: c };
    }
    if (best) {
      pairs.push({ from: u, to: best.to });
      usedV.add(best.to!);
    } else pairs.push({ from: u });
  }

  for (const v of V) {
    if (![...pairs.map(p => p.to)].includes(v)) pairs.push({ to: v });
  }
  return pairs;
}

export function tweenBetween(
  A: number[],
  B: number[],
  mapping: { from?: number; to?: number }[],
  t: number
) {
  const out: number[] = [];
  for (const m of mapping) {
    if (m.from != null && m.to != null) {
      const a = m.from, b = m.to;
      const cw = (b - a + 12) % 12;
      const ccw = (a - b + 12) % 12;
      const dir = cw <= ccw ? +1 : -1;
      const dist = Math.min(cw, ccw);
      const prog = Math.round(dist * t);
      out.push(((a + dir * prog) + 12) % 12);
    } else if (m.from != null && m.to == null) {
      if (t < 0.3) out.push(m.from);
    } else if (m.from == null && m.to != null) {
      if (t > 0.7) out.push(m.to);
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}