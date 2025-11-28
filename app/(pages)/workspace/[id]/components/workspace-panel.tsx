"use client"

import { useState, useRef, useEffect, Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react"
import VersionsPanel from "./versions-panel"
import HLS from "hls.js"
import { WorkspaceVersion } from "./workspace-shell"
import { requestHandler } from "@/lib/requestHandler"

const ALL_RESOLUTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160]

export default function WorkspacePanel({ activeVersion, setActiveVersion, versions }: {
  activeVersion: WorkspaceVersion | null
  setActiveVersion: Dispatch<SetStateAction<WorkspaceVersion | null>>
  versions: WorkspaceVersion[]
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<HLS | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resumeTimeRef = useRef(0)
  const resumeWasPlayingRef = useRef(false)
  const hasStartedRef = useRef(false)

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [availableResolutions, setAvailableResolutions] = useState<number[]>([])
  const [selectedResolution, setSelectedResolution] = useState<number | null>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const [resolutionsState, setResolutionsState] = useState<Record<number, string>>({})
  const [isVideoReady, setIsVideoReady] = useState(false)

  // ------------------------- Fetch max resolution -------------------------
  useEffect(() => {
    if (!activeVersion) return
    requestHandler({
      url: `/videos/${activeVersion.id}/max-resolution`,
      method: "GET",
      action: ({ maxResolution }: { maxResolution: number }) => {
        const avail = ALL_RESOLUTIONS.filter(r => r <= maxResolution)
        setAvailableResolutions(avail)
        // default to 1080p if available
        const defaultRes = avail.includes(1080) ? 1080 : avail[avail.length - 1]
        setSelectedResolution(defaultRes)
      }
    })
  }, [activeVersion])

  // ------------------------- Poll resolution states -------------------------
  useEffect(() => {
    if (!activeVersion || availableResolutions.length === 0) return

    let interval: NodeJS.Timeout | null = null

    const pollStates = async () => {
      const states: Record<number, string> = {}

      await Promise.all(
        availableResolutions.map(async (res) => {
          await requestHandler({
            url: `/videos/${activeVersion.id}/state/${res}`,
            method: "GET",
            action: ({ state }: { state: string }) => {
              states[res] = state
            }
          })
        })
      )

      setResolutionsState(states)

      const allReady = Object.values(states).every(s => s === "Uploaded")
      if (allReady) {
        setIsVideoReady(true)
        if (interval) clearInterval(interval)
      }
    }

    pollStates()
    interval = setInterval(pollStates, 2000)

    return () => {
      if (interval) clearInterval(interval)
      clearInterval(interval)
    }
  }, [activeVersion, availableResolutions])

  // ------------------------- Load HLS video -------------------------
  const loadHLS = (res: number) => {
    const video = videoRef.current
    if (!video || !activeVersion) return

    setLoading(true)
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      const playlistUrl = `http://localhost:1234/api/v1/videos/${activeVersion.id}/playlist/${res}`

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playlistUrl
        video.onloadedmetadata = () => {
          video.currentTime = resumeTimeRef.current
          if (resumeWasPlayingRef.current) video.play()
          setLoading(false)
        }
      } else if (HLS.isSupported()) {
        const hls = new HLS({ debug: false, enableWorker: true })
        hls.loadSource(playlistUrl)
        hls.attachMedia(video)
        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          video.currentTime = resumeTimeRef.current
          if (resumeWasPlayingRef.current) video.play()
          setLoading(false)
        })
        hlsRef.current = hls
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedResolution !== null && isVideoReady && !hasStartedRef.current) {
      loadHLS(selectedResolution)
      hasStartedRef.current = true
      resumeWasPlayingRef.current = true // auto-play on first load
    }
  }, [selectedResolution, isVideoReady])

  // ------------------------- Handlers -------------------------
  const handlePlayPause = () => {
    if (!videoRef.current) return

    if (!hasStartedRef.current && selectedResolution !== null) {
      // force load HLS if not loaded yet
      loadHLS(selectedResolution)
      hasStartedRef.current = true
    }

    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()

    setIsPlaying(!isPlaying)
  }

  const handleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) containerRef.current.requestFullscreen()
    else document.exitFullscreen()
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  // ------------------------- JSX -------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[4fr_1fr] gap-4">
      {!isVideoReady ? (
        <ResolutionProcessingUI resolutionsState={resolutionsState} />
      ) : (
        <div
          ref={containerRef}
          className="rounded-xl border border-border/80 bg-black overflow-hidden relative aspect-video lg:aspect-[16/8.5] group"
          onMouseEnter={() => setShowControls(true)}
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => setTimeout(() => setShowControls(false), 2000)}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            controls={false}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
          />

          {loading && (
            <div className="
              absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px] 
              flex flex-col items-center justify-center z-50
            ">
              <div className="
                w-12 h-12 rounded-full border-[3px] border-gray-500 border-t-white animate-spin
              "></div>
              <p className="text-gray-300 text-xs mt-4 tracking-wide">Loading video…</p>
            </div>
          )}

          {!isPlaying && !loading && (
            <div
              className="absolute inset-0 bg-black/30 hover:bg-black/50 flex items-center justify-center cursor-pointer"
              onClick={handlePlayPause}
            >
              <div className="w-20 h-20 rounded-full bg-white/80 hover:bg-white flex items-center justify-center">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </div>
          )}

          {(showControls || !isPlaying) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={e => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value) }}
                className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-white" onClick={handlePlayPause}>
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={handleMute}>
                    {isMuted ? <VolumeX /> : <Volume2 />}
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50">
                        <span className="text-sm">{selectedResolution}</span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 z-[60]">
                      <DropdownMenuLabel>Quality</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableResolutions.map((opt) => (
                        <DropdownMenuItem
                          key={opt}
                          onClick={() => {
                            if (videoRef.current) {
                              resumeTimeRef.current = videoRef.current.currentTime
                              resumeWasPlayingRef.current = !videoRef.current.paused
                            }
                            setSelectedResolution(opt)
                            setLoading(true)
                          }}
                          className={`justify-between ${opt === selectedResolution ? "bg-gray-200 text-black font-medium" : ""}`}
                        >
                          <span>{opt}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button size="sm" variant="ghost" className="text-white" onClick={handleFullscreen}>
                    {isFullscreen ? <Minimize /> : <Maximize />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <VersionsPanel versions={versions} activeVersion={activeVersion} setActiveVersion={setActiveVersion} />
    </div>
  )
}

// ------------------------- Processing UI -------------------------
function ResolutionProcessingUI({ resolutionsState }: { resolutionsState: Record<number, string> }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] w-full rounded-xl border border-border/60 bg-[#111]/60 backdrop-blur-md p-10 shadow-[0_0_25px_rgba(255,255,255,0.03)] animate-fade-in">
      <h2 className="text-xl font-semibold tracking-wide text-white mb-2">Preparing Your Video</h2>
      <p className="text-gray-400 text-sm mb-8 text-center max-w-sm leading-relaxed">
        We’re generating all video resolutions. This usually takes a moment.
      </p>

      <div className="w-full max-w-md space-y-3">
        {Object.entries(resolutionsState)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([res, state]) => {
            const isDone = state === "Uploaded"
            return (
              <div key={res} className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A]/70 border border-border/40 rounded-lg">
                <span className="text-sm text-gray-200">{res}p</span>
                <div className="flex items-center gap-2">
                  {!isDone ? (
                    <span className="flex items-center gap-1.5 text-yellow-500 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      Processing
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-green-500 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Ready
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      <div className="mt-10 w-full max-w-xs h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full bg-white/70 animate-loader rounded-full"></div>
      </div>
    </div>
  )
}
