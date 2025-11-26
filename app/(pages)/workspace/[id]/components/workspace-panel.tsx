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


  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [availableResolutions, setAvailableResolutions] = useState<number[]>([])
  const [selectedResolution, setSelectedResolution] = useState(360)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showControls, setShowControls] = useState(true)

  // Fetch max resolution for the version
  useEffect(() => {
    const fetchRes = async () => {
      requestHandler({
        url: `/videos/${activeVersion?.id}/max-resolution`,
        method: "GET",
        action: ({ maxResolution }: { maxResolution: number }) => {
          const avail = ALL_RESOLUTIONS.filter(r => r <= maxResolution)
          setAvailableResolutions(avail)
          setSelectedResolution(avail[avail.length - 1])
        }
      })
    }
    fetchRes()
  }, [activeVersion])

  // Load HLS video
  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeVersion) return

    const initHLS = async () => {
      setLoading(true)
      try {

        setLoading(true)

        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }

        const playlistUrl = `http://localhost:1234/api/v1/videos/${activeVersion.id}/playlist/${selectedResolution}`

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = playlistUrl

          // ⬅️ ADD THIS
          video.onloadedmetadata = () => {
            video.currentTime = resumeTimeRef.current
            if (resumeWasPlayingRef.current) video.play()
            setLoading(false)
          }
        } else if (HLS.isSupported()) {
          const hls = new HLS({ debug: false, enableWorker: true })

          hls.loadSource(playlistUrl)
          hls.attachMedia(video)

          // ⬅️ ADD THIS
          hls.on(HLS.Events.MANIFEST_PARSED, () => {
            video.currentTime = resumeTimeRef.current
            if (resumeWasPlayingRef.current) video.play()
            setLoading(false)
          })

          hlsRef.current = hls
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    initHLS()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeVersion, selectedResolution])



  const handlePlayPause = () => {
    if (!videoRef.current) return
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[4fr_1fr] gap-4">
      {/* VIDEO PLAYER (replaced with merged version) */}
      <div
        ref={containerRef}
        className="rounded-xl border border-border/80 bg-black overflow-hidden relative aspect-video lg:aspect-[16/8.5] group"
        onMouseEnter={() => setShowControls(true)}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => setTimeout(() => setShowControls(false), 2000)}
      >
        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          controls={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-4 border-gray-700 border-t-white rounded-full"></div>
          </div>
        )}

        {/* Click-to-play overlay */}
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

        {/* Controls */}
        {(showControls || !isPlaying) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
            {/* Progress */}
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={e => {
                if (videoRef.current) videoRef.current.currentTime = Number(e.target.value)
              }}
              className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600"
            />

            {/* Time */}
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Buttons */}
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
                {/* Speed */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50"
                    >
                      <span className="text-sm">{playbackSpeed}x</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[60]">
                    <DropdownMenuLabel>Speed</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[0.5, 1, 1.25, 1.5, 2].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setPlaybackSpeed(opt)}
                        className={`justify-between ${opt === selectedResolution
                          ? "bg-gray-200 text-black font-medium"
                          : ""
                          }`}
                      >
                        <span>{opt}x</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Resolution */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50"
                    >
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
                          setLoading(true)
                          setSelectedResolution(opt)
                        }}
                        className={`justify-between ${opt === selectedResolution
                          ? "bg-gray-200 text-black font-medium"
                          : ""
                          }`}
                      >
                        <span>{opt}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <Button size="sm" variant="ghost" className="text-white" onClick={handleFullscreen}>
                  {isFullscreen ? <Minimize /> : <Maximize />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Versions Panel (unchanged) */}
      <VersionsPanel
        versions={versions}
        activeVersion={activeVersion}
        setActiveVersion={setActiveVersion}
      />
    </div>
  )
}
