"use client"

import { useEffect, useRef, useState } from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { Button } from "@/components/ui/button"
import VideoPlayerDrawer from "./components/video-player-drawer"
import ChangesHistoryDrawer from "./components/changes-history-drawer"
import EditFeaturesDialog from "./components/edit-features-dialog"
import EditDialog from "./components/edit-dialog"
import { useParams, useRouter } from "next/navigation"
import { requestHandler } from "@/lib/requestHandler"
import { validate } from 'uuid'
import OopsError from "@/components/OopsError"
import { MainNavbar } from "../../navbar"
import { Dialog } from "@radix-ui/react-dialog"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import axios from "axios"
import { applyToast } from "@/lib/toast"

export type ChangeRecord = {
  id: number
  type: "add" | "replace" | "remove"
  startTimestamp: number
  endTimestamp?: number
  newSection?: string
  fileName?: string
  videoBFile?: File
  createdAt: string
  clipIndex: number
}

export type EditState = {
  type: "add" | "replace" | "remove" | null
  startTimestamp: string
  endTimestamp: string
  uploadedFile: File | null
}

export default function VideoEditor() {
  const { versionId } = useParams<{ versionId: string }>()
  const ffmpeg = useRef(new FFmpeg())
  const nextId = useRef(1)
  const router = useRouter()

  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [invalidUUID, setInvalidUUID] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false)
  const [showUploadDialogTitle, setShowUploadDialogTitle] = useState("")

  const [selectedVideo, setSelectedVideo] = useState<"original" | "edited">("original")
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false)
  const [editState, setEditState] = useState<EditState>({
    type: null,
    startTimestamp: "0",
    endTimestamp: "0",
    uploadedFile: null,
  })

  const [changes, setChanges] = useState<ChangeRecord[]>([])
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [fileHistory, setFileHistory] = useState<Array<{ file: File; url: string }>>([])

  // -------------------------
  // HLS -> TS downloader
  // -------------------------
  async function downloadSegmentUrls(playlistUrl: string) {
    console.log("Fetching playlist:", playlistUrl)

    // 1. Fetch the playlist.m3u8 only ONCE
    const res = await fetch(playlistUrl)
    if (!res.ok) throw new Error(`Failed to fetch playlist: ${res.status}`)
    const text = await res.text()

    // 2. Extract all `.ts` or `.m4s` URLs (resolve relative URLs)
    const lines = text.split("\n")
    const segmentUrls: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.endsWith(".ts") || trimmed.endsWith(".m4s")) {
        const resolved = new URL(trimmed, playlistUrl).href
        segmentUrls.push(resolved)
      }
    }

    console.log("Total segments found:", segmentUrls.length)

    if (segmentUrls.length === 0) throw new Error("No segments found in playlist")

    // 3. Download each segment (one time)
    const segmentBlobs: Blob[] = []

    for (let i = 0; i < segmentUrls.length; i++) {
      const url = segmentUrls[i]
      console.log(`Downloading segment ${i + 1}/${segmentUrls.length}`, url)

      const segmentRes = await fetch(url)
      if (!segmentRes.ok) throw new Error(`Failed to fetch segment ${url}`)
      const arrayBuffer = await segmentRes.arrayBuffer()

      // push as TS chunk (mpeg2 transport stream) — type used for clarity
      segmentBlobs.push(new Blob([arrayBuffer], { type: "video/mp2t" }))

      // update progress (download stage)
      setProgress(Math.round(((i + 1) / segmentUrls.length) * 100))
    }

    console.log("All segments downloaded:", segmentBlobs.length)

    // 4. Combine into one TS blob
    const tsBlob = new Blob(segmentBlobs, { type: "video/mp2t" })

    // 5. Convert to File
    const tsFile = new File([tsBlob], "input.ts", { type: "video/mp2t" })

    return tsFile // You will give this to FFmpeg next
  }

  // -------------------------
  // Load FFmpeg (we keep simple ensure helper)
  // -------------------------
  const ensureFF = async () => {
    // ffmpeg ref created at top, just load if not loaded
    try {
      if (!ffmpeg.current.loaded) {
        await ffmpeg.current.load()
        console.log("FFmpeg loaded")
      }
    } catch (err) {
      console.error("Error loading FFmpeg:", err)
      throw err
    }
  }

  const writeFileToFF = async (name: string, file: File) => {
    await ffmpeg.current.writeFile(name, await fetchFile(file))
  }

  const readURLFromFF = async (name: string) => {
    const data = await ffmpeg.current.readFile(name)
    const fixed = new Uint8Array(data as Uint8Array)
    const url = URL.createObjectURL(new Blob([fixed], { type: "video/mp4" }))
    return url
  }

  // -------------------------
  // On mount: download playlist, segments, remux -> mp4
  // -------------------------
  useEffect(() => {
    let cancelled = false

    const loadAndRemux = async () => {

      if (!validate(versionId)) {
        setInvalidUUID(true)
        return
      }
      await requestHandler({
        method: "GET",
        url: `/videos/${versionId}/max-resolution`,
        action: async ({ maxResolution }: { maxResolution: number }) => {
          const playlistUrl =
            `http://localhost:1234/api/v1/videos/${versionId}/playlist/${maxResolution}`

          setIsLoading(true)
          setProgress(0)

          try {
            // 1) download all segments into a single TS File
            const tsFile = await downloadSegmentUrls(playlistUrl)

            if (cancelled) return

            // 2) ensure ffmpeg ready
            await ensureFF()

            // show ffmpeg remux progress
            ffmpeg.current.on("progress", ({ progress }) => {
              // ratio comes as 0..1, mix with previous download progress to reflect activity
              // here we just map ratio -> 0..100 during remux step
              setProgress(Math.round(progress * 100))
            })

            // 3) write TS into ffmpeg FS
            await writeFileToFF("input.ts", tsFile)

            // 4) remux into MP4 (no re-encode) — fast
            await ffmpeg.current.exec(["-i", "input.ts", "-c", "copy", "output.mp4"])

            // 5) read output
            const data = await ffmpeg.current.readFile("output.mp4")
            const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" })
            const mp4File = new File([mp4Blob], "video.mp4", { type: "video/mp4" })

            if (cancelled) return

            const url = URL.createObjectURL(mp4File)

            // set into state
            setOriginalFile(mp4File)
            setCurrentFile(mp4File)
            setOriginalUrl(url)
            setCurrentUrl(url)
            setSelectedVideo("original")

            // put into history
            setFileHistory([{ file: mp4File, url }])
          } catch (err) {
            console.error("Failed to load and remux HLS:", err)
          } finally {
            if (!cancelled) {
              setIsLoading(false)
              setProgress(0)
            }
          }
        }
      })
    }

    loadAndRemux()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUndo = () => {
    if (fileHistory.length === 0) {
      alert("Nothing to undo!")
      return
    }

    const newChanges = changes.slice(0, -1)
    setChanges(newChanges)

    if (newChanges.length === 0) {
      setCurrentFile(originalFile)
      setCurrentUrl(originalUrl)
      setSelectedVideo("original")
      setFileHistory([])
    } else {
      const previousState = fileHistory[fileHistory.length - 2]
      if (previousState) {
        setCurrentFile(previousState.file)
        setCurrentUrl(previousState.url)
        setSelectedVideo("edited")
        setFileHistory(fileHistory.slice(0, -1))
      }
    }
  }

  const applyEdit = async (editType: "add" | "replace" | "remove") => {
    if (!currentFile) {
      alert("Please upload original video first.")
      return
    }

    const start = Number.parseFloat(editState.startTimestamp) || 0
    const end = editType === "add" ? start : Number.parseFloat(editState.endTimestamp) || start

    if (editType !== "remove" && !editState.uploadedFile) {
      alert("Please upload a video file.")
      return
    }

    setLoading(true)
    await ensureFF()
    ffmpeg.current.on("progress", ({ progress }) => {
      setProgress(Math.round(progress * 100))
    })

    const F = ffmpeg.current

    try {
      await writeFileToFF("input.mp4", currentFile)

      const safeStart = Math.max(0, Math.min(start, end))
      const safeEnd = Math.max(safeStart, end)

      if (editType === "replace") {
        if (!editState.uploadedFile) throw new Error("No file uploaded")
        await writeFileToFF("b.mp4", editState.uploadedFile)

        await F.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "a1.mp4"])
        await F.exec(["-i", "input.mp4", "-ss", String(safeEnd), "-c", "copy", "a2.mp4"])

        const list = `file a1.mp4\nfile b.mp4\nfile a2.mp4`
        await F.writeFile("list.txt", list)
        await F.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
      } else if (editType === "add") {
        if (!editState.uploadedFile) throw new Error("No file uploaded")
        await writeFileToFF("b.mp4", editState.uploadedFile)

        await F.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "p1.mp4"])
        await F.exec(["-i", "input.mp4", "-ss", String(safeStart), "-c", "copy", "p2.mp4"])

        const list = `file p1.mp4\nfile b.mp4\nfile p2.mp4`
        await F.writeFile("list.txt", list)
        await F.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
      } else {
        await F.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "r1.mp4"])
        await F.exec(["-i", "input.mp4", "-ss", String(safeEnd), "-c", "copy", "r2.mp4"])

        const list = `file r1.mp4\nfile r2.mp4`
        await F.writeFile("list.txt", list)
        await F.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
      }

      const url = await readURLFromFF("out.mp4")
      const blob = await (await fetch(url)).blob()
      const newFile = new File([blob], "edited.mp4", { type: "video/mp4" })

      setCurrentFile(newFile)
      setCurrentUrl(URL.createObjectURL(newFile))
      setSelectedVideo("edited")

      setFileHistory((prev) => [...prev, { file: newFile, url: URL.createObjectURL(newFile) }])

      const record: ChangeRecord = {
        id: nextId.current++,
        clipIndex: changes.length + 1,
        type: editType,
        startTimestamp: start,
        endTimestamp: editType === "add" ? undefined : end,
        fileName: editState.uploadedFile?.name,
        videoBFile: editState.uploadedFile ? editState.uploadedFile : undefined,
        newSection: editState.uploadedFile?.name,
        createdAt: new Date().toLocaleString(),
      }

      setChanges((prev) => [...prev, record])

      setEditState({
        type: null,
        startTimestamp: "0",
        endTimestamp: "0",
        uploadedFile: null,
      })
      setShowFeaturesDialog(false)
    } catch (err) {
      console.error(err)
      alert("Processing failed. See console.")
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const updateChange = async (id: number, updates: Partial<ChangeRecord>) => {
    const updatedChanges = changes.map((c) => (c.id === id ? { ...c, ...updates } : c))
    setChanges(updatedChanges)

    if (updates.videoBFile || updates.startTimestamp !== undefined || updates.endTimestamp !== undefined) {
      setLoading(true)
      await ensureFF()

      try {
        let workingFile = originalFile
        let workingUrl = originalUrl

        for (const change of updatedChanges) {
          await writeFileToFF("input.mp4", workingFile!)

          const safeStart = Math.max(0, Math.min(change.startTimestamp, change.endTimestamp ?? change.startTimestamp))
          const safeEnd = Math.max(safeStart, change.endTimestamp ?? change.startTimestamp)

          if (change.type === "replace") {
            if (!change.videoBFile) continue
            await writeFileToFF("b.mp4", change.videoBFile)

            await ffmpeg.current.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "a1.mp4"])
            await ffmpeg.current.exec(["-i", "input.mp4", "-ss", String(safeEnd), "-c", "copy", "a2.mp4"])

            const list = `file a1.mp4\nfile b.mp4\nfile a2.mp4`
            await ffmpeg.current.writeFile("list.txt", list)
            await ffmpeg.current.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
          } else if (change.type === "add") {
            if (!change.videoBFile) continue
            await writeFileToFF("b.mp4", change.videoBFile)

            await ffmpeg.current.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "p1.mp4"])
            await ffmpeg.current.exec(["-i", "input.mp4", "-ss", String(safeStart), "-c", "copy", "p2.mp4"])

            const list = `file p1.mp4\nfile b.mp4\nfile p2.mp4`
            await ffmpeg.current.writeFile("list.txt", list)
            await ffmpeg.current.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
          } else {
            await ffmpeg.current.exec(["-i", "input.mp4", "-t", String(safeStart), "-c", "copy", "r1.mp4"])
            await ffmpeg.current.exec(["-i", "input.mp4", "-ss", String(safeEnd), "-c", "copy", "r2.mp4"])

            const list = `file r1.mp4\nfile r2.mp4`
            await ffmpeg.current.writeFile("list.txt", list)
            await ffmpeg.current.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"])
          }

          const url = await readURLFromFF("out.mp4")
          const blob = await (await fetch(url)).blob()
          workingFile = new File([blob], "edited.mp4", { type: "video/mp4" })
          workingUrl = URL.createObjectURL(workingFile)
        }

        setCurrentFile(workingFile)
        setCurrentUrl(workingUrl)
        setSelectedVideo("edited")
        setFileHistory((prev) => [...prev, { file: workingFile!, url: workingUrl }])
      } catch (err) {
        console.error(err)
        alert("Reprocessing failed. See console.")
      } finally {
        setLoading(false)
        setProgress(0)
      }
    }
  }

  const deleteChange = (id: number) => {
    setChanges((prev) => prev.filter((c) => c.id !== id))
  }

  const displayUrl = selectedVideo === "original" ? originalUrl : currentUrl

  const handleSubmitFinal = async () => {

    // 1. Upload all clips
    for (const c of changes) {
      if (c.type != "remove") {
        // Upload File
        await requestHandler({
          url: '/storage/signed-url',
          method: "POST",
          body: {
            type: "clip",
            contentType: c.videoBFile?.type
          },
          action: async ({ uploadUrl }: { uploadUrl: string }) => {
            setUploadProgress(0) // ensure it reaches 100%
            setShowUploadDialog(true)
            setShowUploadDialogTitle(`Uploading Clip #${c.clipIndex}`);

            // Uploading
            await axios.put(uploadUrl, c.videoBFile, {
              headers: { "Content-Type": c.videoBFile?.type },
              onUploadProgress: (evt) => {
                if (!evt.total) return
                const percent = Math.round((evt.loaded / evt.total) * 100)
                setUploadProgress(percent)
              },
            }).catch(() => {
              throw new Error()
            })
            setUploadProgress(100) // ensure it reaches 100%
            setShowUploadDialog(false)
          }
        })
      }
    }

    applyToast("Success", "Video is sent for processing")
    router.push("/dashboard")
  }

  return <>
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      {/* ---------------- NAVBAR ---------------- */}
      <MainNavbar />

      <>
        {
          invalidUUID && (
            <OopsError
              title="Invalid Version ID"
              message="The version ID provided is incorrect. Please verify and try again."
            />
          )
        }

        <div className="w-screen h-screen bg-[#0C0C0C] text-white flex flex-col items-center justify-center overflow-hidden relative">

          <Dialog open={showUploadDialog} >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{showUploadDialogTitle}</DialogTitle>
                <DialogDescription>Your file is being uploaded to secure storage.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Progress value={uploadProgress} />
                <div className="text-sm text-muted-foreground text-right">{uploadProgress}%</div>
              </div>
            </DialogContent>
          </Dialog >

          {/* LOADING OVERLAY */}
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
              <div className="animate-spin h-14 w-14 border-4 border-white border-t-transparent rounded-full" />
              <p className="mt-4 text-sm opacity-60">Processing video...</p>

              {progress > 0 && (
                <div className="w-64 mt-6">
                  <p className="text-xs opacity-60 text-center mb-1">{progress}%</p>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OUTER WRAPPER */}
          <div className="w-[92vw] max-w-6xl">

            {/* VIDEO PLAYER */}

            <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
              {displayUrl ? (
                <video
                  src={displayUrl}
                  controls
                  className="w-full h-full object-cover rounded-2xl"
                  controlsList="nodownload"
                />
              ) : (
                <div className="flex w-full h-full items-center justify-center text-white/60">
                  <p>No video loaded</p>
                </div>
              )}
            </div>

            {/* BUTTONS */}
            {
              currentFile &&
              <div className="flex gap-4 mt-8 w-full">

                <Button
                  onClick={() => setLeftDrawerOpen(true)}
                  className="flex-1 h-14 rounded-xl bg-white border border-white/10 transition hover:cursor-pointer"
                >
                  Change Video
                </Button>

                <Button
                  onClick={() => setShowFeaturesDialog(true)}
                  className="flex-1 h-14 rounded-xl bg-white border border-white/10 transition hover:cursor-pointer"
                >
                  ✎ Edit Video
                </Button>

                <Button
                  onClick={() => setRightDrawerOpen(true)}
                  className="flex-1 h-14 rounded-xl bg-white border border-white/10 transition hover:cursor-pointer"
                >
                  Show Changes ({changes.length})
                </Button>

                <Button
                  onClick={handleSubmitFinal}
                  className="flex-1 h-14 rounded-xl bg-white border border-white/10 transition hover:cursor-pointer"
                >
                  Submit
                </Button>

              </div>
            }
          </div>

          {/* DRAWERS */}
          <VideoPlayerDrawer
            isOpen={leftDrawerOpen}
            onClose={() => setLeftDrawerOpen(false)}
            originalFile={originalFile}
            currentFile={currentFile}
            selectedVideo={selectedVideo}
            onSelectVideo={setSelectedVideo}
          />

          <ChangesHistoryDrawer
            isOpen={rightDrawerOpen}
            onClose={() => setRightDrawerOpen(false)}
            changes={changes}
            onUpdateChange={updateChange}
            onDeleteChange={deleteChange}
            onUndo={handleUndo}
            canUndo={changes.length > 0}
          />

          {showFeaturesDialog && (
            <EditFeaturesDialog
              isOpen
              onClose={() => setShowFeaturesDialog(false)}
              onSelectFeature={(type) => {
                setEditState((prev) => ({ ...prev, type }))
                setShowFeaturesDialog(false)
              }}
            />
          )}

          {editState.type && (
            <EditDialog
              isOpen
              onClose={() =>
                setEditState({
                  type: null,
                  startTimestamp: "0",
                  endTimestamp: "0",
                  uploadedFile: null,
                })
              }
              editType={editState.type}
              startTimestamp={editState.startTimestamp}
              endTimestamp={editState.endTimestamp}
              uploadedFile={editState.uploadedFile}
              onStartTimestampChange={(v) => setEditState((p) => ({ ...p, startTimestamp: v }))}
              onEndTimestampChange={(v) => setEditState((p) => ({ ...p, endTimestamp: v }))}
              onFileChange={(f) => setEditState((p) => ({ ...p, uploadedFile: f }))}
              onApply={() => applyEdit(editState.type!)}
              loading={loading}
            />
          )}
        </div>
      </>
    </div>
  </>

}
