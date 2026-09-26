"use client";

import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { MotionItem, MotionStagger } from "@/components/Motion";
import { PlanningMap } from "@/components/map/PlanningMap";

export default function MapPage() {
  return (
    <div id="main-content" className="app-shell min-h-screen px-4 lg:px-6 pb-8 max-w-[1600px] mx-auto">
      <div className="app-grid-overlay" aria-hidden />
      <div className="app-vignette" aria-hidden />
      <div className="relative z-10">
        <MotionStagger>
          <MotionItem>
            <AppNav />
          </MotionItem>
          <MotionItem>
            <header className="mb-6">
              <p className="eyebrow">Live MCP data</p>
              <h1 className="title-serif title-serif-lg text-4xl mt-2">Planning map</h1>
              <p className="text-sm text-[var(--muted)] mt-3 max-w-xl leading-relaxed">
                Explore London borough metrics and geocoded applications from Foundations.
                Filter by size, status, borough, or search a postcode for constraints.
              </p>
            </header>
          </MotionItem>
          <MotionItem>
            <Suspense
              fallback={
                <div className="panel p-8 text-sm text-[var(--muted)]">Loading map…</div>
              }
            >
              <PlanningMap />
            </Suspense>
          </MotionItem>
        </MotionStagger>
      </div>
    </div>
  );
}
