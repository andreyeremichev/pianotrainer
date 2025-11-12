// ===============================================
// lib/harmony/audio.ts — WebAudio sampler for /public/audio/notes
// ===============================================
import { type ParsedChord } from "./chords";

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

/** Encode '#' for URL safety (C#4.wav → C%234.wav) */
function safe(name: string) {
  return name.replace(/#/g, "%23");
}

/** Sharps-only pitch-class names */
function pcToSharpName(pc: number): string {
  const N = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return N[((pc % 12) + 12) % 12];
}

/** Build a note filename like “F#4” */
function pcToNote(pc: number, octave: number) {
  return pcToSharpName(pc) + String(octave);
}

async function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

async function loadBuffer(noteName: string) {
  const key = noteName;
  if (bufferCache.has(key)) return bufferCache.get(key)!;

  const url = `/audio/notes/${safe(noteName)}.wav`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audio file not found: ${url}`);
  const arr = await res.arrayBuffer();
  const ac = await getCtx();
  const buf = await ac.decodeAudioData(arr);
  bufferCache.set(key, buf);
  return buf;
}

function now(ac: AudioContext) {
  return ac.currentTime;
}

/** Play a chord progression using cached sample buffers
 *  - In "chords" mode, each chord lasts exactly opts.chordDur
 *  - In "arpeggio" mode, we schedule an up-then-down pattern whose total length == opts.chordDur
 */
export async function playProgression(
  chords: ParsedChord[],
  opts: {
    playMode: "chords" | "arpeggio";
    chordDur: number;          // <- visual per-chord duration (seconds)
    arpeggioPattern?: "upDown";
    baseOctave?: number;       // default 4
  }
) {
  if (!chords.length) return;

  const ac = await getCtx();
  const chordDur = Math.max(0.1, opts.chordDur);
  const baseOct = opts.baseOctave ?? 4;

  let t = now(ac);

  for (const c of chords) {
    const notes = c.pcs.map((pc) => pcToNote(pc, baseOct));
    const bufs = await Promise.all(notes.map((n) => loadBuffer(n)));

    if (opts.playMode === "chords") {
      const when = t;
      for (const buf of bufs) {
        const src = ac.createBufferSource();
        src.buffer = buf;
        const g = ac.createGain();
        g.gain.value = 0.95;
        src.connect(g).connect(ac.destination);
        src.start(when);
        src.stop(when + chordDur);
      }
      t += chordDur;
    } else {
      // Arpeggio pattern: up then partial down (e.g., 3 notes → 3 + 2 = 5 hits)
      const seq = [...bufs, ...bufs.slice(0, -1).reverse()];
      const hits = Math.max(1, seq.length);
      const gap = chordDur / hits; // EXACT fit into chordDur

      let at = t;
      for (const buf of seq) {
        const src = ac.createBufferSource();
        src.buffer = buf;
        const g = ac.createGain();
        g.gain.value = 0.95;
        src.connect(g).connect(ac.destination);
        const dur = Math.min(gap * 0.95, 0.6); // small overlap guard
        src.start(at);
        src.stop(at + dur);
        at += gap;
      }
      t += chordDur; // exact advance to next chord
    }
  }
}