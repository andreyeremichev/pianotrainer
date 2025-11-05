/** High-level categories the mapper will use. */
export type PhonemeKind = "vowel" | "diphthong" | "consonant" | "punct" | "space" | "number" | "symbol";
/** Optional subtypes for vowels/consonants if you want finer control. */
export type VowelClass =
  | "close" | "close-mid" | "mid" | "open-mid" | "open"
  | "rounded" | "unrounded" | "r-colored";

export type ConsonantClass =
  | "stop" | "fricative" | "affricate" | "nasal" | "approximant" | "liquid" | "glide";

/** Stress levels from dictionary or heuristics. */
export type Stress = "primary" | "secondary" | "unstressed";

/** One token per phoneme-like unit after G2P. */
export interface PhonemeToken {
  kind: PhonemeKind;
  /** Canonical IPA symbol(s), e.g., "t", "ɔ", "ɪ", "eə", "ɔɪ" */
  ipa: string;
  /** Original ARPABET symbol(s) if the source was CMU, e.g., "AO", "OY". */
  arpa?: string;
  /** Stress, if known/applicable (on vowels/diphthongs). */
  stress?: Stress;
  /** Optional finer classification for vowels/consonants. */
  vowelClass?: VowelClass;
  consonantClass?: ConsonantClass;

  /** Word-level info (useful for caption grouping). */
  wordIndex: number;       // 0-based index of the word in the input
  phonemeIndex: number;    // 0-based index within the word’s phoneme sequence

  /** Source character span in the original input (for caption alignment). */
  srcFrom: number;         // inclusive
  srcTo: number;           // exclusive

  /** Heuristic weight for duration scaling (mapper can multiply by base ms). */
  durWeight?: number;      // e.g., 1.0 for vowels, 0.4 for consonants
}

/** Main entry: converts free text to a flat, time-ordered phoneme stream. */
export function tokenizeToIPA(input: string): PhonemeToken[] {
  const out: PhonemeToken[] = [];
  const text = input || "";
  if (!text) return out;

  // Simple word splitter that keeps indices
  const parts: { word: string; from: number; to: number }[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      const s = i, e = i + 1;
      parts.push({ word: " ", from: s, to: e });
      i = e;
      continue;
    }
    const s = i;
    while (i < text.length && !/\s/.test(text[i])) i++;
    parts.push({ word: text.slice(s, i), from: s, to: i });
  }

  const VOWEL_IPA = new Set(["a","e","i","o","u","ɑ","æ","ɪ","ɛ","ɔ","ʊ","ə","ɚ","ɝ"]);
  const wordToArpa = (w: string): string[] | null => {
    // tiny lexicon demo: try ARPA_TO_IPA keys by common words; else null
    const lw = w.toLowerCase();
    if (lw === "toy")  return ["T","OY"];     // → t + ɔɪ
    if (lw === "where")return ["W","EH","R"]; // → w + ɛ + ɹ  (we’ll map to eə visually by join)
    if (lw === "through") return ["TH","R","UW"]; // → θ r u
    return null;
  };

  let wordIndex = 0;
  for (const p of parts) {
    if (p.word === " ") {
      out.push({
        kind: "space", ipa: " ", wordIndex, phonemeIndex: 0,
        srcFrom: p.from, srcTo: p.to, durWeight: 0.5
      });
      wordIndex++;
      continue;
    }
    // --- Numbers -------------------------------------------------
{
  const c = input[i];
  if (/\d/.test(c)) {
    let j = i;
    while (j < input.length && /\d/.test(input[j])) j++;
    const run = input.slice(i, j);
    out.push({
      kind: "number",
      ipa: run,
      wordIndex,
      phonemeIndex: ph++,
      srcFrom: i,
      srcTo: j,
      durWeight: 1.0,
    });
    i = j;
    continue;
  }
}

// --- Symbols -------------------------------------------------
{
  const c = input[i];
  if (/[/%+=#@$.,\-:']/.test(c)) {
    out.push({
      kind: "symbol",
      ipa: c,
      wordIndex,
      phonemeIndex: ph++,
      srcFrom: i,
      srcTo: i + 1,
      durWeight: 1.0,
    });
    i++;
    continue;
  }
}
    // 1) Try dictionary (ARPABET → IPA)
    const arpaSeq = wordToArpa(p.word);
    if (arpaSeq) {
      let phIdx = 0;
      for (const arpa of arpaSeq) {
        const ipa = ARPA_TO_IPA[arpa] || arpa.toLowerCase();
        // crude diphthong detect
        const isDip = /(aɪ|aʊ|ɔɪ|eɪ|oʊ)/.test(ipa);
        out.push({
          kind: isDip ? "diphthong" : (VOWEL_IPA.has(ipa) ? "vowel" : "consonant"),
          ipa,
          arpa,
          wordIndex,
          phonemeIndex: phIdx++,
          srcFrom: p.from, srcTo: p.to,
          durWeight: isDip || VOWEL_IPA.has(ipa) ? 1.0 : 0.4
        });
      }
      wordIndex++;
      continue;
    }

    // 2) Fallback letter-scan → IPA
    const w = p.word;
    let j = 0, ph = 0;
    while (j < w.length) {
      const two = w.slice(j, j + 2).toLowerCase();
      // simple diphthongs
      if (two === "oy") {
        out.push({
          kind: "diphthong", ipa: "ɔɪ",
          wordIndex, phonemeIndex: ph++,
          srcFrom: p.from + j, srcTo: p.from + j + 2,
          durWeight: 1.0
        });
        j += 2; continue;
      }
      if (two === "ea") {
        out.push({
          kind: "diphthong", ipa: "eɪ",         // approx for fallback
          wordIndex, phonemeIndex: ph++,
          srcFrom: p.from + j, srcTo: p.from + j + 2,
          durWeight: 1.0
        });
        j += 2; continue;
      }

      const ch = w[j];
      const lower = ch.toLowerCase();

      // vowels basic mapping
      let ipa = lower;
      if (lower === "a") ipa = "a";
      else if (lower === "e") ipa = "e";
      else if (lower === "i") ipa = "ɪ";
      else if (lower === "o") ipa = "o";
      else if (lower === "u") ipa = "u";
      else if (lower === "y") ipa = "j"; // treat y as consonant glide in fallback

      const kind: PhonemeKind =
        (ipa === "a" || ipa === "e" || ipa === "ɪ" || ipa === "o" || ipa === "u")
          ? "vowel"
          : "consonant";

      out.push({
        kind,
        ipa,
        wordIndex, phonemeIndex: ph++,
        srcFrom: p.from + j, srcTo: p.from + j + 1,
        durWeight: kind === "vowel" ? 1.0 : 0.4
      });
      j += 1;
    }
    wordIndex++;
  }

  return out;
}
/** ARPABET (CMU) → IPA miniset. Add more as you expand. */
export const ARPA_TO_IPA: Record<string, string> = {
  // Vowels (monophthongs)
  AA: "ɑ",   AE: "æ",   AH: "ʌ",  AO: "ɔ",  AW: "aʊ", AX: "ə",  AXR: "ɚ",
  EH: "ɛ",   ER: "ɝ",   EY: "eɪ",
  IH: "ɪ",   IY: "i",
  OW: "oʊ",  UH: "ʊ",   UW: "u",

  // Diphthongs (CMU uses: AY, EY, OW, OY, AW)
  AY: "aɪ",  OY: "ɔɪ",  // (EY/OW already mapped as monophthong→diphthong)
  // R-colored vowels (already above: ER/AXR)

  // Consonants
  P: "p",  B: "b",  T: "t",  D: "d",  K: "k",  G: "g",
  CH: "tʃ", JH: "dʒ",
  F: "f",  V: "v",  TH: "θ", DH: "ð", S: "s",  Z: "z",
  SH: "ʃ", ZH: "ʒ", HH: "h",
  M: "m",  N: "n",  NG: "ŋ",
  L: "l",  R: "ɹ",  Y: "j",  W: "w",
}

/** Optional: consonant classification helper */
export const IPA_CONS_CLASS: Record<string, ConsonantClass> = {
  p:"stop", b:"stop", t:"stop", d:"stop", k:"stop", g:"stop",
  f:"fricative", v:"fricative", θ:"fricative", ð:"fricative",
  s:"fricative", z:"fricative", ʃ:"fricative", ʒ:"fricative", h:"fricative",
  tʃ:"affricate", dʒ:"affricate",
  m:"nasal", n:"nasal", ŋ:"nasal",
  l:"liquid", ɹ:"liquid",
  j:"glide", w:"glide",
}

/** Optional: vowel classification helper */
export const IPA_VOWEL_CLASS: Record<string, VowelClass> = {
  i:"close",  ɪ:"close",  u:"close",  ʊ:"close",
  e:"close-mid", eɪ:"close-mid", o:"close-mid", oʊ:"close-mid",
  ɛ:"mid",  ə:"mid",  ɜ:"mid",  ɝ:"r-colored", ɚ:"r-colored",
  ʌ:"open-mid", ɔ:"open-mid",
  a:"open",  ɑ:"open",  æ:"open",
  // diphthongs (label as you prefer)
  aɪ:"open", aʊ:"open", ɔɪ:"open-mid",
}
if (typeof window !== "undefined") {
  console.log(tokenizeToIPA("toy where through"));
}