import React from 'react'
import { Area, AreaChart, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

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

export default function FeaturesChart() {
    return (
        <ChartContainer className="aspect-auto h-64 md:h-80 w-full" config={chartConfig}>
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
