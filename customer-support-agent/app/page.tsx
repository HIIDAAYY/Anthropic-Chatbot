"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import ChatArea from "@/components/ChatArea";
import config from "@/config";

const LeftSidebar = dynamic(() => import("@/components/LeftSidebar"), {
  ssr: false,
});
const RightSidebar = dynamic(() => import("@/components/RightSidebar"), {
  ssr: false,
});

export default function Home() {
  const searchParams = useSearchParams();

  // Get clinicId from URL parameter
  // Example: http://localhost:3000?clinicId=glow-clinic
  const clinicId = searchParams.get('clinicId') || null;

  // Log for debugging
  if (clinicId) {
    console.log(`🏥 Bot configured for clinic: ${clinicId}`);
  } else {
    console.log('⚠️  No clinicId specified - bot will respond to all clinics');
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden h-screen w-full">
        {config.includeLeftSidebar && <LeftSidebar />}
        <ChatArea clinicId={clinicId} />
        {config.includeRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
}
