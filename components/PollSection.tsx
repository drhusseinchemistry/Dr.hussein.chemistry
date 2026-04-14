import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { Poll, PollResponse } from '../types';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface PollSectionProps {
  studentName?: string;
}

const PollSection: React.FC<PollSectionProps> = ({ studentName: initialName }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [answeredPolls, setAnsweredPolls] = useState<string[]>([]);
  const [textResponses, setTextResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [localName, setLocalName] = useState('');

  const studentName = initialName || localName;

  useEffect(() => {
    const q = query(collection(db, 'polls'), where('isVisible', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    });
    return () => unsubscribe();
  }, []);

  // Load answered polls from localStorage to prevent double voting in same session
  useEffect(() => {
    const saved = localStorage.getItem(`answered_polls_${studentName}`);
    if (saved) setAnsweredPolls(JSON.parse(saved));
  }, [studentName]);

  const submitResponse = async (pollId: string, response: string) => {
    if (!response.trim()) return;
    setIsSubmitting(pollId);
    try {
      await addDoc(collection(db, 'poll_responses'), {
        pollId,
        studentName,
        response,
        timestamp: Date.now()
      });
      
      const newAnswered = [...answeredPolls, pollId];
      setAnsweredPolls(newAnswered);
      localStorage.setItem(`answered_polls_${studentName}`, JSON.stringify(newAnswered));
    } catch (e) {
      console.error(e);
      alert("خەلەتیەک چێبوو د هنارتنا بەرسڤێ دا.");
    } finally {
      setIsSubmitting(null);
    }
  };

  if (polls.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 space-y-6 px-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1 w-8 bg-indigo-500 rounded-full"></div>
        <h3 className="text-xl font-black text-gray-800">راپرسی و بۆچوون</h3>
      </div>

      <div className="grid gap-4">
        {polls.map(poll => {
          const isAnswered = answeredPolls.includes(poll.id);
          
          return (
            <div key={poll.id} className="bg-white p-6 rounded-3xl border-2 border-indigo-50 shadow-sm hover:shadow-md transition-all">
              <h4 className="text-lg font-bold text-gray-800 mb-4">{poll.question}</h4>
              
              {isAnswered ? (
                <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 p-3 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                  سوپاس بۆ بەشدارییا تە!
                </div>
              ) : (
                <div className="space-y-4">
                  {!initialName && (
                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <label className="block text-[10px] font-bold text-indigo-600 mb-1">ناڤێ تە (پێدڤیە بۆ بەشداریێ):</label>
                      <input 
                        type="text"
                        placeholder="ناڤێ تە یێ سیانی..."
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="w-full p-2 rounded-lg border border-indigo-100 outline-none focus:border-indigo-500 text-sm font-bold"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {poll.type === 'CHOICE' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {poll.options?.map((opt, i) => (
                          <button 
                            key={i}
                            disabled={isSubmitting === poll.id || !studentName.trim()}
                            onClick={() => submitResponse(poll.id, opt)}
                            className="p-3 rounded-xl border-2 border-gray-100 font-bold text-gray-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="بۆچوونا خۆ بنڤیسە..."
                          value={textResponses[poll.id] || ''}
                          onChange={(e) => setTextResponses({...textResponses, [poll.id]: e.target.value})}
                          className="flex-grow p-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none font-medium"
                        />
                        <button 
                          disabled={isSubmitting === poll.id || !textResponses[poll.id]?.trim() || !studentName.trim()}
                          onClick={() => submitResponse(poll.id, textResponses[poll.id])}
                          className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollSection;
