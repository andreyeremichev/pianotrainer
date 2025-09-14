// app/api/convert-webm-to-mp4/route.ts
// Normalize ANY recorded video (WebM/MP4) to a Reels/TikTok-ready MP4:
// • 1080×1920 portrait with 8-px safe margin (scale 1064×1904 then pad)
// • 30 fps, H.264 (yuv420p), AAC 128k/44.1kHz
// • loudnorm to −14 LUFS
// • fragmented MP4 (works on non-seekable stdout)
// • Node runtime (spawns ffmpeg)

export const runtime = "nodejs";

import { spawn, spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { Readable } from "node:stream";

// Probe for a working ffmpeg binary: try ffmpeg-static, then system "ffmpeg".
function pickFfmpeg(): string {
  const candidates = [
    (ffmpegPath as string) || "",
    "ffmpeg", // Homebrew/system fallback
  ].filter(Boolean);

  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ["-version"], { stdio: "ignore" });
      if (r.status === 0) return bin;
    } catch {
      // try next
    }
  }
  throw new Error("No working ffmpeg binary found (ffmpeg-static or system ffmpeg).");
}

// GET: health/info (so hitting the route in a browser is not a scary 405)
export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, msg: "POST a WebM/MP4 blob to convert to social-ready MP4." }),
    { headers: { "Content-Type": "application/json" }, status: 200 }
  );
}

export async function POST(req: Request) {
  try {
    if (!req.body) return new Response("Missing body", { status: 400 });

    // Detect input container so ffmpeg can demux piped stdin correctly
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    const inputFmt = ct.includes("mp4") ? "mp4" : ct.includes("webm") ? "webm" : "";

    // Build ffmpeg args
    // 8-px margin per side: scale to 1064×1904 (fits), pad to 1080×1920 centered, square pixels
    const args = [
      "-hide_banner", "-loglevel", "warning",
      ...(inputFmt ? ["-f", inputFmt] : []),
      "-i", "pipe:0",

      "-vf", "scale=1064:1904:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2,setsar=1",
      "-r", "30",

      "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
      "-b:v", "6M", "-maxrate", "8M", "-bufsize", "12M",

      "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",

      // Fragmented MP4 for non-seekable stdout (pipe:1)
      "-movflags", "+frag_keyframe+empty_moov",
      "-metadata:s:v:0", "rotate=0",

      "-f", "mp4", "pipe:1",
    ];

    const bin = pickFfmpeg();
    // console.log("[ffmpeg] using:", bin);

    const ff = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });

    // Pipe the request body → ffmpeg stdin, and close stdin on end
    const nodeIn = Readable.fromWeb(req.body as any);
    nodeIn.on("error", () => { try { ff.stdin.end(); } catch {} });
    nodeIn.on("end",   () => { try { ff.stdin.end(); } catch {} });
    nodeIn.pipe(ff.stdin);

    // Accumulate stdout fully (avoid 0-byte streaming races)
    const outChunks: Buffer[] = [];
    ff.stdout.on("data", (chunk) => { outChunks.push(chunk as Buffer); });

    // Collect stderr for diagnostics (dev)
    let stderrBuf = "";
    ff.stderr.setEncoding("utf8");
    ff.stderr.on("data", (d) => { stderrBuf += d; });

    const exitCode: number = await new Promise((resolve) => {
      ff.on("close", (code) => resolve(code ?? -1));
      ff.on("error", () => resolve(-1));
    });

    if (exitCode !== 0) {
      const msg = `[ffmpeg] exit ${exitCode}\n${stderrBuf || "(no stderr)"}`;
      // console.error(msg);
      return new Response(msg, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const outBuf = Buffer.concat(outChunks);
    if (outBuf.length === 0) {
      const msg = "[ffmpeg] produced 0 bytes";
      // console.error(msg);
      return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain" } });
    }

    return new Response(outBuf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    // console.error("convert-webm-to-mp4 error:", msg);
    return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}