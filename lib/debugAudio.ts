// lib/debugAudio.ts

// ===== AUDIO DEBUG – UNIVERSAL MODULE =====
// Toggle these globally (or temporarily flip to false if too noisy).
export const DEBUG_LIVE_AUDIO = true;
export const DEBUG_EXPORT_AUDIO = true;

// Free-form context you can attach to a log: emotion name, preset, mode, seed, etc.
export type DebugTag = string | number | null | undefined;

export type LiveDebugArgs = {
  page: string;          // e.g. "key-clock", "tone-dial", "text-to-tone", "shape-of-harmony"
  tag?: DebugTag;        // e.g. "emotion=Playful", "preset=Clock A", "mode=letters"
  chordNames?: string[]; // ["C", "Dm", "G7", ...]
  noteNames?: string[];  // ["C4", "E4", "G4", ...]
};

export type ExportDebugArgs = {
  page: string;              // same as above
  tag?: DebugTag;            // same idea as Live
  degreesInput?: string | null; // whatever user typed (degrees, steps, phrase, etc.)
  chordsToExport?: string[][];  // [["C4","E4","G4"], ["F4","A4","C5"], ...]
  noteEventsToExport?: string[]; // ["C4","E4","G4", ...] for one-line exports
};

function formatTag(tag: DebugTag): string {
  if (tag === null || tag === undefined || tag === "") return ", tag=n/a";
  return `, tag=${String(tag)}`;
}

// ===== LIVE AUDIO LOG =====
export function logLiveAudioDebug({
  page,
  tag,
  chordNames,
  noteNames,
}: LiveDebugArgs) {
  if (!DEBUG_LIVE_AUDIO) return;

  let payload = "(no chord/note names)";

  if (chordNames && chordNames.length) {
    payload = chordNames.join(" → ");
  } else if (noteNames && noteNames.length) {
    payload = noteNames.join(" ");
  }

  console.log(
    `%c[LIVE DEBUG] page=${page}${formatTag(tag)}:`,
    "color:#5fc3ff;font-weight:bold",
    payload
  );
}

// ===== EXPORT AUDIO LOG =====
export function logExportAudioDebug({
  page,
  tag,
  degreesInput,
  chordsToExport,
  noteEventsToExport,
}: ExportDebugArgs) {
  if (!DEBUG_EXPORT_AUDIO) return;

  let sequence = "(no export data)";

  if (chordsToExport && chordsToExport.length) {
    const exportChordSymbols = chordsToExport.map((triad) => {
      const root = triad?.[0] ?? "";
      // Strip octave numbers so you see "C F G" instead of "C4 F4 G4"
      return root.replace(/[0-9]/g, "");
    });
    sequence = exportChordSymbols.join(" → ");
  } else if (noteEventsToExport && noteEventsToExport.length) {
    const cleaned = noteEventsToExport.map((n) => n.replace(/[0-9]/g, ""));
    sequence = cleaned.join(" ");
  }

  console.log(
    `%c[EXPORT DEBUG] page=${page}${formatTag(tag)}, input="${degreesInput ?? ""}":`,
    "color:#FBBF24;font-weight:bold",
    sequence
  );
}