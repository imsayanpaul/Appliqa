import { useState } from 'react';
import { FiX, FiMapPin, FiArrowRight, FiLoader } from 'react-icons/fi';
import SelectMenu from './ui/SelectMenu';
import citiesByCountry from '../data/cities';

const COUNTRIES = Object.keys(citiesByCountry);

// Asks once for the city that job searches default to. Detect uses the
// visitor's IP; manual picks a country and city right here in the card.
export default function LocationPrompt({ detecting, onDetect, onManualSave, onDismiss }) {
    const [manual, setManual] = useState(false);
    const [country, setCountry] = useState('India');
    const [city, setCity] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const busy = detecting || saving;

    const detect = async () => {
        setError('');
        const ok = await onDetect();
        if (ok === false) {
            setManual(true);
            setError('We couldn’t detect your city. Pick it here instead.');
        }
    };

    const save = async () => {
        if (!city) return;
        setSaving(true);
        setError('');
        try {
            await onManualSave(country, city);
        } catch {
            setError('Couldn’t save that. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div role="dialog" aria-labelledby="loc-title" className="location-prompt ds-toast !items-stretch !flex-col !w-[400px] max-[767px]:!w-auto min-[900px]:!bottom-[72px] !z-[1100]">
            <div className="flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                <span className="ds-mono ds-mono-muted self-center px-5 py-3 flex items-center gap-2">
                    <FiMapPin size={13} className="text-[#CA3C0A]" /> job location
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    disabled={busy}
                    aria-label="Not now"
                    className="w-11 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#171717] hover:bg-[#F7F5F2]"
                >
                    <FiX size={16} />
                </button>
            </div>

            <div className="px-5 pt-4 pb-5">
                <h3 id="loc-title" className="m-0 text-[18px] font-semibold tracking-[-0.015em] text-[#171717]">Where are you looking for work?</h3>
                <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-[#4A4540]">
                    Searches and your for-you jobs start in this city. You can change it any time.
                </p>

                {manual && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div>
                            <p className="ds-mono ds-mono-muted m-0 mb-1.5">country</p>
                            <SelectMenu
                                ariaLabel="Country"
                                size="sm"
                                value={country}
                                onChange={(v) => { setCountry(v); setCity(''); }}
                                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                            />
                        </div>
                        <div>
                            <p className="ds-mono ds-mono-muted m-0 mb-1.5">city</p>
                            <SelectMenu
                                ariaLabel="City"
                                size="sm"
                                value={city}
                                onChange={setCity}
                                options={[{ value: '', label: 'Choose a city' }, ...citiesByCountry[country].map((c) => ({ value: c, label: c }))]}
                            />
                        </div>
                    </div>
                )}
                {error && <p role="alert" className="m-0 mt-3 text-[13px] text-[#B91C1C]">{error}</p>}
            </div>

            {manual ? (
                <div className="grid grid-cols-[1fr_auto] border-0 border-t border-[#D8D4CC]">
                    <button type="button" onClick={save} disabled={!city || busy} className="ds-btn ds-btn-accent !min-h-12 !px-5 !text-[14px] disabled:!bg-[#EFECE6] disabled:!text-[#8A8580] disabled:!opacity-100">
                        {saving ? 'Saving…' : city ? `Use ${city}` : 'Choose a city'} {saving ? <FiLoader size={15} className="animate-spin" /> : <FiArrowRight size={15} />}
                    </button>
                    <button type="button" onClick={() => setManual(false)} disabled={busy} className="ds-btn !min-h-12 !px-5 !text-[14px] bg-transparent text-[#171717] hover:bg-[#F7F5F2] border-0 border-l border-[#D8D4CC]">
                        Back
                    </button>
                </div>
            ) : (
                <div className="border-0 border-t border-[#D8D4CC]">
                    <button type="button" onClick={detect} disabled={busy} className="ds-btn ds-btn-ink w-full !min-h-12 !px-5 !text-[14px] hover:!bg-[#CA3C0A] disabled:cursor-wait">
                        {detecting ? 'Detecting your city…' : 'Detect my city'}
                        {detecting ? <FiLoader size={15} className="animate-spin" /> : <FiMapPin size={15} />}
                    </button>
                    <div className="grid grid-cols-2">
                        <button type="button" onClick={() => setManual(true)} disabled={busy} className="ds-btn !min-h-11 !px-5 !text-[14px] bg-transparent text-[#171717] hover:bg-[#F7F5F2] border-0 border-t border-[#D8D4CC]">
                            Choose manually
                        </button>
                        <button type="button" onClick={onDismiss} disabled={busy} className="ds-btn !min-h-11 !px-5 !text-[14px] bg-transparent text-[#6F6A65] hover:text-[#171717] hover:bg-[#F7F5F2] border-0 border-t border-l border-[#D8D4CC]">
                            Not now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
