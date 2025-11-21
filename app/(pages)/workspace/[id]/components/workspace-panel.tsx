"use client"

import { useMemo, useState, useRef } from "react"
// import useSWR from "swr"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Play, Settings } from "lucide-react"
import VersionsPanel from "./versions-panel"
import { WorkspaceVersion } from "./workspace-shell"
import useSWR from "swr"
// import { fetcher } from "@/lib/fetcher"
// import type { WorkspaceVersion } from "@/lib/types"

type VideoInfo = {
  versionId: string
  maxResolution: number
  allResolutions: number[]
  processedResolutions: number[]
  poster: string
  sources: Array<{ res: number; src: string }>
}

export default function WorkspacePanel({
  workspaceId,
  versions,
  activeVersion,
  onChangeVersion,
}: {
  workspaceId: string
  versions: WorkspaceVersion[]
  activeVersion: string
  onChangeVersion: (id: string) => void
}) {
  const { data, isLoading, mutate } = useSWR<VideoInfo>(
    `/api/workspace/${workspaceId}/video?version=${activeVersion}`,
    // fetcher,
    {
      refreshInterval: 2500, // poll to reflect processing changes
    },
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [showUi, setShowUi] = useState(true)
  const hideTimerRef = useRef<number | null>(null)

  const showUiForAWhile = () => {
    setShowUi(true)
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    // hide after 2 seconds when playing
    if (isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        setShowUi(false)
      }, 2000)
    }
  }

  const bestProcessed = useMemo(() => {
    if (!data) return undefined
    const processed = data.processedResolutions.sort((a, b) => a - b)
    return processed[processed.length - 1]
  }, [data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[4fr_1fr] gap-4">
      {/* video banner */}
      <div
        className="rounded-xl border border-border/80 bg-card/40 overflow-hidden relative aspect-video lg:aspect-[16/9]"
        onMouseEnter={() => showUiForAWhile()}
        onMouseMove={() => showUiForAWhile()}
        onMouseLeave={() => {
          if (isPlaying) setShowUi(false)
        }}
      >
        <div
          className={`absolute inset-0 grid place-items-center transition-opacity duration-200 ${!isPlaying || showUi ? "opacity-100" : "opacity-0"
            } pointer-events-none z-20`}
        >
          <button
            onClick={() => {
              if (!videoRef.current) return
              if (videoRef.current.paused) {
                videoRef.current.play()
                setIsPlaying(true)
                setShowUi(false)
              } else {
                videoRef.current.pause()
                setIsPlaying(false)
                setShowUi(true)
              }
            }}
            className="pointer-events-auto group relative size-20 rounded-full bg-primary/15 border border-primary/20 backdrop-blur-sm hover:bg-primary/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Play className="relative mx-auto text-primary w-8 h-8 translate-x-0.5" />
          </button>
        </div>

        <div
          className={`absolute right-3 top-3 flex items-center gap-2 transition-opacity duration-200 z-30 ${!isPlaying || showUi ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        >
          <ResolutionMenu info={data} disabled={isLoading} />
        </div>

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster="/video-banner-preview-dark-silver-theme.jpg"
          onPlay={() => {
            setIsPlaying(true)
            setShowUi(false)
          }}
          onPause={() => {
            setIsPlaying(false)
            setShowUi(true)
          }}
        >
          {/* using a public demo video for preview purposes */}
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* versions rail */}
      <VersionsPanel
        versions={versions}
        activeVersion={activeVersion}
        onChangeVersion={(id) => {
          onChangeVersion(id)
          setTimeout(() => mutate(), 50)
        }}
      />
    </div>
  )
}

function ResolutionMenu({ info, disabled }: { info?: VideoInfo; disabled?: boolean }) {
  const fallbackAll = [144, 240, 360, 480, 720, 1080]
  const fallbackProcessed = [144, 240, 360] // show some ready, others processing

  const available = (info?.allResolutions?.length ? info.allResolutions : fallbackAll) ?? fallbackAll
  const processed = new Set(
    (info?.processedResolutions?.length ? info.processedResolutions : fallbackProcessed) ?? fallbackProcessed,
  )

  const maxRes = info?.maxResolution || Math.max(...available)
  const maxLabel = `${maxRes}p • Preview`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">{maxLabel}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[60]">
        <DropdownMenuLabel>Quality (preview only)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((res) => {
          const isReady = processed.has(res)
          return (
            <DropdownMenuItem key={res} className="justify-between">
              <span>{res}p</span>
              {isReady ? (
                <span className="text-xs text-muted-foreground">Ready</span>
              ) : (
                <span className="text-xs text-primary animate-pulse">Processing…</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
