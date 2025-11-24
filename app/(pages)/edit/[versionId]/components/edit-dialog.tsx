"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import Image from "next/image"

interface EditDialogProps {
  isOpen: boolean
  onClose: () => void
  editType: "add" | "replace" | "remove"
  startTimestamp: string
  endTimestamp: string
  uploadedFile: File | null
  onStartTimestampChange: (value: string) => void
  onEndTimestampChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onApply: () => void
  loading: boolean
}

export default function EditDialog({
  isOpen,
  onClose,
  editType,
  startTimestamp,
  endTimestamp,
  uploadedFile,
  onStartTimestampChange,
  onEndTimestampChange,
  onFileChange,
  onApply,
  loading,
}: EditDialogProps) {
  const [videoThumbnail, setVideoThumbnail] = useState<string>("")
  const [expandedVideo, setExpandedVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const typeConfig = {
    add: {
      title: "Add Video Clip",
      icon: "➕",
      description: "Insert a new video clip at the specified timestamp",
    },
    replace: {
      title: "Replace Video Section",
      icon: "🔄",
      description: "Replace a section of the video with a new clip",
    },
    remove: {
      title: "Remove Video Section",
      icon: "🗑️",
      description: "Delete a section from the video",
    },
  }

  const config = typeConfig[editType]

  useEffect(() => {
    if (uploadedFile && videoRef.current) {
      videoRef.current.src = URL.createObjectURL(uploadedFile)
      videoRef.current.onloadedmetadata = () => {
        videoRef.current!.currentTime = 0
        setTimeout(() => {
          const canvas = document.createElement("canvas")
          canvas.width = videoRef.current!.videoWidth
          canvas.height = videoRef.current!.videoHeight
          canvas.getContext("2d")?.drawImage(videoRef.current!, 0, 0)
          setVideoThumbnail(canvas.toDataURL())
        }, 100)
      }
    }
  }, [uploadedFile])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h2 className="text-xl font-bold">{config.title}</h2>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {(editType === "add" || editType === "replace") && (
              <div>
                <label className="block text-sm font-medium mb-2">Upload Video Clip</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                  />
                  {uploadedFile && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Selected: {uploadedFile.name}</div>
                      {videoThumbnail && (
                        <button
                          onClick={() => setExpandedVideo(true)}
                          className="w-full group relative overflow-hidden rounded-lg border border-border/60 hover:border-primary/50 transition-all"
                        >
                          <div className="relative aspect-video bg-secondary/30 overflow-hidden">
                            <Image
                              src={videoThumbnail || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-2xl">🔍 Expand</span>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Start Timestamp (seconds)</label>
              <input
                type="number"
                value={startTimestamp}
                onChange={(e) => onStartTimestampChange(e.target.value)}
                placeholder="0"
                className="w-full border border-border rounded px-3 py-2 text-sm"
                step="0.1"
              />
            </div>

            {(editType === "replace" || editType === "remove") && (
              <div>
                <label className="block text-sm font-medium mb-2">End Timestamp (seconds)</label>
                <input
                  type="number"
                  value={endTimestamp}
                  onChange={(e) => onEndTimestampChange(e.target.value)}
                  placeholder="0"
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  step="0.1"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onApply}
              disabled={
                loading ||
                !startTimestamp ||
                ((editType === "replace" || editType === "remove") && !endTimestamp) ||
                ((editType === "add" || editType === "replace") && !uploadedFile)
              }
              className="flex-1"
            >
              {loading ? "Processing..." : "Apply Edit"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent" disabled={loading}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={expandedVideo} onOpenChange={setExpandedVideo}>
        <DialogContent className="max-w-4xl w-full">
          {uploadedFile && (
            <div className="w-full">
              <video
                src={URL.createObjectURL(uploadedFile)}
                controls
                autoPlay
                className="w-full aspect-video bg-black rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <video ref={videoRef} className="hidden" />
    </>
  )
}
