// app/api/convert-webm-to-mp4/route.ts
// Normalize any recorded video (WebM or MP4) to IG/TikTok-ready MP4:
// - 1080x1920 portrait, 8px safe margin (scale 1064x1904 then pad)
// - 30 fps, H.264 (yuv420p), AAC 128k @ 44.1 kHz
// - Loudness normalized to -14 LUFS
// - +faststart for faster uploads

export const runtime = "nodejs";

import { spawn, spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { Readable } from "node:stream";

// Robust ffmpeg resolver: try ffmpeg-static first, then system ffmpeg (brew).
function pickFfmpeg(): string {
  const candidates = [
    (ffmpegPath as string) || "",
    "ffmpeg", // Homebrew/system fallback
  ].filter(Boolean);

  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ["-version"], { stdio: "ignore" });
      if (r.status === 0) {
        return bin;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error("No working ffmpeg binary found (ffmpeg-static or system ffmpeg).");
}

export async function POST(req: Request) {
  try {
    if (!req.body) return new Response("Missing body", { status: 400 });

    const ct = (req.headers.get("content-type") || "").toLowerCase();
    const inputFmt = ct.includes("mp4") ? "mp4" : ct.includes("webm") ? "webm" : "";

    // Build ffmpeg args
    const args = [
      "-hide_banner", "-loglevel", "info",
      ...(inputFmt ? ["-f", inputFmt] : []),
      "-i", "pipe:0",
      "-vf", "scale=1064:1904:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2,setsar=1",
      "-r", "30",
      "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
      "-b:v", "6M", "-maxrate", "8M", "-bufsize", "12M",
      "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
      "-movflags", "+frag_keyframe+empty_moov",
      "-metadata:s:v:0", "rotate=0",
      "-f", "mp4", "pipe:1",
    ];



const bin = pickFfmpeg();
console.log("[ffmpeg] using:", bin);
const ff = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });

    // Pipe request body to ffmpeg stdin and close at end
    const nodeIn = Readable.fromWeb(req.body as any);
    nodeIn.on("error", () => { try { ff.stdin.end(); } catch {} });
    nodeIn.on("end",   () => { try { ff.stdin.end(); } catch {} });
    nodeIn.pipe(ff.stdin);

    // Collect stdout fully (so we don't return 0B)
    const outChunks: Buffer[] = [];
    ff.stdout.on("data", (chunk) => { outChunks.push(chunk as Buffer); });

    // Collect stderr for diagnostics
    let stderrBuf = "";
    ff.stderr.setEncoding("utf8");
    ff.stderr.on("data", (d) => { stderrBuf += d; });

    // Wait for ffmpeg to finish
    const exitCode: number = await new Promise((resolve) => {
      ff.on("close", (code) => resolve(code ?? -1));
      ff.on("error", () => resolve(-1));
    });

    if (exitCode !== 0) {
  const msg = `[ffmpeg] exit ${exitCode}\n${stderrBuf || "(no stderr)"}`
  console.error(msg);
  // Return stderr so you can read it in the Network response (dev-only)
  return new Response(msg, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

    const outBuf = Buffer.concat(outChunks);
    if (outBuf.length === 0) {
      console.log("[ffmpeg] produced 0 bytes");
      return new Response("Empty output", { status: 500 });
    }

    return new Response(outBuf, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("convert-webm-to-mp4 error:", e?.message || e);
    return new Response("Conversion failed", { status: 500 });
  }
}