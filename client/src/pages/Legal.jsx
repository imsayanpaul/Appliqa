import { useLocation, useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'October 6, 2026';

const openFeedback = (category) => {
    window.dispatchEvent(new CustomEvent('appliqa:open-feedback', { detail: { category } }));
};

const ContactButton = ({ category, children }) => (
    <button
        type="button"
        onClick={() => openFeedback(category)}
        className="font-semibold text-[#CA3C0A] underline underline-offset-2 hover:text-[#B73609]"
    >
        {children}
    </button>
);

const Section = ({ title, children }) => (
    <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#171717] tracking-tight">{title}</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-[#4A4540]">{children}</div>
    </section>
);

const List = ({ items }) => (
    <ul className="list-disc pl-5 space-y-1.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
);

const Privacy = () => (
    <>
        <Section title="What we collect">
            <p>We only collect what Appliqa needs to search jobs and give you AI career help.</p>
            <List items={[
                <><strong>Account details:</strong> your email address and password login, handled by our authentication provider. We never see your password.</>,
                <><strong>Profile details you choose to add:</strong> name, phone, date of birth, job preferences, salary expectations, target cities, skills, and portfolio links.</>,
                <><strong>Resume content:</strong> when you upload a resume, the text is extracted in your browser. We store that text and the details extracted from it (skills, experience, education). We don't store the original file, only its name and size.</>,
                <><strong>Your activity:</strong> jobs you save and their status, cover letters and messages you generate, and your recent searches while signed in.</>,
                <><strong>Feedback:</strong> anything you send through the Feedback form, plus the email you provide.</>,
            ]} />
        </Section>

        <Section title="How we use it">
            <List items={[
                'To run searches, match jobs to your resume, and generate AI results such as match scores, cover letters, and interview prep.',
                'To save your work so it’s there when you return.',
                'To show popular searches to everyone. These are anonymous search terms only, never linked to you.',
                'To keep the service secure and prevent abuse, for example by rate limiting requests.',
            ]} />
            <p>We don’t sell your data, show ads, or use third-party analytics or tracking scripts.</p>
        </Section>

        <Section title="Services that process your data">
            <List items={[
                <><strong>Supabase:</strong> sign-in and database hosting.</>,
                <><strong>Google Gemini:</strong> AI features. Your resume text, profile details, job descriptions, and chat messages are sent to Gemini to generate results.</>,
                <><strong>JSearch (via RapidAPI):</strong> job listings. Your search terms and location filters are sent to fetch results.</>,
                <><strong>Vercel:</strong> website hosting.</>,
                <><strong>Google Fonts:</strong> loads the site’s typeface. Your browser contacts Google to download it.</>,
            ]} />
            <p>To save cost and time, AI results may be cached on our servers using a fingerprint of the input, so identical requests return the same answer.</p>
        </Section>

        <Section title="Stored on your device">
            <p>
                We keep your sign-in session and some recent results (such as your resume analysis, career path, advisor chat, and recent searches)
                in your browser’s local storage so pages load quickly. Signing out clears cached account data. We don’t use advertising cookies.
            </p>
        </Section>

        <Section title="Retention and your choices">
            <List items={[
                'You can edit or clear your profile details and resume at any time from your Profile.',
                'You can delete saved jobs and clear your search history from within the app.',
                'Cached job listings and search results are deleted automatically after 30 days.',
                <>To get a copy of your data or delete your account entirely, <ContactButton category="Other">contact us</ContactButton>.</>,
            ]} />
        </Section>
    </>
);

const Terms = () => (
    <>
        <Section title="Using Appliqa">
            <p>
                By creating an account or using Appliqa, you agree to these terms. If you don’t agree, please don’t use the service.
                You’re responsible for keeping your login secure and for the activity on your account.
            </p>
        </Section>

        <Section title="AI-generated content">
            <p>
                Match scores, ATS scores, cover letters, career paths, interview prep, and advisor responses are generated by AI.
                They can be wrong or incomplete. Review everything before you send it to an employer. Appliqa doesn’t guarantee
                interviews, job offers, or any hiring outcome.
            </p>
        </Section>

        <Section title="Job listings">
            <p>
                Listings come from third-party sources. We don’t employ the recruiters or verify every posting, so check details with the
                employer before applying or sharing personal information. Applications happen on the employer’s or job board’s site.
            </p>
        </Section>

        <Section title="Your content">
            <p>
                You own the resumes, profile details, and documents you create. You give us permission to store and process them only to
                provide the service. Please don’t upload content you don’t have the right to use.
            </p>
        </Section>

        <Section title="Acceptable use">
            <List items={[
                'Don’t scrape, overload, or automate requests against the service beyond normal use.',
                'Don’t try to access other users’ data or bypass security or rate limits.',
                'Don’t use Appliqa to create misleading or fraudulent applications.',
            ]} />
            <p>We may limit or suspend accounts that break these rules.</p>
        </Section>

        <Section title="Plans and changes">
            <p>
                Paid plans, when offered, include the price and billing terms shown at checkout. We may update features or these terms.
                If we make significant changes, we’ll update the date at the top of this page.
            </p>
        </Section>

        <Section title="Liability">
            <p>
                Appliqa is provided “as is”, without warranties. To the extent the law allows, we aren’t liable for indirect losses
                arising from your use of the service, including decisions made based on AI output.
            </p>
        </Section>

        <Section title="Questions">
            <p>Something unclear? <ContactButton category="Other">Contact us</ContactButton>.</p>
        </Section>
    </>
);

const Security = () => (
    <>
        <Section title="How we protect your account">
            <List items={[
                'All traffic is encrypted over HTTPS.',
                'Sign-in is handled by Supabase Auth. Passwords are never stored or seen by Appliqa’s servers.',
                'Every request that reads or changes your data is verified against your signed-in session on the server, and only returns records that belong to you.',
                'API keys for our AI and job providers are kept on the server and never sent to your browser.',
            ]} />
        </Section>

        <Section title="How we handle your resume">
            <List items={[
                'Resume PDFs and images are read in your browser. The original file is never uploaded.',
                'Only the extracted text is sent to our server to power AI features.',
            ]} />
        </Section>

        <Section title="Abuse prevention">
            <p>
                AI and search requests are rate limited per account and per network to prevent misuse. If you hit a limit, wait a minute and try again.
            </p>
        </Section>

        <Section title="Reporting a vulnerability">
            <p>
                If you think you’ve found a security issue, please <ContactButton category="Bug Report">report it to us</ContactButton> and
                include steps to reproduce it. Please don’t access other users’ data or disrupt the service while testing. We’ll look into every report.
            </p>
        </Section>
    </>
);

const PAGES = {
    '/privacy': { title: 'Privacy Policy', eyebrow: 'YOUR DATA', intro: 'What Appliqa collects, why, and the choices you have.', Body: Privacy },
    '/terms': { title: 'Terms of Service', eyebrow: 'THE RULES', intro: 'The agreement between you and Appliqa when you use the service.', Body: Terms },
    '/security': { title: 'Security', eyebrow: 'TRUST', intro: 'How we keep your account and career data safe.', Body: Security },
};

export default function Legal() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const page = PAGES[pathname] || PAGES['/privacy'];
    const { Body } = page;

    return (
        <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
            <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#D8D4CC] p-6 sm:p-10 space-y-8">
                <nav aria-label="Legal pages" className="flex flex-wrap gap-2">
                    {Object.entries(PAGES).map(([path, p]) => (
                        <button
                            key={path}
                            type="button"
                            onClick={() => navigate(path)}
                            aria-current={path === pathname ? 'page' : undefined}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                                path === pathname
                                    ? 'bg-[#171717] text-white border-[#171717]'
                                    : 'bg-white text-[#4A4540] border-[#D8D4CC] hover:border-[#171717]'
                            }`}
                        >
                            {p.title}
                        </button>
                    ))}
                </nav>

                <header className="space-y-2 border-b border-[#EFECE6] pb-6">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#CA3C0A] block">
                        {page.eyebrow}
                    </span>
                    <h1 className="text-3xl font-black text-[#171717] tracking-tight m-0">{page.title}</h1>
                    <p className="text-[15px] text-[#66615C]">{page.intro}</p>
                    <p className="text-xs text-[#6F6A65]">Last updated {LAST_UPDATED}</p>
                </header>

                <Body />
            </article>
        </div>
    );
}
