"use client"

import { Award, MapPin, LinkIcon, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditProfileDialog } from "./edit-profile-dialog"

interface ProfileSidebarProps {
  profileData: {
    username: string
    email: string
    description?: string
    website?: string
    profileImage?: string
  }
}

export function ProfileSidebar({ profileData }: ProfileSidebarProps) {

  const handleProfileSave = () => {
    // console.log("[v0] Profile updated:", updatedProfile)
  }


  return (
    <div className="w-full space-y-6 animate-float-up">
      {/* Profile Card */}
      <Card className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover-lift bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20 hover:ring-primary/40 transition-all duration-300">
              <AvatarImage src={profileData?.profileImage || "/developer-avatar.png"} alt="Profile" />
              <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                {profileData?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">{profileData?.username}</h2>
              <p className="text-muted-foreground">{profileData?.email}</p>
            </div>

            <EditProfileDialog initialData={profileData}>
              <Button
                variant="outline"
                className="w-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 bg-card border-primary/50 text-primary hover:border-primary hover-lift"
              >
                <span className="mr-2">✏️</span>
                Edit Profile
              </Button>
            </EditProfileDialog>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover-lift bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{profileData?.description}</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
              <LinkIcon className="w-4 h-4" />
              <span className="text-primary hover:underline cursor-pointer">{profileData?.website}</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
              <Calendar className="w-4 h-4" />
              <span>Joined March 2023</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div >
  )
}
