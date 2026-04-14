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
  const needsName = polls.some(p => p.requireName) && !initialName;

  useEffect(() => {
    const q = query(collection(db, 'polls'), where('isVisible', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`polls_submitted_${studentName}`);
    if (saved) setHasSubmitted(true);
  }, [studentName]);

  const handleSubmitAll = async () => {
    if (!studentName.trim()) {
      alert("هیڤیە ناڤێ خۆ بنڤیسە.");
      return;
    }

    const unanswered = polls.filter(p => !responses[p.id]);
    if (unanswered.length > 0) {
      alert("هیڤیە بەرسڤا هەمی پرسیاران بدە.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const timestamp = Date.now();

      polls.forEach(poll => {
        const docRef = doc(collection(db, 'poll_responses'));
        batch.set(docRef, {
          pollId: poll.id,
          studentName,
          response: responses[poll.id],
          timestamp
        });
      });

      await batch.commit();
      setHasSubmitted(true);
      localStorage.setItem(`polls_submitted_${studentName}`, 'true');
    } catch (e) {
      console.error(e);
      alert("خەلەتیەک چێبوو د هنارتنا بەرسڤان دا.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (polls.length === 0) return null;

  if (!isStarted) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-10 px-4">
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 group hover:border-indigo-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800">راپرسی و بۆچوون</h3>
              <p className="text-sm text-gray-500 font-medium">بەشداری بکە د باشترکرنا بابەتێن مە دا</p>
            </div>
          </div>
          <button 
            onClick={() => setIsStarted(true)}
            className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            دەستپێکرن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-2xl mx-auto py-10 px-4 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 bg-indigo-500 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-800">راپرسی و بۆچوون</h3>
          </div>
          <button 
            onClick={() => setIsStarted(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-xl overflow-hidden">
          <div className="bg-indigo-50 p-6 border-b border-indigo-100">
            {needsName ? (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-indigo-700">ناڤێ تە یێ سیانی:</label>
                <input 
                  type="text"
                  placeholder="ناڤێ خۆ لێرە بنڤیسە..."
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <MessageSquare className="w-5 h-5" />
                {studentName ? `بخێر بێی ${studentName}` : 'بەشداری بکە د راپرسیێ دا'}
              </div>
            )}
          </div>

          <div className="p-6 space-y-8">
            {hasSubmitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-gray-800">سوپاس بۆ بەشدارییا تە!</h4>
                <p className="text-gray-500 font-medium">بۆچوونێن تە ب سەرکەفتی هاتنە وەرگرتن.</p>
                <button 
                  onClick={() => setIsStarted(false)}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold mt-4"
                >
                  زڤرین
                </button>
              </div>
            ) : (
              <>
                {polls.map((poll, idx) => (
                  <div key={poll.id} className={`space-y-4 ${idx !== 0 ? 'pt-8 border-t border-gray-100' : ''}`}>
                    <h4 className="text-lg font-bold text-gray-800 flex gap-2">
                      <span className="text-indigo-500">#{idx + 1}</span>
                      {poll.question}
                    </h4>
                    
                    <div className="space-y-3">
                      {poll.type === 'CHOICE' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {poll.options?.map((opt, i) => (
                            <button 
                              key={i}
                              onClick={() => setResponses({...responses, [poll.id]: opt})}
                              className={`p-3 rounded-xl border-2 font-bold transition-all ${responses[poll.id] === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-gray-100 text-gray-500 hover:border-indigo-200'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea 
                          placeholder="بۆچوونا خۆ لێرە بنڤیسە..."
                          value={responses[poll.id] || ''}
                          onChange={(e) => setResponses({...responses, [poll.id]: e.target.value})}
                          className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none font-medium min-h-[100px] resize-none"
                        />
                      )}
                    </div>
                  </div>
                ))}

                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmitAll}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'دهێتە هنارتن...' : (
                    <>
                      <Send className="w-5 h-5" />
                      هنارتنا هەمی بۆچوونان
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollSection;
