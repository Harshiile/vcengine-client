"use client"

import { useEffect, useState } from "react"
import { ProfileNavbar } from "./components/profile-navbar"
import { ProfileSidebar } from "./components/profile-sidebar"
import { MainContent } from "./components/main-content"
import { useUser } from "@/context/user-context"

export default function DashboardPage() {

  const [activeTab, setActiveTab] = useState("overview")
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    description: "",
    website: "",
    location: "",
    profileImage: "",
  })

  const { user, setUser } = useUser()

  useEffect(() => {
    const fetchUser = async () => {
      setProfile(prev => {
        return {
          ...prev,
          username: user?.username,
          profileImage: `http://localhost:1234/api/v1/storage/images/avatar/${user?.avatar}`
        };
      });
    }
    fetchUser()
  }, [user, setUser])

  // if (!user) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <div className="flex flex-col items-center gap-3 text-gray-300">
  //         <div className="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  //         <div className="text-sm">Loading your dashboard...</div>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-background premium-scrollbar relative">

      {/* Profile Navigation */}
      <ProfileNavbar activeTab={activeTab} onTabChange={setActiveTab} profileData={profile} />

      {/* Main Content Area */}
      <div className="flex relative z-10">
        {/* Profile Sidebar - 30% width */}
        <div className="w-[30%] min-w-[320px] p-6 border-r border-border">
          <ProfileSidebar profileData={profile} />
        </div>

        {/* Main Content - 70% width */}
        <div className="w-[70%] premium-scrollbar">
          <MainContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  )
}
