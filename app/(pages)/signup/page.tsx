"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import logo from '@/public/logo.svg'
import Image from "next/image"

type FormDataState = {
  name: string
  email: string
  username: string
  password: string
  confirmPassword: string
  selectedFile: File | null
}

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HardDrive, Layers, Cloud, Gauge, ArrowRight, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { User, useUser } from "@/context/user-context"
import { requestHandler } from "@/lib/requestHandler"
import { applyToast } from "@/lib/toast"

export default function Signup() {
  const { setUser } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
    selectedFile: null,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
    return file
  }

  const handleGoogleSignIn = async () => {
    // placeholder for real OAuth
    console.log("[v0] Google sign-in clicked")
  }

  const handleInputChange = (field: keyof FormDataState, value: File | string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)


    // Doing Validation
    if (formData.password != formData.confirmPassword) {
      applyToast('Error', 'Passwords Not Match')
      setIsLoading(false)
      return;
    }

    try {
      // Check for username uniqueness
      requestHandler({
        url: `/auth/username/uniqueness/${formData.username}`,
        method: 'GET',
        action: async ({ isUsernameExist }: { isUsernameExist: boolean }) => {
          // Username Exists
          if (isUsernameExist) {
            applyToast('Error', "Username already exists")
            setIsLoading(false)
            return;
          }

          let avatarKey: string | null = null

          if (formData.selectedFile) {
            setShowUploadDialog(true)
            setUploadProgress(0)
            avatarKey = await uploadAvatar()
            console.log(avatarKey);
            setShowUploadDialog(false)
          }


          requestHandler({
            url: "/auth/signup",
            method: "POST",
            body: {
              email: formData.email,
              username: formData.username,
              password: formData.confirmPassword,
              name: formData.name,
              ...(avatarKey && { avatar: avatarKey }),
            },
            action: ({ user }: { user: User }) => {
              setUser(user)
              applyToast('Success', "Signup Successfully !!")
              router.push('/dashboard')
            }
          })
            .finally(() => setIsLoading(false))
        }
      })
    } catch (error) {
      console.log(error);
      setIsLoading(false)
      setShowUploadDialog(false)
    }
  }

  const uploadAvatar = async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {

      await requestHandler({
        url: "/auth/signup/avatar",
        method: "POST",
        body: {
          contentType: formData.selectedFile?.type,
          type: "avatar",
        },
        action: async ({ uploadUrl, fileKey }: { uploadUrl: string, fileKey: string }) => {

          await axios.put(uploadUrl, formData.selectedFile, {
            headers: {
              "Content-Type": formData.selectedFile?.type,
            },
            onUploadProgress: (evt) => {
              if (!evt.total) return
              const percent = Math.round((evt.loaded / evt.total) * 100)
              setUploadProgress(percent)
            },
          })

          resolve(fileKey)
        }
      })
        .catch(reject)
        .finally(() => setIsLoading(false))
    })
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-24 -left-10 size-56 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-24 right-0 size-72 rounded-full bg-primary/5 blur-3xl animate-pulse" />
      </div>

      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Image unoptimized src={logo} alt="V'DURA" width={100} height={100} />
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              router.push("/login")
            }}
            className="relative group border-border hover:border-primary/50 bg-transparent hover:bg-transparent transition-all duration-300"
          >
            <span className="relative z-10 group-hover:text-primary transition-colors">Sign In</span>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></div>
          </Button>
        </div>
      </header>

      <section className="grid md:grid-cols-[1.2fr_1fr] gap-8 px-6 md:px-12 lg:px-20 pb-16">
        <div className="flex items-center">
          <div className="max-w-2xl space-y-6">
            <Badge className="bg-primary/10 text-primary border-primary/30">Video Versioning • Space Saving</Badge>

            <h1 className="text-4xl md:text-5xl font-bold text-balance leading-tight">
              Version every edit. Save space. <span className="text-primary">Ship faster.</span>
            </h1>

            <p className="text-lg text-muted-foreground text-pretty">
              CinemaStudio Versioning stores only the changes between edits using delta compression. Keep hundreds of
              revisions without blowing up your storage. Roll back instantly, branch experiments, and sync across
              devices with smart deduplication.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <FeatureCard icon={Layers} title="Delta Storage" desc="Save diffs, not duplicates" />
              <FeatureCard icon={HardDrive} title="80% Less Space" desc="Smart deduplication" />
              <FeatureCard icon={Cloud} title="Cloud Snapshots" desc="Branch & roll back" />
              <FeatureCard icon={Gauge} title="Instant Preview" desc="No re-exports needed" />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Card className="bg-card/80 backdrop-blur border-border/60 shadow-2xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl text-center">Start Versioning</CardTitle>
              <CardDescription className="text-center">
                Create your account to enable video diff storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="group w-full h-12 border-border hover:border-primary/60 bg-transparent hover:bg-primary/5 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                <div className="relative z-10 flex items-center gap-3">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium text-google-label">Continue with Google</span>
                </div>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Label htmlFor="avatar" className="text-sm text-muted-foreground">
                  Profile picture (optional)
                </Label>

                <label
                  htmlFor="avatar"
                  className="group relative avatar-glow rounded-full w-24 h-24 grid place-content-center bg-muted/20 border border-border/60 cursor-pointer overflow-hidden"
                  aria-label="Upload profile picture"
                >
                  <div className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute -inset-8 rounded-full bg-primary/10 blur-2xl animate-pulse" />
                  </div>

                  {avatarPreview ? (
                    <Image
                      unoptimized
                      src={avatarPreview || "/placeholder.svg"}
                      alt="Selected profile"
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors"
                        aria-hidden
                      >
                        <path
                          fill="currentColor"
                          d="M5 20h14a2 2 0 0 0 2-2v-7h-2v7H5V6h7V4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Zm7-3l5-5l-3.5-3.5l-5 5V17h3.5ZM14 7l3 3l-1 1l-3-3l1-1Z"
                        />
                      </svg>
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Upload
                      </span>
                    </div>
                  )}
                </label>

                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = handleAvatarChange(e)
                    if (file) handleInputChange("selectedFile", file)
                  }}
                  className="sr-only"
                />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-input border-border focus:border-primary transition-colors hover:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    User Name
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your user name"
                    value={formData.username}
                    onChange={(e) => {
                      handleInputChange("username", e.target.value)
                    }}
                    className="bg-input border-border focus:border-primary transition-colors hover:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-input border-border focus:border-primary transition-colors hover:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="bg-input border-border focus:border-primary transition-colors hover:border-primary/50 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Repeat Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="bg-input border-border focus:border-primary transition-colors hover:border-primary/50 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 group relative overflow-hidden"
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Start Creating
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

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
    </main>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="p-4 rounded-lg bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-card/80 transition-colors">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  )
}
