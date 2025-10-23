// lib/text-to-tone/buildEvents.ts
// Shared "text → events" builder (tokenizer + step timing).
// NOTE: No 8s normalization anymore. Timeline = sum of step durations.

type Event =
  | { kind: "MELODY"; notes: string[]; label?: string; dur: number; clef: "treble" | "bass"; t: number; d: number }
  | { kind: "CHORD";  notes: string[]; label?: string; dur: number; clef: "treble" | "bass"; t: number; d: number }
  | { kind: "REST";   dur: number; label?: string; t: number; d: number };

export type TextToneEvent = Event;

const A_MINOR_PC = ["A","B","C","D","E","F","G"] as const;
type PC = (typeof A_MINOR_PC)[number];

// ── Timing constants ────────────────────────────────────────────────────────────
// Default step length for everything that’s a *played element* (letters, digits,
// numeric chords, symbol chords, etc.)
const STEP_DEFAULT_SEC = 0.300;  // 300 ms

// Rests for space/dash only (shorter)
const STEP_SPACE_DASH_REST_SEC = 0.250; // 250 ms

// Micro elements (soft tick, tiny breaths)
const STEP_TICK_SEC = 0.125;     // for "." and ":"
const STEP_MICRO_REST_SEC = 0.10; // for comma, apostrophe, tiny link rests, etc.

// ── Legacy “weights” kept for compatibility in the draft stage (not used for time) ─
const WEIGHTS = {
  SINGLE: 1.0,
  TEEN: 1.25,
  TENS: 1.25,
  HUNDRED: 1.0,
  HUNDRED_REST: 0.125,
  ZERO: 0.5,
  SPACE: 0.5,
};

const SINGLE_MAP: Record<number, PC[]> = {
  1: ["A","C","E"], 2: ["B","D","F"], 3: ["C","E","G"], 4: ["D","F","A"],
  5: ["E","G","B"], 6: ["F","A","C"], 7: ["G","B","D"], 8: ["A","C","E","G"],
  9: ["C","E","G","B"],
};
const TEEN_MAP: Record<number, PC[]> = {
  10: ["A","C","E","B"], 11: ["B","D","F","A"], 12: ["C","E","G","A"],
  13: ["D","F","A","E"], 14: ["E","G","B","D"], 15: ["F","A","C","E"],
  16: ["G","B","D","E"], 17: ["A","C","E","B"], 18: ["C","E","G","F"], 19: ["E","G","B","F"],
};
const TENS_MAP: Record<number, PC[]> = {
  20: ["C","E","A","D"], 30: ["E","A","C"], 40: ["F","A","D"], 50: ["G","B","E"],
  60: ["C","F","A"], 70: ["D","G","B"], 80: ["G","C","E"], 90: ["B","E","G"],
};

const CADENCE_A: PC[] = ["E","G","B"]; // 100-A
const CADENCE_B: PC[] = ["C","E","A"]; // 100-B

// ── Notation helpers ───────────────────────────────────────────────────────────
function noteNameToMidi(n: string) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n) || /^([a-g])([#b]?)\/(-?\d+)$/.exec(n);
  if (!m) throw new Error("bad note: "+n);
  const L = m[1].toUpperCase(); const acc = m[2] || ""; const oct = parseInt(m[3], 10);
  const BASE: Record<string, number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  let pc = BASE[L]; if (acc==="#") pc=(pc+1)%12; else if (acc==="b") pc=(pc+11)%12;
  return (oct+1)*12 + pc;
}
function placeChordInA3A4(pcs: PC[]): string[] {
  const MIN = noteNameToMidi("A3"), MAX = noteNameToMidi("A4");
  const guess = (pc: PC) => (pc==="A"||pc==="B"||pc==="C")?`${pc}3`:`${pc}4`;
  let notes = pcs.map(guess);
  notes = notes.map(n => {
    const m = noteNameToMidi(n);
    if (m < MIN) return n.replace(/(\d+)$/, d=>String(+d+1));
    if (m > MAX) return n.replace(/(\d+)$/, d=>String(+d-1));
    return n;
  });
  const seen = new Map<number,1>();
  notes = notes.map(n => {
    let m = noteNameToMidi(n);
    if (!seen.has(m)) { seen.set(m,1); return n; }
    const up = n.replace(/(\d+)$/, d=>String(+d+1));
    if (noteNameToMidi(up) <= MAX && !seen.has(noteNameToMidi(up))) { seen.set(noteNameToMidi(up),1); return up; }
    const dn = n.replace(/(\d+)$/, d=>String(+d-1));
    if (noteNameToMidi(dn) >= MIN && !seen.has(noteNameToMidi(dn))) { seen.set(noteNameToMidi(dn),1); return dn; }
    return n;
  });
  if (notes.length > 4) {
    const imp = (pc: PC) => (pc==="A"||pc==="C"||pc==="E")?0:1;
    notes = notes.map(n=>({n,pc:n[0] as PC})).sort((a,b)=>imp(a.pc)-imp(b.pc)).slice(0,4).map(x=>x.n);
  }
  return notes;
}

function sanitize(s: string) {
  const normalized = s.replace(/\u2014|\u2013/g,"-").replace(/\.{3,}/g,"...");
  return normalized.replace(/[^A-Za-z0-9 .,;?\-!'/%+=:@#$()&]+/g,"");
}

// ── Builder ────────────────────────────────────────────────────────────────────
export function buildEvents(input: string) : { events: TextToneEvent[] } {
  const s = sanitize(input);

  // Draft tokens (weights kept for legacy; timing is decided later).
  type Draft =
    | { type:"melody"; data?: any; weight:number; label?:string }
    | { type:"chord";  data?: any; weight:number; label?:string }
    | { type:"rest";   data?: any; weight:number; label?:string }
    | { type:"zero";   data?: any; weight:number; label?:string };

  const draft: Draft[] = [];
  const pushRest = (w=WEIGHTS.ZERO,l?:string)=>draft.push({type:"rest",weight:w,label:l});
  const pushZero = (w=WEIGHTS.ZERO)=>draft.push({type:"zero",weight:w});
  const pushChordPCS = (pcs:PC[], w=WEIGHTS.SINGLE, label?:string)=>draft.push({type:"chord",weight:w,data:{pcs},label});
  const pushDigit = (d:number,w:number)=>{ const pcs=SINGLE_MAP[d]||SINGLE_MAP[1]; pushChordPCS(pcs,w,String(d)); };

  let i=0, cadenceRot=0;
  while(i<s.length){
    const ch=s[i];

    // Letters
    if (/[A-Za-z]/.test(ch)){ draft.push({type:"melody",weight:WEIGHTS.SINGLE,data:{char:ch}}); i++; continue; }

    // Space
    if (ch===" "){ pushRest(WEIGHTS.SPACE,"space"); i++; continue; }

    // Ellipsis …
    if (s.slice(i,i+3)==="..."){ pushZero(); pushZero(); pushZero(); i+=3; continue; }

    // Digits
    if (/[0-9]/.test(ch)){
      let j=i; while(j<s.length && /[0-9]/.test(s[j])) j++;
      const run = s.slice(i,j);
      if (run.length>3){ for(const c of run){ const d=+c; d===0?pushZero():pushDigit(d,WEIGHTS.SINGLE); } i=j; continue; }
      if (run==="100"){ // cadence + breath
        const pcs = (cadenceRot++ % 2===0) ? CADENCE_A : CADENCE_B;
        pushChordPCS(pcs, WEIGHTS.HUNDRED, "100");
        pushRest(WEIGHTS.HUNDRED_REST,"cad-rest");
        i=j; continue;
      }
      const n = parseInt(run,10);
      if (run.length===3 && run[0]==="1"){
        const bc = parseInt(run.slice(1),10);
        const pcs = (cadenceRot++ % 2===0) ? CADENCE_A : CADENCE_B;
        pushChordPCS(pcs, WEIGHTS.HUNDRED, "100");
        if (bc===0){ /* nothing */ }
        else if (bc>=10 && bc<=19) pushChordPCS(TEEN_MAP[bc], WEIGHTS.TEEN, String(bc));
        else if (bc>=20 && bc%10===0) pushChordPCS(TENS_MAP[bc], WEIGHTS.TENS, String(bc));
        else if (bc>=20){ const tens=Math.floor(bc/10)*10, unit=bc%10; pushChordPCS(TENS_MAP[tens], WEIGHTS.TENS, String(tens)); pushDigit(unit,WEIGHTS.SINGLE); }
        else pushDigit(bc,WEIGHTS.SINGLE);
        i=j; continue;
      }
      if (run.length===3 && run[0]!=="1"){
        const a=+run[0], bc=+run.slice(1);
        if (a!==0) pushDigit(a,WEIGHTS.SINGLE);
        const pcs = (cadenceRot++ % 2===0) ? CADENCE_A : CADENCE_B;
        pushChordPCS(pcs, WEIGHTS.HUNDRED, "100");
        if (bc===0){ /* */ }
        else if (bc>=10 && bc<=19) pushChordPCS(TEEN_MAP[bc], WEIGHTS.TEEN, String(bc));
        else if (bc>=20 && bc%10===0) pushChordPCS(TENS_MAP[bc], WEIGHTS.TENS, String(bc));
        else if (bc>=20){ const tens=Math.floor(bc/10)*10, unit=bc%10; pushChordPCS(TENS_MAP[tens], WEIGHTS.TENS, String(tens)); pushDigit(unit,WEIGHTS.SINGLE); }
        else pushDigit(bc,WEIGHTS.SINGLE);
        i=j; continue;
      }
      if (run.length===2 && n>=10 && n<=19){ pushChordPCS(TEEN_MAP[n], WEIGHTS.TEEN, String(n)); i=j; continue; }
      if (run.length===2 && n%10===0 && n>=20 && n<=90){ pushChordPCS(TENS_MAP[n], WEIGHTS.TENS, String(n)); i=j; continue; }
      if (run.length===2 && n>20 && n<100 && n%10!==0){
        const tens=Math.floor(n/10)*10,unit=n%10;
        pushChordPCS(TENS_MAP[tens], WEIGHTS.TENS, String(tens)); pushDigit(unit,WEIGHTS.SINGLE); i=j; continue;
      }
      // single digit
      pushDigit(n,WEIGHTS.SINGLE); i=j; continue;
    }

    // punctuation / symbols
    const pre = "%/=@#$".includes(ch);
    if (pre) pushRest(WEIGHTS.ZERO,"pre-sym");

    switch(ch){
      case ".": case ":": pushZero(); break; // soft ticks
      case ",": pushRest(WEIGHTS.SPACE,","); break;
      case ";": pushRest(WEIGHTS.ZERO,";"); break;
      case "-": pushRest(WEIGHTS.ZERO,"-"); break;
      case "?": pushChordPCS(["G","B","D"],WEIGHTS.SINGLE,"?"); break;
      case "!": pushChordPCS(["E","G","B"],WEIGHTS.SINGLE,"!"); break;
      case "%": pushChordPCS(["E","G","B"],WEIGHTS.SINGLE,"%-1"); pushChordPCS(["C","E","A"],WEIGHTS.SINGLE,"%-2"); break;
      case "/": pushChordPCS(["E","G","B"],WEIGHTS.SINGLE,"/"); break;      // link chord
      case "+": pushChordPCS(["D","F","A"],WEIGHTS.SINGLE,"+"); break;      // warm lift
      case "=": pushChordPCS(["C","E","A"],WEIGHTS.SINGLE,"="); pushRest(WEIGHTS.ZERO,"eq-rest"); break; // settle + tiny rest
      case "@": pushChordPCS(["A"],WEIGHTS.ZERO,"@A4"); pushRest(WEIGHTS.ZERO,"at-rest"); break;         // quick high tick + breath
      case "#": pushChordPCS(["G","B","D"],WEIGHTS.SINGLE,"#"); pushRest(WEIGHTS.ZERO,"hash-rest"); break;
      case "$": pushChordPCS(["F","A","C","E"],WEIGHTS.TEEN,"$"); pushRest(WEIGHTS.ZERO,"dlr-rest"); break;
      case "'": pushRest(WEIGHTS.ZERO,"apost"); break; // tiny breath
      default: break;
    }
    i++;
  }

  // ── Assign times and durations (no 8s normalization) ─────────────────────────
  // Walk the draft in order; each draft entry is ONE "step". Duration rules:
  // - space or '-' rest → 125 ms
  // - '.' or ':' → 120 ms tick
  // - other tiny rests (pre-sym, eq-rest, apost, etc.) → 80 ms
  // - everything else (melody, digits, symbol chords, 100 cadence, teens, tens, etc.) → 250 ms

  let t = 0;
  const timed = draft.map((e): Draft & { t:number; d:number } => {
    let d = STEP_DEFAULT_SEC;

    if (e.type === "rest") {
      if (e.label === "space" || e.label === "-") {
        d = STEP_SPACE_DASH_REST_SEC;
      } else {
        d = STEP_MICRO_REST_SEC;
      }
    } else if (e.type === "zero") {
      d = STEP_TICK_SEC; // soft tick (A3) for '.' and ':'
    } else {
      // melody/chord/symbols → default 250 ms
      d = STEP_DEFAULT_SEC;
    }

    const out = { ...e, t, d };
    t += d;
    return out;
  });

  // ── Finalize: convert to TextToneEvent & place chords in A3–A4 ───────────────
  const lettersSeq = (s||"").replace(/[^A-Za-z]/g,"").toUpperCase();
  let letterCursor = 0;
  const SCALE = ["A","B","C","D","E","F","G"];

  const events: TextToneEvent[] = timed.map((e, idx) => {
    if (e.type==="rest") return { kind:"REST", dur:e.d, label:e.label, t:e.t, d:e.d };

    if (e.type==="zero"){
      const notes=["A3"];
      return { kind:"CHORD", notes, dur:e.d, clef:"bass", label:e.label, t:e.t, d:e.d };
    }

    if (e.type==="melody"){
      const letter = lettersSeq[letterCursor++] || "A";
      const pc = SCALE[(letter.charCodeAt(0)-65)%7] as PC;
      const oct = (pc==="A"||pc==="B")?3:4;
      const n = `${pc}${oct}`;
      const clef = oct>=4?"treble":"bass";
      return { kind:"MELODY", notes:[n], dur:e.d, clef, label:e.label, t:e.t, d:e.d };
    }

    // chord
    let pcs: PC[]|undefined;
    if (e.label==="100"){ pcs = (idx%2===0)?CADENCE_A:CADENCE_B; }
    else if (e.data?.teen){ pcs = TEEN_MAP[e.data.teen]; }
    else if (e.data?.tens){ pcs = TENS_MAP[e.data.tens]; }
    else if (e.data?.single){ pcs = SINGLE_MAP[e.data.single]; }
    else if (e.data?.pcs){ pcs = e.data.pcs as PC[]; }
    if (!pcs || pcs.length===0) pcs = SINGLE_MAP[1];

    if (e.label==="@A4"){
      return { kind:"CHORD", notes:["A4"], dur:e.d, clef:"treble", label:e.label, t:e.t, d:e.d };
    }

    const notes = placeChordInA3A4(pcs);
    const hasTreble = notes.some(n=>noteNameToMidi(n)>=noteNameToMidi("C4"));
    const clef = hasTreble?"treble":"bass";
    return { kind:"CHORD", notes, dur:e.d, clef, label:e.label, t:e.t, d:e.d };
  });

  return { events };
}