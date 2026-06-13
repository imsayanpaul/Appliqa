import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Map as MapIcon, MessageCircle, FileText, Send, TrendingUp, Compass, CheckSquare, Zap, Sparkles, Briefcase } from 'lucide-react'
import DottedMap from 'dotted-map'
import { Area, AreaChart, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export function Features() {
    const navigate = useNavigate();
    return (
        <section className="px-4 pt-4 pb-16 md:pt-8 md:pb-24">
            <div className="mx-auto grid max-w-5xl border border-white/5 rounded-2xl bg-zinc-950/20 backdrop-blur-md md:grid-cols-2 overflow-hidden">
                
                {/* Box 1: AI Resume Builder */}
                <div 
                    onClick={() => navigate('/resume-creator')}
                    className="border-b border-white/5 md:border-r p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <FileText className="size-4 text-orange-500" />
                            AI Resume Builder
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Build and optimize your resume with AI-generated summaries, professional templates, and bullet enhancers.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                            <span className="text-[10px] text-slate-400 font-medium font-mono">my-resume-v2.pdf</span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"/> Ready to Download
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-2 py-0.5 rounded text-[9px] bg-orange-500/10 text-orange-300 border border-orange-500/20 font-medium">Modern Theme</span>
                            <span className="px-2 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">ATS Checked</span>
                        </div>
                    </div>
                </div>

                {/* Box 2: AI Career Advisor */}
                <div 
                    onClick={() => navigate('/advisor')}
                    className="border-b border-white/5 p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <MessageCircle className="size-4 text-orange-500" />
                            AI Career Advisor
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Chat with an interactive AI mentor for personalized career guidance, mock interviews, and resume critique.
                        </p>
                    </div>

                    <div aria-hidden className="flex flex-col gap-4 mt-8">
                        <div className="rounded-xl bg-zinc-900 border border-white/5 p-3 text-xs text-slate-300 leading-relaxed">
                            How can I stand out for a Tech Lead role?
                        </div>

                        <div className="ml-auto w-4/5">
                            <div className="rounded-xl bg-orange-600/90 p-3 text-xs text-white leading-relaxed shadow-lg">
                                Highlight architectural decisions, team leadership metrics, and system design experience.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Box 3: Location Matching */}
                <div className="border-b border-white/5 md:border-r p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.015] transition-colors duration-300">
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <MapIcon className="size-4 text-orange-500" />
                            Smart Location Matching
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Global opportunities. Instantly find jobs in your preferred city or remote worldwide.
                        </p>
                    </div>

                    <div aria-hidden className="relative mt-8">
                        <div className="absolute inset-0 z-10 m-auto size-fit flex items-center justify-center">
                            <div className="rounded-xl bg-zinc-900/90 backdrop-blur-md z-[1] relative flex max-w-[240px] sm:max-w-none items-center gap-2 border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium text-white shadow-xl">
                                <span className="text-sm sm:text-base flex-shrink-0">🇺🇸</span>
                                <span className="text-left leading-normal">Match: React Developer in San Francisco</span>
                            </div>
                            <div className="rounded-xl bg-zinc-950/80 absolute inset-2 -bottom-2 w-[220px] sm:w-auto mx-auto border border-white/5 px-3 py-4 shadow-lg"></div>
                        </div>

                        <div className="relative overflow-hidden opacity-30 h-36 flex items-center justify-center">
                            <div className="[background-image:radial-gradient(var(--tw-gradient-stops))] z-10 absolute inset-0 from-transparent via-transparent to-zinc-950"></div>
                            <Map />
                        </div>
                    </div>
                </div>

                {/* Box 4: AI Match Score & Skills */}
                <div className="border-b border-white/5 p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.015] transition-colors duration-300">
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="size-4 text-emerald-400" />
                            AI Match Score & Skill Gap
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Analyze your compatibility with any job. Instantly identify missing skills to improve your pass rate.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Match Score</span>
                            <span className="text-3xl font-extrabold text-emerald-400">87%</span>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 sm:pl-4 sm:border-l border-white/5">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Skills to Add</span>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 font-medium">System Design</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 font-medium">Kubernetes</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Box 5: ATS Keyword Scanner & Fixer */}
                <div 
                    onClick={() => navigate('/resume-creator')}
                    className="border-b border-white/5 md:border-r p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <CheckSquare className="size-4 text-orange-500" />
                            ATS Keyword Scanner & Fixer
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Compare your resume directly with job postings. Scan for missing keywords and get priority fixes.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Keywords Found</span>
                            <div className="flex gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium font-mono">✓ React</span>
                                <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium font-mono">✓ Tailwind</span>
                            </div>
                        </div>
                        <div className="h-px bg-white/5 my-1" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Missing Keywords</span>
                            <div className="flex gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 font-medium font-mono">✗ System Design</span>
                                <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 font-medium font-mono">✗ Docker</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Box 6: AI Cover Letter Generator */}
                <div 
                    onClick={() => navigate('/resume-creator')}
                    className="border-b border-white/5 p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="size-4 text-orange-500" />
                            AI Cover Letter Generator
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Generate tailored cover letters matching the requirements and tone of the role in seconds.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                            <span className="text-[10px] text-slate-400 font-medium font-mono">cover-letter-lead-react.pdf</span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"/> Optimized
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            "Dear hiring manager, I am thrilled to apply for the Lead Developer role. Over the last 5 years, I have built highly scalable design systems..."
                        </p>
                    </div>
                </div>

                {/* Box 7: LinkedIn Cold Outreach */}
                <div 
                    onClick={() => navigate('/resume-creator')}
                    className="border-b border-white/5 md:border-r p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Send className="size-4 text-orange-500" />
                            LinkedIn Cold Outreach
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Create personalized DMs and introduction notes to grab the attention of recruiters.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="size-5 rounded-full bg-slate-600 flex items-center justify-center text-[9px] text-white font-bold">HR</div>
                            <span className="text-[10px] text-slate-300 font-semibold">Sarah (Recruiting Lead)</span>
                        </div>
                        <div className="rounded-lg bg-zinc-950 p-2.5 border border-white/5 text-[11px] text-slate-300 leading-relaxed font-sans">
                            "Hey Sarah, noticed you're scaling the engineering squad. I recently slashed our build times by 40%..."
                        </div>
                    </div>
                </div>

                {/* Box 8: Career Path Visualizer */}
                <div 
                    onClick={() => navigate('/career')}
                    className="border-b border-white/5 p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Compass className="size-4 text-orange-500" />
                            Career Path Visualizer
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Map your long-term career growth. Discover key skills required to level up your career role.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-y-2 gap-x-1 px-2 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">Current</span>
                            <span className="text-[9.5px] sm:text-xs font-semibold text-white mt-0.5">Frontend Dev</span>
                        </div>
                        <span className="text-slate-500 text-[9.5px] sm:text-xs">➔</span>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">Level Up</span>
                            <span className="text-[9.5px] sm:text-xs font-semibold text-orange-400 mt-0.5">Senior React</span>
                        </div>
                        <span className="text-slate-500 text-[9.5px] sm:text-xs">➔</span>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">Target</span>
                            <span className="text-[9.5px] sm:text-xs font-semibold text-orange-400 mt-0.5">Tech Architect</span>
                        </div>
                    </div>
                </div>

                {/* Box 9: AI Interview Prep Coach */}
                <div 
                    onClick={() => navigate('/saved')}
                    className="border-b border-white/5 md:border-b-0 md:border-r p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Zap className="size-4 text-orange-500" />
                            AI Interview Prep Coach
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Generate custom behavioral and technical questions with model talking points for saved jobs.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mock Question</span>
                            <span className="text-[9px] text-orange-400 font-semibold font-mono">STAR Method</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
                            "Describe a complex system design challenge you solved."
                        </p>
                        <div className="text-[10px] text-slate-400 italic">
                            💡 Tip: Highlight exact metrics and performance stats.
                        </div>
                    </div>
                </div>

                {/* Box 10: Smart Application Tracker */}
                <div 
                    onClick={() => navigate('/saved')}
                    className="p-5 sm:p-12 flex flex-col justify-between hover:bg-white/[0.025] hover:border-orange-500/20 transition-all duration-300 cursor-pointer group"
                >
                    <div>
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Briefcase className="size-4 text-emerald-400" />
                            Smart Application Tracker
                        </span>

                        <p className="mt-4 md:mt-6 text-lg sm:text-xl font-semibold text-white leading-snug">
                            Bookmark jobs and track application status seamlessly from Saved, Applied, Interview, to Offer.
                        </p>
                    </div>

                    <div aria-hidden className="mt-8 grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded bg-zinc-900/60 border border-white/5">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Saved</div>
                            <div className="text-sm font-bold text-white mt-1">12</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-900/60 border border-white/5">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Applied</div>
                            <div className="text-sm font-bold text-orange-400 mt-1">5</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-900/60 border border-white/5">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Interview</div>
                            <div className="text-sm font-bold text-orange-400 mt-1">2</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-900/60 border border-white/5">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Offer</div>
                            <div className="text-sm font-bold text-emerald-400 mt-1">1</div>
                        </div>
                    </div>
                </div>

                {/* Box 9: ATS Stat */}
                <div className="col-span-full border-t border-white/5 p-6 sm:p-12 bg-white/[0.01] flex flex-col items-center justify-center hover:bg-white/[0.02] transition-colors duration-300">
                    <p className="text-center text-3xl sm:text-5xl lg:text-7xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                        98% ATS Pass Rate
                    </p>
                    <p className="text-slate-400 text-sm mt-3 text-center max-w-md">
                        Our AI models optimize resumes to bypass Applicant Tracking Systems with maximum score matches.
                    </p>
                </div>

                {/* Box 10: Application Tracking Graph */}
                <div className="col-span-full border-t border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors duration-300 flex flex-col md:relative">
                    <div className="md:absolute md:z-10 max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
                        <span className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                            <Activity className="size-4 text-emerald-400" />
                            Application Activity Feed
                        </span>

                        <p className="my-4 md:my-6 text-xl md:text-2xl font-semibold text-white leading-snug">
                            Track your status. <span className="text-slate-400">Monitor recruiter views, resume downloads, and matches in real-time.</span>
                        </p>
                    </div>
                    <div className="pt-4 md:pt-40 flex-1">
                        <MonitoringChart />
                    </div>
                </div>
            </div>
        </section>
    )
}

const map = new DottedMap({ height: 55, grid: 'diagonal' })
const points = map.getPoints()

const svgOptions = {
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.25)',
    radius: 0.15,
}

const Map = () => {
    const viewBox = `0 0 120 60`
    return (
        <svg viewBox={viewBox} style={{ background: svgOptions.backgroundColor }} className="w-full">
            {points.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r={svgOptions.radius} fill={svgOptions.color} />
            ))}
        </svg>
    )
}

const chartConfig = {
    matches: {
        label: 'ATS Matches',
        color: '#f97316',
    },
    views: {
        label: 'Recruiter Views',
        color: '#ffffff',
    },
}

const chartData = [
    { month: 'Jan', matches: 45, views: 12 },
    { month: 'Feb', matches: 62, views: 24 },
    { month: 'Mar', matches: 95, views: 58 },
    { month: 'Apr', matches: 120, views: 82 },
    { month: 'May', matches: 180, views: 145 },
    { month: 'Jun', matches: 250, views: 210 },
]

const MonitoringChart = () => {
    return (
        <ChartContainer className="h-64 md:h-80 w-full" config={chartConfig}>
            <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                    left: 0,
                    right: 0,
                    top: 10,
                    bottom: 0
                }}>
                <defs>
                    <linearGradient id="fillMatches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-matches)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-matches)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <ChartTooltip active cursor={false} content={<ChartTooltipContent className="bg-zinc-900 border border-white/10 text-white" />} />
                <Area strokeWidth={2} dataKey="views" type="monotone" fill="url(#fillViews)" stroke="var(--color-views)" stackId="a" />
                <Area strokeWidth={2} dataKey="matches" type="monotone" fill="url(#fillMatches)" stroke="var(--color-matches)" stackId="a" />
            </AreaChart>
        </ChartContainer>
    )
}
