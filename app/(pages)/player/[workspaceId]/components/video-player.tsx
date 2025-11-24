"use client"

import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Maximize, Minimize, Volume2, VolumeX, Edit3, Play, Pause, Settings } from "lucide-react"
import Link from "next/link"
import HLS from "hls.js"
import { requestHandler } from "@/lib/requestHandler"

interface Branch {
    id: string
    name: string
    versions: Version[]
}

interface Version {
    id: string
    commitMessage: string
    createdAt: string
}

interface VideoPlayerProps {
    workspaceId: string
    initialVersionId: string
    branches: Branch[]
    selectedBranch: string
    onBranchChange: (branchId: string) => void
    onVersionChange: (versionId: string) => void
}

const ALL_RESOLUTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160]

export function VideoPlayer({
    workspaceId,
    initialVersionId,
    branches,
    selectedBranch,
    onBranchChange,
    onVersionChange,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<HLS | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [selectedVersion, setSelectedVersion] = useState(initialVersionId)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [availableResolutions, setAvailableResolutions] = useState<number[]>([])
    const [selectedResolution, setSelectedResolution] = useState<number>(360)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const [loading, setLoading] = useState(false)

    const currentBranch = branches.find((b) => b.id === selectedBranch)
    const currentVersionData = currentBranch?.versions.find((v) => v.id === selectedVersion)

    useEffect(() => {
        const fetchResolutions = async () => {
            requestHandler({
                url: `/videos/${selectedVersion}/max-resolution`,
                method: "GET",
                action: ({ maxResolution }: any) => {
                    const availRes = ALL_RESOLUTIONS.filter((res) => res <= maxResolution)
                    setAvailableResolutions(availRes)
                    setSelectedResolution(availRes[availRes.length - 1] || 1080)
                }
            })
        }

        if (selectedVersion) {
            fetchResolutions()
        }
    }, [selectedVersion])

    useEffect(() => {
        const video = videoRef.current
        if (!video || !selectedVersion) return

        const initHLS = async () => {
            setLoading(true)
            try {
                // Clean up previous HLS instance
                if (hlsRef.current) {
                    hlsRef.current.destroy()
                    hlsRef.current = null
                }

                const playlistUrl = `http://localhost:1234/api/v1/videos/${selectedVersion}/playlist/${selectedResolution}`

                // Check if browser supports HLS natively
                if (video.canPlayType("application/vnd.apple.mpegurl")) {
                    // Native HLS support (Safari, iOS)
                    video.src = playlistUrl
                } else if (HLS.isSupported()) {
                    // Use HLS.js for other browsers
                    const hls = new HLS({
                        debug: false,
                        enableWorker: true,
                        xhrSetup: (xhr, url) => {
                            xhr.withCredentials = true
                        },
                    })

                    hls.loadSource(playlistUrl)
                    hls.attachMedia(video)

                    hls.on(HLS.Events.MANIFEST_PARSED, () => {
                        console.log("[v0] HLS manifest parsed")
                    })

                    hls.on(HLS.Events.ERROR, (event, data) => {
                        console.error("[v0] HLS Error:", data)
                        if (data.fatal) {
                            switch (data.type) {
                                case HLS.ErrorTypes.NETWORK_ERROR:
                                    console.error("[v0] Network error, retrying...")
                                    hls.startLoad()
                                    break
                                case HLS.ErrorTypes.MEDIA_ERROR:
                                    console.error("[v0] Media error, attempting recovery...")
                                    hls.recoverMediaError()
                                    break
                            }
                        }
                    })

                    hlsRef.current = hls
                } else {
                    console.error("[v0] HLS is not supported in this browser")
                }
            } catch (error) {
                console.error("[v0] Error initializing HLS:", error)
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
    }, [selectedVersion, selectedResolution, availableResolutions])

    useEffect(() => {
        if (currentBranch?.versions.length) {
            const newVersionId = currentBranch.versions[0].id
            setSelectedVersion(newVersionId)
            onVersionChange(newVersionId)
        }
    }, [selectedBranch, currentBranch, onVersionChange])

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (!isFullscreen) {
                containerRef.current.requestFullscreen().catch(() => {
                    console.error("[v0] Fullscreen request failed")
                })
            } else {
                document.exitFullscreen()
            }
            setIsFullscreen(!isFullscreen)
        }
    }

    const handleSpeedChange = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
            setPlaybackSpeed(speed)
        }
    }

    const handleResolutionChange = (resolution: string) => {
        setSelectedResolution(Number.parseInt(resolution))
    }

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00"
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }

    return (
        <div className="w-full space-y-4">
            {/* Video player container with YouTube-like styling */}
            <div
                ref={containerRef}
                className="rounded-lg overflow-hidden bg-black relative group aspect-video"
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setTimeout(() => setShowControls(false), 2000)}
            >
                <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls={false}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                />

                {/* Loading indicator */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="animate-spin">
                            <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* Play button overlay */}
                {!isPlaying && !loading && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/50 transition-colors"
                        onClick={handlePlayPause}
                    >
                        <div className="w-20 h-20 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors">
                            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                        </div>
                    </div>
                )}

                {/* Controls - Show on hover or when paused */}
                {(showControls || !isPlaying) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
                        {/* Progress bar */}
                        <div className="mb-4">
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={(e) => {
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = Number.parseFloat(e.target.value)
                                    }
                                }}
                                className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {/* Play/Pause */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20 rounded-full h-9 w-9 p-0"
                                    onClick={handlePlayPause}
                                >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </Button>

                                {/* Mute */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20 rounded-full h-9 w-9 p-0"
                                    onClick={handleMute}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>

                                {/* Time display */}
                                <span className="text-sm text-white ml-2">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Speed selector */}
                                <Select
                                    value={playbackSpeed.toString()}
                                    onValueChange={(value) => {
                                        if (videoRef.current) {
                                            videoRef.current.playbackRate = Number.parseFloat(value)
                                            setPlaybackSpeed(Number.parseFloat(value))
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-16 h-8 text-white bg-black/20 border-0 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700">
                                        <SelectItem value="0.5">0.5x</SelectItem>
                                        <SelectItem value="1">1x</SelectItem>
                                        <SelectItem value="1.5">1.5x</SelectItem>
                                        <SelectItem value="2">2x</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Resolution selector */}
                                <Select value={selectedResolution.toString()} onValueChange={handleResolutionChange}>
                                    <SelectTrigger className="w-20 h-8 text-white bg-black/20 border-0 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700">
                                        {availableResolutions.map((res) => (
                                            <SelectItem key={res} value={res.toString()}>
                                                {res}p
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Settings */}
                                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full h-9 w-9 p-0">
                                    <Settings className="w-5 h-5" />
                                </Button>

                                {/* Fullscreen */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20 rounded-full h-9 w-9 p-0"
                                    onClick={handleFullscreen}
                                >
                                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Metadata and Version selector */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">{currentBranch?.name}</h3>
                        <p className="text-sm text-gray-400">{currentVersionData?.commitMessage}</p>
                    </div>
                    <Link href={`/edit/${selectedVersion}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Video
                        </Button>
                    </Link>
                </div>

                {/* Version selector */}
                <div className="space-y-2">
                    <label className="text-sm text-gray-400">Version</label>
                    <Select
                        value={selectedVersion}
                        onValueChange={(versionId) => {
                            setSelectedVersion(versionId)
                            onVersionChange(versionId)
                        }}
                    >
                        <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                            {currentBranch?.versions.map((version, idx) => (
                                <SelectItem key={version.id} value={version.id}>
                                    Version {idx + 1} - {version.commitMessage}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
