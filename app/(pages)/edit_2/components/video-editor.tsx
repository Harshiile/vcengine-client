"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

type ChangeType = "add" | "replace" | "remove"

type ChangeEntry = {
  id: string
  type: ChangeType
  start: number // seconds
  end: number // seconds
  src?: string | null
  mediaType?: "video" | "image" | null
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function toMs(sec: number) {
  return Math.max(0, Math.round(sec * 1000))
}
function fromSecMs(secStr: string, msStr: string) {
  const s = Number.parseFloat(secStr || "0")
  const m = Number.parseFloat(msStr || "0")
  return clamp(s + m / 1000, 0, Number.MAX_SAFE_INTEGER)
}

const MIN_GAP = 0.5 // seconds

export default function VideoEditor() {
  // timeline + selection state
  const duration = 120 // seconds; demo duration
  const [start, setStart] = useState(10)
  const [end, setEnd] = useState(40)
  const [cursor, setCursor] = useState(10) // default at first dragbar
  const [changes, setChanges] = useState<ChangeEntry[]>([])
  const [showTools, setShowTools] = useState(false)
  const hoverTimerRef = useRef<number | null>(null)
  const onToolsEnter = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    setShowTools(true)
  }
  const onToolsLeave = () => {
    hoverTimerRef.current = window.setTimeout(() => setShowTools(false), 1000) // increased hover time
  }

  // refs for dragging
  const railRef = useRef<HTMLDivElement | null>(null)
  const framesCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const thumbVideoRef = useRef<HTMLVideoElement | null>(null)
  const [dragging, setDragging] = useState<null | "start" | "end" | "cursor">(null)
  const dragOffsetRef = useRef(0)

  // video preview
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const overlayVideoRef = useRef<HTMLVideoElement | null>(null)
  const [overlayActive, setOverlayActive] = useState(false)
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null)
  const [overlayType, setOverlayType] = useState<"video" | "image" | null>(null)
  const activeChangeRef = useRef<string | null>(null)

  // dialog state
  const [openAdd, setOpenAdd] = useState(false)
  const [openReplace, setOpenReplace] = useState(false)
  const [openRemove, setOpenRemove] = useState(false)

  // manual vs auto toggles
  const [addManual, setAddManual] = useState(false)
  const [replaceManual, setReplaceManual] = useState(false)
  const [removeManual, setRemoveManual] = useState(false)

  // inputs for manual modes
  const [addSec, setAddSec] = useState(String(cursor | 0))
  const [addMs, setAddMs] = useState("0")
  const [replaceStartSec, setReplaceStartSec] = useState(String(start | 0))
  const [replaceStartMs, setReplaceStartMs] = useState("0")
  const [replaceEndSec, setReplaceEndSec] = useState(String(end | 0))
  const [replaceEndMs, setReplaceEndMs] = useState("0")
  const [removeStartSec, setRemoveStartSec] = useState(String(start | 0))
  const [removeStartMs, setRemoveStartMs] = useState("0")
  const [removeEndSec, setRemoveEndSec] = useState(String(end | 0))
  const [removeEndMs, setRemoveEndMs] = useState("0")

  // uploads (not processed; UI only per spec)
  const [addFile, setAddFile] = useState<File | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)

  const [showChangesPanel, setShowChangesPanel] = useState(false)
  const [previewChoice, setPreviewChoice] = useState<"original" | "preview">("preview")

  // derived positions
  const startPct = (start / duration) * 100
  const endPct = (end / duration) * 100
  const cursorPct = (cursor / duration) * 100

  const onDownFactory = (kind: "start" | "end" | "cursor") => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(kind)
    dragOffsetRef.current = 0
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const x = e.clientX - rect.left
    // store offset so handle doesn't jump
    let currentPct = 0
    if (kind === "start") currentPct = startPct
    if (kind === "end") currentPct = endPct
    if (kind === "cursor") currentPct = cursorPct
    dragOffsetRef.current = x - (currentPct / 100) * rect.width
  }

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      const rail = railRef.current
      if (!rail) return
      const rect = rail.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffsetRef.current
      const pct = clamp((x / rect.width) * 100, 0, 100)
      const seconds = clamp((pct / 100) * duration, 0, duration)
      if (dragging === "start") {
        const next = Math.min(seconds, end - MIN_GAP * 2)
        setStart(next)
        // cursor sits at least MIN_GAP to the right of start
        setCursor((c) => clamp(Math.max(next + MIN_GAP, c), next + MIN_GAP, end - MIN_GAP))
      } else if (dragging === "end") {
        const next = Math.max(seconds, start + MIN_GAP * 2)
        setEnd(next)
        setCursor((c) => clamp(c, start + MIN_GAP, next - MIN_GAP))
      } else if (dragging === "cursor") {
        const next = clamp(seconds, start + MIN_GAP, end - MIN_GAP)
        setCursor(next)
      }
    },
    [dragging, duration, start, end],
  )

  const onUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [onMove, onUp])

  useEffect(() => {
    const rail = railRef.current
    const canvas = framesCanvasRef.current
    const v = thumbVideoRef.current
    if (!rail || !canvas || !v) return

    let cancelled = false
    const draw = async () => {
      const width = Math.max(rail.clientWidth, 320)
      const height = 56
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const ready = () =>
        new Promise<void>((r) => {
          if (v.readyState >= 1) r()
          else v.addEventListener("loadedmetadata", () => r(), { once: true })
        })

      await ready()
      ctx.clearRect(0, 0, width, height)

      // choose a number of thumbnails based on width
      const frames = Math.min(60, Math.max(12, Math.floor(width / 32)))
      for (let i = 0; i < frames && !cancelled; i++) {
        const t = (i / (frames - 1)) * Math.max(0.01, duration - 0.05)
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            if (cancelled) return resolve()
            const w = (height * v.videoWidth) / Math.max(1, v.videoHeight)
            const x = Math.round((i / (frames - 1)) * (width - w))
            try {
              ctx.drawImage(v, x, 0, w || 1, height)
            } catch {
              // ignore draw errors if any
            }
            resolve()
          }
          v.currentTime = t
          v.addEventListener("seeked", onSeeked, { once: true })
        })
      }
    }

    // initial draw
    void draw()

    // redraw on resize
    const ro = new ResizeObserver(() => void draw())
    ro.observe(rail)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [duration])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onEnded = () => setIsPlaying(false)
    v.addEventListener("ended", onEnded)
    return () => v.removeEventListener("ended", onEnded)
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTime = () => {
      // keep cursor inside selection
      setCursor(() => clamp(v.currentTime, start + MIN_GAP, end - MIN_GAP))

      // Skip removed region
      const rm = changes.find((c) => c.type === "remove" && v.currentTime >= c.start && v.currentTime < c.end)
      if (rm) {
        v.currentTime = rm.end
        return
      }

      if (overlayActive) return // overlay already handling

      // Replace: if within selected replace clip, switch to overlay
      const rep = changes.find(
        (c) => c.type === "replace" && c.src && v.currentTime >= c.start && v.currentTime < c.end,
      )
      if (rep && activeChangeRef.current !== rep.id) {
        startOverlay(rep, { jumpAfterMs: (rep.end - rep.start) * 1000 })
        return
      }

      // Add: when crossing add start, insert overlay (do not advance main time)
      const ad = changes.find((c) => c.type === "add" && c.src && Math.abs(v.currentTime - c.start) < 0.15)
      if (ad && activeChangeRef.current !== ad.id) {
        startOverlay(ad, { jumpAfterMs: 0 }) // resume main video at same time
        return
      }
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    v.addEventListener("timeupdate", onTime)
    v.addEventListener("play", onPlay)
    v.addEventListener("pause", onPause)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("play", onPlay)
      v.removeEventListener("pause", onPause)
    }
  }, [changes, start, end, overlayActive])

  const addChange = (type: ChangeType, s: number, e: number) => {
    setChanges((prev) => [...prev, { id: Math.random().toString(36).slice(2), type, start: s, end: e }])
  }

  function startOverlay(c: ChangeEntry, opts: { jumpAfterMs: number }) {
    const v = videoRef.current
    if (!v || !c.src) return
    activeChangeRef.current = c.id
    setOverlaySrc(c.src || null)
    setOverlayType(c.mediaType || null)
    setOverlayActive(true)
    v.pause()

    if (c.mediaType === "video") {
      const ov = overlayVideoRef.current
      if (!ov) return
      ov.currentTime = 0
      ov.play().catch(() => { })
      const endOverlay = () => {
        ov.removeEventListener("ended", endOverlay)
        finishOverlay(c, opts)
      }
      ov.addEventListener("ended", endOverlay)
    } else if (c.mediaType === "image") {
      // show still image for 1s, then resume
      window.setTimeout(() => finishOverlay(c, opts), 1000)
    }
  }

  function finishOverlay(c: ChangeEntry, opts: { jumpAfterMs: number }) {
    const v = videoRef.current
    if (!v) return
    setOverlayActive(false)
    setOverlaySrc(null)
    setOverlayType(null)
    if (c.type === "replace") {
      // jump past replaced section
      v.currentTime = c.end
    }
    // for 'add' we resume at same time
    activeChangeRef.current = null
    if (isPlaying) {
      v.play().catch(() => { })
    }
  }

  // dialogs submit handlers
  const submitAddAuto = async () => {
    let src: string | null = null
    let mediaType: "video" | "image" | null = null
    if (addFile) {
      src = URL.createObjectURL(addFile)
      mediaType = addFile.type.startsWith("image/") ? "image" : "video"
    }
    const s = cursor
    const e = Math.min(cursor + 2, duration)
    setChanges((prev) => [...prev, { id: crypto.randomUUID(), type: "add", start: s, end: e, src, mediaType }])
    setOpenAdd(false)
    setAddManual(false)
    setAddFile(null)
  }
  const submitAddManual = async () => {
    let src: string | null = null
    let mediaType: "video" | "image" | null = null
    if (addFile) {
      src = URL.createObjectURL(addFile)
      mediaType = addFile.type.startsWith("image/") ? "image" : "video"
    }
    const s = fromSecMs(addSec, addMs)
    const e = Math.min(s + 2, duration)
    setChanges((prev) => [...prev, { id: crypto.randomUUID(), type: "add", start: s, end: e, src, mediaType }])
    setOpenAdd(false)
    setAddManual(false)
    setAddFile(null)
  }
  const submitReplaceAuto = async () => {
    let src: string | null = null
    let mediaType: "video" | "image" | null = null
    if (replaceFile) {
      src = URL.createObjectURL(replaceFile)
      mediaType = replaceFile.type.startsWith("image/") ? "image" : "video"
    }
    setChanges((prev) => [...prev, { id: crypto.randomUUID(), type: "replace", start, end, src, mediaType }])
    setOpenReplace(false)
    setReplaceManual(false)
    setReplaceFile(null)
  }
  const submitReplaceManual = async () => {
    let src: string | null = null
    let mediaType: "video" | "image" | null = null
    if (replaceFile) {
      src = URL.createObjectURL(replaceFile)
      mediaType = replaceFile.type.startsWith("image/") ? "image" : "video"
    }
    const s = fromSecMs(replaceStartSec, replaceStartMs)
    const e = fromSecMs(replaceEndSec, replaceEndMs)
    if (e > s) {
      setChanges((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "replace", start: s, end: Math.min(e, duration), src, mediaType },
      ])
    }
    setOpenReplace(false)
    setReplaceManual(false)
    setReplaceFile(null)
  }
  const submitRemoveAuto = () => {
    addChange("remove", start, end)
    setOpenRemove(false)
    setRemoveManual(false)
  }
  const submitRemoveManual = () => {
    const s = fromSecMs(removeStartSec, removeStartMs)
    const e = fromSecMs(removeEndSec, removeEndMs)
    if (e > s) addChange("remove", s, Math.min(e, duration))
    setOpenRemove(false)
    setRemoveManual(false)
  }

  const sortedChanges = useMemo(() => [...changes].sort((a, b) => a.start - b.start), [changes])

  const prevChoiceRef = useRef(previewChoice)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (prevChoiceRef.current !== previewChoice) {
      if (previewChoice === "preview") {
        // pause original playback and seek to the edited region start
        if (isPlaying) {
          try {
            v.pause()
          } catch { }
          setIsPlaying(false)
        }
        try {
          v.currentTime = start
        } catch { }
        setCursor(clamp(start + MIN_GAP, start + MIN_GAP, end - MIN_GAP))
        // stop any overlay currently running
        if (overlayVideoRef.current) {
          try {
            overlayVideoRef.current.pause()
          } catch { }
        }
        setOverlayActive(false)
        activeChangeRef.current = null
      }
      prevChoiceRef.current = previewChoice
    }
  }, [previewChoice, isPlaying, start, end])

  return (
    <div className="flex flex-col h-screen gap-2 bg-background p-2">
      <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm glow-silver flex-1 flex flex-col min-h-0">
        <div
          className={`transition-[padding] duration-500 ease-out p-2 flex-1 flex flex-col min-h-0 ${showChangesPanel ? "md:pr-[340px]" : "md:pr-0"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium mt-0">Preview</h2>
            <button
              className="mr-4 rounded-md border border-border bg-accent/50 px-2 py-1 text-xs hover:bg-accent/70"
              onClick={() => setShowChangesPanel((v) => !v)}
            >
              {showChangesPanel ? "Hide Changes" : "Made Changes"}
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-[30%_70%] flex-1 min-h-0">
            {/* Left: options */}
            <div className="space-y-3 overflow-y-auto">
              {/* Original option */}
              <button
                className={`group relative block w-57 rounded-lg border border-border p-2 text-left transition-all hover:scale-[1.02] ${previewChoice === "original" ? "ring-1 ring-[color:var(--silver)] scale-[1.02]" : "opacity-85"
                  }`}
                onClick={() => setPreviewChoice("original")}
              >
                <div className="mb-1 text-[11px] font-medium">Original</div>
                <div className="relative h-20 w-full overflow-hidden rounded-md bg-muted">
                  <video className="h-full w-full object-cover" muted src="/videos/sample.mp4" />
                </div>
              </button>
              {/* Preview option */}
              <button
                className={`group relative block w-57 rounded-lg border border-border p-2 text-left transition-all hover:scale-[1.02] ${previewChoice === "preview" ? "ring-1 ring-[color:var(--silver)] scale-[1.02]" : "opacity-85"
                  }`}
                onClick={() => setPreviewChoice("preview")}
              >
                <div className="mb-1 text-[11px] font-medium">Edit Preview</div>
                <div className="relative h-20 w-full overflow-hidden rounded-md bg-muted">
                  <video className="h-full w-full object-cover" muted src="/videos/sample.mp4" />
                </div>
              </button>

              <div className="rounded-md border border-border/60 bg-card/40 p-2 text-[10px] text-muted-foreground">
                Tip: Drag the bracket handles to set a range. The dotted line is the playhead. Click the pencil to Add,
                Replace, or Remove a section. Press Space to toggle play/pause.
              </div>
            </div>

            <div className="relative flex-1 flex flex-col min-h-0">
              <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-muted transition-transform hover:scale-[1.01] pb-2">
                <video ref={videoRef} className="h-full w-full object-cover" controls muted src="/videos/sample.mp4" />
                {overlayActive && overlaySrc && overlayType === "video" && (
                  <video
                    ref={overlayVideoRef}
                    src={overlaySrc}
                    className="pointer-events-none absolute inset-0 z-40 h-full w-full object-cover"
                    muted
                    playsInline
                  />
                )}
                {overlayActive && overlaySrc && overlayType === "image" && (
                  <img
                    src={overlaySrc || "/placeholder.svg"}
                    alt="Overlay"
                    className="pointer-events-none absolute inset-0 z-40 h-full w-full object-cover"
                  />
                )}
                {(() => {
                  const tints = changes
                    .filter(
                      (c) =>
                        videoRef.current &&
                        videoRef.current.currentTime >= c.start &&
                        videoRef.current.currentTime < c.end,
                    )
                    .map((c) =>
                      c.type === "add"
                        ? "bg-[color:var(--change-add)]/20"
                        : c.type === "replace"
                          ? "bg-[color:var(--change-replace)]/20"
                          : "",
                    )
                    .filter(Boolean)
                  return tints.length ? (
                    <div className={`pointer-events-none absolute inset-0 ${tints.join(" ")} transition-opacity`} />
                  ) : null
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Slide-in Made Changes panel */}
        <aside
          className={`absolute right-0 top-0 h-full w-[320px] border-l border-border bg-card/80 backdrop-blur-md transition-transform duration-500 ease-out ${showChangesPanel ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ zIndex: 60 }}
        >
          <div className="p-3 h-full overflow-y-auto">
            <h3 className="mb-2 text-xs font-medium">Made Changes</h3>
            <ul className="space-y-2">
              {sortedChanges.length === 0 && <li className="text-sm text-muted-foreground">No changes yet.</li>}
              {sortedChanges.map((c) => (
                <ChangeRow key={c.id} entry={c} />
              ))}
            </ul>
          </div>
        </aside>
      </Card>

      <Card className="relative z-10 bg-card/60 backdrop-blur-sm flex-shrink-0">
        {/* <div className="p-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs font-medium mt-0">Timeline</h2>
            <span className="text-[10px] text-muted-foreground">Duration: {duration}s</span>
          </div>

          <div className="relative select-none">
            <div
              ref={railRef}
              className="relative h-14 w-full overflow-hidden rounded-lg border border-border bg-muted"
            >
              <canvas ref={framesCanvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

              <div
                className="absolute inset-y-0 left-0 bg-background/50"
                style={{ width: `${startPct}%` }}
                aria-hidden
              />
              <div
                className="absolute inset-y-0 right-0 bg-background/50"
                style={{ width: `${100 - endPct}%` }}
                aria-hidden
              />

              <div
                className="absolute top-0 h-full rounded-md ring-1"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0, endPct - startPct)}%`,
                  backgroundColor: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
                  boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 40%, transparent)",
                }}
              />

              {sortedChanges.map((c) => {
                const left = (c.start / duration) * 100
                const width = Math.max(0.5, ((c.end - c.start) / duration) * 100)
                const base =
                  c.type === "add"
                    ? "var(--change-add)"
                    : c.type === "replace"
                      ? "var(--change-replace)"
                      : "var(--change-remove)"
                return c.type === "remove" ? (
                  <div
                    key={c.id}
                    className="absolute top-0 h-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background:
                        "linear-gradient(to right, transparent 48%, var(--change-remove) 50%, transparent 52%)",
                      opacity: 0.9,
                    }}
                    aria-label="Removed segment"
                  />
                ) : (
                  <div
                    key={c.id}
                    className="absolute top-0 h-full opacity-30"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: base }}
                    aria-label={`${c.type} segment`}
                  />
                )
              })}

              <div
                role="slider"
                aria-label="Selection start"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={start}
                tabIndex={0}
                className="absolute top-0 h-full w-4 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${startPct}%` }}
                onMouseDown={onDownFactory("start")}
              >
                <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[color:var(--change-add)]"></div>
                <div className="absolute top-1 left-1/2 h-[2px] w-3 -translate-x-1/2 bg-[color:var(--change-add)]"></div>
                <div className="absolute bottom-1 left-1/2 h-[2px] w-3 -translate-x-1/2 bg-[color:var(--change-add)]"></div>
              </div>

              <div
                role="slider"
                aria-label="Cursor"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={cursor}
                tabIndex={0}
                className="absolute -translate-x-1/2 cursor-ew-resize"
                style={{
                  left: `${cursorPct}%`,
                  top: -3,
                  height: "calc(100% + 6px)",
                  borderLeft: "2px dotted rgba(255,255,255,0.9)",
                  filter: "drop-shadow(0 0 1px rgba(255,255,255,0.6))",
                }}
                onMouseDown={onDownFactory("cursor")}
              />

              <div
                role="slider"
                aria-label="Selection end"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={end}
                tabIndex={0}
                className="absolute top-0 h-full w-4 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${endPct}%` }}
                onMouseDown={onDownFactory("end")}
              >
                <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[color:var(--change-remove)]"></div>
                <div className="absolute top-1 left-1/2 h-[2px] w-3 -translate-x-1/2 bg-[color:var(--change-remove)]"></div>
                <div className="absolute bottom-1 left-1/2 h-[2px] w-3 -translate-x-1/2 bg-[color:var(--change-remove)]"></div>
              </div>
            </div>

            <div
              className="absolute -top-5 z-20 rounded-md border border-border bg-popover/90 px-1.5 py-0.5 text-[10px] shadow-sm"
              style={{ left: `${cursorPct}%`, transform: "translateX(-50%)" }}
            >
              Cursor: {cursor.toFixed(2)}s
            </div>

            <div
              className="absolute -bottom-5 z-20 rounded-md border border-border bg-popover/90 px-1.5 py-0.5 text-[10px] shadow-sm"
              style={{ left: `${startPct}%`, transform: "translateX(-50%)" }}
            >
              Start: {start.toFixed(2)}s
            </div>
            <div
              className="absolute -bottom-5 z-20 rounded-md border border-border bg-popover/90 px-1.5 py-0.5 text-[10px] shadow-sm"
              style={{ left: `${endPct}%`, transform: "translateX(-50%)" }}
            >
              End: {end.toFixed(2)}s
            </div>

            <div
              className="absolute z-50"
              style={{ left: `${cursorPct}%`, top: "100%", transform: "translate(-50%, 8px)" }}
              onMouseEnter={onToolsEnter}
              onMouseLeave={onToolsLeave}
            >
              <div className="flex items-center gap-2">
                <button
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card/90 shadow-sm hover:bg-accent/60 focus-silver"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={() => {
                    const v = videoRef.current
                    if (!v) return
                    if (isPlaying) {
                      if (overlayActive && overlayVideoRef.current) overlayVideoRef.current.pause()
                      v.pause()
                      setIsPlaying(false)
                    } else {
                      try {
                        v.currentTime = cursor
                      } catch { }
                      if (overlayActive && overlayVideoRef.current) {
                        overlayVideoRef.current.play().catch(() => { })
                      }
                      v.play().catch(() => { })
                      setIsPlaying(true)
                    }
                  }}
                >
                  {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                </button>

                <button
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card/90 shadow-sm hover:bg-accent/60 focus-silver"
                  aria-label="Edit"
                  onClick={() => setShowTools((s) => !s)}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>

              <div
                className={`absolute left-1/2 mt-2 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 shadow-xl backdrop-blur-md transition-opacity ${showTools ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  }`}
                style={{ zIndex: 80 }}
              >
                <div className="mb-2 text-[11px] font-medium">Choose an editing action</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpenAdd(true)}>
                    Add
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setOpenReplace(true)}>
                    Replace
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setOpenRemove(true)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Special hover transition and pro-styled UI.
                </div>
              </div>
            </div>

            <video ref={thumbVideoRef} className="hidden" src="/videos/sample.mp4" preload="metadata" muted />
          </div>
        </div> */}

        {/* Slide-in Made Changes panel */}
        <aside
          className={`absolute right-0 top-0 h-full w-[320px] border-l border-border bg-card/80 backdrop-blur-md transition-transform duration-500 ease-out ${showChangesPanel ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ zIndex: 60 }}
        >
          <div className="p-3 h-full overflow-y-auto">
            <h3 className="mb-2 text-xs font-medium">Made Changes</h3>
            <ul className="space-y-2">
              {sortedChanges.length === 0 && <li className="text-sm text-muted-foreground">No changes yet.</li>}
              {sortedChanges.map((c) => (
                <ChangeRow key={c.id} entry={c} />
              ))}
            </ul>
          </div>
        </aside>
      </Card>

      {/* ... existing dialogs ... */}
      <AddDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        addManual={addManual}
        setAddManual={setAddManual}
        addSec={addSec}
        setAddSec={setAddSec}
        addMs={addMs}
        setAddMs={setAddMs}
        addFile={addFile}
        setAddFile={setAddFile}
        submitAuto={submitAddAuto}
        submitManual={submitAddManual}
        currentCursor={cursor}
      />

      <ReplaceDialog
        open={openReplace}
        onOpenChange={setOpenReplace}
        replaceManual={replaceManual}
        setReplaceManual={setReplaceManual}
        replaceStartSec={replaceStartSec}
        setReplaceStartSec={setReplaceStartSec}
        replaceStartMs={replaceStartMs}
        setReplaceStartMs={setReplaceStartMs}
        replaceEndSec={replaceEndSec}
        setReplaceEndSec={setReplaceEndSec}
        replaceEndMs={replaceEndMs}
        setReplaceEndMs={setReplaceEndMs}
        replaceFile={replaceFile}
        setReplaceFile={setReplaceFile}
        submitAuto={submitReplaceAuto}
        submitManual={submitReplaceManual}
        currentStart={start}
        currentEnd={end}
      />

      <RemoveDialog
        open={openRemove}
        onOpenChange={setOpenRemove}
        removeManual={removeManual}
        setRemoveManual={setRemoveManual}
        removeStartSec={removeStartSec}
        setRemoveStartSec={setRemoveStartSec}
        removeStartMs={removeStartMs}
        setRemoveStartMs={setRemoveStartMs}
        removeEndSec={removeEndSec}
        setRemoveEndSec={setRemoveEndSec}
        removeEndMs={removeEndMs}
        setRemoveEndMs={setRemoveEndMs}
        submitAuto={submitRemoveAuto}
        submitManual={submitRemoveManual}
        currentStart={start}
        currentEnd={end}
      />
    </div>
  )
}

// ... existing dialog components and icons ...
function AddDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  addManual: boolean
  setAddManual: (v: boolean) => void
  addSec: string
  setAddSec: (v: string) => void
  addMs: string
  setAddMs: (v: string) => void
  addFile: File | null
  setAddFile: (f: File | null) => void
  submitAuto: () => void
  submitManual: () => void
  currentCursor: number
}) {
  const {
    open,
    onOpenChange,
    addManual,
    setAddManual,
    addSec,
    setAddSec,
    addMs,
    setAddMs,
    addFile,
    setAddFile,
    submitAuto,
    submitManual,
    currentCursor,
  } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add section</DialogTitle>
          <DialogDescription>Insert a new segment into the timeline.</DialogDescription>
        </DialogHeader>

        {/* Auto */}
        {!addManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Auto add</div>
              <p className="text-muted-foreground text-xs">
                Start at current cursor position: <strong>{toMs(currentCursor)}ms</strong>
              </p>
              <UploadBox file={addFile} setFile={setAddFile} label="Upload new section" />
              <div className="mt-3">
                <Button className="w-full" onClick={submitAuto}>
                  Make Changes
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setAddManual(true)}
              >
                Make changes manually
              </button>
            </div>
          </div>
        )}

        {/* Manual */}
        {addManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Add with specific time</div>
              <p className="text-muted-foreground text-xs">Provide start time in seconds and milliseconds.</p>
              <TimeRow label="Start time" sec={addSec} setSec={setAddSec} ms={addMs} setMs={setAddMs} />
              <UploadBox file={addFile} setFile={setAddFile} label="Upload new section" />
              <div className="mt-3">
                <Button className="w-full" onClick={submitManual}>
                  Make Changes
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setAddManual(false)}
              >
                Back to auto
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReplaceDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  replaceManual: boolean
  setReplaceManual: (v: boolean) => void
  replaceStartSec: string
  setReplaceStartSec: (v: string) => void
  replaceStartMs: string
  setReplaceStartMs: (v: string) => void
  replaceEndSec: string
  setReplaceEndSec: (v: string) => void
  replaceEndMs: string
  setReplaceEndMs: (v: string) => void
  replaceFile: File | null
  setReplaceFile: (f: File | null) => void
  submitAuto: () => void
  submitManual: () => void
  currentStart: number
  currentEnd: number
}) {
  const {
    open,
    onOpenChange,
    replaceManual,
    setReplaceManual,
    replaceStartSec,
    setReplaceStartSec,
    replaceStartMs,
    setReplaceStartMs,
    replaceEndSec,
    setReplaceEndSec,
    replaceEndMs,
    setReplaceEndMs,
    replaceFile,
    setReplaceFile,
    submitAuto,
    submitManual,
    currentStart,
    currentEnd,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replace section</DialogTitle>
          <DialogDescription>Replace a selected segment with a new upload.</DialogDescription>
        </DialogHeader>

        {!replaceManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Auto replace</div>
              <p className="text-muted-foreground text-xs">
                Current selection: <strong>{toMs(currentStart)}ms</strong> → <strong>{toMs(currentEnd)}ms</strong>
              </p>
              <UploadBox file={replaceFile} setFile={setReplaceFile} label="Upload replacement section" />
              <div className="mt-3">
                <Button className="w-full" onClick={submitAuto}>
                  Make Changes
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setReplaceManual(true)}
              >
                Make changes manually
              </button>
            </div>
          </div>
        )}

        {replaceManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Replace with specific time</div>
              <p className="text-muted-foreground text-xs">Provide start and end time in seconds and milliseconds.</p>
              <TimeRow
                label="Start time"
                sec={replaceStartSec}
                setSec={setReplaceStartSec}
                ms={replaceStartMs}
                setMs={setReplaceStartMs}
              />
              <TimeRow
                label="End time"
                sec={replaceEndSec}
                setSec={setReplaceEndSec}
                ms={replaceEndMs}
                setMs={setReplaceEndMs}
              />
              <UploadBox file={replaceFile} setFile={setReplaceFile} label="Upload replacement section" />
              <div className="mt-3">
                <Button className="w-full" onClick={submitManual}>
                  Make Changes
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setReplaceManual(false)}
              >
                Back to auto
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RemoveDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  removeManual: boolean
  setRemoveManual: (v: boolean) => void
  removeStartSec: string
  setRemoveStartSec: (v: string) => void
  removeStartMs: string
  setRemoveStartMs: (v: string) => void
  removeEndSec: string
  setRemoveEndSec: (v: string) => void
  removeEndMs: string
  setRemoveEndMs: (v: string) => void
  submitAuto: () => void
  submitManual: () => void
  currentStart: number
  currentEnd: number
}) {
  const {
    open,
    onOpenChange,
    removeManual,
    setRemoveManual,
    removeStartSec,
    setRemoveStartSec,
    removeStartMs,
    setRemoveStartMs,
    removeEndSec,
    setRemoveEndSec,
    removeEndMs,
    setRemoveEndMs,
    submitAuto,
    submitManual,
    currentStart,
    currentEnd,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove section</DialogTitle>
          <DialogDescription>Permanently mark a segment as removed.</DialogDescription>
        </DialogHeader>

        {!removeManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Auto remove</div>
              <p className="text-destructive text-xs">
                Are you sure you want to remove: <strong>{toMs(currentStart)}ms</strong> →{" "}
                <strong>{toMs(currentEnd)}ms</strong>?
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="destructive" className="flex-1" onClick={submitAuto}>
                  Remove
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setRemoveManual(true)}
              >
                Remove manually
              </button>
            </div>
          </div>
        )}

        {removeManual && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Remove with specific time</div>
              <p className="text-muted-foreground text-xs">Provide start and end time in seconds and milliseconds.</p>
              <TimeRow
                label="Start time"
                sec={removeStartSec}
                setSec={setRemoveStartSec}
                ms={removeStartMs}
                setMs={setRemoveStartMs}
              />
              <TimeRow
                label="End time"
                sec={removeEndSec}
                setSec={setRemoveEndSec}
                ms={removeEndMs}
                setMs={setRemoveEndMs}
              />
              <div className="mt-3">
                <Button variant="destructive" className="w-full" onClick={submitManual}>
                  Remove
                </Button>
              </div>
            </div>

            <div className="text-center text-xs">
              <button
                className="text-primary underline underline-offset-4 hover:text-[color:var(--silver)]"
                onClick={() => setRemoveManual(false)}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TimeRow(props: {
  label: string
  sec: string
  setSec: (v: string) => void
  ms: string
  setMs: (v: string) => void
}) {
  const { label, sec, setSec, ms, setMs } = props
  return (
    <div className="mt-3 grid grid-cols-3 items-end gap-3">
      <div className="col-span-3">
        <Label className="text-xs">{label}</Label>
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${label}-sec`} className="sr-only">
          Seconds
        </Label>
        <div className="text-xs text-muted-foreground mb-1">Seconds</div>
        <Input
          id={`${label}-sec`}
          type="number"
          min="0"
          inputMode="numeric"
          value={sec}
          onChange={(e) => setSec(e.target.value)}
          className="bg-background/70"
        />
      </div>
      <div className="col-span-1">
        <Label htmlFor={`${label}-ms`} className="sr-only">
          Milliseconds
        </Label>
        <div className="text-xs text-muted-foreground mb-1">ms</div>
        <Input
          id={`${label}-ms`}
          type="number"
          min="0"
          inputMode="numeric"
          value={ms}
          onChange={(e) => setMs(e.target.value)}
          className="bg-background/70"
        />
      </div>
    </div>
  )
}

function UploadBox(props: {
  file: File | null
  setFile: (f: File | null) => void
  label: string
}) {
  const { file, setFile, label } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)

  const handleFile = async (f: File | null) => {
    setFile(f)
    setThumb(null)
    if (!f) return
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f)
      setThumb(url)
      return
    }
    if (f.type.startsWith("video/")) {
      const url = URL.createObjectURL(f)
      const v = document.createElement("video")
      v.src = url
      v.muted = true
      await new Promise<void>((resolve) => {
        if (v.readyState >= 2) resolve()
        else v.addEventListener("loadeddata", () => resolve(), { once: true })
      })
      const canvas = document.createElement("canvas")
      const w = 160
      const h = Math.max(1, Math.round((w * v.videoHeight) / Math.max(1, v.videoWidth)))
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      try {
        ctx?.drawImage(v, 0, 0, w, h)
        setThumb(canvas.toDataURL("image/png"))
      } catch {
        setThumb(null)
      }
    }
  }

  return (
    <div className="mt-3">
      <Label className="text-xs">{label}</Label>
      <div
        className="mt-1 grid place-items-center rounded-lg border border-dashed border-border bg-background/70 px-4 py-4 text-center transition-all hover:border-primary hover:bg-accent/40"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          accept="video/*,image/*"
        />
        <div className="flex flex-col items-center gap-2">
          {thumb ? (
            <img
              src={thumb || "/placeholder.svg"}
              alt="Selected media preview"
              className="h-16 w-auto rounded-md border border-border object-cover"
            />
          ) : (
            <UploadIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">{file ? file.name : "Click to upload or drop a file"}</span>
        </div>
      </div>
    </div>
  )
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M14.06 6.19 16.19 4.06c.39-.39 1.03-.39 1.41 0l1.34 1.34c.39.39.39 1.02 0 1.41l-2.13 2.13-2.75-2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 16V4m0 0l4 4m-4-4l-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M8 5v14l11-7-11-7Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" />
    </svg>
  )
}

function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChangeRow({ entry }: { entry: ChangeEntry }) {
  const [open, setOpen] = useState(false)
  const color =
    entry.type === "add"
      ? "var(--change-add)"
      : entry.type === "replace"
        ? "var(--change-replace)"
        : "var(--change-remove)"

  const typeLabel = entry.type === "add" ? "Added" : entry.type === "replace" ? "Replaced" : "Removed"

  return (
    <li className="rounded-lg border border-border">
      <button
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="uppercase text-xs tracking-wide opacity-80">{entry.type}</span>
          <span className="text-muted-foreground text-xs">
            {toMs(entry.start)}ms → {toMs(entry.end)}ms
          </span>
        </div>
        <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-2 text-xs">
          {entry.src && entry.mediaType === "video" && (
            <div className="rounded-md overflow-hidden border border-border bg-muted">
              <video src={entry.src} className="w-full h-24 object-cover" controls muted />
            </div>
          )}
          {entry.src && entry.mediaType === "image" && (
            <div className="rounded-md overflow-hidden border border-border bg-muted">
              <img
                src={entry.src || "/placeholder.svg"}
                alt={`${typeLabel} media`}
                className="w-full h-24 object-cover"
              />
            </div>
          )}
          {!entry.src && (
            <div className="rounded-md bg-muted/40 p-2 text-muted-foreground">
              {typeLabel} section (no media attached)
            </div>
          )}
          {entry.type === "replace" && entry.src && (
            <div className="text-right">
              <Button size="sm" variant="secondary">
                Replace again
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
