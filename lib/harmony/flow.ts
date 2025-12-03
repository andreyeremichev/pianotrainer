// /lib/harmony/flow.ts

// Pitch classes we will use for root naming (0–11)
export const PITCHES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type PitchName = (typeof PITCHES)[number];

export type FlowMode = "minor" | "major";

export type EmotionId =
  | "sadness"
  | "anger"
  | "fear"
  | "mystery"
  | "melancholy"
  | "calm"
  | "playful"
  | "magic"
  | "wonder"
  | "tension";

export type FlowQuality = "M" | "m" | "dim";

export type FlowPreset = {
  id: EmotionId;
  mode: FlowMode;
  /**
   * Semitone offsets from tonic (0 = tonic).
   * These are derived from your canonical examples in C minor or B♭ major.
   */
  offsets: number[];
  /**
   * Triad qualities for each step: "M", "m", or "dim".
   */
  qualities: FlowQuality[];
  /**
   * Degree labels for theory and ring display,
   * e.g. ["1", "6b", "3b", "7b"].
   */
  degrees: string[];
  label: string;
  emoji: string;
};

/**
 * Flow presets derived from your C minor / B♭ major examples.
 *
 * These offsets/qualities are the canonical “movement” that can later
 * be applied to any tonic.
 */
export const FLOW_PRESETS: Record<EmotionId, FlowPreset> = {
  // 😢 Sadness — C minor example: Cm → Ab → Eb → Bb
  sadness: {
    id: "sadness",
    mode: "minor",
    offsets: [0, 8, 3, 10], // C, Ab, Eb, Bb
    qualities: ["m", "M", "M", "M"],
    degrees: ["1", "6b", "3b", "7b"],
    label: "Sadness",
    emoji: "😢",
  },

  // 😡 Anger — C minor example: Cm → Fm → Db → G
  anger: {
    id: "anger",
    mode: "minor",
    offsets: [0, 5, 1, 7], // C, F, Db, G
    qualities: ["m", "m", "M", "M"],
    degrees: ["1", "4", "2b", "5"],
    label: "Anger",
    emoji: "😡",
  },

  // 😱 Fear / Horror — C minor example: Cm → Db → G → Cm
  fear: {
    id: "fear",
    mode: "minor",
    offsets: [0, 1, 7, 0], // C, Db, G, C
    qualities: ["m", "M", "M", "m"],
    degrees: ["1", "2b", "5", "1"],
    label: "Fear / Horror",
    emoji: "😱",
  },

  // 🕵️‍♀️ Mystery — C minor example: Cm → Fm → Bb → Cm
  mystery: {
    id: "mystery",
    mode: "minor",
    offsets: [0, 5, 10, 0], // C, F, Bb, C
    qualities: ["m", "m", "M", "m"],
    degrees: ["1", "4", "7b", "1"],
    label: "Mystery",
    emoji: "🕵️‍♀️",
  },

  // 🌧️ Melancholy — C minor example: Ab → Fm → Cm → G
  melancholy: {
    id: "melancholy",
    mode: "minor",
    offsets: [8, 5, 0, 7], // Ab, F, C, G
    qualities: ["M", "m", "m", "M"],
    degrees: ["6b", "4", "1", "5"],
    label: "Melancholy",
    emoji: "🌧️",
  },

  // 🌙 Calm / Peace — B♭ major example: Bb → F → Gm → Eb
  calm: {
    id: "calm",
    mode: "major",
    offsets: [0, 7, 9, 5], // Bb, F, G, Eb (relative to Bb)
    qualities: ["M", "M", "m", "M"],
    degrees: ["1", "5", "6", "4"],
    label: "Calm / Peace",
    emoji: "🌙",
  },

  // 🎈 Playful — B♭ major example: Bb → Cm → F → Bb
  playful: {
    id: "playful",
    mode: "major",
    offsets: [0, 2, 7, 0], // Bb, C, F, Bb
    qualities: ["M", "m", "M", "M"],
    degrees: ["1", "2", "5", "1"],
    label: "Playful",
    emoji: "🎈",
  },

  // ✨ Magic / Fantasy — B♭ major example: Eb → Bb → F → Gm
  magic: {
    id: "magic",
    mode: "major",
    offsets: [5, 0, 7, 9], // Eb, Bb, F, G
    qualities: ["M", "M", "M", "m"],
    degrees: ["4", "1", "5", "6"],
    label: "Magic / Fantasy",
    emoji: "✨",
  },

  // 🌌 Wonder / Transcendence — C minor example: Cm → Ab → Eb → F
  wonder: {
    id: "wonder",
    mode: "minor",
    offsets: [0, 8, 3, 5], // C, Ab, Eb, F
    qualities: ["m", "M", "M", "M"],
    degrees: ["1", "6b", "3b", "4"],
    label: "Wonder / Transcendence",
    emoji: "🌌",
  },

  // 😬 Tension / Suspense — C minor example: Cm → D° → G → Cm
  tension: {
    id: "tension",
    mode: "minor",
    offsets: [0, 2, 7, 0], // C, D, G, C
    qualities: ["m", "dim", "M", "m"],
    degrees: ["1", "2", "5", "1"],
    label: "Tension / Suspense",
    emoji: "😬",
  },
};

/**
 * Convert a tonic pitch name (e.g. "C", "Bb", "F#") into its pitch class (0–11).
 * This is optional, but convenient for UI-driven key selection.
 */
export function pitchNameToPc(name: string): number {
  const normalized = name.trim().toUpperCase();
  // Support "BB" / "EB" style too
  const normalizedFlat = normalized.replace("B", "♭"); // optional if you want to treat "Bb" specially

  // Quick map for common key names
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    "DB": 1,
    D: 2,
    "D#": 3,
    "EB": 3,
    E: 4,
    F: 5,
    "F#": 6,
    "GB": 6,
    G: 7,
    "G#": 8,
    "AB": 8,
    A: 9,
    "A#": 10,
    "BB": 10,
    B: 11,
  };

  // Try normalized with and without flat substitutions
  if (map[normalized] != null) return map[normalized];
  if (map[normalizedFlat] != null) return map[normalizedFlat];

  // Fallback: assume name matches one of PITCHES
  const idx = PITCHES.indexOf(normalized as PitchName);
  if (idx >= 0) return idx;

  return 0; // default to C if unrecognized
}

/**
 * Build Flow chords (as chord symbols like "Cm", "Bb", "D°") for a given tonic
 * and FlowPreset.
 *
 * tonicPc: semitone index of the tonic (0 = C, 1 = C#, ..., 10 = Bb, 11 = B)
 */
export function buildFlowChordsForKey(
  tonicPc: number,
  preset: FlowPreset
): string[] {
  return preset.offsets.map((off, i) => {
    const rootPc = (tonicPc + off + 12) % 12;
    const rootName = PITCHES[rootPc];
    const q = preset.qualities[i];

    if (q === "M") return rootName;
    if (q === "m") return rootName + "m";
    if (q === "dim") return rootName + "°";

    return rootName;
  });
}

/**
 * Convenience helper: build Flow chords for a given emotion and tonic name
 * (e.g. "C", "Bb", "F#").
 */
export function buildFlowChordsForEmotionInKey(
  emotionId: EmotionId,
  tonicName: string
): string[] {
  const preset = FLOW_PRESETS[emotionId];
  const tonicPc = pitchNameToPc(tonicName);
  return buildFlowChordsForKey(tonicPc, preset);
}