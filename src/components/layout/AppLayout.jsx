import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AudioPlayer from "../player/AudioPlayer";
import { PlayerProvider } from "../../context/PlayerContext";

export default function AppLayout() {
  return (
    <PlayerProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:ml-[72px] pt-14 lg:pt-0 pb-24">
          <Outlet />
        </main>
        <AudioPlayer />
      </div>
    </PlayerProvider>
  );
}