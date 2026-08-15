import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiZap, FiArrowRight, FiShield, FiStar, FiHelpCircle } from 'react-icons/fi';
import Footer from '../components/ui/Footer';

const plans = [
    {
        id: 'starter',
        name: 'Starter Pass',
        badge: 'Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        description: 'Core AI career discovery and ATS keyword matching for active job hunters.',
        features: [
            '50,000+ Live Verified Job Listings',
            'Basic ATS Resume Keyword Matching',
            'Application Pipeline Tracker',
            'Standard AI Query Searches',
            'Community Support'
        ],
        cta: 'Get Started Free',
        popular: false,
        buttonVariant: 'secondary'
    },
    {
        id: 'pro',
        name: 'Pro Career Pass',
        badge: 'Most Popular',
        priceMonthly: 19,
        priceYearly: 15,
        description: 'Full-throttle algorithmic resume tuning, cover letters, and mock interview prep.',
        features: [
            'Everything in Starter',
            'Unlimited 90%+ ATS Keyword Audits',
            'AI Cover Letter & Recruiter DM Writer',
            'Interactive AI Mock Interview Prep',
            'Automated Skills Gap Remediation',
            'Visual PDF Resume Builder & Tailor',
            'Priority Job Notification Alerts'
        ],
        cta: 'Start Pro Trial',
        popular: true,
        buttonVariant: 'primary'
    },
    {
        id: 'agentic-enterprise',
        name: 'Agentic & API',
        badge: 'For Power Users',
        priceMonthly: 99,
        priceYearly: 79,
        description: 'Autonomous agent access, bulk candidate parsing, and programmatic MCP integration.',
        features: [
            'Everything in Pro',
            'Dedicated MCP Server & API Access',
            'Autonomous Job Application Agent',
            'Bulk Resume Parsing & Auditing',
            'Custom Prompt Injection & Fine-Tuning',
            'Dedicated 24/7 Priority Support'
        ],
        cta: 'Access Agent API',
        popular: false,
        buttonVariant: 'secondary'
    }
];

export default function Pricing({ user, session }) {
    const navigate = useNavigate();
    const [annual, setAnnual] = useState(false);

    const handleSelectPlan = (planId) => {
        if (session) {
            navigate('/profile');
        } else {
            navigate('/profile');
        }
    };

    return (
        <div className="fade-in bg-[#F7F5F2] min-h-screen text-[#171717] flex flex-col justify-between">
            {/* Schema.org Product / Offer Structured Data */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": "Appliqa Pro Career & Job Search Platform",
                    "description": "AI-powered job search platform and ATS resume optimization subscription plans.",
                    "brand": {
                        "@type": "Brand",
                        "name": "Appliqa"
                    },
                    "offers": {
                        "@type": "AggregateOffer",
                        "priceCurrency": "USD",
                        "lowPrice": "0",
                        "highPrice": "99",
                        "offerCount": "3",
                        "offers": plans.map(p => ({
                            "@type": "Offer",
                            "name": p.name,
                            "price": annual ? p.priceYearly : p.priceMonthly,
                            "priceCurrency": "USD",
                            "availability": "https://schema.org/InStock",
                            "url": "https://www.appliqa.xyz/pricing"
                        }))
                    }
                })
            }} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-20 w-full">
                {/* Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E8] border border-[#F45B25]/20 text-[#F45B25] text-xs font-bold uppercase tracking-wider mb-4">
                        <FiZap size={12} />
                        <span>Predictable Career Investment</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#171717] leading-tight mb-4">
                        Transparent Plans for High-Impact Careers.
                    </h1>
                    <p className="text-base sm:text-lg text-[#66615C] font-normal leading-relaxed">
                        Outsmart automated ATS filters, master technical interviews, and secure top-of-market compensation packages with AI-assisted career tooling.
                    </p>

                    {/* Billing Toggle */}
                    <div className="mt-8 inline-flex items-center bg-white border border-[#D8D4CC] p-1.5 rounded-full shadow-xs">
                        <button
                            type="button"
                            onClick={() => setAnnual(false)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${!annual ? 'bg-[#171717] text-white shadow-xs' : 'bg-transparent text-[#66615C] hover:text-[#171717]'}`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            type="button"
                            onClick={() => setAnnual(true)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${annual ? 'bg-[#171717] text-white shadow-xs' : 'bg-transparent text-[#66615C] hover:text-[#171717]'}`}
                        >
                            <span>Annual Billing</span>
                            <span className="bg-[#F45B25] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Save 20%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
                    {plans.map((plan) => {
                        const price = annual ? plan.priceYearly : plan.priceMonthly;
                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                                    plan.popular
                                        ? 'bg-[#171717] text-white shadow-2xl border-2 border-[#F45B25] scale-[1.02]'
                                        : 'bg-white text-[#171717] border border-[#D8D4CC] shadow-sm hover:shadow-md'
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F45B25] to-[#FF8C42] text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                                        ★ Most Popular Choice
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <h2 className="text-xl font-bold tracking-tight">{plan.name}</h2>
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.popular ? 'bg-white/15 text-white' : 'bg-[#ECE8E1] text-[#66615C]'}`}>
                                            {plan.badge}
                                        </span>
                                    </div>

                                    <p className={`text-xs sm:text-sm mb-6 ${plan.popular ? 'text-white/80' : 'text-[#66615C]'}`}>
                                        {plan.description}
                                    </p>

                                    <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-neutral-200/40">
                                        <span className="text-4xl sm:text-5xl font-black tracking-tight">${price}</span>
                                        <span className={`text-xs font-semibold ${plan.popular ? 'text-white/60' : 'text-[#66615C]'}`}>
                                            {price === 0 ? 'forever' : '/ month'}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <p className={`text-xs font-bold uppercase tracking-wider ${plan.popular ? 'text-white/60' : 'text-[#8A8580]'}`}>
                                            Included Features:
                                        </p>
                                        {plan.features.map((feat) => (
                                            <div key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm">
                                                <FiCheck className={`shrink-0 mt-0.5 ${plan.popular ? 'text-[#F45B25]' : 'text-[#171717]'}`} size={16} />
                                                <span className={plan.popular ? 'text-white/90' : 'text-[#171717]'}>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectPlan(plan.id)}
                                        className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-none cursor-pointer ${
                                            plan.popular
                                                ? 'bg-[#F45B25] hover:bg-[#D94B1F] text-white shadow-lg shadow-[#F45B25]/30'
                                                : 'bg-[#171717] hover:bg-neutral-800 text-white'
                                        }`}
                                    >
                                        <span>{plan.cta}</span>
                                        <FiArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trust & Guarantee Banner */}
                <div className="mt-14 max-w-3xl mx-auto bg-white border border-[#D8D4CC] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center shrink-0">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#171717]">100% Risk-Free Guarantee</p>
                            <p className="text-xs text-[#66615C]">Upgrade, downgrade, or cancel your subscription at any time without fees.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/search')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FAF8F5] border border-[#D8D4CC] text-[#171717] hover:border-[#171717] cursor-pointer whitespace-nowrap"
                    >
                        Explore Free Search
                    </button>
                </div>
            </div>

            <Footer />
        </div>
    );
}
