import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { Poll, PollResponse } from '../types';
import { Plus, Trash2, Eye, EyeOff, BarChart3, MessageSquare, Send, X, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';

const PollManager: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newType, setNewType] = useState<'CHOICE' | 'TEXT'>('CHOICE');
  const [newOptions, setNewOptions] = useState<string[]>(['بەلێ', 'نەخێر']);
  const [newRequireName, setNewRequireName] = useState(true);
  const [viewingResults, setViewingResults] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'poll_responses'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResponses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PollResponse)));
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePoll = async () => {
    if (!newQuestion.trim()) return;
    try {
      const maxOrder = polls.length > 0 ? Math.max(...polls.map(p => p.order || 0)) : 0;
      await addDoc(collection(db, 'polls'), {
        question: newQuestion,
        type: newType,
        options: newType === 'CHOICE' ? newOptions.filter(o => o.trim()) : [],
        isVisible: true,
        requireName: newRequireName,
        order: maxOrder + 1,
        timestamp: Date.now()
      });
      setIsCreating(false);
      setNewQuestion('');
      setNewOptions(['بەلێ', 'نەخێر']);
      setNewRequireName(true);
    } catch (e) {
      console.error(e);
      alert("خەلەتیەک چێبوو د دروستکرنا راپرسیێ دا.");
    }
  };

  const movePoll = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= polls.length) return;

    const pollA = polls[index];
    const pollB = polls[newIndex];

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'polls', pollA.id), { order: pollB.order });
      batch.update(doc(db, 'polls', pollB.id), { order: pollA.order });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVisibility = async (poll: Poll) => {
    try {
      await updateDoc(doc(db, 'polls', poll.id), { isVisible: !poll.isVisible });
    } catch (e) { console.error(e); }
  };

  const toggleRequireName = async (poll: Poll) => {
    try {
      await updateDoc(doc(db, 'polls', poll.id), { requireName: !poll.requireName });
    } catch (e) { console.error(e); }
  };

  const deletePoll = async (id: string) => {
    if (confirm("تۆ دڵنیای دتەوێت ئەڤێ راپرسیێ ڕەش بکەی؟")) {
      try {
        await deleteDoc(doc(db, 'polls', id));
        // Also delete responses (optional but cleaner)
        const respSnapshot = await getDocs(query(collection(db, 'poll_responses'), where('pollId', '==', id)));
        respSnapshot.docs.forEach(async (d) => await deleteDoc(d.ref));
      } catch (e) { console.error(e); }
    }
  };

  const getStats = (pollId: string) => {
    const pollResponses = responses.filter(r => r.pollId === pollId);
    const total = pollResponses.length;
    const poll = polls.find(p => p.id === pollId);
    
    if (!poll || poll.type === 'TEXT') return { total, breakdown: {} };

    const breakdown: Record<string, number> = {};
    poll.options?.forEach(opt => breakdown[opt] = 0);
    pollResponses.forEach(r => {
      if (breakdown[r.response] !== undefined) breakdown[r.response]++;
    });

    return { total, breakdown };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-800">رێڤەبەریا راپرسیان</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          راپرسیەکا نوی
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">پرسیارا راپرسیێ:</label>
            <input 
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none font-bold"
              placeholder="بۆ نموونە: ئایا بابەتێ کیمیایێ ب دلێ تە یە؟"
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setNewType('CHOICE')}
              className={`flex-1 p-3 rounded-xl font-bold border-2 transition-all ${newType === 'CHOICE' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-400'}`}
            >
              هەلبژارتن (بەلێ/نەخێر)
            </button>
            <button 
              onClick={() => setNewType('TEXT')}
              className={`flex-1 p-3 rounded-xl font-bold border-2 transition-all ${newType === 'TEXT' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-400'}`}
            >
              نڤیسین (بۆچوون)
            </button>
          </div>

          {newType === 'CHOICE' && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-600">بژاردەکان:</label>
              {newOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[i] = e.target.value;
                      setNewOptions(updated);
                    }}
                    className="flex-grow p-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 font-bold text-sm"
                  />
                  <button 
                    onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setNewOptions([...newOptions, ''])}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                + زێدەکرنا بژاردەیەکا دی
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
            <input 
              type="checkbox"
              id="requireName"
              checked={newRequireName}
              onChange={(e) => setNewRequireName(e.target.checked)}
              className="w-5 h-5 accent-indigo-600"
            />
            <label htmlFor="requireName" className="text-sm font-bold text-indigo-700 cursor-pointer">
              داخازا ناڤێ قوتابی بکە
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={handleCreatePoll}
              className="flex-grow bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700"
            >
              بەلاڤکرن
            </button>
            <button 
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200"
            >
              پەشیمان بوون
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {polls.map(poll => {
          const { total, breakdown } = getStats(poll.id);
          const isViewing = viewingResults === poll.id;

          return (
            <div key={poll.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-gray-800">{poll.question}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500 uppercase">
                      {poll.type === 'CHOICE' ? 'هەلبژارتن' : 'نڤیسین'}
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-50 px-2 py-1 rounded-md text-indigo-600">
                      {total} بەرسڤ
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="flex flex-col gap-1 mr-2">
                    <button 
                      onClick={() => movePoll(polls.indexOf(poll), 'up')}
                      disabled={polls.indexOf(poll) === 0}
                      className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => movePoll(polls.indexOf(poll), 'down')}
                      disabled={polls.indexOf(poll) === polls.length - 1}
                      className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setViewingResults(isViewing ? null : poll.id)}
                    className={`p-2 rounded-xl transition-all ${isViewing ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    title="بینینا ئەنجامان"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => toggleVisibility(poll)}
                    className={`p-2 rounded-xl transition-all ${poll.isVisible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                    title={poll.isVisible ? 'ڤەشارتی بکە' : 'دیار بکە'}
                  >
                    {poll.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => deletePoll(poll.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                    title="ڕەشکرن"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isViewing && (
                <div className="mt-6 pt-6 border-t border-dashed border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                  {poll.type === 'CHOICE' ? (
                    <div className="space-y-3">
                      {Object.entries(breakdown).map(([opt, count]) => {
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={opt}>
                            <div className="flex justify-between text-sm font-bold mb-1">
                              <span>{opt}</span>
                              <span className="text-indigo-600">{Math.round(percentage)}% ({count})</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {responses.filter(r => r.pollId === poll.id).map((r, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-indigo-600">{r.studentName}</span>
                            <span className="text-[8px] text-gray-400">{new Date(r.timestamp).toLocaleString('ku-IQ')}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{r.response}</p>
                        </div>
                      ))}
                      {total === 0 && <p className="text-center text-gray-400 text-sm py-4">چ بۆچوون نەهاتینە نڤیسین.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {polls.length === 0 && !isCreating && (
          <div className="text-center py-20 text-gray-400">
            چ راپرسی نەهاتینە دروستکرن.
          </div>
        )}
      </div>
    </div>
  );
};

export default PollManager;
