import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, writeBatch, doc, orderBy } from 'firebase/firestore';
import { Poll, PollResponse } from '../types';
import { MessageSquare, Send, CheckCircle2, X } from 'lucide-react';

interface PollSectionProps {
  studentName?: string;
}

const PollSection: React.FC<PollSectionProps> = ({ studentName: initialName }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localName, setLocalName] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  const studentName = initialName || localName;
  const anyPollRequiresName = polls.some(p => p.requireName);
  const needsNameInput = anyPollRequiresName && !initialName;

  useEffect(() => {
    const q = query(collection(db, 'polls'), where('isVisible', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll));
      setPolls(fetchedPolls);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // We use a generic key if no name is required, or the specific name
    const storageKey = anyPollRequiresName ? `polls_submitted_${studentName}` : `polls_submitted_anon`;
    const saved = localStorage.getItem(storageKey);
    if (saved && (studentName || !anyPollRequiresName)) setHasSubmitted(true);
  }, [studentName, anyPollRequiresName]);

  const handleSubmitAll = async () => {
    if (anyPollRequiresName && !studentName.trim()) {
      alert("هیڤیە ناڤێ خۆ بنڤیسە چونکە ئەڤ راپرسیە پێدڤی ب ناڤی یە.");
      return;
    }

    const unanswered = polls.filter(p => !responses[p.id]);
    if (unanswered.length > 0) {
      alert("هیڤیە بەرسڤا هەمی پرسیاران بدە بەری هنارتنێ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const timestamp = Date.now();
      const finalName = anyPollRequiresName ? studentName : (studentName || "بەشداربوو (بێ ناڤ)");

      polls.forEach(poll => {
        const docRef = doc(collection(db, 'poll_responses'));
        batch.set(docRef, {
          pollId: poll.id,
          studentName: finalName,
          response: responses[poll.id],
          timestamp
        });
      });

      await batch.commit();
      setHasSubmitted(true);
      const storageKey = anyPollRequiresName ? `polls_submitted_${studentName}` : `polls_submitted_anon`;
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      console.error(e);
      alert("خەلەتیەک چێبوو د هنارتنا بۆچوونان دا.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (polls.length === 0) return null;

  if (!isStarted) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-6 px-4">
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 group hover:border-indigo-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800">راپرسی و بۆچوون</h3>
              <p className="text-sm text-gray-500 font-medium">بۆچوونا تە بۆ مە یا گرنگە</p>
            </div>
          </div>
          <button 
            onClick={() => setIsStarted(true)}
            className="w-full md:w-auto bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
          >
            دەستپێکرن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-full max-w-3xl mx-auto py-10 px-6 space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">راپرسی و بۆچوون</h3>
          </div>
          <button 
            onClick={() => setIsStarted(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-7 h-7 text-gray-400" />
          </button>
        </div>

        <div className="space-y-10 pb-20">
          {hasSubmitted ? (
            <div className="text-center py-20 space-y-6 bg-indigo-50/30 rounded-3xl border-2 border-dashed border-indigo-100">
              <div className="w-24 h-24 bg-white text-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-3xl font-black text-gray-800 mb-2">سوپاس بۆ تە!</h4>
                <p className="text-gray-500 font-bold">بۆچوونێن تە ب سەرکەفتی گەهشتنە مە.</p>
              </div>
              <button 
                onClick={() => setIsStarted(false)}
                className="bg-indigo-600 text-white px-12 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                زڤرین بۆ سەرەکی
              </button>
            </div>
          ) : (
            <>
              {needsNameInput && (
                <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 shadow-sm">
                  <label className="block text-sm font-black text-indigo-700 mb-3">ناڤێ تە یێ سیانی (پێدڤیە):</label>
                  <input 
                    type="text"
                    placeholder="ناڤێ خۆ لێرە بنڤیسە..."
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm text-lg"
                  />
                </div>
              )}

              <div className="space-y-12">
                {polls.map((poll, idx) => (
                  <div key={poll.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                    <h4 className="text-xl font-black text-gray-800 mb-6 flex items-start gap-3">
                      <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      {poll.question}
                    </h4>
                    
                    <div className="px-2">
                      {poll.type === 'CHOICE' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {poll.options?.map((opt, i) => (
                            <button 
                              key={i}
                              onClick={() => setResponses({...responses, [poll.id]: opt})}
                              className={`p-4 rounded-2xl border-2 font-bold text-lg transition-all text-right flex justify-between items-center ${responses[poll.id] === opt ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'border-gray-100 text-gray-500 hover:border-indigo-200 hover:bg-gray-50'}`}
                            >
                              <span>{opt}</span>
                              {responses[poll.id] === opt && <CheckCircle2 className="w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea 
                          placeholder="بۆچوونا خۆ لێرە بنڤیسە..."
                          value={responses[poll.id] || ''}
                          onChange={(e) => setResponses({...responses, [poll.id]: e.target.value})}
                          className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 outline-none font-bold text-lg min-h-[150px] resize-none bg-gray-50/30"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-gray-100">
                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmitAll}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>دهێتە هنارتن...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      هنارتنا هەمی بۆچوونان
                    </>
                  )}
                </button>
                <p className="text-center text-gray-400 text-xs mt-4 font-medium">
                  {anyPollRequiresName ? 'ئەڤ راپرسیە پێدڤی ب ناڤێ تە هەیە' : 'تو دشێی بێ ناڤ بەشداریێ بکەی'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollSection;
