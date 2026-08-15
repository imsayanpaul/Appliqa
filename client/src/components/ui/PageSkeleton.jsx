import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route-Specific Pixel-Accurate Skeletons
 * Matches the exact DOM geometry, spacing, and styling of each respective page.
 */

// 1. 🧭 Career Path & Trajectory Skeleton (/career)
export function CareerSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-neutral-200/80 rounded-xl" />
            <div className="h-4 w-96 max-w-full bg-neutral-200/50 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-neutral-200/80 rounded-xl" />
        </div>

        {/* Current Position Baseline Card */}
        <div className="bg-white rounded-xl p-6 sm:p-7 border border-[#D8D4CC] shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-200/80 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-36 bg-neutral-200/60 rounded" />
              <div className="h-6 w-64 bg-neutral-200/90 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-7 w-24 bg-neutral-200/50 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Trajectory Sequential Promotion Ladder */}
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-[#D8D4CC] shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-neutral-200/80 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-5 w-56 bg-neutral-200/80 rounded-md" />
                    <div className="h-3.5 w-36 bg-neutral-200/50 rounded" />
                  </div>
                </div>
                <div className="h-8 w-28 bg-neutral-200/70 rounded-full" />
              </div>
              <div className="space-y-2.5 pt-2">
                <div className="h-3.5 bg-neutral-200/50 rounded w-full" />
                <div className="h-3.5 bg-neutral-200/50 rounded w-5/6" />
                <div className="h-3.5 bg-neutral-200/50 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 2. 📝 Visual Resume Creator Skeleton (/resume-creator)
export function ResumeCreatorSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-64px)]">
        {/* Left Form Editor Panel */}
        <div className="lg:col-span-6 bg-white border-r border-[#D8D4CC] p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex items-center justify-end gap-2 pb-4 border-b border-[#D8D4CC]/60">
              <div className="h-8 w-28 bg-neutral-200/70 rounded-md" />
              <div className="h-8 w-28 bg-neutral-200/70 rounded-md" />
              <div className="h-8 w-28 bg-neutral-200/90 rounded-md" />
            </div>

            {/* Horizontal Tabs */}
            <div className="flex items-center gap-2 overflow-x-hidden pb-2 border-b border-[#D8D4CC]/40">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="h-7 w-20 bg-neutral-200/60 rounded-md shrink-0" />
              ))}
            </div>

            {/* Form Fields Grid */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-neutral-200/60 rounded" />
                  <div className="h-10 bg-neutral-200/40 rounded-lg border border-[#D8D4CC]/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-neutral-200/60 rounded" />
                  <div className="h-10 bg-neutral-200/40 rounded-lg border border-[#D8D4CC]/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-neutral-200/60 rounded" />
                  <div className="h-10 bg-neutral-200/40 rounded-lg border border-[#D8D4CC]/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-neutral-200/60 rounded" />
                  <div className="h-10 bg-neutral-200/40 rounded-lg border border-[#D8D4CC]/40" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-32 bg-neutral-200/60 rounded" />
                <div className="h-28 bg-neutral-200/30 rounded-lg border border-[#D8D4CC]/40" />
              </div>
            </div>
          </div>

          <div className="h-11 w-full bg-neutral-200/80 rounded-xl mt-6" />
        </div>

        {/* Right Live A4 Resume Preview Panel */}
        <div className="hidden lg:flex lg:col-span-6 bg-[#EBE7DF] p-8 flex-col items-center justify-start space-y-4 overflow-hidden">
          {/* Top Preview Controls */}
          <div className="w-full max-w-[560px] flex items-center justify-between">
            <div className="flex gap-2">
              <div className="h-7 w-16 bg-neutral-300/80 rounded-md" />
              <div className="h-7 w-16 bg-neutral-300/60 rounded-md" />
              <div className="h-7 w-16 bg-neutral-300/60 rounded-md" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-24 bg-neutral-300/80 rounded-md" />
              <div className="h-7 w-28 bg-neutral-300/90 rounded-md" />
            </div>
          </div>

          {/* White A4 Paper Simulation */}
          <div className="w-full max-w-[560px] h-[720px] bg-white rounded-lg shadow-xl p-10 space-y-6 border border-neutral-300/50">
            {/* Header / Name */}
            <div className="space-y-2 pb-4 border-b border-neutral-200">
              <div className="h-7 w-48 bg-neutral-300/80 rounded-md" />
              <div className="h-4 w-36 bg-neutral-200/70 rounded" />
              <div className="h-3 w-72 bg-neutral-200/40 rounded pt-1" />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <div className="h-3.5 w-36 bg-neutral-300/70 rounded font-bold" />
              <div className="h-2.5 bg-neutral-200/50 rounded w-full" />
              <div className="h-2.5 bg-neutral-200/50 rounded w-11/12" />
              <div className="h-2.5 bg-neutral-200/50 rounded w-4/5" />
            </div>

            {/* Experience Section */}
            <div className="space-y-4 pt-2">
              <div className="h-3.5 w-32 bg-neutral-300/70 rounded font-bold" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-40 bg-neutral-200/80 rounded" />
                  <div className="h-3 w-20 bg-neutral-200/50 rounded" />
                </div>
                <div className="h-2.5 bg-neutral-200/40 rounded w-full" />
                <div className="h-2.5 bg-neutral-200/40 rounded w-5/6" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-36 bg-neutral-200/80 rounded" />
                  <div className="h-3 w-20 bg-neutral-200/50 rounded" />
                </div>
                <div className="h-2.5 bg-neutral-200/40 rounded w-full" />
                <div className="h-2.5 bg-neutral-200/40 rounded w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. 👤 Profile Page Skeleton (/profile)
export function ProfileSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D8D4CC] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-neutral-200/80 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-neutral-200/90 rounded-md" />
              <div className="h-3.5 w-40 bg-neutral-200/50 rounded" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-24 bg-neutral-200/60 rounded-full" />
                <div className="h-5 w-28 bg-neutral-200/60 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-28 bg-neutral-200/90 rounded-xl" />
            <div className="h-10 w-20 bg-neutral-200/50 rounded-xl" />
          </div>
        </div>

        {/* Sequential Section Cards */}
        {[
          { num: '01', title: 'Personal Identity & Contact', fields: 4 },
          { num: '02', title: 'Target Roles & Desired Track', fields: 3 },
          { num: '03', title: 'Urgency, Notice Period & Education', fields: 3 },
          { num: '04', title: 'Target Compensation & Relocation', fields: 2 }
        ].map((sec, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D8D4CC] shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <span className="text-xs font-mono font-bold text-neutral-300">{sec.num} //</span>
              <div className="h-5 w-52 bg-neutral-200/80 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {Array.from({ length: sec.fields }).map((_, fIdx) => (
                <div key={fIdx} className="space-y-2">
                  <div className="h-3 w-28 bg-neutral-200/50 rounded" />
                  <div className="h-10 bg-neutral-200/40 rounded-lg border border-[#D8D4CC]/40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. 💬 AI Advisor Chat Skeleton (/advisor)
export function AdvisorSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-6 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-112px)]">
        {/* Left Prompts / Topics Drawer */}
        <div className="hidden lg:block lg:col-span-4 bg-white rounded-2xl p-6 border border-[#D8D4CC] shadow-xs space-y-6">
          <div className="space-y-2 pb-4 border-b border-neutral-100">
            <div className="h-5 w-36 bg-neutral-200/80 rounded-md" />
            <div className="h-3 w-48 bg-neutral-200/40 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-3 rounded-xl bg-[#FAF8F5] border border-neutral-200/60 space-y-2">
                <div className="h-3.5 w-3/4 bg-neutral-200/70 rounded" />
                <div className="h-2.5 w-1/2 bg-neutral-200/40 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Chat Conversation Window */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#D8D4CC] shadow-xs flex flex-col justify-between p-6">
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-200/80" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-neutral-200/80 rounded" />
                <div className="h-2.5 w-20 bg-neutral-200/50 rounded" />
              </div>
            </div>
          </div>

          {/* Conversation Bubbles */}
          <div className="space-y-6 py-6 flex-1">
            {/* AI message */}
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-neutral-200/80 shrink-0" />
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-neutral-200/60 space-y-2 flex-1">
                <div className="h-3 bg-neutral-200/70 rounded w-full" />
                <div className="h-3 bg-neutral-200/70 rounded w-5/6" />
                <div className="h-3 bg-neutral-200/70 rounded w-2/3" />
              </div>
            </div>

            {/* User message */}
            <div className="flex justify-end">
              <div className="p-4 rounded-2xl bg-[#171717]/10 space-y-2 max-w-[70%]">
                <div className="h-3 bg-neutral-300/80 rounded w-48" />
              </div>
            </div>

            {/* AI message 2 */}
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-neutral-200/80 shrink-0" />
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-neutral-200/60 space-y-2 flex-1">
                <div className="h-3 bg-neutral-200/70 rounded w-full" />
                <div className="h-3 bg-neutral-200/70 rounded w-4/5" />
              </div>
            </div>
          </div>

          {/* Input Bar */}
          <div className="pt-4 border-t border-neutral-100 flex gap-3">
            <div className="h-11 bg-neutral-200/40 rounded-xl flex-1 border border-[#D8D4CC]/60" />
            <div className="h-11 w-11 bg-neutral-200/80 rounded-xl shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. 🔖 Saved Jobs Page Skeleton (/saved)
export function SavedJobsSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-neutral-200/80 rounded-xl" />
            <div className="h-4 w-72 bg-neutral-200/50 rounded-lg" />
          </div>
          <div className="h-9 w-32 bg-neutral-200/60 rounded-xl" />
        </div>

        {/* 3-Column Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#D8D4CC] shadow-xs space-y-4 flex flex-col justify-between min-h-[220px]">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-neutral-200/80" />
                  <div className="h-5 w-16 bg-neutral-200/60 rounded-full" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-5 w-4/5 bg-neutral-200/80 rounded-md" />
                  <div className="h-3.5 w-1/2 bg-neutral-200/50 rounded" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-20 bg-neutral-200/50 rounded-md" />
                  <div className="h-6 w-24 bg-neutral-200/50 rounded-md" />
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="h-4 w-24 bg-neutral-200/60 rounded" />
                <div className="h-8 w-24 bg-neutral-200/80 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. 💳 Pricing Page Skeleton (/pricing, /checkout)
export function PricingSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12 animate-pulse text-center">
        {/* Header */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="h-9 w-72 bg-neutral-200/80 rounded-xl mx-auto" />
          <div className="h-4 w-96 max-w-full bg-neutral-200/50 rounded-lg mx-auto" />
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className={`bg-white rounded-3xl p-8 border ${i === 2 ? 'border-[#F45B25]/40 shadow-lg' : 'border-[#D8D4CC] shadow-xs'} space-y-6 flex flex-col justify-between text-left min-h-[460px]`}>
              <div className="space-y-4">
                <div className="h-5 w-28 bg-neutral-200/80 rounded-md" />
                <div className="h-10 w-24 bg-neutral-200/90 rounded-xl" />
                <div className="h-3.5 w-full bg-neutral-200/40 rounded" />
                <div className="space-y-2.5 pt-4 border-t border-neutral-100">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-neutral-200/70 shrink-0" />
                      <div className="h-3 bg-neutral-200/50 rounded w-full" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-11 w-full bg-neutral-200/80 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 7. 🔍 Job Search Skeleton (/search)
export function SearchSkeleton() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#D8D4CC] shadow-xs flex flex-col md:flex-row gap-3">
          <div className="h-11 bg-neutral-200/40 rounded-xl flex-1 border border-neutral-200/50" />
          <div className="h-11 w-32 bg-neutral-200/80 rounded-xl" />
        </div>

        {/* Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#D8D4CC] shadow-xs space-y-4 min-h-[220px]">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
                <div className="h-5 w-16 bg-neutral-200/60 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 w-3/4 bg-neutral-200/80 rounded" />
                <div className="h-3 w-1/2 bg-neutral-200/50 rounded" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-neutral-200/50 rounded-md" />
                <div className="h-6 w-24 bg-neutral-200/50 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic Route-Aware Page Skeleton
 * Inspects current URL pathname and renders the exact skeleton matching the destination page.
 */
export function PageSkeleton() {
  const location = useLocation();
  const path = location?.pathname || '';

  if (path.startsWith('/career')) {
    return <CareerSkeleton />;
  }
  if (path.startsWith('/resume-creator')) {
    return <ResumeCreatorSkeleton />;
  }
  if (path.startsWith('/profile')) {
    return <ProfileSkeleton />;
  }
  if (path.startsWith('/advisor')) {
    return <AdvisorSkeleton />;
  }
  if (path.startsWith('/saved')) {
    return <SavedJobsSkeleton />;
  }
  if (path.startsWith('/pricing') || path.startsWith('/checkout')) {
    return <PricingSkeleton />;
  }
  if (path.startsWith('/search')) {
    return <SearchSkeleton />;
  }

  return <CareerSkeleton />;
}

export default PageSkeleton;
