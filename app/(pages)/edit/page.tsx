"use client"

import React, { useEffect, useRef, useState } from "react";

/*
  Next.js page (TSX) — In-browser fast video cut using @ffmpeg/ffmpeg (FFmpeg.wasm).

  How it works (fast preview):
  1. User uploads a single MP4/WEBM file.
  2. We load ffmpeg.wasm in the browser (client-only).
  3. We compute two segments: [0, start) and (end, duration].
  4. Use ffmpeg copy mode ("-c copy") to avoid re-encoding (very fast) to extract part1 & part2.
  5. Use the concat demuxer to join both parts without re-encoding.
  6. Write the result to a blob URL and show it in a <video> as the real-time output.

  Notes:
  - This file is a single-file React component (default export). Put it in `pages/video-editor.tsx` (Next.js < 13) or `app/video-editor/page.tsx` (adapt
    for App Router) and ensure it only runs client-side.
  - Install required dependency: `npm i @ffmpeg/ffmpeg`
  - ffmpeg.wasm is relatively large; consider caching or lazy-loading in production.
  - This code tries to do the trimming with stream copy for speed. Some containers/codecs may still need re-encoding; if you encounter artifacts,
    change `-c copy` to a re-encode command.
  - Remotion: for advanced, frame-accurate editing and compositing you can send the output to Remotion for rendering. This example focuses on
    quick in-browser edits with FFmpeg.wasm.
*/

export default function VideoEditorPage() {
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<string>("10");
  const [endTime, setEndTime] = useState<string>("30");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const outVideoRef = useRef<HTMLVideoElement | null>(null);

  // ffmpeg instance (client only)
  const ffmpegRef = useRef<any>(null);

  useEffect(() => {
    // make sure this runs only on client
    const load = async () => {
      setFfmpegLoading(true);
      try {
        const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");
        const ffmpeg = createFFmpeg({
          log: true,
          // progress callback
          progress: (p: any) => {
            // p.ratio is 0..1
            setProgress(Math.round((p.ratio || 0) * 100));
          },
        });
        ffmpegRef.current = { ffmpeg, fetchFile };
        await ffmpeg.load();
        setFfmpegReady(true);
      } catch (e) {
        console.error("Failed to load ffmpeg.wasm", e);
      } finally {
        setFfmpegLoading(false);
      }
    };

    load();
  }, []);

  const handleFile = (f: File | null) => {
    setInputFile(f);
    setOutputUrl(null);
    setFileName(f ? f.name : null);
    setDuration(null);
    if (f && videoRef.current) {
      const url = URL.createObjectURL(f);
      videoRef.current.src = url;
      videoRef.current.onloadedmetadata = () => {
        setDuration(videoRef.current?.duration || null);
        // free URL when metadata loaded? keep it for preview
      };
    }
  };

  const parseTime = (s: string, fallback = 0) => {
    // Accept seconds or mm:ss or hh:mm:ss
    if (!s || isNaN(Number(s))) {
      // try mm:ss
      const parts = s.split(":").map((p) => Number(p));
      if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return fallback;
    }
    return Number(s);
  };

  const handleEdit = async () => {
    if (!ffmpegRef.current) return alert("FFmpeg not ready");
    if (!inputFile) return alert("Upload a video first");
    if (!duration) return alert("Video metadata not ready yet. Wait a second and try again.");

    const ffmpeg = ffmpegRef.current.ffmpeg;
    const fetchFile = ffmpegRef.current.fetchFile;

    setBusy(true);
    setProgress(0);
    setOutputUrl(null);

    // compute numeric times
    const start = Math.max(0, parseTime(startTime, 0));
    const end = Math.min(duration, parseTime(endTime, duration));

    if (start >= end) {
      alert("Start must be less than end");
      setBusy(false);
      return;
    }

    try {
      // write input to ffmpeg FS
      const inputName = "input.mp4"; // use mp4 for simplicity
      await ffmpeg.FS("writeFile", inputName, await fetchFile(inputFile));

      // extract part1 (0 -> start)
      const part1 = "part1.mp4";
      if (start > 0.05) {
        // Use -ss 0 -to start
        // Use copy codec for speed
        await ffmpeg.run(
          "-i",
          inputName,
          "-ss",
          "0",
          "-to",
          String(start),
          "-c",
          "copy",
          part1
        );
      } else {
        // very small start -> create empty small file by copying nothing
        // skip creating part1; ffmpeg concat requires at least one file so we'll handle cases below
      }

      // extract part2 (end -> duration)
      const part2 = "part2.mp4";
      if (end < duration - 0.05) {
        // -ss END -to DURATION
        await ffmpeg.run(
          "-i",
          inputName,
          "-ss",
          String(end),
          "-to",
          String(duration),
          "-c",
          "copy",
          part2
        );
      }

      // Build concat list depending on which parts exist
      const filesToConcat: string[] = [];
      try {
        ffmpeg.FS("stat", part1);
        filesToConcat.push(part1);
      } catch (e) {
        // part1 doesn't exist
      }
      try {
        ffmpeg.FS("stat", part2);
        filesToConcat.push(part2);
      } catch (e) {
        // part2 doesn't exist
      }

      if (filesToConcat.length === 0) {
        // If user removed entire video, produce a 0.5s blank video or just error
        alert("The selected cut removed the entire video. Nothing to output.");
        setBusy(false);
        return;
      }

      const concatList = "concat-list.txt";
      const concatContent = filesToConcat.map((f) => `file '${f}'`).join("\n");
      ffmpeg.FS("writeFile", concatList, new TextEncoder().encode(concatContent));

      const outName = "output.mp4";
      // concat using demuxer and copy codec
      await ffmpeg.run("-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", outName);

      // read result
      const data = ffmpeg.FS("readFile", outName);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);

      // cleanup some FS files to save memory
      try {
        ffmpeg.FS("unlink", inputName);
      } catch (e) { }
    } catch (err) {
      console.error("FFmpeg error:", err);
      alert("An error occurred while editing the video. See console for details.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Fast In-Browser Video Trimmer (FFmpeg.wasm)</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">Upload video (mp4/webm)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            <div className="mt-4">
              <div className="mb-1">Original preview</div>
              <video
                controls
                ref={videoRef}
                style={{ width: "100%", maxHeight: 360 }}
              />
            </div>

            <div className="mt-4">
              <label className="block">Start timestamp (seconds or mm:ss)</label>
              <input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </div>

            <div className="mt-2">
              <label className="block">End timestamp (seconds or mm:ss)</label>
              <input
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <button
                onClick={handleEdit}
                disabled={!ffmpegReady || busy || !inputFile}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {busy ? "Editing..." : "Edit (remove section)"}
              </button>

              <button
                onClick={() => {
                  // quick set to example using current video
                  if (videoRef.current && videoRef.current.duration) {
                    const d = videoRef.current.duration;
                    setStartTime("0");
                    setEndTime(String(Math.min(5, Math.floor(d))));
                  }
                }}
                className="px-3 py-2 rounded border"
              >
                Sample
              </button>

              <div className="ml-auto text-sm text-gray-600">
                FFmpeg: {ffmpegLoading ? "loading..." : ffmpegReady ? "ready" : "failed"}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm">Progress: {progress}%</div>
              <progress value={progress} max={100} className="w-full" />
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {duration ? `Original duration: ${Math.round(duration)}s` : "Video metadata not loaded yet."}
            </div>
          </div>

          <div>
            <div className="mb-2">Output preview</div>
            <div className="border rounded p-2 min-h-[240px]">
              {outputUrl ? (
                <>
                  <video
                    controls
                    src={outputUrl}
                    ref={outVideoRef}
                    style={{ width: "100%", maxHeight: 360 }}
                  />

                  <div className="mt-3 flex space-x-2">
                    <a href={outputUrl} download={`edited-${fileName ?? "video"}`} className="px-3 py-2 rounded bg-green-600 text-white">
                      Download
                    </a>
                    <button
                      onClick={() => {
                        // play in a new tab
                        window.open(outputUrl!, "_blank");
                      }}
                      className="px-3 py-2 rounded border"
                    >
                      Open in new tab
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">No output yet. After clicking <b>Edit</b> the trimmed/concatenated result will appear here.</div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Tip: The faster (and usually lossless) way is to use <code>-c copy</code> which copies stream data without re-encoding. If you see
              playback issues you can change the concat step to re-encode (e.g. use <code>-c:v libx264 -c:a aac</code>) but it will be slower.
            </div>

            <div className="mt-4 text-xs text-gray-400">Built with FFmpeg.wasm. For frame-accurate editing + programmatic timelines consider Remotion integration.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
