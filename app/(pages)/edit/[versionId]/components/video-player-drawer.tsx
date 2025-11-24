"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface VideoPlayerDrawerProps {
  isOpen: boolean
  onClose: () => void
  originalFile: File | null
  currentFile: File | null
  selectedVideo: "original" | "edited"
  onSelectVideo: (video: "original" | "edited") => void
}

export default function VideoPlayerDrawer({
  isOpen,
  onClose,
  originalFile,
  currentFile,
  selectedVideo,
  onSelectVideo,
}: VideoPlayerDrawerProps) {
  const [originalThumbnail, setOriginalThumbnail] = useState<string>("")
  const [editedThumbnail, setEditedThumbnail] = useState<string>("")
  const videoRefs = { original: useRef<HTMLVideoElement>(null), edited: useRef<HTMLVideoElement>(null) }

  const hasEdited = currentFile && originalFile && currentFile !== originalFile

  useEffect(() => {
    if (originalFile && videoRefs.original.current) {
      videoRefs.original.current.src = URL.createObjectURL(originalFile)
      videoRefs.original.current.onloadedmetadata = () => {
        videoRefs.original.current!.currentTime = 0
        setTimeout(() => {
          const canvas = document.createElement("canvas")
          canvas.width = videoRefs.original.current!.videoWidth
          canvas.height = videoRefs.original.current!.videoHeight
          canvas.getContext("2d")?.drawImage(videoRefs.original.current!, 0, 0)
          setOriginalThumbnail(canvas.toDataURL())
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalFile])

  useEffect(() => {
    if (hasEdited && currentFile && videoRefs.edited.current) {
      videoRefs.edited.current.src = URL.createObjectURL(currentFile)
      videoRefs.edited.current.onloadedmetadata = () => {
        videoRefs.edited.current!.currentTime = 0
        setTimeout(() => {
          const canvas = document.createElement("canvas")
          canvas.width = videoRefs.edited.current!.videoWidth
          canvas.height = videoRefs.edited.current!.videoHeight
          canvas.getContext("2d")?.drawImage(videoRefs.edited.current!, 0, 0)
          setEditedThumbnail(canvas.toDataURL())
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEdited, currentFile])

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300" onClick={onClose} />}

      <div
        className={`fixed top-0 left-0 h-screen w-96 bg-card/95 backdrop-blur-xl border-r border-border/60 z-50 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Change Video</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-primary/10 text-foreground">
              ✕
            </Button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                onSelectVideo("original")
                onClose()
              }}
              className={`w-full group relative overflow-hidden rounded-lg transition-all ${selectedVideo === "original"
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 hover:ring-offset-background"
                }`}
              disabled={!originalFile}
            >
              <div className="relative aspect-video bg-secondary/30 overflow-hidden">
                {originalThumbnail ? (
                  <>
                    <Image
                      src={originalThumbnail || "/placeholder.svg"}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span className="text-2xl">📹</span>
                  </div>
                )}
              </div>
              <div className="p-2 bg-secondary/40">
                <p className="text-xs font-medium text-foreground">Original Video</p>
              </div>
            </button>
            <video ref={videoRefs.original} className="hidden" />

            {hasEdited && (
              <>
                <button
                  onClick={() => {
                    onSelectVideo("edited")
                    onClose()
                  }}
                  className={`w-full group relative overflow-hidden rounded-lg transition-all ${selectedVideo === "edited"
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 hover:ring-offset-background"
                    }`}
                >
                  <div className="relative aspect-video bg-secondary/30 overflow-hidden">
                    {editedThumbnail ? (
                      <>
                        <Image
                          src={editedThumbnail || "/placeholder.svg"}
                          alt="Edited"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-2xl">✂️</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span className="text-2xl">✂️</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-secondary/40">
                    <p className="text-xs font-medium text-foreground">Edited Version</p>
                  </div>
                </button>
                <video ref={videoRefs.edited} className="hidden" />
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-6 pt-6 border-t border-border/40">
            Click on a video frame to select and view it in the player
          </div>
        </div>
      </div>
    </>
  )
}
