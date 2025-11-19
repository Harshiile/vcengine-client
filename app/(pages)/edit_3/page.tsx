import VideoEditor from "./components/video-editor"
import EditorNavbar from "./components/editor-navbar"

export default function Page() {
  return (
    <main className="relative min-h-dvh bg-background text-foreground overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-aurora" aria-hidden />
      <EditorNavbar />
      <div className="relative mx-auto w-full px-3 py-3 h-[calc(100dvh-56px)] overflow-hidden">
        <VideoEditor />
      </div>
    </main>
  )
}
