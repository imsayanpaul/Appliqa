const PRICING_DATA = {
  provider: "Appliqa",
  url: "https://www.appliqa.xyz/pricing",
  checkout_url: "https://www.appliqa.xyz/checkout",
  currency: "USD",
  payment_rails: ["stripe_agentic", "usdc-base", "lightning"],
  plans: [
    {
      id: "starter",
      name: "Starter Pass",
      price: 0,
      interval: "month",
      description: "Core AI career discovery and ATS keyword matching for active job hunters.",
      features: [
        "50,000+ Live Verified Job Listings",
        "Basic ATS Resume Keyword Matching",
        "Application Pipeline Tracker",
        "Standard AI Query Searches"
      ],
      checkout_url: "https://www.appliqa.xyz/pricing"
    },
    {
      id: "pro",
      name: "Pro Career Pass",
      price: 19,
      interval: "month",
      popular: true,
      description: "Full-throttle algorithmic resume tuning, cover letters, and mock interview prep.",
      features: [
        "Everything in Starter",
        "Unlimited 90%+ ATS Keyword Audits",
        "AI Cover Letter & Recruiter DM Writer",
        "Interactive AI Mock Interview Prep",
        "Automated Skills Gap Remediation",
        "Visual PDF Resume Builder & Tailor"
      ],
      checkout_url: "https://www.appliqa.xyz/checkout?plan=pro"
    },
    {
      id: "agentic",
      name: "Agentic & API",
      price: 99,
      interval: "month",
      description: "Autonomous agent access, bulk candidate parsing, and programmatic MCP integration.",
      features: [
        "Everything in Pro",
        "Dedicated MCP Server & API Access",
        "Autonomous Job Application Agent",
        "Bulk Resume Parsing & Auditing",
        "Dedicated Priority Support"
      ],
      checkout_url: "https://www.appliqa.xyz/checkout?plan=agentic"
    }
  ]
};

const MARKDOWN_CONTENT = `# Appliqa — AI-Powered Job Finder & Career Optimization

> Appliqa (https://www.appliqa.xyz) is a full-stack career platform engineered to bypass ATS filters, score resumes against live job descriptions, calculate skills gaps, and optimize the end-to-end job application pipeline.

## Core Capabilities
- **Job Discovery & Search**: Real-time verified job listings across 50k+ active roles with customizable filters (remote, country, location, employment type).
- **AI Smart Search**: Natural-language query translation for complex job criteria (e.g., "Remote React engineer paying over $140k").
- **ATS Resume Intelligence**: Automatic PDF resume analysis extracting skills, technical stack, experience, and education with instant keyword match scoring (0-100%).
- **Skills Gap Analysis**: Algorithmic comparison between candidate credentials and target job requirements to highlight missing keywords and recommend actionable learning steps.
- **AI Career Advisor**: Conversational AI mentor providing contextual career guidance, mock interview preparation, and compensation negotiation strategies.
- **Visual Resume Creator & Optimizer**: Automated generation of ATS-optimized resumes, tailored cover letters, and personalized recruiter outreach messages.
- **Career Roadmap Planner**: Visualized promotion ladders, milestone timelines, and salary progression benchmarks based on professional background.

## Pricing & Commerce Plans
- **Starter Pass ($0/mo)**: 50k+ Live Job Search, Basic ATS Resume Matching, Application Tracker.
  - URL: https://www.appliqa.xyz/pricing
- **Pro Career Pass ($19/mo)**: Unlimited 90%+ ATS Audits, AI Cover Letters, Mock Interview Prep, PDF Resume Builder.
  - Checkout: https://www.appliqa.xyz/checkout?plan=pro
- **Agentic & API ($99/mo)**: Dedicated MCP Server, Autonomous Application Agent, Bulk Resume Parsing.
  - Checkout: https://www.appliqa.xyz/checkout?plan=agentic

## Public Endpoints & Routes
- Homepage: https://www.appliqa.xyz/
- Job Search: https://www.appliqa.xyz/search
- Pricing Surface: https://www.appliqa.xyz/pricing
- Checkout Surface: https://www.appliqa.xyz/checkout
- Direct Role Query: https://www.appliqa.xyz/search?query=React+Developer
- Machine Payments Protocol (MPP): https://www.appliqa.xyz/.well-known/payment
- Agent Payments Protocol (AP2): https://www.appliqa.xyz/.well-known/ap2
- Agent Commerce Protocol (ACP): https://www.appliqa.xyz/.well-known/acp
- x402-Mesh Manifest: https://www.appliqa.xyz/.well-known/x402-mesh.json
- Agent Skills: https://www.appliqa.xyz/.well-known/agent-skills/index.json
- API Catalog (RFC 9727): https://www.appliqa.xyz/.well-known/api-catalog
- OpenAPI Specification: https://www.appliqa.xyz/openapi.json
- MCP Server Card: https://www.appliqa.xyz/.well-known/mcp/server-card.json
- OAuth Discovery: https://www.appliqa.xyz/.well-known/oauth-authorization-server
- Micropayments (x402): https://www.appliqa.xyz/x402
- Sitemap: https://www.appliqa.xyz/sitemap.xml
`;

export default function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const accept = req.headers?.get?.('accept') || '';

  // Return JSON commerce payload if requested as application/json
  if ((path === '/pricing' || path === '/checkout') && accept.includes('application/json')) {
    return new Response(JSON.stringify(PRICING_DATA, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  // Return Markdown if requested
  if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
    return new Response(MARKDOWN_CONTENT, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
        'RateLimit': 'limit=100, remaining=47, reset=42',
        'RateLimit-Limit': '100',
        'RateLimit-Remaining': '47',
        'RateLimit-Reset': '42',
        'RateLimit-Policy': '100;w=60',
        'Link': '</llms.txt>; rel="describedby"; type="text/markdown", </openapi.json>; rel="service-desc"; type="application/json", </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json", </.well-known/payment>; rel="payment"; type="application/json", </.well-known/ap2>; rel="payment-protocol"; type="application/json", </.well-known/acp>; rel="commerce-protocol"; type="application/json", </.well-known/mcp/server-card.json>; rel="mcp-server"; type="application/json", </.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json", </.well-known/x402-mesh.json>; rel="x402-mesh"; type="application/json", </pricing>; rel="pricing"; type="text/html", </checkout>; rel="checkout"; type="text/html", </x402>; rel="payment-endpoint"; type="application/json", </sitemap.xml>; rel="sitemap"; type="application/xml"'
      }
    });
  }
}
