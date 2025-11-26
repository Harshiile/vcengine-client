"use client"

import type React from "react"
import { useState, useRef } from "react"
import axios from "axios"
import { ArrowRight, Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { requestHandler } from "@/lib/requestHandler"
import { useRouter } from "next/navigation"
import { applyToast } from "@/lib/toast"
import { MainNavbar } from "../navbar"
import Image from "next/image"

type UploadState = {
  workspace: string
  branch: string
  videoFile: File | null
  thumbnailFile: File | null
}

export default function VideoUploadPage() {
  const rotuer = useRouter()
  const [form, setForm] = useState<UploadState>({
    workspace: "",
    branch: "",
    videoFile: null,
    thumbnailFile: null,
  })

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null)
  const [thumbLoaded, setThumbLoaded] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showUploadDialogTitle, setShowUploadDialogTitle] = useState("Upload Video")
  const [step, setStep] = useState(1)
  const [isPrivate, setIsPrivate] = useState(true)

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)


  const handleInput = (key: keyof UploadState, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleInput("videoFile", file)
    setVideoPreviewUrl(URL.createObjectURL(file))
  }

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX_THUMB_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_THUMB_SIZE) {
      applyToast("Warning", "Max thumbnail size is 5 MB")
      e.currentTarget.value = ""
      handleInput("thumbnailFile", null)
      setThumbnailPreviewUrl(null)
      return
    }
    handleInput("thumbnailFile", file)
    setThumbLoaded(false)
    setThumbnailPreviewUrl(URL.createObjectURL(file))
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const uploadProcess = async () => {
    if (!form.videoFile) return
    setIsUploading(true)
    setUploadProgress(0)
    setShowUploadDialog(true)

    try {
      let bannerKey: string | undefined = undefined

      if (form.thumbnailFile) {
        setShowUploadDialogTitle("Upload Banner")
        setUploadProgress(0)

        await requestHandler({
          url: "/storage/signed-url",
          method: "POST",
          body: {
            contentType: form.thumbnailFile?.type,
            type: "banner",
          },
          action: async ({ uploadUrl, fileKey }: { uploadUrl: string, fileKey: string }) => {
            await axios.put(uploadUrl, form.thumbnailFile, {
              headers: { "Content-Type": form.thumbnailFile?.type },
              onUploadProgress: (evt) => {
                if (!evt.total) return
                const percent = Math.round((evt.loaded / evt.total) * 100)
                setUploadProgress(percent)
              },
            })
            bannerKey = fileKey
            setUploadProgress(100)
          }
        })
      }

      await requestHandler({
        url: "/workspaces",
        method: "POST",
        body: {
          name: form.workspace,
          branchName: form.branch,
          type: isPrivate ? "Private" : "Public",
          banner: bannerKey,
        },
        action: async ({ branchId, workspaceId }: { branchId: string, workspaceId: string }) => {
          setUploadProgress(0)
          setShowUploadDialogTitle("Upload Video")

          await requestHandler({
            url: "/videos/upload",
            method: "POST",
            body: {
              contentType: form.videoFile?.type,
              commitMessage: "init",
              workspace: workspaceId,
              branch: branchId,
            },
            action: async ({ uploadUrl }: { uploadUrl: string }) => {
              await axios.put(uploadUrl, form.videoFile, {
                headers: { "Content-Type": form.videoFile?.type },
                onUploadProgress: (evt) => {
                  const total = evt.total || form.videoFile?.size || 0
                  const loaded = evt.loaded || 0
                  const percent = total ? Math.round((loaded / total) * 100) : 0
                  setUploadProgress(percent)
                },
              })

              setUploadProgress(100)
              setShowUploadDialog(false)
              applyToast("Success", "Video Uploaded !!")
              rotuer.push("/dashboard")
            },
          })
        },
      })

      setIsUploading(false)
    } catch (error) {
      console.log(error)
      applyToast("Error", "Uploading Failed !!")
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      <MainNavbar />

      <main className="min-h-screen relative overflow-hidden grid items-start pt-12">

        {/* BIGGER CONTAINER */}
        <section className="px-8 md:px-16 lg:px-24 py-10">
          <div className="w-full max-w-7xl mx-auto">

            <Card className="bg-card/80 backdrop-blur border-border/60 shadow-2xl w-full p-12 md:p-16">
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-3xl">Upload Video</CardTitle>
                <CardDescription className="text-base">Step {step} of 3</CardDescription>

                {/* Steps */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-center justify-center gap-3">
                      <div
                        className={`size-7 rounded-full grid place-content-center text-sm border transition-colors ${step >= num
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border"
                          }`}
                      >
                        {num}
                      </div>
                      <span className={`text-sm ${step >= num ? "text-foreground" : "text-muted-foreground"}`}>
                        {num === 1 ? "Details" : num === 2 ? "Thumbnail" : "Video"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardHeader>

              <CardContent>

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-6">

                    {/* Wider form section */}
                    <div className="w-full md:w-[75%] lg:w-[70%] mx-auto space-y-6">

                      <div className="flex items-center justify-between rounded-lg bg-card/60 border border-border px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-base font-medium">Workspace Visibility</div>
                          <div className="text-sm text-muted-foreground">
                            {isPrivate ? "Private (only you can access)" : "Public (anyone with link can view)"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isPrivate ? "text-foreground" : "text-muted-foreground"}`}>
                            Public
                          </span>
                          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                          <span className={`text-sm ${!isPrivate ? "text-foreground" : "text-muted-foreground"}`}>
                            Private
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="workspace" className="text-sm font-medium">Workspace</Label>
                        <Input
                          id="workspace"
                          type="text"
                          placeholder="Enter your workspace name"
                          value={form.workspace}
                          onChange={(e) => handleInput("workspace", e.target.value)}
                          className="bg-input border-border focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="branch" className="text-sm font-medium">Branch</Label>
                        <Input
                          id="branch"
                          type="text"
                          placeholder="e.g. main or master"
                          value={form.branch}
                          onChange={(e) => handleInput("branch", e.target.value)}
                          className="bg-input border-border focus:border-primary"
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-border"
                        onClick={() => setStep(2)}
                        disabled={!form.workspace || !form.branch}
                      >
                        Next <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>

                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="space-y-6">

                    <div className="space-y-3">
                      {/* Hidden Input */}
                      <input
                        ref={thumbInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbSelect}
                        className="hidden"
                      />

                      {!thumbnailPreviewUrl ? (
                        // CLICK ENTIRE BOX TO OPEN FILE MANAGER
                        <div
                          onClick={() => thumbInputRef.current?.click()}
                          className="w-full h-48 rounded-lg border border-dashed border-border grid place-content-center cursor-pointer hover:border-primary/50"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <ImageIcon className="size-5 text-muted-foreground" />
                            <p className="text-sm">Click to upload thumbnail</p>
                            <p className="text-xs text-muted-foreground">Max 5 MB</p>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => thumbInputRef.current?.click()}
                          className="w-[70%] mx-auto rounded-lg overflow-hidden border border-border cursor-pointer"
                        >
                          <Image
                            unoptimized
                            src={thumbnailPreviewUrl}
                            width={1000}
                            height={600}
                            className="object-cover w-full h-auto"
                            onLoad={() => setThumbLoaded(true)}
                            alt="Thumbnail"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Button variant="outline" className="border-border" onClick={() => setStep(1)}>
                        Back
                      </Button>

                      <Button variant="outline" onClick={() => setStep(3)}>
                        Next <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>

                  </div>
                )}


                {/* STEP 3 */}
                {step === 3 && (
                  <div className="space-y-6">

                    <div className="space-y-4">
                      {/* Hidden Input */}
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className="hidden"
                      />

                      {videoPreviewUrl ? (
                        <div
                          onClick={() => videoInputRef.current?.click()}
                          className="border border-primary/40 rounded-lg overflow-hidden cursor-pointer"
                        >
                          <video
                            src={videoPreviewUrl}
                            controls
                            className="w-full max-h-[45vh] object-contain bg-background rounded-lg"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => videoInputRef.current?.click()}
                          className="w-full h-48 rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50"
                        >
                          <Upload className="size-5 text-muted-foreground" />
                          <p className="text-sm mt-2">Click to upload video</p>
                        </div>
                      )}


                      {form.videoFile && (
                        <div className="text-xs text-muted-foreground flex justify-between mt-1">
                          <span>{form.videoFile.name}</span>
                          <span>{formatFileSize(form.videoFile.size)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Button variant="outline" className="border-border" onClick={() => setStep(2)}>
                        Back
                      </Button>

                      <div className="flex gap-2">
                        {videoPreviewUrl && (
                          <Button variant="outline" onClick={() => videoInputRef.current?.click()}>
                            Replace
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={uploadProcess}
                        >
                          Upload
                        </Button>
                      </div>
                    </div>

                  </div>
                )}


              </CardContent>
            </Card>

          </div>
        </section>

        <Dialog open={showUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{showUploadDialogTitle}</DialogTitle>
              <DialogDescription>Your file is being uploaded...</DialogDescription>
            </DialogHeader>

            <Progress value={uploadProgress} />
            <div className="text-right text-sm text-muted-foreground">{uploadProgress}%</div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
