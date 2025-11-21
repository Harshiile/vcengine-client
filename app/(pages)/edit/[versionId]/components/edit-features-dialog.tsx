"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EditFeaturesDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectFeature: (type: "add" | "replace" | "remove") => void
}

export default function EditFeaturesDialog({ isOpen, onClose, onSelectFeature }: EditFeaturesDialogProps) {
  if (!isOpen) return null

  const features = [
    {
      type: "add" as const,
      title: "ADD",
      description: "Insert a new video clip at a specific timestamp",
      icon: "➕",
      color: "bg-green-50 dark:bg-green-950",
    },
    {
      type: "replace" as const,
      title: "REPLACE",
      description: "Replace a section of video with a new clip",
      icon: "🔄",
      color: "bg-blue-50 dark:bg-blue-950",
    },
    {
      type: "remove" as const,
      title: "REMOVE",
      description: "Delete a section from the video",
      icon: "🗑️",
      color: "bg-red-50 dark:bg-red-950",
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">Select Edit Feature</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {features.map((feature) => (
            <button
              key={feature.type}
              onClick={() => onSelectFeature(feature.type)}
              className={`p-4 rounded-lg border-2 border-transparent hover:border-primary transition-all text-left ${feature.color}`}
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </button>
          ))}
        </div>

        <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
          Cancel
        </Button>
      </Card>
    </div>
  )
}
