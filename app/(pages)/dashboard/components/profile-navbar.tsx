"use client"
import { Plus, FolderOpen, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ProfileData } from "../page"
import { avatarUrl } from "@/lib/avatar"

interface ProfileNavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  profileData: ProfileData
  onEditProfile?: () => void
}

export function ProfileNavbar({ activeTab, onTabChange, profileData, onEditProfile }: ProfileNavbarProps) {
  const router = useRouter()
  const tabs = [
    { id: "repositories", label: "Repositories", icon: FolderOpen },
  ]

  return (
    <div className="border-b border-border bg-card/30 backdrop-blur-sm relative z-10">
      <div className="px-6 py-4">
        {/* Profile Info */}
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300">
            <AvatarImage src={avatarUrl(profileData.avatarUrl!)} alt="Profile" />
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-foreground">
                {profileData?.name?.charAt(0)?.toUpperCase()}
                {profileData?.name?.slice(1)}
              </p>
              {onEditProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditProfile}
                  className="hover:bg-accent transition-colors bg-transparent"
                >
                  <Edit2 className="w-3 h-3 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
            <p className="text-md font-bold text-foreground/80">@{profileData?.username}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "secondary" : "ghost"}
                  className={cn(
                    "relative transition-all duration-500 hover:scale-105",
                    activeTab === tab.id && "bg-primary/10 text-primary hover:bg-primary/20",
                  )}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-slide-in-left" />
                  )}
                </Button>
              )
            })}
          </div>

          <Button className="bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all duration-300 animate-shimmer font-medium shadow-lg shadow-primary/25"

            onClick={() => router.push('/upload')}
          >
            <Plus className="w-4 h-4 mr-2 text-black" />
            New Workspace
          </Button>
        </div>
      </div>
    </div>
  )
}
