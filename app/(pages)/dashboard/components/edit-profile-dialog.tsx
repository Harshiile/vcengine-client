"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload } from "lucide-react"
import { ProfileData } from "../page"
import { requestHandler } from "@/lib/requestHandler"
import axios from "axios"
import { Progress } from "@/components/ui/progress"
import { avatarUrl } from "@/lib/avatar"
import { applyToast } from "@/lib/toast"
import { useRouter } from "next/navigation"

interface EditProfileDialogProps {
  children: React.ReactNode
  initialData: ProfileData
}

export function EditProfileDialog({ children, initialData }: EditProfileDialogProps) {

  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    ...initialData,
    avatarFile: undefined as File | undefined
  })
  const [imagePreview, setImagePreview] = useState<string | undefined | File>(
    initialData.avatarUrl
      ? `http://localhost:1234/api/v1/storage/images/avatar/${initialData.avatarUrl}`
      : undefined
  )
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)

      setImagePreview(previewUrl)

      setFormData({
        ...formData,
        avatarUrl: undefined,
        avatarFile: file,
      })
    }
  }

  const handleCancel = () => {
    setFormData({
      ...initialData,
      avatarFile: undefined
    })
    setImagePreview(
      initialData.avatarUrl
        ? avatarUrl(initialData.avatarUrl)
        : undefined
    )
    setOpen(false)
  }


  const handleSubmit = async () => {

    let avatarFileKey = null;

    if (formData.avatarFile) {
      // Upload 
      await requestHandler({
        url: '/storage/signed-url',
        method: "POST",
        body: {
          type: "avatar",
          contentType: formData.avatarFile.type
        },
        action: async ({ uploadUrl, fileKey }: { uploadUrl: string, fileKey: string }) => {

          setUploadProgress(0)
          setShowUploadDialog(true)

          // Uploading
          await axios.put(uploadUrl, formData.avatarFile, {
            headers: {
              "Content-Type": formData.avatarFile?.type,
            },
            onUploadProgress: (evt) => {
              if (!evt.total) return
              const percent = Math.round((evt.loaded / evt.total) * 100)
              setUploadProgress(percent)
            },
          })

          setUploadProgress(100)
          setShowUploadDialog(false)
          avatarFileKey = fileKey
        }
      })
    }

    // Updaing Database
    await requestHandler({
      url: "/auth/users",
      method: "PUT",
      body: {
        name: formData.name,
        avatarUrl: avatarFileKey ? avatarFileKey : initialData.avatarUrl,
        bio: formData.bio,
        website: formData.website,
        location: formData.location
      },
      action: ({ message }: { message: string }) => {
        setOpen(false)
        applyToast("Success", message)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to your profile here. Click save when you are done.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={imagePreview} alt="Profile preview" className="object-contain" />
              <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                {formData.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-2">
              <Label
                htmlFor="profile-image"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Label>
              <Input id="profile-image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Bio
              </Label>
              <Textarea
                id="description"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary min-h-[100px] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-foreground">
                Website
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="yourwebsite.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground">
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="City, Country"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="bg-transparent border-border hover:bg-accent">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
          >
            Save Changes
          </Button>
        </DialogFooter>


        <Dialog open={showUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Uploading avatar</DialogTitle>
              <DialogDescription>Your image is being uploaded to secure storage.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Progress value={uploadProgress} />
              <div className="text-sm text-muted-foreground text-right">{uploadProgress}%</div>
            </div>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  )
}
