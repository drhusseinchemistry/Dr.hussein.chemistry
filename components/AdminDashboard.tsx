import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { QuizResult, Quiz } from '../types';
import { ArrowLeft, Download, Copy, Check, Search, Filter, Plus, Edit2, Trash2, Users, BookOpen } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onCreateQuiz: () => void;
  quizzes: Quiz[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onEditQuiz, onCreateQuiz, quizzes }) => {
  const [submissions, setSubmissions] = useState<QuizResult[]>([]);
  const [activeTab, setActiveTab] = useState<'submissions' | 'quizzes'>('submissions');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setSubmissions(data);
    });
    return () => unsubscribe();
  }, []);

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.studentInfo?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'All' || s.studentInfo?.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const copyToClipboard = () => {
    const text = filteredSubmissions.map(s => 
      `${s.studentInfo?.name}\t${s.studentInfo?.section}\t${s.scorePercentage}%`
    ).join('\n');
    
    navigator.clipboard.writeText(`ناو\tشوعبە\tنمرە\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Section', 'Score', 'Correct', 'Total', 'Date'];
    const rows = filteredSubmissions.map(s => [
      s.studentInfo?.name,
      s.studentInfo?.section,
      `${Math.round(s.scorePercentage)}%`,
      s.correctAnswers,
      s.totalQuestions,
      new Date(s.timestamp || 0).toLocaleString('ku-IQ')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `quiz_results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteQuiz = async (id: string) => {
    if (confirm("تۆ دڵنیای دتەوێت ئەم کویزە ڕەش بکەیتەوە؟")) {
      try {
        await deleteDoc(doc(db, 'quizzes', id));
      } catch (error) {
        console.error("Error deleting quiz:", error);
        alert("خەلەتیەک چێبوو د ڕەشکرنا کویزێ دا.");
      }
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    const password = prompt("بۆ ڕەشکرنا ئەنجامی، تکایە ڕەمزێ لێبدە:");
    if (password !== 'hussein1996hussein') {
      alert("ڕەمز خەلەتە!");
      return;
    }

    if (confirm("تۆ دڵنیای دتەوێت ئەڤی ناڤی ڕەش بکەی؟")) {
      try {
        await deleteDoc(doc(db, 'submissions', id));
      } catch (error) {
        console.error("Error deleting submission:", error);
        alert("خەلەتیەک چێبوو د ڕەشکرنا ئەنجامی دا.");
      }
    }
  };

  const handleDeleteAllSubmissions = async () => {
    const password = prompt("بۆ ڕەشکرنا هەمی ئەنجامان، تکایە ڕەمزێ لێبدە:");
    if (password !== 'hussein1996hussein') {
      alert("ڕەمز خەلەتە!");
      return;
    }

    if (confirm("تۆ دڵنیای دتەوێت هەمی ئەنجامان ڕەش بکەی؟ ئەڤ کارە ناهێتە زڤراندن!")) {
      try {
        const snapshot = await getDocs(collection(db, 'submissions'));
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        alert("هەمی ئەنجام ب سەرکەفتی هاتنە ڕەشکرن.");
      } catch (error) {
        console.error("Error deleting all submissions:", error);
        alert("خەلەتیەک چێبوو د ڕەشکرنا هەمی ئەنجامان دا.");
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 min-h-[600px]">
        <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180" />
            </button>
            <h2 className="text-2xl font-black text-gray-800">ڕێڤەبەریا سیستەمی</h2>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4" />
              ئەنجام
            </button>
            <button 
              onClick={() => setActiveTab('quizzes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'quizzes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BookOpen className="w-4 h-4" />
              کویز
            </button>
          </div>
        </div>

        {activeTab === 'submissions' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  کۆپی کرن
                </button>
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  داونلۆد (CSV)
                </button>
              </div>
              <button 
                onClick={handleDeleteAllSubmissions}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-100"
              >
                <Trash2 className="w-4 h-4" />
                ڕەشکرنا هەمیان
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="لێگەریان ل ناڤێ قوتابی..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400 w-5 h-5" />
                <select 
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="p-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                >
                  <option value="All">هەمی شوعبە</option>
                  {['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز'].map(s => (
                    <option key={s} value={s}>شوعبا {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-50">
                    <th className="pb-4 font-bold">ناڤێ قوتابی</th>
                    <th className="pb-4 font-bold">شوعبە</th>
                    <th className="pb-4 font-bold">نمرە</th>
                    <th className="pb-4 font-bold">بەرسڤێن راست</th>
                    <th className="pb-4 font-bold">دەم</th>
                    <th className="pb-4 font-bold text-center">کردار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-400">
                        چ ئەنجام نەهاتنە دیتن.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-4 font-bold text-gray-800">{s.studentInfo?.name}</td>
                        <td className="py-4">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold">
                            {s.studentInfo?.section}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`font-black text-lg ${s.scorePercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.round(s.scorePercentage)}%
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 font-medium">
                          {s.correctAnswers} / {s.totalQuestions}
                        </td>
                        <td className="py-4 text-gray-400 text-xs">
                          {new Date(s.timestamp || 0).toLocaleString('ku-IQ')}
                        </td>
                        <td className="py-4 text-center">
                          <button 
                            onClick={() => s.id && handleDeleteSubmission(s.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="ڕەشکرن"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <button 
                onClick={onCreateQuiz}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                دروستکرنا کویزەکێ نوی
              </button>
            </div>

            <div className="grid gap-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  چ کویز نەهاتینە دیتن.
                </div>
              ) : (
                quizzes.map(quiz => (
                  <div key={quiz.id} className="border-2 border-gray-50 rounded-2xl p-6 flex justify-between items-center hover:border-indigo-100 transition-all bg-gray-50/50">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3>
                      <div className="flex gap-3 mt-2">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                          {quiz.questions.length} پرسیار
                        </span>
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">
                          {quiz.timerSeconds} چرکە
                        </span>
                        {quiz.maxQuestionsToShow && (
                          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">
                            نیشاندانا {quiz.maxQuestionsToShow} پرسیاران
                          </span>
                        )}
                        {(quiz.startTime || quiz.endTime) && (
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                            وەخت: {quiz.startTime ? new Date(quiz.startTime).toLocaleTimeString('ku-IQ', {hour: '2-digit', minute:'2-digit'}) : '...'} - {quiz.endTime ? new Date(quiz.endTime).toLocaleTimeString('ku-IQ', {hour: '2-digit', minute:'2-digit'}) : '...'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditQuiz(quiz)}
                        className="p-3 bg-white text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
                        title="دەستکاری"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-3 bg-white text-red-600 rounded-xl border border-red-100 hover:bg-red-50 transition-all shadow-sm"
                        title="ڕەشکرنەوە"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
