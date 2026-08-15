import React from 'react';

/**
 * Universal Luxury Page Skeleton
 * Matches Appliqa's editorial warm aesthetic with subtle pulsating placeholders.
 */
export function PageSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-8 w-64 bg-neutral-200/80 rounded-xl" />
            <div className="h-4 w-96 max-w-full bg-neutral-200/50 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-neutral-200/80 rounded-xl" />
        </div>

        {/* Top Feature / Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
            <div className="h-5 w-36 bg-neutral-200/70 rounded-md" />
            <div className="h-3 w-48 bg-neutral-200/40 rounded" />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
            <div className="h-5 w-40 bg-neutral-200/70 rounded-md" />
            <div className="h-3 w-44 bg-neutral-200/40 rounded" />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
            <div className="h-5 w-32 bg-neutral-200/70 rounded-md" />
            <div className="h-3 w-52 bg-neutral-200/40 rounded" />
          </div>
        </div>

        {/* Main Content Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-neutral-200/80 space-y-6 shadow-xs min-h-[380px]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-200/80 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-1/2 bg-neutral-200/80 rounded-md" />
                <div className="h-3 w-1/3 bg-neutral-200/50 rounded" />
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-neutral-200/50 rounded w-full" />
              <div className="h-4 bg-neutral-200/50 rounded w-5/6" />
              <div className="h-4 bg-neutral-200/50 rounded w-4/6" />
            </div>
            <div className="pt-6 flex gap-3">
              <div className="h-10 w-36 bg-neutral-200/80 rounded-xl" />
              <div className="h-10 w-28 bg-neutral-200/50 rounded-xl" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-neutral-200/80 space-y-5 shadow-xs min-h-[380px]">
            <div className="h-6 w-44 bg-neutral-200/80 rounded-lg" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-neutral-200/60 flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-3/4 bg-neutral-200/80 rounded" />
                    <div className="h-2.5 w-1/2 bg-neutral-200/40 rounded" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-neutral-200/70" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Career Path Progression Skeleton
 */
export function CareerSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-neutral-200/80 rounded-xl" />
            <div className="h-4 w-96 bg-neutral-200/50 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-neutral-200/80 rounded-xl" />
        </div>

        {/* Current Baseline Card Skeleton */}
        <div className="bg-white rounded-xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-200/80 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 bg-neutral-200/60 rounded" />
              <div className="h-6 w-64 bg-neutral-200/90 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-7 w-24 bg-neutral-200/50 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Trajectory Steps Skeletons */}
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-neutral-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
                  <div className="space-y-1.5">
                    <div className="h-5 w-52 bg-neutral-200/80 rounded-md" />
                    <div className="h-3 w-36 bg-neutral-200/50 rounded" />
                  </div>
                </div>
                <div className="h-8 w-28 bg-neutral-200/70 rounded-full" />
              </div>
              <div className="space-y-2.5 pt-2">
                <div className="h-3.5 bg-neutral-200/50 rounded w-full" />
                <div className="h-3.5 bg-neutral-200/50 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
