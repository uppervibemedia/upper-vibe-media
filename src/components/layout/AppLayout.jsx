import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AudioPlayer from "../player/AudioPlayer";
import { PlayerProvider } from "../../context/PlayerContext";
import { usePlayer } from "../../context/PlayerContext";

function LayoutContent() {
  const { currentTrack } = usePlayer();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* pt-14 for mobile topbar, pb for mobile bottom nav + player */}
      <main className={`lg:ml-[72px] pt-14 lg:pt-0 ${currentTrack ? "pb-32 lg:pb-20" : "pb-16 lg:pb-0"} mb-safe`}>
        <Outlet />
      </main>
      <AudioPlayer />
    </div>
  );
}

export default function AppLayout() {
  return (
    <PlayerProvider>
      <LayoutContent />
    </PlayerProvider>
  );
}