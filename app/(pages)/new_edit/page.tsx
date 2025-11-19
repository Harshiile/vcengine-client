"use client";

import { Player } from "@remotion/player";
import { useState } from "react";
import { MyVideoComposition } from "@/remotion/MyVideoComposition";

export default function VideoEditorPage() {
    const [videos, setVideos] = useState<string[]>([]); // array of video URLs

    // Add new video
    const handleAdd = (file: File) => {
        const url = URL.createObjectURL(file);
        setVideos((prev) => [...prev, url]);
    };

    // Replace existing video
    const handleReplace = (index: number, file: File) => {
        const url = URL.createObjectURL(file);
        setVideos((prev) => prev.map((v, i) => (i === index ? url : v)));
    };

    // Remove a video
    const handleRemove = (index: number) => {
        setVideos((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <h1 className="text-2xl font-bold">🎬 Video Editor</h1>

            <div className="flex gap-4">
                <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files && handleAdd(e.target.files[0])}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {videos.map((src, index) => (
                    <div key={index} className="border rounded-lg p-2 flex flex-col items-center">
                        <video src={src} className="w-40 h-24 object-cover" controls />
                        <div className="flex gap-2 mt-2">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => e.target.files && handleReplace(index, e.target.files[0])}
                            />
                            <button
                                onClick={() => handleRemove(index)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {videos.length > 0 && (
                <Player
                    component={MyVideoComposition}
                    inputProps={{ videos }}
                    durationInFrames={videos.length * 150} // example
                    compositionWidth={1280}
                    compositionHeight={720}
                    fps={30}
                    controls
                />
            )}
        </div>
    );
}
