// ===============================================
// lib/harmony/chords.ts
// Basic chord parser + helpers for Shape of Harmony
// ===============================================

export type ParsedChord = { label: string; pcs: number[]; root?: number };

const NAME_TO_PC: Record<string, number> = {
  "C": 0, "B#": 0,
  "C#": 1, "Db": 1,
  "D": 2,
  "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4,
  "F": 5, "E#": 5,
  "F#": 6, "Gb": 6,
  "G": 7,
  "G#": 8, "Ab": 8,
  "A": 9,
  "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11,
};

const PC_TO_NAME = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

export function noteNameForPc(pc: number) {
  return PC_TO_NAME[((pc % 12) + 12) % 12];
}

// Basic chord templates as intervals from root (pcs)
const TEMPLATES: Record<string, number[]> = {
  // Triads
  "":      [0, 4, 7],       // maj triad
  "m":     [0, 3, 7],       // min triad

  // 7ths (4-note)
  "maj7":  [0, 4, 7, 11],
  "7":     [0, 4, 7, 10],   // dominant 7
  "m7":    [0, 3, 7, 10],

  // 6ths (4-note)
  "maj6":  [0, 4, 7, 9],    // major 6
  "6":     [0, 4, 7, 9],    // C6 alias → maj6
  "m6":    [0, 3, 7, 9],    // minor 6

  // Other triads
  "dim":   [0, 3, 6],
  "°":     [0, 3, 6],
  "+":     [0, 4, 8],
  "aug":   [0, 4, 8],

  // Suspensions
  "sus2":  [0, 2, 7],
  "sus4":  [0, 5, 7],

  // Add chords (4-note)
  "add9":  [0, 4, 7, 14],
};

function uniqSorted(arr: number[]) {
  const m = Array.from(new Set(arr.map(x => ((x % 12) + 12) % 12)));
  m.sort((a, b) => a - b);
  return m;
}

export function parseChordSymbol(token: string): ParsedChord | null {
  token = token.trim();
  if (!token) return null;

  // handle repeats like "C x2" → repetition handled in parseProgression
  const repeatMatch = token.match(/(.+)x(\d+)/i);
  if (repeatMatch) token = repeatMatch[1].trim();

  // slash bass (ignore bass for polygon shape; keep full label)
  const parts = token.split("/");
  const left = parts[0];

  // Old pattern (with named groups) was:
  // /^(?<root>[A-G](#|b)?)(?<qual>maj7|m7|maj9|add9|sus2|sus4|dim|aug|°|\+|m|7|)(?<rest>.*)$/i
  // We rewrite without named groups for ES < 2018:
  const m = left.match(
    /^([A-G](#|b)?)(maj7|maj6|m7|m6|maj9|add9|6|sus2|sus4|dim|aug|°|\+|m|7|)?(.*)$/i
  );
  if (!m) return null;

  const rawRoot = m[1]
    .replace("♯", "#")
    .replace("♭", "b");

  // Normalize root so "eb", "EB", "eB" → "Eb"
  const normalizedRoot =
    rawRoot.length > 1
      ? rawRoot[0].toUpperCase() + rawRoot.slice(1)
      : rawRoot.toUpperCase();

  const rootPc = NAME_TO_PC[normalizedRoot];
  if (rootPc === undefined) return null;

  // Normalized version of the left part for pattern checks
  const normLeft = left
    .replace("♯", "#")
    .replace("♭", "b")
    .toLowerCase();

  // ===== Special extended chords we want support for =====

  // 1) Am(maj7): minor triad + major 7 → [0, 3, 7, 11]
  //    works for any root: "Xm(maj7)"
  if (/m\(maj7\)/.test(normLeft)) {
    const pcs = uniqSorted(
      [0, 3, 7, 11].map(iv => (rootPc + iv) % 12)
    );
    return { label: token, pcs, root: rootPc };
  }

  // 2) Dm9: minor 9 → [0, 3, 7, 10, 14]
  //    works for any root: "Xm9"
  if (/m9/.test(normLeft) && !/maj9/.test(normLeft)) {
    const pcs = uniqSorted(
      [0, 3, 7, 10, 14].map(iv => (rootPc + iv) % 12)
    );
    return { label: token, pcs, root: rootPc };
  }

  // 3) G7(#5#9): dominant 7 with #5 and #9
  //    base 7: [0, 4, 7, 10]
  //    #5  → 8, #9 → 15 (mod 12 = 3)
  //    final intervals: [0, 4, 8, 10, 15]
  //    works for any root: "X7(#5#9)"
  if (/7\(#5#9\)/.test(normLeft)) {
    const pcs = uniqSorted(
      [0, 4, 8, 10, 15].map(iv => (rootPc + iv) % 12)
    );
    return { label: token, pcs, root: rootPc };
  }

  // ===== Fallback: existing template logic =====

  let qual = (m[3] || "").toLowerCase();

  // Normalize some aliases so extended chords stay 4-note
  if (qual === "maj9") qual = "maj7";  // treat maj9 as maj7 (4 pcs)
  if (qual === "6")    qual = "maj6";  // C6 → maj6 template

  const template = TEMPLATES[qual];
  const pcs = uniqSorted(
    (template ?? [0, 4, 7]).map(iv => (rootPc + iv) % 12)
  );

  return { label: token, pcs, root: rootPc };
}

export function parseProgression(input: string): ParsedChord[] {
  // 1) First split on '|' while keeping it as its own token
  const tokens: string[] = [];
  for (const seg of input.split(/(\|)/)) {
    const s = seg.trim();
    if (!s) continue;
    if (s === "|") {
      tokens.push("|");
    } else {
      // 2) For non-bar segments, split further on whitespace
      tokens.push(...s.split(/\s+/));
    }
  }

  const out: ParsedChord[] = [];

  for (const t of tokens) {
    // Bar symbol: treat as special pause marker
    if (t === "|") {
      out.push({ label: "|", pcs: [], root: undefined });
      continue;
    }

    const rep = t.match(/(.+)x(\d+)/i);
    if (rep) {
      const n = Math.max(1, parseInt(rep[2], 10));
      const chord = parseChordSymbol(rep[1]);
      if (chord) for (let i = 0; i < n; i++) out.push(chord);
      continue;
    }

    const chord = parseChordSymbol(t);
    if (chord) out.push(chord);
  }

  return out;
}

export function pcSetToSortedAngles(pcs: number[]): number[] {
  const uniq = Array.from(new Set(pcs.map(x => ((x % 12) + 12) % 12)));
  uniq.sort((a, b) => a - b);
  // map to angles around circle (C at top)
  return uniq.map(pc => (pc / 12) * Math.PI * 2 - Math.PI / 2);
}