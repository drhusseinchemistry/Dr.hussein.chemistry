import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc } from 'firebase/firestore';
import { CharityFormConfig, CharitySubmission } from '../types';
import { HeartHandshake, MapPin, Send, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
    onBack?: () => void;
}

const CharityFormView: React.FC<Props> = ({ onBack }) => {
    const [config, setConfig] = useState<CharityFormConfig | null>(null);
    const [responses, setResponses] = useState<Record<string, string | string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [locationError, setLocationError] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'charity_forms', 'main_form'), (snapshot) => {
            if (snapshot.exists() && snapshot.data().isVisible) {
                setConfig({ id: snapshot.id, ...snapshot.data() } as CharityFormConfig);
            } else {
                setConfig(null); // form doesn't exist or is hidden
            }
        });
        return () => unsubscribe();
    }, []);

    const handleTextChange = (id: string, val: string) => {
        setResponses(prev => ({ ...prev, [id]: val }));
    };

    const handleCheckboxToggle = (id: string, opt: string) => {
        setResponses(prev => {
            const current = (prev[id] as string[]) || [];
            if (current.includes(opt)) {
                return { ...prev, [id]: current.filter(o => o !== opt) };
            } else {
                return { ...prev, [id]: [...current, opt] };
            }
        });
    };

    const requestLocation = () => {
        setGettingLocation(true);
        setLocationError('');
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setGettingLocation(false);
                },
                (error) => {
                    console.error(error);
                    setGettingLocation(false);
                    setLocationError('نەشیایە لۆکەیشنی وەربگریت، هیڤیە رێپێدانێ بدەیێ. (دشێی بەردەوام بی یان دووبارە هەول بدەی)');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } else {
            setGettingLocation(false);
            setLocationError('بەراوزەرێ تە پشتەڤانیا لۆکەیشنی ناکەت.');
        }
    };

    const handleSubmit = async () => {
        if (!config) return;

        // Check required fields
        let missing = false;
        for (const field of config.fields) {
            if (field.required) {
                const val = responses[field.id];
                if (!val || (Array.isArray(val) && val.length === 0)) {
                    missing = true;
                    break;
                }
            }
        }

        if (missing) {
            alert('هیڤیە هەمی خانەیێن پێدڤی پڕ بکەی.');
            return;
        }

        if (config.requireGps && !location) {
            alert('هیڤیە لۆکەیشنێ خۆ فۆرمی دا دیار بکە.');
            return;
        }

        setIsSubmitting(true);
        try {
            const submission: CharitySubmission = {
                timestamp: Date.now(),
                responses,
                gpsLocation: location
            };
            await addDoc(collection(db, 'charity_submissions'), submission);
            setHasSubmitted(true);
        } catch (error) {
            console.error(error);
            alert("خەلەتیەک رویدا د هنارتنا فۆرمی دا.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!config) {
        return (
            <div className="text-center py-20 text-gray-500">
                چ فۆرمێن هانکاریێ نوکە بەردەست نینن.
            </div>
        );
    }

    if (hasSubmitted) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center border-2 border-emerald-50">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex justify-center items-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 mb-4">زۆر سوپاس</h2>
                    <p className="text-lg text-gray-500 mb-8 font-bold">زانیاریێن تە ب سەرکەفتی هاتنە وەرگرتن.</p>
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition"
                        >
                            زڤرین بۆ سەرەکی
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4">
            {onBack && (
                <button onClick={onBack} className="mb-6 flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition">
                    <ArrowLeft className="w-5 h-5" /> 
                    <span>زڤرین</span>
                </button>
            )}

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-50">
                <div className="bg-emerald-600 p-8 text-center text-white relative">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <HeartHandshake className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">{config.title}</h1>
                    <p className="text-emerald-100 font-medium">{config.description}</p>
                </div>

                <div className="p-6 sm:p-10 space-y-8">
                    {config.fields.sort((a,b) => a.order - b.order).map(field => (
                        <div key={field.id} className="space-y-3">
                            <label className="block text-lg font-bold text-gray-800">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {field.type === 'TEXT' ? (
                                <textarea 
                                    className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-500 outline-none text-lg resize-y bg-gray-50 focus:bg-white transition-colors"
                                    rows={2}
                                    placeholder="لێرە بنڤیسە..."
                                    value={(responses[field.id] as string) || ''}
                                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(field.options || []).map(opt => {
                                        const isSelected = ((responses[field.id] as string[]) || []).includes(opt);
                                        return (
                                            <button 
                                                key={opt}
                                                onClick={() => handleCheckboxToggle(field.id, opt)}
                                                className={`p-4 rounded-xl border-2 text-right transition-all font-bold ${
                                                    isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* GPS Section */}
                    {config.requireGps && (
                        <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-blue-200 text-blue-700 rounded-full flex justify-center items-center shrink-0">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-1">ناسکرنا جهـ و لۆکەیشن</h4>
                                    <p className="text-gray-600 text-sm mb-4">
                                        بۆ کو باشتر هاریکاری بگەهیتە تە، هیڤیە رێگە بدە کو لۆکەیشنا تە یا دروست بهێتە دیارکرن.
                                    </p>
                                    
                                    {location ? (
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 inline-flex">
                                            <CheckCircle2 className="w-5 h-5" /> لۆکەیشن هاتیە وەرگرتن
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={requestLocation}
                                            disabled={gettingLocation}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex gap-2 items-center"
                                        >
                                            {gettingLocation ? 'دهێتە لێگەریان...' : 'لۆکەیشنا خۆ دیار بکە'}
                                        </button>
                                    )}
                                    
                                    {locationError && (
                                        <div className="mt-3 flex gap-2 items-start text-red-600 text-sm font-medium">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {locationError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {isSubmitting ? 'دهێتە هنارتن...' : <><Send className="w-6 h-6" /> هنارتنا فۆرمی</>}
                    </button>
                    <p className="text-center text-gray-400 text-sm mt-4 font-bold">
                        پێزانینێن تە یا لایێ مە یێن پاراستینە
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CharityFormView;
