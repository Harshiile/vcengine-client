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

interface EditProfileDialogProps {
  children: React.ReactNode
  initialData: {
    username: string
    email: string
    description?: string
    website?: string
    profileImage?: string
  }
}

export function EditProfileDialog({ children, initialData }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState(initialData)
  const [imagePreview, setImagePreview] = useState(initialData.profileImage)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setFormData({ ...formData, profileImage: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCancel = () => {
    setFormData(initialData)
    setImagePreview(initialData.profileImage)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={imagePreview || "/placeholder.svg"} alt="Profile preview" />
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
              <Label htmlFor="username" className="text-foreground">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Bio
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {/* <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="City, Country"
              /> */}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="bg-transparent border-border hover:bg-accent">
            Cancel
          </Button>
          <Button
            onClick={() => { }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
