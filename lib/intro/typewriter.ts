// lib/intro/typewriter.ts
// Minimal typewriter intro that draws into your export canvas before the toy plays.
// No audio, no external libs. Use 30 fps (same as your recorder).

export type TypewriterIntroOptions = {
  ctx: CanvasRenderingContext2D;
  width: number;      // canvas.width (px)
  height: number;     // canvas.height (px)
  scale: number;      // your SCALE constant (e.g., 2)
  // Draw the full backdrop frame for this moment (no phrase text; you provide it)
  drawBackdrop: () => void;

  // Draw the phrase line (typedTextSoFar) at the intended position
  drawTypedLine: (typed: string) => void;

  // Text source
  fullText: string;       // what we will type, e.g., phrase/date/phone
  // Timing
  preDelayMs?: number;    // pause before typing begins (e.g., 250)
  perElemMs?: number;     // ms per element typed (default 60)
  cursorBlinkMs?: number; // caret blink period (default 380)
  postDelayMs?: number;   // pause after completed (e.g., 250)
  // Rendering FPS
  fps?: number;           // default 30
};

export async function renderTypewriterIntro(opts: TypewriterIntroOptions): Promise<number> {
  const {
    ctx, width, height, scale,
    drawBackdrop, drawTypedLine,
    fullText,
    preDelayMs = 250,
    perElemMs = 60,
    cursorBlinkMs = 380,
    postDelayMs = 250,
    fps = 30,
  } = opts;

  // Guard: nothing to type
  const text = (fullText ?? "").toString();
  if (!text.length) {
    // still draw one frame as a backdrop so the recorder has continuity
    drawBackdrop(); drawTypedLine("");
    return preDelayMs + postDelayMs;
  }

  const frameDelay = 1000 / fps;

  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // Pre delay
  const startT = performance.now();
  while (performance.now() - startT < preDelayMs) {
    drawBackdrop(); drawTypedLine("");
    await sleep(frameDelay);
  }

  let typed = "";
  let caretOn = true;
  let lastBlink = performance.now();

  for (let i = 0; i < text.length; i++) {
    // reveal next character
    typed += text[i];

    const stepStart = performance.now();
    while (performance.now() - stepStart < perElemMs) {
      // caret blink
      if (performance.now() - lastBlink > cursorBlinkMs) {
        caretOn = !caretOn; lastBlink = performance.now();
      }
      drawBackdrop();
      drawTypedLine(typed + (caretOn ? "|" : ""));
      await sleep(frameDelay);
    }
  }

  // Post delay with blinking caret OFF (clean finish)
  const postStart = performance.now();
  while (performance.now() - postStart < postDelayMs) {
    drawBackdrop();
    drawTypedLine(typed);
    await sleep(frameDelay);
  }

  return preDelayMs + perElemMs * text.length + postDelayMs;
}