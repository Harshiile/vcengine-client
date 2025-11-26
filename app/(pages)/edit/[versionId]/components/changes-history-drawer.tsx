"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { ChangeRecord } from "../page"
import Image from "next/image"

interface ChangesHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  changes: ChangeRecord[]
  onUpdateChange: (id: number, updates: Partial<ChangeRecord>) => void
  onDeleteChange: (id: number) => void
  onUndo: () => void
  canUndo: boolean
}

export default function ChangesHistoryDrawer({
  isOpen,
  onClose,
  changes,
  onUpdateChange,
  onDeleteChange,
  onUndo,
  canUndo,
}: ChangesHistoryDrawerProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null)
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, string>>({})

  const handleSaveEdit = (id: number) => {
    const change = changes.find((c) => c.id === id)
    if (!change) return

    const updates: Partial<ChangeRecord> = {
      startTimestamp: Number.parseFloat(editStart),
      ...(editEnd && { endTimestamp: Number.parseFloat(editEnd) }),
      ...(editFile && { videoBFile: editFile, newSection: editFile.name }),
    }

    if (editFile) {
      setVideoThumbnails((prev) => {
        const newThumbnails = { ...prev }
        delete newThumbnails[id]
        return newThumbnails
      })
    }

    onUpdateChange(id, updates)
    setEditingId(null)
    setEditFile(null)
  }

  useEffect(() => {
    changes.forEach((change) => {
      if ((change.type === "add" || change.type === "replace") && change.videoBFile && !videoThumbnails[change.id]) {
        const videoRef = document.createElement("video")
        videoRef.src = URL.createObjectURL(change.videoBFile)
        videoRef.onloadedmetadata = () => {
          videoRef.currentTime = 0
          setTimeout(() => {
            const canvas = document.createElement("canvas")
            canvas.width = videoRef.videoWidth
            canvas.height = videoRef.videoHeight
            canvas.getContext("2d")?.drawImage(videoRef, 0, 0)
            setVideoThumbnails((prev) => ({ ...prev, [change.id]: canvas.toDataURL() }))
          }, 100)
        }
      }
    })
  }, [changes, videoThumbnails])

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-screen w-96 bg-card/95 backdrop-blur-xl border-l border-border/60 z-50 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Changes History</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-primary/10 text-foreground">
              ✕
            </Button>
          </div>

          {changes.length > 0 && (
            <Button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-full mb-4 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 font-medium"
            >
              ↶ Undo Last Change
            </Button>
          )}

          <div className="flex-1 overflow-y-auto">
            {changes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-3xl mb-2">📝</div>
                <p className="font-medium">No changes yet</p>
                <p className="text-sm mt-1">Your edits will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changes.map((change) => (
                  <Card
                    key={change.id}
                    className="p-4 bg-secondary/30 border-border/40 hover:border-primary/30 hover:bg-secondary/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {change.type === "add" ? "➕ ADD" : change.type === "replace" ? "🔄 REPLACE" : "🗑️ REMOVE"}
                        </div>
                        {change.fileName && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">{change.fileName}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteChange(change.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
                      >
                        ✕
                      </Button>
                    </div>

                    {(change.type === "add" || change.type === "replace") && videoThumbnails[change.id] && (
                      <button
                        onClick={() => setExpandedVideo(change.id)}
                        className="w-full group relative overflow-hidden rounded-lg border border-border/60 hover:border-primary/50 transition-all mb-3"
                      >
                        <div className="relative aspect-video bg-secondary/30 overflow-hidden">
                          <Image
                            unoptimized
                            src={videoThumbnails[change.id] || "/placeholder.svg"}
                            alt="Video"
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-lg">🔍 Expand</span>
                          </div>
                        </div>
                      </button>
                    )}

                    {editingId === change.id ? (
                      <div className="space-y-2 mb-3">
                        {(change.type === "add" || change.type === "replace") && (
                          <div>
                            <label className="text-xs font-medium block mb-1 text-foreground">
                              Re-upload Video (optional)
                            </label>
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                              className="w-full border border-border/60 rounded px-2 py-1 text-xs"
                            />
                            {editFile && <div className="text-xs text-muted-foreground mt-1">New: {editFile.name}</div>}
                          </div>
                        )}

                        <input
                          type="number"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          placeholder="Start (sec)"
                          className="w-full bg-input border border-border/60 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                          step="0.1"
                        />
                        {(change.type === "replace" || change.type === "remove") && (
                          <input
                            type="number"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                            placeholder="End (sec)"
                            className="w-full bg-input border border-border/60 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                            step="0.1"
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(change.id)}
                            className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null)
                              setEditFile(null)
                            }}
                            className="flex-1 h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mb-3">
                        {change.startTimestamp}s{change.endTimestamp ? ` → ${change.endTimestamp}s` : ""}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(change.id)
                          setEditStart(String(change.startTimestamp))
                          setEditEnd(String(change.endTimestamp ?? ""))
                          setEditFile(null)
                        }}
                        className="flex-1 h-8 text-xs border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        Edit
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">{change.createdAt}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={expandedVideo !== null} onOpenChange={() => setExpandedVideo(null)}>
        <DialogContent className="max-w-4xl w-full">
          {expandedVideo !== null && changes.find((c) => c.id === expandedVideo)?.videoBFile && (
            <div className="w-full">
              <video
                src={URL.createObjectURL(changes.find((c) => c.id === expandedVideo)?.videoBFile || new File([], ""))}
                controls
                autoPlay
                className="w-full aspect-video bg-black rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
