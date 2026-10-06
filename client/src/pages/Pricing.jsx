import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowUpRight, FiArrowRight } from 'react-icons/fi';

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

const BILLING_TABS = [
    { annual: false, label: 'Monthly' },
    { annual: true, label: 'Annual', note: 'save 20%' },
];

export default function Pricing() {
    const navigate = useNavigate();
    const [annual, setAnnual] = useState(false);

    return (
        <div className="bg-[#F7F5F2] text-[#171717]">
            {/* Schema.org Product / Offer Structured Data */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": "Appliqa Pro Career & Job Search Platform",
                    "description": "AI-powered job search platform and ATS resume optimization subscription plans.",
                    "brand": { "@type": "Brand", "name": "Appliqa" },
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

            <section className="ds-frame ds-rule-b">
                <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                    <span className="ds-mono">plans / billing</span>
                    <span className="ds-mono flex items-center gap-2">free to start <span className="ds-square" /></span>
                </div>
                <div className="ds-cell !pt-16 sm:!pt-28 !pb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                    <h1 className="ds-slash m-0 lg:col-span-7" style={{ fontSize: 'clamp(48px, 7vw, 104px)' }}>pricing</h1>
                    <p className="ds-lede m-0 lg:col-span-5 !text-[#4A4540]">
                        Start free. Upgrade when you want unlimited audits, cover letters and interview prep.
                    </p>
                </div>

                <div role="radiogroup" aria-label="Billing period" className="flex">
                    {BILLING_TABS.map((tab) => {
                        const selected = annual === tab.annual;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setAnnual(tab.annual)}
                                className={`h-16 w-1/2 sm:w-60 px-6 flex items-center justify-between gap-3 text-[15px] font-medium cursor-pointer border-0 border-t border-r border-[#D8D4CC] ${selected ? 'bg-white text-[#171717]' : 'bg-[#EFECE6] text-[#4A4540] hover:bg-white'}`}
                            >
                                <span className="flex items-baseline gap-2">
                                    {tab.label}
                                    {tab.note && <span className="ds-mono text-[#CA3C0A]">{tab.note}</span>}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className={`w-3 h-3 rounded-full border ${selected ? 'bg-[#CA3C0A] border-[#CA3C0A]' : 'border-[#6F6A65]'}`}
                                />
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="ds-frame ds-rule-b">
                <ul className="ds-gridlines grid-cols-1 md:grid-cols-3 list-none m-0 p-0">
                    {plans.map((plan) => {
                        const price = annual ? plan.priceYearly : plan.priceMonthly;
                        return (
                            <li key={plan.id} className={`flex flex-col ${plan.popular ? '!bg-white' : ''}`}>
                                <div className="ds-cell flex flex-col">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="m-0 text-[28px] font-medium tracking-[-0.025em] leading-none">
                                            {plan.name.toLowerCase()}<span className="text-[#CA3C0A]">/</span>
                                        </h2>
                                        <span className={`ds-badge shrink-0 ${plan.popular ? '!bg-[#CA3C0A] !text-white' : '!bg-[#EFECE6] !text-[#4A4540]'}`}>
                                            {plan.badge}
                                        </span>
                                    </div>
                                    <p className="ds-body mt-4 mb-0 min-h-[72px]">{plan.description}</p>

                                    <div className="mt-10 mb-8 flex items-baseline gap-2">
                                        <span className="font-semibold tracking-[-0.04em] leading-none" style={{ fontSize: 'clamp(48px, 5vw, 72px)' }}>
                                            {price === 0 ? 'free' : `$${price}`}
                                        </span>
                                        {price !== 0 && <span className="ds-mono ds-mono-muted">/ month{annual ? ', billed yearly' : ''}</span>}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/profile')}
                                        className={`ds-btn w-full ${plan.popular ? 'ds-btn-accent' : 'ds-btn-ink'}`}
                                    >
                                        {plan.cta}
                                        <FiArrowUpRight size={18} className="ds-btn-arrow" />
                                    </button>
                                </div>

                                <div className="ds-cell flex-1 border-0 border-t border-[#D8D4CC]">
                                    <p className="ds-mono ds-mono-muted m-0 mb-4">included</p>
                                    <ul className="list-none m-0 p-0 space-y-3">
                                        {plan.features.map((feat) => (
                                            <li key={feat} className="flex items-start gap-3 text-[15px] leading-snug">
                                                <FiCheck className="shrink-0 mt-0.5 text-[#CA3C0A]" size={16} aria-hidden="true" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section className="ds-frame ds-rule-b grid grid-cols-1 md:grid-cols-12">
                <div className="md:col-span-8 ds-cell md:border-0 md:border-r border-[#D8D4CC]">
                    <p className="ds-mono ds-mono-muted m-0 mb-2">no lock-in</p>
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">Upgrade, downgrade or cancel at any time, with no fees.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/search')}
                    className="md:col-span-4 ds-btn !min-h-[96px] !px-8 bg-transparent text-[#171717] hover:bg-white border-0 border-t md:border-t-0 border-[#D8D4CC]"
                >
                    Try search without an account <FiArrowRight size={18} className="ds-btn-arrow" />
                </button>
            </section>
        </div>
    );
}
