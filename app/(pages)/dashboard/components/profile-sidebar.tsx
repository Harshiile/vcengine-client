"use client"

import { LinkIcon, Calendar, Edit2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditProfileDialog } from "./edit-profile-dialog"
import { ProfileData } from "../page"

const formattedJoinDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function ProfileSidebar({ profileData }: { profileData: ProfileData }) {

  return (
    <div className="w-full space-y-6 animate-float-up">
      {/* Description */}
      <Card className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover-lift bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">About</CardTitle>

            {/* Edit Icon */}
            <EditProfileDialog initialData={profileData}>
              <button
                className="
            p-2 rounded-md border border-primary/40 
            hover:bg-primary/10 hover:border-primary 
            transition-all duration-200 
            group
          "
              >
                <Edit2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                {/* Tooltip */}
                <span
                  className="
              absolute mt-8 py-1 px-2 text-xs rounded 
              bg-primary text-primary-foreground 
              opacity-0 group-hover:opacity-100 
              transition-opacity"
                >
                  Edit Profile
                </span>
              </button>
            </EditProfileDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {
            profileData?.bio &&
            <p className="text-sm text-muted-foreground leading-relaxed">{profileData?.bio}</p>
          }
          <div className="space-y-2 text-sm">
            {
              profileData?.website &&
              <div className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
                <LinkIcon className="w-4 h-4" />
                <span className="text-primary hover:underline cursor-pointer">{profileData?.website}</span>
              </div>
            }
            <div className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
              <Calendar className="w-4 h-4" />
              <span>Joined {formattedJoinDate(profileData.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div >
  )
}
