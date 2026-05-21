import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, setDoc, orderBy } from 'firebase/firestore';
import { CharityField, CharityFormConfig, CharitySubmission } from '../types';
import { Plus, Trash2, Eye, EyeOff, Save, Settings, Users, MapPin, Grid, AlignLeft } from 'lucide-react';

const CharityManager: React.FC = () => {
    const [config, setConfig] = useState<CharityFormConfig | null>(null);
    const [submissions, setSubmissions] = useState<CharitySubmission[]>([]);
    const [activeTab, setActiveTab] = useState<'submissions' | 'settings'>('submissions');
    const [isSaving, setIsSaving] = useState(false);

    // Default form structure if none exists
    const defaultConfig: CharityFormConfig = {
        title: "فۆرمێ هانکاریێ",
        description: "هیڤیە پێزانینێن خۆ ب دروستی بنڤیسە دا کو پتریا هانکاریێ بگەهیتە هەژیان.",
        isVisible: false,
        requireGps: true,
        fields: [
            { id: 'f1', label: 'ناڤێ سێ قولی', type: 'TEXT', required: true, order: 1 },
            { id: 'f2', label: 'چەند کەسن د خێزانێ دا؟', type: 'TEXT', required: true, order: 2 },
            { id: 'f3', label: 'خانی هەیە یان کرێدارن؟', type: 'CHECKBOX', options: ['خانیێ خۆیە', 'کرێدارن'], required: true, order: 3 },
            { id: 'f4', label: 'معاش هەیە یان نە؟ (ئەگەر هەیە چەندە؟)', type: 'TEXT', required: true, order: 4 },
            { id: 'f5', label: 'رەقەم موبائیل', type: 'TEXT', required: true, order: 5 },
            { id: 'f6', label: 'جهێ نیشتەجێبونێ', type: 'TEXT', required: true, order: 6 },
            { id: 'f7', label: 'نەخوش ل مال هەنە؟ (چ نەخوشی؟)', type: 'TEXT', required: false, order: 7 },
            { id: 'f8', label: 'چەند قوتابی دچنە قوتابخانێ؟', type: 'TEXT', required: true, order: 8 },
            { id: 'f9', label: 'سیارە هەیە؟', type: 'CHECKBOX', options: ['بەڵێ', 'نەخێر'], required: true, order: 9 },
        ]
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'charity_forms', 'main_form'), 
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setConfig({ id: docSnapshot.id, ...docSnapshot.data() } as CharityFormConfig);
                } else {
                    setConfig(defaultConfig);
                    // Auto-create default
                    setDoc(doc(db, 'charity_forms', 'main_form'), defaultConfig).catch(err => {
                        console.error("Failed to create default:", err);
                    });
                }
            },
            (error) => {
                console.error("Error loading forms:", error);
                setConfig(defaultConfig);
            }
        );
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'charity_submissions'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharitySubmission)));
            },
            (error) => {
                console.error("Error loading submissions:", error);
                // Don't crash, just empty list
                setSubmissions([]);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleSaveConfig = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'charity_forms', 'main_form'), config);
            alert("رێکخستنێن فۆرمێ هاتنە پاراستن.");
        } catch (e) {
            console.error(e);
            alert("خەلەتیەک رویدا");
        }
        setIsSaving(false);
    };

    const addField = () => {
        if (!config) return;
        const newField: CharityField = {
            id: 'f' + Date.now(),
            label: 'پرسیارا نوی',
            type: 'TEXT',
            required: false,
            order: config.fields.length + 1
        };
        setConfig({ ...config, fields: [...config.fields, newField] });
    };

    const removeField = (id: string) => {
        if (!config) return;
        setConfig({ ...config, fields: config.fields.filter(f => f.id !== id) });
    };

    const updateField = (id: string, updates: Partial<CharityField>) => {
        if (!config) return;
        const newFields = config.fields.map(f => f.id === id ? { ...f, ...updates } : f);
        setConfig({ ...config, fields: newFields });
    };

    const deleteSubmission = async (id: string) => {
        if (confirm("دڵنیای ژ ڕەشکرنا ڤی فۆرمی؟")) {
            await deleteDoc(doc(db, 'charity_submissions', id));
        }
    };

    const openMap = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    if (!config) return <div className="p-10 text-center">بارکرن...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800">رێڤەبەریا فۆرمێن هانکاریێ</h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('submissions')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Users className="w-4 h-4" /> فۆرمێن گەهشتین
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Settings className="w-4 h-4" /> رێکخستنێن فۆرمی
                    </button>
                </div>
            </div>

            {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">زانیاریێن گشتی یێن فۆرمی</h3>
                        <button
                            onClick={() => setConfig({...config, isVisible: !config.isVisible})}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${config.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {config.isVisible ? <Eye className="w-5 h-5"/> : <EyeOff className="w-5 h-5"/>}
                            {config.isVisible ? 'فۆرم یا دیارە' : 'فۆرم یا ڤەشارتیە'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">ناڤنیشان (سەردێر)</label>
                            <input 
                                type="text"
                                value={config.title}
                                onChange={(e) => setConfig({...config, title: e.target.value})}
                                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">وەسف (زانیاری)</label>
                            <textarea 
                                value={config.description}
                                onChange={(e) => setConfig({...config, description: e.target.value})}
                                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none resize-none h-20"
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <input 
                                type="checkbox" 
                                id="requireGps"
                                checked={config.requireGps}
                                onChange={(e) => setConfig({...config, requireGps: e.target.checked})}
                                className="w-5 h-5 accent-indigo-600 rounded"
                            />
                            <label htmlFor="requireGps" className="font-bold text-gray-800 cursor-pointer">
                                پێدڤیە لۆکەیشن (GPS) بهێتە هنارتن دگەل فۆرمی
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">پرسیار و خانە</h3>
                            <button 
                                onClick={addField}
                                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
                            >
                                <Plus className="w-4 h-4" /> پرسیارەکا نوی
                            </button>
                        </div>

                        <div className="space-y-4">
                            {config.fields.map((field, index) => (
                                <div key={field.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 relative group">
                                    <button 
                                        onClick={() => removeField(field.id)}
                                        className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-10 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">پرسیار</label>
                                            <input 
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm font-bold bg-white"
                                            />
                                        </div>
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">جۆرێ پرسیارێ</label>
                                                <div className="flex bg-gray-200 p-1 rounded-xl">
                                                    <button 
                                                        onClick={() => updateField(field.id, { type: 'TEXT' })}
                                                        className={`flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${field.type === 'TEXT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
                                                    >
                                                        <AlignLeft className="w-3 h-3" /> بوشایی
                                                    </button>
                                                    <button 
                                                        onClick={() => updateField(field.id, { type: 'CHECKBOX', options: field.options || ['بەڵێ', 'نەخێر'] })}
                                                        className={`flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${field.type === 'CHECKBOX' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
                                                    >
                                                        <Grid className="w-3 h-3" /> چوارگۆشە
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input 
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                    className="w-4 h-4 accent-indigo-600 rounded"
                                                />
                                                <span className="text-sm font-bold text-gray-700">پێدڤیە</span>
                                            </div>
                                        </div>
                                    </div>

                                    {field.type === 'CHECKBOX' && (
                                        <div className="mr-10">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">هەڵبژاردن (ب کۆما (,) ژێک جودا بکە)</label>
                                            <input 
                                                type="text"
                                                value={(field.options || []).join(', ')}
                                                onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm bg-white"
                                                placeholder="نمونە: بەڵێ, نەخێر"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
                    >
                        {isSaving ? 'دهێتە پاراستن...' : <><Save className="w-5 h-5"/> پاراستنا فۆرمی</>}
                    </button>
                </div>
            )}

            {activeTab === 'submissions' && (
                <div className="space-y-4">
                    {submissions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm text-gray-400">
                            چ فۆرم نەهاتینە پرکرن.
                        </div>
                    ) : (
                        submissions.map((sub) => (
                            <div key={sub.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group hover:border-indigo-200 transition-all">
                                <button 
                                    onClick={() => sub.id && deleteSubmission(sub.id)}
                                    className="absolute top-6 left-6 p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                
                                <div className="text-xs text-gray-400 font-bold mb-4">
                                    دەم: {new Date(sub.timestamp).toLocaleString('ku-IQ')}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4">
                                    {config.fields.map(field => {
                                        const response = sub.responses[field.id];
                                        if (response === undefined || response === '') return null;
                                        
                                        return (
                                            <div key={field.id} className="border-b border-gray-50 pb-2">
                                                <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                                                <div className="font-bold text-gray-800">
                                                    {Array.isArray(response) ? response.join('، ') : response}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {sub.gpsLocation && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                                            <MapPin className="w-4 h-4 text-emerald-500" />
                                            لۆکەیشن هاتیە هنارتن
                                        </div>
                                        <button 
                                            onClick={() => sub.gpsLocation && openMap(sub.gpsLocation.lat, sub.gpsLocation.lng)}
                                            className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all"
                                        >
                                            بینین ل سەر نەخشەی
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default CharityManager;
