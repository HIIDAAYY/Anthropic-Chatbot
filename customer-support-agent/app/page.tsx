"use client";

import React, { Suspense } from "react";
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

function ChatWrapper() {
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

  return <ChatArea clinicId={clinicId} />;
}

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden h-screen w-full">
        {config.includeLeftSidebar && <LeftSidebar />}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
          <ChatWrapper />
        </Suspense>
        {config.includeRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
}
