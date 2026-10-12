import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiSearch, FiDownload, FiArrowUp, FiArrowDown, FiCheck } from 'react-icons/fi';
import api from '../services/api';

const DAY = 86400000;

const ago = (iso) => {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    return mo < 12 ? `${mo}mo ago` : `${Math.floor(mo / 12)}y ago`;
};
const fullDate = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const within = (iso, days) => iso && Date.now() - new Date(iso).getTime() <= days * DAY;

const FILTERS = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'active7', label: 'Active 7 days', test: (u) => within(u.lastActiveAt, 7) },
    { id: 'new7', label: 'Joined 7 days', test: (u) => within(u.joinedAt, 7) },
    { id: 'inactive30', label: 'Inactive 30+ days', test: (u) => !within(u.lastActiveAt, 30) },
    { id: 'resume', label: 'Has resume', test: (u) => u.hasResume },
    { id: 'noresume', label: 'No resume', test: (u) => !u.hasResume },
    { id: 'applying', label: 'Applying', test: (u) => u.applied + u.interviews + u.offers > 0 },
];

const COLUMNS = [
    { key: 'name', label: 'User', sort: (u) => (u.name || u.email).toLowerCase() },
    { key: 'joinedAt', label: 'Joined', sort: (u) => u.joinedAt || '' },
    { key: 'lastActiveAt', label: 'Last active', sort: (u) => u.lastActiveAt || '' },
    { key: 'searches', label: 'Searches', sort: (u) => u.searches, num: true },
    { key: 'savedJobs', label: 'Saved', sort: (u) => u.savedJobs, num: true },
    { key: 'applied', label: 'Applied · Int · Offer', sort: (u) => u.applied * 100 + u.interviews * 10 + u.offers, num: true },
    { key: 'aiUses', label: 'AI uses', sort: (u) => u.aiUses, num: true },
    { key: 'hasResume', label: 'Resume', sort: (u) => u.resumeUploadedAt || '' },
    { key: 'location', label: 'Location · role', sort: (u) => (u.location || '~').toLowerCase() },
];

function toCsv(users) {
    const head = ['name', 'email', 'provider', 'joined', 'last_active', 'last_sign_in', 'searches', 'saved_jobs', 'applied', 'interviews', 'offers', 'ai_uses', 'resume_uploaded', 'location', 'desired_role', 'experience_level'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = users.map((u) => [u.name, u.email, u.provider, u.joinedAt, u.lastActiveAt, u.lastSignInAt, u.searches, u.savedJobs, u.applied, u.interviews, u.offers, u.aiUses, u.resumeUploadedAt, u.location, u.desiredRole, u.experienceLevel].map(esc).join(','));
    return [head.join(','), ...rows].join('\n');
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

export default function Admin() {
    const [data, setData] = useState(null);
    const [state, setState] = useState('loading'); // loading | ready | denied | error
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState({ key: 'lastActiveAt', dir: 'desc' });

    const load = async () => {
        setState((s) => (s === 'ready' ? 'ready' : 'loading'));
        try {
            const res = await api.get('/admin/users');
            setData(res.data);
            setState('ready');
        } catch (err) {
            setState(err?.response?.status === 404 || err?.response?.status === 401 ? 'denied' : 'error');
        }
    };

    useEffect(() => { load(); }, []);

    const rows = useMemo(() => {
        if (!data) return [];
        const q = query.trim().toLowerCase();
        const test = FILTERS.find((f) => f.id === filter)?.test || (() => true);
        const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[2];
        return data.users
            .filter(test)
            .filter((u) => !q || `${u.name} ${u.email} ${u.location} ${u.desiredRole}`.toLowerCase().includes(q))
            .sort((a, b) => {
                const x = col.sort(a); const y = col.sort(b);
                const cmp = x < y ? -1 : x > y ? 1 : 0;
                return sort.dir === 'asc' ? cmp : -cmp;
            });
    }, [data, query, filter, sort]);

    const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

    const exportCsv = () => {
        const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `appliqa-users-${new Date().toISOString().slice(0, 10)}.csv` });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    if (state === 'denied') {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#F7F5F2] flex items-center justify-center px-5">
                <div className="text-center">
                    <p className="ds-mono ds-mono-muted m-0">404</p>
                    <h1 className="m-0 mt-2 text-[24px] font-semibold text-[#171717]">Page not found</h1>
                </div>
            </div>
        );
    }

    const s = data?.summary;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F7F5F2]">
            <div className="flex items-center justify-between gap-3 px-5 md:px-8 py-3.5 border-0 border-b border-[#D8D4CC]">
                <span className="ds-mono truncate">admin / users</span>
                <span className="ds-mono ds-mono-muted shrink-0">
                    {data ? `updated ${ago(data.generatedAt)}` : 'loading'} <span className="inline-block w-1.5 h-1.5 bg-[#CA3C0A] ml-1 align-middle" aria-hidden="true" />
                </span>
            </div>

            {state === 'error' && (
                <div className="px-5 md:px-8 py-6">
                    <p className="m-0 text-[14px] text-[#B91C1C]">Couldn’t load users. Check the server logs, then try again.</p>
                    <button type="button" onClick={load} className="ds-btn ds-btn-ink mt-3 !min-h-10 !px-4">Try again <FiRefreshCw size={14} /></button>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D8D4CC] border-0 border-b border-[#D8D4CC]">
                <Stat label="users" value={s ? s.totalUsers : '…'} hint={s ? `+${s.newLast7Days} in the last 7 days` : ''} />
                <Stat label="active 7 days" value={s ? s.activeLast7Days : '…'} hint={s ? `${s.activeLast30Days} in the last 30 days` : ''} />
                <Stat label="with a resume" value={s ? s.withResume : '…'} hint={s && s.totalUsers ? `${Math.round((s.withResume / s.totalUsers) * 100)}% of users` : ''} />
                <Stat label="searches · saved · applied" value={s ? `${s.totalSearches} · ${s.totalSavedJobs} · ${s.totalApplied}` : '…'} />
            </div>

            {/* Controls */}
            <div className="px-5 md:px-8 pt-5 pb-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="relative flex-1 min-w-0">
                        <span className="sr-only">Search users</span>
                        <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8580]" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name, email, location or role"
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
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter users">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            aria-pressed={filter === f.id}
                            className={`shrink-0 h-9 px-3 text-[13px] font-medium border cursor-pointer ${filter === f.id ? 'bg-[#171717] text-white border-[#171717]' : 'bg-white text-[#171717] border-[#D8D4CC] hover:border-[#171717]'}`}
                        >
                            {f.label}
                            {data && <span className="ds-mono ml-1.5 opacity-60">{data.users.filter(f.test).length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="px-5 md:px-8 pb-12">
                <div className="bg-white border border-[#D8D4CC] overflow-x-auto">
                    <table className="w-full min-w-[1080px] border-collapse text-left">
                        <thead>
                            <tr className="border-0 border-b-2 border-[#171717]">
                                {COLUMNS.map((c) => (
                                    <th key={c.key} scope="col" className={`p-0 ${c.num ? 'text-right' : ''}`} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(c.key)}
                                            className={`w-full h-11 px-4 inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer ds-mono whitespace-nowrap ${c.num ? 'justify-end' : ''} ${sort.key === c.key ? 'text-[#171717]' : 'text-[#6F6A65] hover:text-[#171717]'}`}
                                        >
                                            {c.label}
                                            {sort.key === c.key && (sort.dir === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {state === 'loading' && !data && Array.from({ length: 6 }, (_, i) => (
                                <tr key={i} className="border-0 border-b border-[#EFECE6]">
                                    <td colSpan={COLUMNS.length} className="px-4 py-4"><div className="h-4 bg-[#EFECE6] w-1/2" /></td>
                                </tr>
                            ))}
                            {rows.map((u) => (
                                <tr key={u.id} className="border-0 border-b border-[#EFECE6] hover:bg-[#FAF8F5] align-top">
                                    <td className="px-4 py-3 min-w-[230px]">
                                        <div className="text-[14px] font-semibold text-[#171717] truncate max-w-[260px]">{u.name || '—'}</div>
                                        <div className="text-[13px] text-[#4A4540] truncate max-w-[260px]">{u.email}</div>
                                        <div className="ds-mono ds-mono-muted mt-0.5">{u.provider}{u.verified ? '' : ' · unverified'}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[13px] text-[#4A4540]" title={fullDate(u.joinedAt)}>{ago(u.joinedAt)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[13px]" title={fullDate(u.lastActiveAt)}>
                                        <span className={within(u.lastActiveAt, 7) ? 'text-[#047857] font-medium' : within(u.lastActiveAt, 30) ? 'text-[#171717]' : 'text-[#8A8580]'}>{ago(u.lastActiveAt)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[14px]">{u.searches}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[14px]">{u.savedJobs}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[14px] whitespace-nowrap">{u.applied} · {u.interviews} · <span className={u.offers ? 'text-[#047857] font-semibold' : ''}>{u.offers}</span></td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[14px]">{u.aiUses}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[13px]" title={fullDate(u.resumeUploadedAt)}>
                                        {u.hasResume ? <span className="inline-flex items-center gap-1 text-[#171717]"><FiCheck size={13} className="text-[#047857]" />{ago(u.resumeUploadedAt)}</span> : <span className="text-[#8A8580]">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-[13px] text-[#4A4540] min-w-[180px]">
                                        <div className="truncate max-w-[220px]">{u.location || '—'}</div>
                                        {(u.desiredRole || u.experienceLevel) && <div className="ds-mono ds-mono-muted truncate max-w-[220px]">{[u.desiredRole, u.experienceLevel].filter(Boolean).join(' · ')}</div>}
                                    </td>
                                </tr>
                            ))}
                            {data && !rows.length && (
                                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[14px] text-[#6F6A65]">No users match.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {data && <p className="ds-mono ds-mono-muted m-0 mt-3">{rows.length} of {data.users.length} users · “last active” is the latest of sign-in, search, saved job or resume upload</p>}
            </div>
        </div>
    );
}
