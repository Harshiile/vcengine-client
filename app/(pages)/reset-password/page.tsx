"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestHandler } from "@/lib/requestHandler"
import { applyToast } from "@/lib/toast"
import { Eye, EyeOff, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    try {
      setSubmitting(true)
      requestHandler({
        url: '/auth/password/reset',
        method: 'POST',
        body: {
          password,
          confirmPassword: confirm
        },
        action: ({ message }: { message: string }) => {
          applyToast("Success", message);
          router.push('/login')
        }
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-md bg-card/80 border-border/60 backdrop-blur shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6">
          <div className="flex flex-col items-center gap-3">
            <div className="size-16 rounded-xl bg-primary/10 border border-border/60 grid place-items-center">
              <Sparkles className="w-7 h-7 text-primary" aria-hidden />
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold tracking-tight text-foreground">v’dura</div>
              <p className="text-sm text-muted-foreground">Secure account access</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="mt-8 text-xl font-medium text-center text-balance">Reset your password</h1>

          {/* Form */}
          <div className="mt-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a new password"
                    className="bg-input border-border pr-10 focus:border-primary transition-colors"
                    aria-describedby={error ? "reset-error" : undefined}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    aria-pressed={showPwd}
                    onClick={() => setShowPwd((s) => !s)}
                  >
                    {showPwd ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">
                  Enter New Password Again
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="bg-input border-border pr-10 focus:border-primary transition-colors"
                    aria-describedby={error ? "reset-error" : undefined}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm((s) => !s)}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p id="reset-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
