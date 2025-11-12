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
  "":     [0, 4, 7],      // maj
  "m":    [0, 3, 7],      // min
  "maj7": [0, 4, 7, 11],
  "7":    [0, 4, 7, 10],
  "m7":   [0, 3, 7, 10],
  "dim":  [0, 3, 6],
  "°":    [0, 3, 6],
  "+":    [0, 4, 8],
  "aug":  [0, 4, 8],
  "sus2": [0, 2, 7],
  "sus4": [0, 5, 7],
  "add9": [0, 4, 7, 14],
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
  const m = left.match(/^([A-G](#|b)?)(maj7|m7|maj9|add9|sus2|sus4|dim|aug|°|\+|m|7|)?(.*)$/i);
  if (!m) return null;

  const rootName = m[1]
    .replace("♯","#")
    .replace("♭","b");
  const rootPc = NAME_TO_PC[rootName.toUpperCase()];
  if (rootPc === undefined) return null;

  let qual = (m[3] || "").toLowerCase();
  if (qual === "maj9") qual = "maj7"; // simple fallback

  const template = TEMPLATES[qual];
  const pcs = uniqSorted(
    (template ?? [0, 4, 7]).map(iv => (rootPc + iv) % 12)
  );

  return { label: token, pcs, root: rootPc };
}

export function parseProgression(input: string): ParsedChord[] {
  const tokens = input
    .replace(/\|/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);

  const out: ParsedChord[] = [];
  for (const t of tokens) {
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