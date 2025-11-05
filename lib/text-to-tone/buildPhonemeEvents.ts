// lib/text-to-tone/buildPhonemeEvents.ts
import type { TextToneEvent } from "@/lib/text-to-tone/buildEvents";
import type {
  PhonemeToken,
  PhonemeKind,
  VowelClass,
  ConsonantClass,
  
} from "@/lib/text-to-tone/phonemeTokenizer";
import { buildEvents } from "@/lib/text-to-tone/buildEvents";

/**
 * Phoneme → Events mapper for A natural minor (Aeolian).
 * - Vowels → sustained notes (A minor tones)
 * - Diphthongs → 2-note glides
 * - Consonants → short rests (tickless by default; see TICKS_FOR_CONS)
 * - Spaces → short rests
 * Timing matches your current engine: ~250ms elements, ~125ms space, ticks short.
 */

const MS_VOWEL = 250;     // ~0.25s base for vowel nuclei
const MS_SPACE = 125;     // short rest for spaces/dashes
const MS_CONS  = 110;     // very short consonant "time slice"
const MS_TICK  = 120;     // soft ticks like . :

// Optional: make consonants audible as ticks on A3 (like your zero tick)
const TICKS_FOR_CONS = true;

// Map IPA vowel (or vowel class) → pitch letters in A minor (letters only; octaves assigned below)
const IPA_TO_DEGREE: Record<string, string[]> = {
  // open / tonic colored
  "a": ["A","E"], "ɑ": ["A","E"], "æ": ["A","E"],
  // open-mid
  "ɔ": ["C","E"], "ʌ": ["D","F"],
  // mid/central
  "ə": ["C","F"], "ɜ": ["C","F"],
  // close-mid / diph combos
  "e": ["C","E","G"], "o": ["E","G"],
  // close
  "i": ["G","B","E"], "ɪ": ["G","E"], "u": ["G","E"], "ʊ": ["G","E"],
  // r-colored (centered – can ornament later)
  "ɚ": ["D","E"], "ɝ": ["D","E"],
};

type DipRule = { first: string[], second: string[] };
const DIPHTHONGS: Record<string, DipRule> = {
  "aɪ": { first: ["A"], second: ["C"] },  // 1 → 3
  "aʊ": { first: ["A"], second: ["E"] },  // 1 → 5
  "ɔɪ": { first: ["C"], second: ["G"] },  // 3 → 7
  "eɪ": { first: ["C"], second: ["E"] },  // 3 → 5
  "oʊ": { first: ["E"], second: ["G"] },  // 5 → 7
};

// Choose a single letter pitch from a list (simple: pick the first)
function pickLetter(candidates: string[], prevLetter?: string): string {
  if (!candidates || candidates.length === 0) return "A";
  // Optional: avoid repeating same letter twice (stepwise feel)
  if (prevLetter) {
    for (const c of candidates) if (c !== prevLetter) return c;
  }
  return candidates[0];
}

// Map a monophthong IPA symbol to a letter (A..G) in A minor
function letterForVowelIPA(ipa: string, prevLetter?: string): string {
  const key = ipa in IPA_TO_DEGREE ? ipa : ipa.normalize();
  const cand = IPA_TO_DEGREE[key] || IPA_TO_DEGREE["ə"];
  return pickLetter(cand, prevLetter);
}

// Assign octaves the same way your Letters mode does:
// - A → A3 (bass), everything else on treble staff (C4..G4, B4)
function toNoteName(letter: string): string {
  if (letter === "A") return "A3";
  // Keep B on treble too
  if (letter === "B") return "B4";
  return `${letter}4`; // C4, D4, E4, F4, G4
}

function asChord(notes: string[], dSec: number, label?: string): TextToneEvent {
  return { kind: "CHORD", notes, dur: dSec, clef: (notes.some(n => /[A-G]3$/.test(n)) ? "bass" : "treble"), label, t: 0, d: dSec };
}

function asRest(dSec: number, label?: string): TextToneEvent {
  return { kind: "REST", dur: dSec, label, t: 0, d: dSec };
}
function asMelody(note: string, dSec: number, label?: string): TextToneEvent {
  const clef = /[A-G]3$/.test(note) ? "bass" : "treble";
  return { kind: "MELODY", notes: [note], dur: dSec, clef, label, t: 0, d: dSec };
}
// ===== Archetypes & Helpers (timing only; no rescaling) =====

type Archetype = "even" | "swing" | "legato" | "stomp" | "bounce" | "glide";

type ArcheRecipe = {
  // relative multipliers per token role within a word
  C1: number;        // consonant(s) before the first vowel
  V: number;         // vowel (monophthong) center
  C2: number;        // consonant(s) after the last vowel
  diphTotal: number; // how much "V time" diphthongs get relative to V
  diphSplit: [number, number]; // split of diphthong 1st→2nd target
};

// Base durations (kept constant; no normalization later)
const BASE_MS_VOWEL = 260;  // core vowel length (unstressed)
const BASE_MS_CONS  = 110;  // core consonant tick
const BASE_MS_SPACE = 150;  // space/pause

// Archetype recipes (durations = BASE * multiplier)
const ARCH: Record<Archetype, ArcheRecipe> = {
  even:   { C1: 0.40, V: 1.00, C2: 0.40, diphTotal: 1.60, diphSplit: [0.60, 0.40] },
  swing:  { C1: 0.30, V: 1.20, C2: 0.50, diphTotal: 1.60, diphSplit: [0.65, 0.35] },
  legato: { C1: 0.50, V: 1.30, C2: 0.60, diphTotal: 1.70, diphSplit: [0.60, 0.40] },
  stomp:  { C1: 0.20, V: 1.40, C2: 0.30, diphTotal: 1.70, diphSplit: [0.70, 0.30] },
  bounce: { C1: 0.35, V: 1.10, C2: 0.45, diphTotal: 1.55, diphSplit: [0.60, 0.40] },
  glide:  { C1: 0.45, V: 1.25, C2: 0.55, diphTotal: 1.70, diphSplit: [0.55, 0.45] },
};

// A tiny deterministic assignment,
// combining "by signature" + a stable position cycle as fallback.
function wordSignature(ipaSeq: string[]): "CV" | "CVC" | "CCV" | "VC" | "V" | "OTHER" {
  const kinds = ipaSeq.map(x =>
    /[aeiouɑæɪɛɔʊəɚɝ]/.test(x) || /(aɪ|aʊ|ɔɪ|eɪ|oʊ)/.test(x) ? "V" : "C"
  );
  const s = kinds.join("");
  if (s === "CV")  return "CV";
  if (s === "CVC") return "CVC";
  if (s.startsWith("CC") && s.includes("V")) return "CCV";
  if (s === "VC")  return "VC";
  if (s === "V")   return "V";
  return "OTHER";
}

function chooseArchetypeForWord(ipaSeq: string[], wordIndex: number, phrase?: string): Archetype {
  // 1) Signature-based base choice
  const sig = wordSignature(ipaSeq);
  let base: Archetype =
    sig === "CV"  ? "swing"  :
    sig === "CVC" ? "legato" :
    sig === "CCV" ? "stomp"  :
    sig === "V"   ? "glide"  :
    sig === "VC"  ? "even"   :
    "even";

  // 2) Position cycle (deterministic variety across words)
  const cycle: Archetype[] = ["swing", "legato", "even", "stomp"]; // 0,1,2,3,0,1…
  const cyc = cycle[wordIndex % cycle.length];

  // 3) Meme preset (optional; simple triggers, extend later)
  const p = (phrase || "").toLowerCase();
  let preset: Archetype | null = null;
  if (/^pov[:]/.test(p)) preset = "swing";
  else if (/no one[:]/.test(p)) preset = "even";
  else if (/\b(be like)\b/.test(p)) preset = "legato";
  else if (/[!?]$/.test(p)) preset = "stomp";

  // Combine: preset > base > cycle
  return preset || base || cyc;
}

// Utility: split phonemes by wordIndex
function splitByWord<T extends { wordIndex: number }>(tokens: T[]): T[][] {
  const out: T[][] = [];
  let current: number | null = null;
  for (const t of tokens) {
    if (current === null || t.wordIndex !== current) {
      out.push([t]); current = t.wordIndex;
    } else {
      out[out.length - 1].push(t);
    }
  }
  return out;
}
/**
 * Build events from phoneme tokens (letters-only pipeline).
 * Numbers / symbols / existing chord logic will be merged in phase 2.
 */
export function buildPhonemeEvents(
  phonemes: PhonemeToken[],
  opts?: { phrase?: string }   // optional: pass the original phrase for meme presets
): { events: TextToneEvent[] } {
  const events: TextToneEvent[] = [];
  let t = 0;
  let prevLetter: string | undefined;

  const pushAt = (ev: TextToneEvent) => {
    ev.t = t;
    events.push(ev);
    t += ev.d;
  };

  // Group tokens by word (so we can assign an archetype per word)
  const byWord = splitByWord(phonemes);

  byWord.forEach((wordTokens, wIdx) => {
    // Determine archetype deterministically
    const ipaSeq = wordTokens.map(t => t.ipa);
    const arche = chooseArchetypeForWord(ipaSeq, wIdx, opts?.phrase);
    const A = ARCH[arche];

    // Find the first & last vowel/diphthong positions for role tagging
    const isV = (t: PhonemeToken) =>
      t.kind === "vowel" || t.kind === "diphthong";
    const firstV = wordTokens.findIndex(isV);
    const lastV  = (() => {
      for (let i = wordTokens.length - 1; i >= 0; i--) {
        if (isV(wordTokens[i])) return i;
      }
      return -1;
    })();

    for (let i = 0; i < wordTokens.length; i++) {
      const tok = wordTokens[i];
      // --- Catch-all delegation for digits/symbols (works even if tokenizer didn't tag them) ---
const ipaStr = String((tok as any).ipa ?? "");

// full digit run (e.g., "2000", "21")
if (/^\d+$/.test(ipaStr)) {
  const seg = opts?.phrase?.slice(tok.srcFrom, tok.srcTo) ?? ipaStr;
  const { events: numEvts } = buildEvents(seg);
  for (const e of numEvts) {
    const copy = { ...e, t, d: e.d ?? 0.25 };
    events.push(copy);
    t += copy.d;
  }
  prevLetter = undefined;
  continue;
}

// single-char musical symbols you already support in Letters mode
if (/^[/%+=#@$.,\-:']$/.test(ipaStr)) {
  const seg = opts?.phrase?.slice(tok.srcFrom, tok.srcTo) ?? ipaStr;
  const { events: symEvts } = buildEvents(seg);
  for (const e of symEvts) {
    const copy = { ...e, t, d: e.d ?? 0.25 };
    events.push(copy);
    t += copy.d;
  }
  prevLetter = undefined;
  continue;
}
          // --- Numbers: reuse Letters-mode builder for digits (20..90, 100, etc.)
    if (tok.kind === "number") {
      const seg = opts?.phrase?.slice(tok.srcFrom, tok.srcTo) ?? tok.ipa;
      const { events: segEvts } = buildEvents(seg);
      for (const e of segEvts) {
        const copy = { ...e, t, d: e.d ?? 0.25 };
        events.push(copy);
        t += copy.d;
      }
      prevLetter = undefined;
      continue;
    }

    // --- Symbols: reuse Letters-mode builder (% / + = # @ $ . , - : ' ; )
    if (tok.kind === "symbol") {
      const seg = opts?.phrase?.slice(tok.srcFrom, tok.srcTo) ?? tok.ipa;
      const { events: segEvts } = buildEvents(seg);
      for (const e of segEvts) {
        const copy = { ...e, t, d: e.d ?? 0.25 };
        events.push(copy);
        t += copy.d;
      }
      prevLetter = undefined;
      continue;
    }

      // Spaces / punctuation → short rests
      if (tok.kind === "space") {
        pushAt(asRest(BASE_MS_SPACE / 1000, "space"));
        continue;
      }
      if (tok.kind === "punct") {
        pushAt(asRest((BASE_MS_CONS / 1000), tok.ipa));
        continue;
      }

      // Consonants
      if (tok.kind === "consonant") {
        // Role: before or after nucleus?
        const before = firstV >= 0 && i < firstV;
        const mult = before ? A.C1 : A.C2;
        const dMs = Math.max(70, Math.round(BASE_MS_CONS * mult));
       // ===== Consonant and Vowel → Note maps =====
const VOWEL_TO_NOTE: Record<string, string> = {
  i:"E4", ɪ:"E4",
  e:"F4", ɛ:"F4",
  æ:"A3", a:"A3", ɑ:"A3",
  ə:"D4", ʌ:"D4", ɜ:"D4", ɝ:"D4", ɚ:"D4",
  o:"G4", ɔ:"G4",
  u:"B4", ʊ:"B4",
};

const CONS_TO_NOTE: Record<string, string> = {
  // Stops
  p:"A3", b:"A3", t:"A3", d:"A3", k:"A3", g:"A3",
  // Nasals
  m:"C4", n:"C4", ŋ:"C4",
  // Affricates
  tʃ:"F4", dʒ:"F4",
  // Fricatives
  f:"E4", v:"E4", s:"E4", z:"E4", ʃ:"E4", ʒ:"E4", θ:"E4", ð:"E4",
  // Liquids / Approximants
  l:"G4", r:"G4", w:"G4", j:"G4",
  // Consonant clusters
  st:"D4", tr:"D4", pl:"D4", gr:"D4", sk:"D4", sp:"D4",
};

       
        // Map consonant to its tick pitch (A3/C4/E4/G4/D4 groups)
        const consIpa = tok.ipa;
        const letter = CONS_TO_NOTE[consIpa] ? CONS_TO_NOTE[consIpa][0] : "A";
        const note   = CONS_TO_NOTE[consIpa] || "A3";
        // If you prefer silent consonants on stave: swap asMelody→asRest & keep trigger for audio only.
        pushAt(asMelody(note, dMs / 1000, "@cons"));
        prevLetter = letter;
        continue;
      }

      // Vowels (monophthong)
      if (tok.kind === "vowel") {
        const baseLetter = letterForVowelIPA(tok.ipa, prevLetter);
        let scale = 1;
        if (tok.stress === "primary")   scale = 1.3;
        else if (tok.stress === "secondary") scale = 1.15;

        const dMs = Math.max(120, Math.round(BASE_MS_VOWEL * A.V * scale));
        pushAt(asMelody(toNoteName(baseLetter), dMs / 1000, tok.ipa));
        prevLetter = baseLetter;
        continue;
      }

      // Diphthongs
      if (tok.kind === "diphthong") {
        const rule = DIPHTHONGS[tok.ipa];
        // Fallback: treat first symbol as a vowel if unknown.
        if (!rule) {
          const L = letterForVowelIPA(tok.ipa[0] || "ə", prevLetter);
          const dMs = Math.max(120, Math.round(BASE_MS_VOWEL * A.V));
          pushAt(asMelody(toNoteName(L), dMs / 1000, tok.ipa));
          prevLetter = L;
          continue;
        }

        // total time for diphthong (relative to vowel)
        let totalMs = Math.round(BASE_MS_VOWEL * A.diphTotal);
        if (tok.stress === "primary")   totalMs = Math.round(totalMs * 1.3);
        else if (tok.stress === "secondary") totalMs = Math.round(totalMs * 1.15);

        const [p1, p2] = A.diphSplit;
        const d1 = Math.max(90, Math.round(totalMs * p1));
        const d2 = Math.max(80, Math.round(totalMs * p2));

        const L1 = pickLetter(rule.first,  prevLetter);
        const L2 = pickLetter(rule.second, L1);

        pushAt(asMelody(toNoteName(L1), d1 / 1000, tok.ipa));
        pushAt(asMelody(toNoteName(L2), d2 / 1000, tok.ipa));
        prevLetter = L2;
        continue;
      }

      // Safety
      pushAt(asRest(BASE_MS_CONS / 1000, "@other"));
    }
  });

  return { events };
}