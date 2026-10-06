import { useEffect, useRef, useState } from 'react';
import { saveJob, deleteSavedJob, getSavedJobs } from '../services/api';

// Search results use `id`; tracker rows use `jobId`
const keyOf = (job) => job?.id ?? job?.jobId;

// Save / unsave a job with an instant UI. The bookmark flips right away, the
// request runs behind it, and quick repeated clicks settle on the last choice.
// `onChange(jobId, saved, savedId)` keeps parent lists in step.
export function useSaveJob({ job, user, initialSaved = false, initialSavedId = null, onChange, payload }) {
    const [saved, setSaved] = useState(initialSaved);
    const [savedId, setSavedId] = useState(initialSavedId);
    const [error, setError] = useState('');

    const server = useRef({ saved: initialSaved, id: initialSavedId }); // what the database has
    const wanted = useRef(initialSaved); // what the person last asked for
    const running = useRef(false);
    const latest = useRef({ job, onChange, payload });
    latest.current = { job, onChange, payload };

    // Parent learned something new (e.g. saved list loaded) while we're idle
    useEffect(() => {
        if (running.current) return;
        server.current = { saved: initialSaved, id: initialSavedId };
        wanted.current = initialSaved;
        setSaved(initialSaved);
        setSavedId(initialSavedId);
    }, [initialSaved, initialSavedId]);

    const findId = async () => {
        const res = await getSavedJobs();
        return (res.data?.jobs || []).find((j) => j.jobId === keyOf(latest.current.job))?._id || null;
    };

    const sync = async () => {
        if (running.current) return;
        running.current = true;
        try {
            while (server.current.saved !== wanted.current) {
                const { job: j, payload: extra } = latest.current;
                if (wanted.current) {
                    let id = null;
                    try {
                        const res = await saveJob({ ...j, id: keyOf(j), ...(extra ? extra() : {}) });
                        id = res.data?.savedJob?.id || null;
                    } catch (err) {
                        if (err.response?.status !== 409) throw err;
                        id = await findId(); // already in the tracker
                    }
                    server.current = { saved: true, id };
                } else {
                    const id = server.current.id || await findId();
                    if (id) await deleteSavedJob(id);
                    server.current = { saved: false, id: null };
                }
            }
            setSavedId(server.current.id);
            latest.current.onChange?.(keyOf(latest.current.job), server.current.saved, server.current.id);
        } catch (err) {
            console.error('Saving the job failed:', err);
            // Put the bookmark back to what the database really has
            wanted.current = server.current.saved;
            setSaved(server.current.saved);
            setError(server.current.saved ? 'Couldn’t remove it from your tracker. Try again.' : 'Couldn’t save it to your tracker. Try again.');
            latest.current.onChange?.(keyOf(latest.current.job), server.current.saved, server.current.id);
        } finally {
            running.current = false;
        }
    };

    const toggle = () => {
        if (!user) return false;
        const next = !wanted.current;
        wanted.current = next;
        setSaved(next);
        setError('');
        latest.current.onChange?.(keyOf(latest.current.job), next, next ? server.current.id : null);
        sync();
        return true;
    };

    return { saved, savedId, toggle, error };
}
