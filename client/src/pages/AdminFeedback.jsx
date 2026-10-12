import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiSearch, FiDownload, FiStar } from 'react-icons/fi';
import api from '../services/api';

const ago = (iso) => {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
};
const fullDate = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function Stars({ value }) {
    if (!value) return <span className="ds-mono ds-mono-muted">no rating</span>;
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <FiStar key={n} size={13} className={n <= value ? 'text-[#CA3C0A] fill-[#CA3C0A]' : 'text-[#D8D4CC]'} />
            ))}
        </span>
    );
}

function Stat({ label, value, hint }) {
    return (
        <div className="bg-white px-5 py-4 min-w-0">
            <p className="ds-mono ds-mono-muted m-0 truncate">{label}</p>
            <p className="m-0 mt-1 text-[28px] font-semibold tracking-[-0.03em] text-[#171717] tabular-nums">{value}</p>
            {hint && <p className="m-0 text-[12px] text-[#6F6A65]">{hint}</p>}
        </div>
    );
}

function toCsv(rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [['date', 'category', 'rating', 'name', 'email', 'message'].join(','),
        ...rows.map((f) => [f.createdAt, f.category, f.rating, f.name, f.email, f.message].map(esc).join(','))].join('\n');
}

export default function AdminFeedback({ onDenied }) {
    const [data, setData] = useState(null);
    const [state, setState] = useState('loading');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [rating, setRating] = useState('all');

    const load = async () => {
        setState((s) => (s === 'ready' ? 'ready' : 'loading'));
        try {
            const res = await api.get('/admin/feedback');
            setData(res.data);
            setState('ready');
        } catch (err) {
            if (err?.response?.status === 404 || err?.response?.status === 401) onDenied?.();
            else setState('error');
        }
    };

    useEffect(() => { load(); }, []);

    const categories = useMemo(() => [...new Set((data?.feedback || []).map((f) => f.category))].sort(), [data]);

    const rows = useMemo(() => {
        if (!data) return [];
        const q = query.trim().toLowerCase();
        return data.feedback.filter((f) =>
            (category === 'all' || f.category === category) &&
            (rating === 'all' || (rating === 'low' ? f.rating && f.rating <= 2 : rating === 'high' ? f.rating >= 4 : !f.rating)) &&
            (!q || `${f.message} ${f.name} ${f.email}`.toLowerCase().includes(q)));
    }, [data, query, category, rating]);

    const exportCsv = () => {
        const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `appliqa-feedback-${new Date().toISOString().slice(0, 10)}.csv` });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const s = data?.summary;
    const chip = (active) => `shrink-0 h-9 px-3 text-[13px] font-medium border cursor-pointer ${active ? 'bg-[#171717] text-white border-[#171717]' : 'bg-white text-[#171717] border-[#D8D4CC] hover:border-[#171717]'}`;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D8D4CC] border-0 border-b border-[#D8D4CC]">
                <Stat label="feedback" value={s ? s.total : '…'} hint={s ? `+${s.last7Days} in the last 7 days` : ''} />
                <Stat label="average rating" value={s ? (s.averageRating ?? '—') : '…'} hint={s?.averageRating ? 'out of 5' : ''} />
                <Stat label="from signed-in users" value={s ? s.signedIn : '…'} hint={s ? `${s.total - s.signedIn} signed out` : ''} />
                <Stat label="categories" value={data ? categories.length : '…'} hint={categories.slice(0, 3).join(' · ')} />
            </div>

            <div className="px-5 md:px-8 pt-5 pb-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="relative flex-1 min-w-0">
                        <span className="sr-only">Search feedback</span>
                        <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8580]" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search messages, names or emails"
                            className="w-full h-11 pl-10 pr-3 bg-white border border-[#D8D4CC] focus:border-[#171717] outline-none text-[14px] text-[#171717]"
                        />
                    </label>
                    <div className="flex gap-2">
                        <button type="button" onClick={load} className="ds-btn !min-h-11 !px-4 bg-white text-[#171717] border border-[#D8D4CC] hover:border-[#171717]">
                            Refresh <FiRefreshCw size={14} />
                        </button>
                        <button type="button" onClick={exportCsv} disabled={!rows.length} className="ds-btn ds-btn-ink !min-h-11 !px-4 hover:!bg-[#CA3C0A] disabled:opacity-50">
                            Export CSV <FiDownload size={14} />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
                    <button type="button" className={chip(category === 'all')} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All categories</button>
                    {categories.map((c) => (
                        <button key={c} type="button" className={chip(category === c)} aria-pressed={category === c} onClick={() => setCategory(c)}>
                            {c} <span className="ds-mono ml-1 opacity-60">{data.feedback.filter((f) => f.category === c).length}</span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by rating">
                    {[['all', 'Any rating'], ['low', '1–2 stars'], ['high', '4–5 stars'], ['none', 'No rating']].map(([id, label]) => (
                        <button key={id} type="button" className={chip(rating === id)} aria-pressed={rating === id} onClick={() => setRating(id)}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="px-5 md:px-8 pb-12">
                {state === 'error' && <p className="m-0 mb-4 text-[14px] text-[#B91C1C]">Couldn’t load feedback. Try again.</p>}
                <div className="bg-white border border-[#D8D4CC]">
                    {!data && state === 'loading' && Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="px-5 py-5 border-0 border-b border-[#EFECE6]"><div className="h-4 bg-[#EFECE6] w-2/3" /></div>
                    ))}
                    {rows.map((f) => (
                        <article key={f.id} className="px-5 py-4 border-0 border-b border-[#EFECE6] last:border-b-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="ds-mono text-[#171717] border border-[#D8D4CC] px-2 py-0.5">{f.category}</span>
                                <Stars value={f.rating} />
                                <span className="ds-mono ds-mono-muted ml-auto" title={fullDate(f.createdAt)}>{ago(f.createdAt)}</span>
                            </div>
                            <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-[#171717] whitespace-pre-wrap break-words">{f.message}</p>
                            <p className="m-0 mt-2 text-[13px] text-[#6F6A65] break-all">
                                {f.name && <span className="text-[#171717] font-medium">{f.name} · </span>}
                                {f.email ? <a href={`mailto:${f.email}`} className="text-[#4A4540] hover:text-[#CA3C0A]">{f.email}</a> : 'no email'}
                                {!f.userId && <span className="ds-mono ds-mono-muted"> · signed out</span>}
                            </p>
                        </article>
                    ))}
                    {data && !rows.length && <p className="m-0 px-5 py-10 text-center text-[14px] text-[#6F6A65]">No feedback matches.</p>}
                </div>
                {data && <p className="ds-mono ds-mono-muted m-0 mt-3">{rows.length} of {data.feedback.length} messages</p>}
            </div>
        </>
    );
}
