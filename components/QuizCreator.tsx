import React, { useState, useEffect } from 'react';
import { Question, QuestionType, Quiz, AppSettings } from '../types';
import { generateQuizAI } from '../services/geminiService';
import { Loader2, Plus, Sparkles, Trash2, Save, Upload, Edit2, ArrowRight, Download, Eye, EyeOff, UserCheck, UserMinus, Key, X } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
  initialQuiz?: Quiz | null;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel, initialQuiz }) => {
  const [title, setTitle] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [maxQuestionsToShow, setMaxQuestionsToShow] = useState<number | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [requireSection, setRequireSection] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Manual Question State
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Load initial data if editing
  useEffect(() => {
    if (initialQuiz) {
        setTitle(initialQuiz.title);
        setTimerSeconds(initialQuiz.timerSeconds || 20);
        setMaxQuestionsToShow(initialQuiz.maxQuestionsToShow);
        setStartTime(initialQuiz.startTime || '');
        setEndTime(initialQuiz.endTime || '');
        setIsVisible(initialQuiz.isVisible !== false);
        setRequireSection(initialQuiz.requireSection !== false);
        setQuestions(initialQuiz.questions);
    }
    
    // Load API Key from Firestore
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'gemini');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settings = docSnap.data() as AppSettings;
          setGeminiApiKey(settings.geminiApiKey || '');
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadSettings();
  }, [initialQuiz]);

  const handleSaveApiKey = async () => {
    if (!geminiApiKey) return;
    setIsSavingKey(true);
    try {
      await setDoc(doc(db, 'settings', 'gemini'), { geminiApiKey });
      alert("API Key هاتە پاشکەفتکرن (Save)");
    } catch (err) {
      alert("خەلەتیەک چێبوو د پاشکەفتکرنا API Key دا");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!confirm("ئەرێ تو یێ پشت راستی دێ API Key ژێبەی؟")) return;
    try {
      await deleteDoc(doc(db, 'settings', 'gemini'));
      setGeminiApiKey('');
      alert("API Key هاتە ژێبرن");
    } catch (err) {
      alert("خەلەتیەک چێبوو د ژێبرنا API Key دا");
    }
  };

  // --- AUTO SAVE LOGIC ---
  const performAutoSave = (updatedQuestions: Question[], updatedTitle: string) => {
    if (initialQuiz && updatedTitle && updatedQuestions.length > 0) {
        const updatedQuiz: Quiz = {
            id: initialQuiz.id,
            title: updatedTitle,
            description: `ژمارا پرسیاران: ${updatedQuestions.length}`,
            questions: updatedQuestions
        };
        // Just save to local state/app state, don't exit
        // We actually want to update the App component's state without changing the view mode
        // But since onSave switches mode to HOME in App.tsx, we need a way to silent save or just rely on local state until "Done"
        // For now, let's just keep local state 'questions' as the source of truth until the big SAVE button is clicked.
        // The previous auto-save actually triggered a view change if it called onSave. 
        // We will remove immediate onSave trigger to satisfy "don't leave page until done".
    }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) return;
    setIsGenerating(true);
    try {
      const generatedQuestions = await generateQuizAI(aiTopic, 5, geminiApiKey);
      const newQuestions = [...questions, ...generatedQuestions];
      setQuestions(newQuestions);
      const newTitle = title || `پرسیارێن دەربارەی: ${aiTopic}`;
      if (!title) setTitle(newTitle);
      
    } catch (e) {
      alert("شاشییەک رویدا د دروستکرنا پرسیاران دا");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- JSON DOWNLOAD LOGIC ---
  const handleDownloadJSON = () => {
    if (questions.length === 0) {
        alert("چ پرسیار نینن بۆ داگرتنێ (Download).");
        return;
    }
    
    // Create JSON string
    const jsonString = JSON.stringify(questions, null, 2);
    
    // Create Blob
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    
    // Trigger Download
    const link = document.createElement('a');
    link.href = href;
    const fileName = title ? `${title.replace(/\s+/g, '-')}.json` : `quiz-export-${Date.now()}.json`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Confirmation if replacing existing questions
    if (questions.length > 0) {
        if (!confirm("ئاگەهداربە! ئەپلودکرنا ڤێ فایلێ دێ هەمی پرسیارێن نوکە ژێبەت و یێن نوی دانیت. رازی؟")) {
            e.target.value = ''; // Reset input
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          alert("فایل نابیت بهێتە خوێندن. پێدڤیە لیستیەکا پرسیاران بیت (Array).");
          return;
        }

        const newQuestions: Question[] = json.map((q: any) => ({
             id: Math.random().toString(36).substr(2, 9),
             text: q.text || q.question || "بێ ناڤ",
             type: q.type || QuestionType.MULTIPLE_CHOICE,
             options: Array.isArray(q.options) ? q.options : [],
             correctAnswer: q.correctAnswer || ""
        })).filter(q => q.text && q.correctAnswer);

        if (newQuestions.length === 0) {
            alert("چ پرسیارێن دروست د فایلێ تە دا نەبون.");
            return;
        }
        
        // REPLACE Logic (Not append)
        setQuestions(newQuestions);
        alert(`فایل هاتە بارکرن. ${newQuestions.length} پرسیارێن نوى هاتنە دانان.`);
        
      } catch (err) {
        console.error(err);
        alert("خەلەت! دڵنیابە فایلێ تە JSON ـە و فۆرماتێ وێ یێ دروستە.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addOrUpdateManualQuestion = () => {
    if (!qText || !qCorrect) return;

    const newQ: Question = {
      id: editingQuestionId || Math.random().toString(36).substr(2, 9),
      text: qText,
      type: qType,
      options: qType === QuestionType.MULTIPLE_CHOICE ? qOptions : undefined,
      correctAnswer: qCorrect
    };

    let updatedQuestions: Question[];

    if (editingQuestionId) {
        updatedQuestions = questions.map(q => q.id === editingQuestionId ? newQ : q);
        setEditingQuestionId(null);
    } else {
        updatedQuestions = [...questions, newQ];
    }

    setQuestions(updatedQuestions);
    
    // Reset form but DO NOT leave the page
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect('');
    setQType(QuestionType.MULTIPLE_CHOICE);
    // Remove scroll logic to prevent jumping
  };

  const editQuestion = (q: Question) => {
      setEditingQuestionId(q.id);
      setQText(q.text);
      setQType(q.type);
      setQOptions(q.options && q.options.length > 0 ? q.options : ['', '', '', '']);
      setQCorrect(q.correctAnswer);
      
      // Removed window.scrollTo to keep user context
  };

  const removeQuestion = (id: string) => {
    if (confirm("تۆ دڵنیای دتەوێت ئەم پرسیارە ڕەش بکەیتەوە؟")) {
        const updatedQuestions = questions.filter(q => q.id !== id);
        setQuestions(updatedQuestions);
    }
  };

  const handleManualSave = () => {
    if (!title || questions.length === 0) {
      alert("هیڤیە ناڤەکێ دانە پرسیاران و کێماتی ئێک پرسیار هەبیت");
      return;
    }
    const newQuiz: Quiz = {
      id: initialQuiz ? initialQuiz.id : Math.random().toString(36).substr(2, 9),
      title,
      description: `ژمارا پرسیاران: ${questions.length}`,
      questions,
      timerSeconds,
      maxQuestionsToShow,
      startTime,
      endTime,
      isVisible,
      requireSection
    };
    // This is the ONLY place that triggers the save and exits to Home
    onSave(newQuiz);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">
            {initialQuiz ? 'دەستکاریکردنی پرسیارەکان' : 'دروستکرنا پرسیاران'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-red-500 flex items-center gap-1">
             <ArrowRight className="w-4 h-4" />
             زڤرین (پەشیمان)
        </button>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">سەربارێ بابەتی</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="نموونە: مێژووا کوردان"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وەختێ هەر پرسیارەکێ (چرکە)</label>
          <input
            type="number"
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Number(e.target.value))}
            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min={5}
            max={300}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ژمارا پرسیاران بۆ قوتابی (ئەگەر تە بڤێت کێمتر بن)</label>
          <input
            type="number"
            value={maxQuestionsToShow || ''}
            onChange={(e) => setMaxQuestionsToShow(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="نموونە: 10 (هەمی پرسیار ئەگەر بەتاڵ بیت)"
            min={1}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وەختێ دەستپێکرنێ (Start Time)</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وەختێ ب دوماهیک هاتنێ (End Time)</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setIsVisible(!isVisible)}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              isVisible 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <span className="font-medium">{isVisible ? 'کویز یێ دیارە بۆ قوتابیان' : 'کویز یێ ڤەشارتیە'}</span>
          </button>

          <button
            onClick={() => setRequireSection(!requireSection)}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
              requireSection 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}
          >
            {requireSection ? <UserCheck className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
            <span className="font-medium">{requireSection ? 'پۆل پێدڤیە' : 'پۆل نە پێدڤیە (ب تنێ ناڤ)'}</span>
          </button>
        </div>

        {/* API Key Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Gemini API Key (بۆ دروستکرنا پرسیاران ب زیرەکی دەستکرد)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="flex-1 border p-2 rounded-lg text-sm"
              placeholder="API Key لڤێرە دانە..."
            />
            <button
              onClick={handleSaveApiKey}
              disabled={isSavingKey || !geminiApiKey}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              پاشکەفت
            </button>
            {geminiApiKey && (
              <button
                onClick={handleClearApiKey}
                className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200"
                title="ژێبرنا API Key"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">ئەڤ کلیلە دێ د Firebase دا هێتە پاراستن دا کو هەر جار پێدڤی نەبیت بنڤیسی.</p>
        </div>

        {/* Tools Section (AI/Upload/Download) */}
        {!editingQuestionId && (
            <div className="grid md:grid-cols-2 gap-4">
                {/* AI Section */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex flex-col gap-2">
                    <label className="block text-sm font-medium text-indigo-700 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        دروستکرن ب AI
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm"
                            placeholder="بابەت..."
                        />
                        <button
                            onClick={handleAiGenerate}
                            disabled={isGenerating || !aiTopic}
                            className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* File Operations Section (Upload & Download) */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col gap-2">
                    <label className="block text-sm font-medium text-green-700 flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        فایلێن پرسیاران (JSON)
                    </label>
                    <div className="flex items-center gap-2">
                         {/* Upload Button */}
                        <label className="flex-1 cursor-pointer bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-200 flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-95" title="Upload JSON">
                            <Upload className="w-4 h-4" />
                            <span>ئەپلود (Update)</span>
                            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                        </label>

                         {/* Download Button */}
                        <button 
                            onClick={handleDownloadJSON}
                            disabled={questions.length === 0}
                            className="flex-1 bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download Current List"
                        >
                            <Download className="w-4 h-4" />
                            <span>داگرتن (Save)</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Manual Entry / Edit Form */}
      <div className={`border-2 rounded-xl p-6 mb-8 ${editingQuestionId ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-dashed border-gray-300'}`}>
        <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
            {editingQuestionId ? <Edit2 className="w-5 h-5 text-indigo-600"/> : <Plus className="w-5 h-5 text-green-600"/>}
            {editingQuestionId ? 'دەستکاریکردنی پرسیار' : 'زیێدەکرنا پرسیارەکێ ب دەستی'}
        </h3>
        
        <div className="grid gap-4">
          <select 
            value={qType} 
            onChange={(e) => setQType(e.target.value as QuestionType)}
            className="border p-3 rounded-lg w-full md:w-1/3 bg-white"
          >
            <option value={QuestionType.MULTIPLE_CHOICE}>هەلبژارتن (Multiple Choice)</option>
            <option value={QuestionType.TRUE_FALSE}>راست / خەلەت (True/False)</option>
            <option value={QuestionType.FILL_BLANK}>بوشایی (Fill Blank)</option>
          </select>

          <input
            type="text"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            className="border p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-400"
            placeholder="پرسیارێ لڤێرە بنڤیسە..."
          />

          {qType === QuestionType.MULTIPLE_CHOICE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...qOptions];
                    newOpts[idx] = e.target.value;
                    setQOptions(newOpts);
                  }}
                  className="border p-3 rounded-lg text-sm bg-white"
                  placeholder={`هەلبژاردە ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {qType === QuestionType.TRUE_FALSE ? (
             <select
                value={qCorrect}
                onChange={(e) => setQCorrect(e.target.value)}
                className="border p-3 rounded-lg w-full bg-white"
             >
               <option value="">بەرسڤا راست کیژە؟</option>
               <option value="rast">راست (Rast)</option>
               <option value="xelat">خەلەت (Xelat)</option>
             </select>
          ) : qType === QuestionType.MULTIPLE_CHOICE ? (
            <select
              value={qCorrect}
              onChange={(e) => setQCorrect(e.target.value)}
              className="border p-3 rounded-lg w-full bg-white"
            >
              <option value="">بەرسڤا راست کیژە؟</option>
              {qOptions.map((opt, idx) => (
                opt && <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={qCorrect}
              onChange={(e) => setQCorrect(e.target.value)}
              className="border p-3 rounded-lg w-full bg-white"
              placeholder="پەیڤا بوشایی لڤێرە بنڤیسە (بەرسڤ)"
            />
          )}

          <div className="flex gap-2 mt-2">
            <button
                onClick={addOrUpdateManualQuestion}
                className={`${editingQuestionId ? 'bg-indigo-600 text-white' : 'bg-green-600 text-white'} px-6 py-3 rounded-lg hover:opacity-90 font-bold flex-1 flex justify-center items-center gap-2 shadow-md`}
            >
                {editingQuestionId ? 'نوێکردنەوە (تەمام)' : 'زیێدەکە (Add)'}
            </button>
            {editingQuestionId && (
                <button
                    onClick={() => {
                        setEditingQuestionId(null);
                        setQText('');
                        setQCorrect('');
                    }}
                    className="bg-gray-200 text-gray-700 px-4 rounded-lg hover:bg-gray-300"
                >
                    پەشیمان
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Question List Preview */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 flex justify-between items-center border-b pb-2 mb-4">
            <span>لیستا پرسیاران ({questions.length})</span>
            {questions.length > 0 && (
                 <button onClick={() => { if(confirm("ئایە دڵنیای؟")) { setQuestions([]); }}} className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded">
                    ژێبرنا هەمی پرسیاران
                 </button>
            )}
        </h3>
        {questions.length === 0 && <p className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border-dashed border-2">چ پرسیار نەهاتینە زێدەکرن.</p>}
        
        {/* Render List with Edit/Delete Controls */}
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2">
            {questions.map((q, idx) => (
            <div key={q.id} className={`border rounded-lg p-3 flex justify-between items-start transition-all hover:shadow-md ${editingQuestionId === q.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'bg-white border-gray-200'}`}>
                <div className="flex-1 cursor-pointer" onClick={() => editQuestion(q)}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">{idx + 1}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${q.type === QuestionType.MULTIPLE_CHOICE ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                        {q.type === QuestionType.MULTIPLE_CHOICE ? 'هەڵبژاردن' : q.type}
                    </span>
                </div>
                <div className="font-medium text-gray-800">{q.text}</div>
                <div className="text-sm text-gray-500 mt-1 flex gap-2">
                    <span className="text-green-600 font-bold bg-green-50 px-2 rounded">✓ {q.correctAnswer}</span>
                </div>
                </div>
                <div className="flex flex-col gap-1 mr-2">
                    <button onClick={() => editQuestion(q)} className="text-indigo-500 hover:bg-indigo-100 p-2 rounded-lg" title="دەستکاری">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg" title="ڕەشکرنەوە">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
      
      {/* Save / Create / Exit Button */}
      <div className="mt-8 pt-4 border-t flex justify-end sticky bottom-0 bg-white pb-2 z-10">
            <button
            onClick={handleManualSave}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 shadow-lg flex items-center gap-2 font-bold text-lg"
            >
            <Save className="w-5 h-5" />
            {initialQuiz ? 'نوێکردنەوە و دەرچوون' : 'دروستکرن و دەرچوون'}
            </button>
      </div>
    </div>
  );
};

export default QuizCreator;