import React, { useState, useEffect } from 'react';
import QuizTaker from './components/QuizTaker';
import ResultsView from './components/ResultsView';
import QuizCreator from './components/QuizCreator';
import StudentInfoForm from './components/StudentInfoForm';
import AdminDashboard from './components/AdminDashboard';
import { Quiz, QuizResult, StudentInfo } from './types';
import { BrainCircuit, PlayCircle, ShieldCheck } from 'lucide-react';
import { INITIAL_QUIZZES } from './sampleData';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, addDoc, getDocs, where } from 'firebase/firestore';

enum AppMode {
  HOME = 'HOME',
  STUDENT_INFO = 'STUDENT_INFO',
  TAKE = 'TAKE',
  RESULTS = 'RESULTS',
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  ADMIN = 'ADMIN'
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  
  // Initialize from LocalStorage or fallback to Sample Data
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    try {
      // Updated key to 'chem-quizzes-final-v1' to ensure new questions are loaded
      const saved = localStorage.getItem('chem-quizzes-final-v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load quizzes from storage");
    }
    return INITIAL_QUIZZES;
  });

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);

  // Firebase Quizzes Effect
  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      if (fbQuizzes.length > 0) {
        setQuizzes(fbQuizzes);
      } else if (quizzes.length > 0) {
        // Bootstrap initial quizzes to Firebase if empty
        quizzes.forEach(async (quiz) => {
          await setDoc(doc(db, 'quizzes', quiz.id), quiz);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const startQuizFlow = async (quiz: Quiz) => {
    // 1. Check Time Window
    const now = new Date();
    if (quiz.startTime) {
      const start = new Date(quiz.startTime);
      if (now < start) {
        alert(`ببورە! ئەڤ کویزە دێ ل دەمژمێر (${start.toLocaleString('ku-IQ')}) ڤەبیت.`);
        return;
      }
    }
    if (quiz.endTime) {
      const end = new Date(quiz.endTime);
      if (now > end) {
        alert("ببورە! وەختێ ڤی کویزێ ب دوماهیک هاتیە.");
        return;
      }
    }

    setActiveQuiz(quiz);
    setMode(AppMode.STUDENT_INFO);
  };

  const handleStudentInfoSubmit = async (info: StudentInfo) => {
    if (!activeQuiz) return;

    // 2. Check for existing attempt (One attempt per student)
    try {
      const q = query(
        collection(db, 'submissions'), 
        where('quizId', '==', activeQuiz.id),
        where('studentInfo.name', '==', info.name),
        where('studentInfo.section', '==', info.section)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("تە بەری نوکە ئەڤ کویزە ئەنجام دایە. هەر قوتابیەک ب تنێ ئێک جار دشێت کویزێ بکەت.");
        return;
      }
    } catch (e) {
      console.error("Error checking attempts:", e);
    }

    setStudentInfo(info);
    setMode(AppMode.TAKE);
  };

  const handleQuizComplete = async (result: QuizResult) => {
    setLastResult(result);
    setMode(AppMode.RESULTS);

    // 3. Auto-submit results to Firebase
    try {
      await addDoc(collection(db, 'submissions'), {
        ...result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error auto-submitting results:", error);
    }
  };

  const handleSaveQuiz = async (updatedQuiz: Quiz) => {
    try {
      await setDoc(doc(db, 'quizzes', updatedQuiz.id), updatedQuiz);
      setMode(AppMode.HOME);
      setQuizToEdit(null);
    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("خەلەتیەک چێبوو د پاراستنا پرسیاران دا.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10" dir="rtl">
      {/* Navbar */}
      <nav className="bg-white shadow-md mb-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-700" onClick={() => setMode(AppMode.HOME)}>
             <BrainCircuit className="w-8 h-8" />
             <h1 className="text-xl font-bold cursor-pointer">کیمیا</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                پرسیار & بەرسڤ
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4">
        
        {mode === AppMode.HOME && (
          <div className="animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 min-h-[400px]">
              <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    <PlayCircle className="w-8 h-8 text-indigo-600" />
                    لیستا پرسیاران
                </h2>
                {/* Create button removed */}
              </div>
              
              <div className="space-y-4">
                {quizzes.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">چ پرسیار بەردەست نینن.</p>
                    </div>
                ) : (
                    quizzes.map(quiz => (
                    <div 
                        key={quiz.id}
                        className="relative overflow-hidden border-2 border-indigo-50 rounded-2xl p-6 hover:border-indigo-200 transition-all flex flex-col md:flex-row justify-between items-center group cursor-pointer bg-white active:scale-[0.99]"
                        onClick={() => startQuizFlow(quiz)}
                    >
                        <div className="relative z-10 w-full md:w-auto mb-4 md:mb-0">
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-800 transition-colors">{quiz.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium">{quiz.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-md font-bold">
                            {quiz.questions.length} پرسیار
                            </span>
                        </div>
                        </div>
                        <div className="relative z-10 flex gap-3 w-full md:w-auto">
                        {/* Edit button removed */}
                        <button 
                            className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg active:shadow-inner"
                        >
                            دەستپێکرن
                        </button>
                        </div>
                        {/* Background decoration */}
                        <div className="absolute -right-4 -bottom-4 text-indigo-50 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <BrainCircuit size={120} />
                        </div>
                    </div>
                    ))
                )}
              </div>

              <div className="mt-10 flex flex-col items-center gap-4">
                <button 
                  onClick={() => {
                    const password = prompt("بۆ چوونە ژوورێ، تکایە ڕەمزێ لێبدە:");
                    if (password === 'hussein1996hussein') {
                      setMode(AppMode.ADMIN);
                    } else {
                      alert("ڕەمز خەلەتە!");
                    }
                  }}
                  className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors text-sm font-medium"
                >
                  <ShieldCheck className="w-4 h-4" />
                  بەشێ ڕێڤەبەری (Admin)
                </button>
                <div className="text-gray-400 text-xs">
                  © 2025 هەمی ماف د پاراستینە | ڤێرژن 2.5
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.STUDENT_INFO && (
          <StudentInfoForm 
            onSubmit={handleStudentInfoSubmit}
            onCancel={() => setMode(AppMode.HOME)}
          />
        )}

        {mode === AppMode.TAKE && activeQuiz && (
          <QuizTaker 
            quiz={activeQuiz}
            studentInfo={studentInfo || undefined}
            onComplete={handleQuizComplete}
            onExit={() => setMode(AppMode.HOME)}
          />
        )}

        {mode === AppMode.RESULTS && lastResult && (
          <ResultsView 
            result={lastResult}
            onHome={() => {
              setMode(AppMode.HOME);
              setStudentInfo(null);
              setActiveQuiz(null);
            }}
          />
        )}

        {mode === AppMode.ADMIN && (
          <AdminDashboard 
            onBack={() => setMode(AppMode.HOME)}
            onEditQuiz={(quiz) => {
              const password = prompt("بۆ دەستکاری کرنا کویزێ، تکایە ڕەمزێ لێبدە:");
              if (password === 'hussein1996hussein') {
                setQuizToEdit(quiz);
                setMode(AppMode.EDIT);
              } else {
                alert("ڕەمز خەلەتە!");
              }
            }}
            onCreateQuiz={() => {
              const password = prompt("بۆ دروستکرنا کویزێ، تکایە ڕەمزێ لێبدە:");
              if (password === 'hussein1996hussein') {
                setMode(AppMode.CREATE);
              } else {
                alert("ڕەمز خەلەتە!");
              }
            }}
            quizzes={quizzes}
          />
        )}

        {(mode === AppMode.CREATE || mode === AppMode.EDIT) && (
            <QuizCreator 
                onSave={handleSaveQuiz}
                onCancel={() => setMode(AppMode.HOME)}
                initialQuiz={mode === AppMode.EDIT ? quizToEdit : undefined}
            />
        )}

      </main>
    </div>
  );
};

export default App;