"use client"

import { useEffect, useState } from "react"
import { ProfileNavbar } from "./components/profile-navbar"
import { ProfileSidebar } from "./components/profile-sidebar"
import { MainContent } from "./components/main-content"
import { useUser } from "@/context/user-context"
import { MainNavbar } from "../navbar"

export default function DashboardPage() {

  const [activeTab, setActiveTab] = useState("overview")
  const [profile, setProfile] = useState({
    username: "",
    name: "",
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
          name: user?.name,
          username: user?.username,
          profileImage: `http://localhost:1234/api/v1/storage/images/avatar/${user?.avatar}`
        };
      });
    }
    fetchUser()
  }, [user, setUser])

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      {/* ---------------- NAVBAR ---------------- */}
      <MainNavbar />

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
    </div>
  )
}
