"use client"

import { useEffect, useState } from "react"
import { ProfileNavbar } from "./components/profile-navbar"
import { ProfileSidebar } from "./components/profile-sidebar"
import { MainContent } from "./components/main-content"
import { useUser } from "@/context/user-context"
import { MainNavbar } from "../navbar"
import { requestHandler } from "@/lib/requestHandler"

export interface ProfileData {
  id: string,
  name: string,
  username: string,
  bio?: string,
  createdAt: string,
  location?: string,
  website?: string,
  avatarUrl?: string
}

function DashboardLoader() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#0C0C0C]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-700 border-t-white"></div>
    </div>
  )
}

export default function DashboardPage() {

  const [activeTab, setActiveTab] = useState("overview")
  const [profile, setProfile] = useState<ProfileData | null>(null)

  const { user, setUser } = useUser()

  useEffect(() => {
    const fetchUser = async () => {
      if (user?.id) {
        await requestHandler({
          url: `/auth/users/${user?.id}`,
          method: "GET",
          action: ({ user }: { user: ProfileData }) => {
            console.log(user);
            setProfile(user);
          }
        })
      }
    }
    fetchUser()
  }, [user, setUser])

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      <MainNavbar />

      {
        !profile ?
          <DashboardLoader />
          :
          <div className="min-h-screen bg-background premium-scrollbar relative">

            <ProfileNavbar activeTab={activeTab} onTabChange={setActiveTab} profileData={profile} />

            <div className="flex relative z-10">
              <div className="w-[30%] min-w-[320px] p-6 border-r border-border">
                <ProfileSidebar profileData={profile} />
              </div>

              <div className="w-[70%] premium-scrollbar">
                <MainContent activeTab={activeTab} />
              </div>
            </div>
          </div>
      }
    </div>
  )
}
