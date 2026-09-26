"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ChatBox } from "@/components/ChatBox";
import { MotionItem, MotionStagger } from "@/components/Motion";

function ChatPageInner() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q") ?? undefined;

  return (
    <MotionStagger>
      <MotionItem>
        <AppNav />
      </MotionItem>
      <MotionItem>
        <header className="mb-8">
          <p className="eyebrow">House London #2</p>
          <h1 className="title-serif title-serif-lg text-4xl mt-2">Ask the data</h1>
          <p className="text-sm text-[var(--muted)] mt-3 max-w-md leading-relaxed">
            Freeform questions answered with live Foundations data via the Housing Intent Engine.
          </p>
        </header>
      </MotionItem>
      <MotionItem>
        <div className="flex-1 min-h-[70vh]">
          <ChatBox initialPrompt={initialPrompt} />
        </div>
      </MotionItem>
    </MotionStagger>
  );
}

export default function ChatPage() {
  return (
    <div className="app-shell min-h-screen px-6 pb-8 max-w-3xl mx-auto flex flex-col">
      <div className="app-grid-overlay" aria-hidden />
      <div className="app-vignette" aria-hidden />
      <div className="relative z-10">
        <Suspense fallback={<div className="text-sm text-[var(--muted)] p-8">Loading chat…</div>}>
          <ChatPageInner />
        </Suspense>
      </div>
    </div>
  );
}
