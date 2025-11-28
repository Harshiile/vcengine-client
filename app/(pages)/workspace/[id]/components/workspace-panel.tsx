"use client";

import { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import VersionsPanel from "./versions-panel";
import HLS from "hls.js";
import { WorkspaceVersion } from "./workspace-shell";
import { requestHandler } from "@/lib/requestHandler";

const ALL_RESOLUTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160];

export default function WorkspacePanel({
  activeVersion,
  setActiveVersion,
  versions,
}: {
  activeVersion: WorkspaceVersion | null;
  setActiveVersion: Dispatch<SetStateAction<WorkspaceVersion | null>>;
  versions: WorkspaceVersion[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HLS | null>(null);

  const [availableResolutions, setAvailableResolutions] = useState<number[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [resolutionsState, setResolutionsState] = useState<Record<number, string>>({});

  // Fetch max resolution
  useEffect(() => {
    if (!activeVersion) return;

    requestHandler({
      url: `/videos/${activeVersion.id}/max-resolution`,
      method: "GET",
      action: ({ maxResolution }: { maxResolution: number }) => {
        const avail = ALL_RESOLUTIONS.filter((r) => r <= maxResolution);
        setAvailableResolutions(avail);

        const defaultRes = avail.includes(360) ? 360 : avail[avail.length - 1];
        setSelectedResolution(defaultRes);
      },
    });
  }, [activeVersion]);

  // Check resolutions' processing state
  useEffect(() => {
    if (!activeVersion || availableResolutions.length === 0) return;

    let interval: NodeJS.Timeout | null = null;

    const pollStates = async () => {
      const states: Record<number, string> = {};

      await Promise.all(
        availableResolutions.map(async (res) => {
          await requestHandler({
            url: `/videos/${activeVersion.id}/state/${res}`,
            method: "GET",
            action: ({ state }: { state: string }) => {
              states[res] = state;
            },
          });
        })
      );

      setResolutionsState(states);

      const allDone = Object.values(states).every((s) => s === "Uploaded");
      if (allDone) {
        setIsVideoReady(true);
        if (interval) clearInterval(interval);
      }
    };

    pollStates();
    interval = setInterval(pollStates, 2000);

    return () => interval && clearInterval(interval);
  }, [activeVersion, availableResolutions]);

  // Load HLS video (simple)
  const loadHLS = (res: number) => {
    const video = videoRef.current;
    if (!video || !activeVersion) return;

    setLoading(true);

    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const playlistUrl = `http://localhost:1234/api/v1/videos/${activeVersion.id}/playlist/${res}`;

      // Safari native HLS
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playlistUrl;
        video.onloadeddata = () => setLoading(false);
      }
      // HLS.js fallback
      else if (HLS.isSupported()) {
        const hls = new HLS();
        hls.loadSource(playlistUrl);
        hls.attachMedia(video);

        hls.on(HLS.Events.MANIFEST_PARSED, () => setLoading(false));

        hlsRef.current = hls;
      }
    } catch (err) {
      console.error("HLS load error", err);
      setLoading(false);
    }
  };

  // Reload on resolution switch
  useEffect(() => {
    if (selectedResolution !== null) {
      loadHLS(selectedResolution);
    }
  }, [selectedResolution, isVideoReady, activeVersion]);

  // -------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[4fr_1fr] gap-4">
      {!isVideoReady ? (
        <ResolutionProcessingUI resolutionsState={resolutionsState} />
      ) : (
        <div className="relative rounded-xl border border-border/80 bg-black overflow-hidden aspect-video lg:aspect-[16/8.5]">
          {/* NATIVE VIDEO PLAYER */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay={false}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm">
              Loading…
            </div>
          )}

          {/* Quality Selector */}
          <div className="absolute top-4 right-4 z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-white bg-black/60 border-white/30">
                  {selectedResolution}p <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {availableResolutions.map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => {
                      setSelectedResolution(opt);
                      setLoading(true);
                    }}
                    className={opt === selectedResolution ? "bg-gray-200 text-black font-medium" : ""}
                  >
                    {opt}p
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <VersionsPanel
        versions={versions}
        activeVersion={activeVersion}
        setActiveVersion={setActiveVersion}
      />
    </div>
  );
}

// Processing UI
function ResolutionProcessingUI({
  resolutionsState,
}: {
  resolutionsState: Record<number, string>;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] w-full rounded-xl border border-border/60 bg-[#111]/60 p-10">
      <h2 className="text-xl text-white">Preparing Your Video</h2>
      <p className="text-gray-400 text-sm mb-6 text-center">
        We’re generating video resolutions. Please wait.
      </p>

      <div className="w-full max-w-md space-y-3">
        {Object.entries(resolutionsState)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([res, state]) => (
            <div
              key={res}
              className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border border-border/40 rounded-lg"
            >
              <span className="text-sm text-gray-200">{res}p</span>
              <span
                className={`text-xs ${state === "Uploaded" ? "text-green-500" : "text-yellow-500"
                  }`}
              >
                {state === "Uploaded" ? "Ready" : "Processing"}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
