import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, Quiz, UserAnswer, QuizResult, StudentInfo } from '../types';
import { CheckCircle2, ChevronLeft, HelpCircle, Timer, XCircle } from 'lucide-react';

interface QuizTakerProps {
  quiz: Quiz;
  studentInfo?: StudentInfo;
  onComplete: (result: QuizResult) => void;
  onExit: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, studentInfo, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  
  // Prepare questions (shuffle and slice if needed)
  const [activeQuestions] = useState(() => {
    let qs = [...quiz.questions];
    // Shuffle
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }
    // Slice
    if (quiz.maxQuestionsToShow && quiz.maxQuestionsToShow > 0) {
      return qs.slice(0, quiz.maxQuestionsToShow);
    }
    return qs;
  });

  // States for animation and flow
  const [visibleOptionsCount, setVisibleOptionsCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timerSeconds || 20);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const hasCompleted = useRef(false);
  const isTransitioning = useRef(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = activeQuestions[currentIndex];
  
  // Refs for timeouts/intervals to clear them properly
  const optionsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 1. Init Question (No Typing Effect anymore) ---
  useEffect(() => {
    // Reset states for new question
    setVisibleOptionsCount(0);
    setTimeLeft(quiz.timerSeconds || 20);
    setIsAnswered(false);
    setSelectedAnswer('');
    setIsTimerActive(false);

    // Immediately start revealing options (Text is shown instantly now)
    startRevealingOptions();

    return () => clearAllTimers();
  }, [currentIndex, currentQuestion]);

  // --- 2. Sequential Options Reveal Logic ---
  const startRevealingOptions = () => {
    if (currentQuestion.type === QuestionType.FILL_BLANK) {
        setVisibleOptionsCount(1); // Show input immediately
        setIsTimerActive(true);
        return;
    }

    const totalOptions = currentQuestion.type === QuestionType.TRUE_FALSE ? 2 : (currentQuestion.options?.length || 0);
    let currentCount = 0;

    optionsIntervalRef.current = setInterval(() => {
      if (currentCount < totalOptions) {
        currentCount++;
        setVisibleOptionsCount(currentCount);
      } else {
        if (optionsIntervalRef.current) clearInterval(optionsIntervalRef.current);
        setIsTimerActive(true); // Start timer after options are shown
      }
    }, 200); // Faster options reveal (200ms instead of 800ms)
  };

  // --- 3. Timer Logic ---
  useEffect(() => {
    if (isTimerActive && timeLeft > 0 && !isAnswered) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      // Time is up!
      handleTimeUp();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerActive, timeLeft, isAnswered]);

  const clearAllTimers = () => {
    if (optionsIntervalRef.current) clearInterval(optionsIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
  };

  const handleTimeUp = () => {
    if (isAnswered || isTransitioning.current) return;
    setIsAnswered(true);
    setIsTimerActive(false);
    
    // Automatically move to next question after a short delay
    isTransitioning.current = true;
    transitionTimeoutRef.current = setTimeout(() => {
      handleNext("");
      isTransitioning.current = false;
    }, 1500);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered || isTransitioning.current) return; // Prevent changing answer
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setIsTimerActive(false);

    // Automatically move to next question after a short delay for feedback
    isTransitioning.current = true;
    transitionTimeoutRef.current = setTimeout(() => {
      handleNext(answer);
      isTransitioning.current = false;
    }, 1500);
  };

  const handleNext = (finalAnswer?: string) => {
    if (hasCompleted.current) return;

    // Clear any pending transition timeout if manually clicking next
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    isTransitioning.current = false;

    const currentAns = finalAnswer !== undefined ? finalAnswer : selectedAnswer;
    // Record the answer (even if empty/time up)
    const isCorrect = currentAns.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      answer: currentAns || "Time Expired",
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: currentAns ? isCorrect : false
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete
      hasCompleted.current = true;
      const correctCount = newAnswers.filter(a => a.isCorrect).length;
      const result: QuizResult = {
        quizId: quiz.id,
        totalQuestions: activeQuestions.length,
        correctAnswers: correctCount,
        scorePercentage: (correctCount / activeQuestions.length) * 100,
        answers: newAnswers,
        studentInfo,
        timestamp: Date.now()
      };
      onComplete(result);
    }
  };

  // --- Text Formatter for Purple/Bold Keywords ---
  const formatQuestionText = (text: string) => {
    // Regex to find content in quotes '...', parentheses (...), or Chemical Symbols/Latin text
    const regex = /('.*?'|\(.*?\)|[A-Za-z0-9]+(?:[+-]\d?)?)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.match(regex)) {
         return <span key={i} className="font-black text-purple-700 mx-1 inline-block" dir="ltr">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // --- Helper for Option Styling (Green/Red) ---
  const getOptionStyle = (optionValue: string) => {
    const isSelected = selectedAnswer === optionValue;
    const isCorrect = optionValue.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

    let baseStyle = "flex items-center p-4 border-2 rounded-xl transition-all duration-300 transform ";
    
    if (!isAnswered) {
      // Normal state before answering: Dark Text (Gray-900)
      return baseStyle + "hover:bg-indigo-50 border-gray-200 cursor-pointer hover:scale-[1.02] text-gray-900";
    }

    // Feedback state
    if (isCorrect) {
      return baseStyle + "bg-green-100 border-green-500 text-green-900 scale-[1.02] shadow-md";
    }
    
    if (isSelected && !isCorrect) {
      return baseStyle + "bg-red-100 border-red-500 text-red-900 opacity-80";
    }

    return baseStyle + "border-gray-200 opacity-50 text-gray-500"; // Other non-selected options
  };

  const progress = ((currentIndex) / quiz.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header - Light Background, Dark Text */}
        <div className="bg-indigo-50 p-6 border-b border-indigo-100 text-indigo-900 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{quiz.title}</h2>
            <p className="text-indigo-500 text-sm">پرسیارا {currentIndex + 1} ژ {activeQuestions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xl ${timeLeft <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-indigo-100 text-indigo-700'}`}>
            <Timer className="w-5 h-5" />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-2">
          <div 
            className="bg-green-500 h-2 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Question Body */}
        <div className="p-8 flex-grow flex flex-col">
          {/* Question Text with Big Icon Above */}
          <div className="flex flex-col items-center gap-6 mb-8 min-h-[120px]">
            <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 shadow-sm animate-bounce-slow">
              <HelpCircle className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 leading-relaxed font-noto text-center">
              {formatQuestionText(currentQuestion.text)}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Multiple Choice Options */}
            {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && currentQuestion.options?.map((option, idx) => (
              <div 
                key={idx}
                className={`transition-all duration-500 ${idx < visibleOptionsCount ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 hidden'}`}
              >
                <div 
                  onClick={() => !isAnswered && handleAnswerSelect(option)}
                  className={getOptionStyle(option)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ml-4 border-2
                    ${selectedAnswer === option || (isAnswered && option === currentQuestion.correctAnswer) ? 'border-current' : 'border-gray-300 text-gray-500'}
                  `}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg font-medium">{option}</span>
                  
                  {isAnswered && option === currentQuestion.correctAnswer && (
                    <CheckCircle2 className="mr-auto w-6 h-6 text-green-600" />
                  )}
                  {isAnswered && selectedAnswer === option && option !== currentQuestion.correctAnswer && (
                     <XCircle className="mr-auto w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
            ))}

            {/* True/False Options */}
            {currentQuestion.type === QuestionType.TRUE_FALSE && (
              <div className="grid grid-cols-2 gap-4">
                 {['rast', 'xelat'].map((opt, idx) => (
                    <div 
                      key={opt}
                      className={`transition-all duration-500 ${idx < visibleOptionsCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                      <button
                        onClick={() => !isAnswered && handleAnswerSelect(opt)}
                        className={`w-full ${getOptionStyle(opt)} justify-center font-bold text-xl`}
                      >
                         {opt === 'rast' ? 'راست (Rast)' : 'خەلەت (Xelat)'}
                      </button>
                    </div>
                 ))}
              </div>
            )}

            {/* Fill Blank */}
            {currentQuestion.type === QuestionType.FILL_BLANK && visibleOptionsCount > 0 && (
               <div className="transition-all duration-500 opacity-100">
                   <div className="flex gap-2">
                     <input
                      type="text"
                      value={selectedAnswer}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={isAnswered}
                      className={`w-full text-lg p-4 border-2 rounded-xl focus:ring-0 ${isAnswered 
                        ? (selectedAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ? 'border-green-500 bg-green-50 text-green-900' : 'border-red-500 bg-red-50 text-red-900')
                        : 'border-gray-300 focus:border-indigo-500 text-gray-900'}`}
                      placeholder="بەرسڤێ لڤێرە بنڤیسە..."
                    />
                    {!isAnswered && (
                        <button 
                            onClick={() => handleAnswerSelect(selectedAnswer)}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 rounded-xl font-bold border border-indigo-200"
                        >
                            تەمام
                        </button>
                    )}
                   </div>
                   {isAnswered && selectedAnswer.trim().toLowerCase() !== currentQuestion.correctAnswer.trim().toLowerCase() && (
                       <div className="mt-2 text-green-700 font-bold p-2 bg-green-50 rounded border border-green-200">
                           بەرسڤا راست: {currentQuestion.correctAnswer}
                       </div>
                   )}
               </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
            {isAnswered ? (
                <div className="flex flex-col gap-1">
                   <span className="font-bold text-indigo-700">
                       {selectedAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() 
                        ? "ئافەرین! بەرسڤا تە یا دروستە." 
                        : `ئەڤە یا دروست بو (${currentQuestion.correctAnswer}) لێ تە خەلەت هەلبژارت.`}
                   </span>
                </div>
            ) : (
                <div className="text-gray-400 text-sm">
                    {isTimerActive ? "وەڵام بدەوە پێش ئەوەی کات تەواو بێت" : "چاوەڕێی پرسیار بە..."}
                </div>
            )}

            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all
                ${isAnswered 
                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 shadow-md translate-y-0 border border-indigo-200' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed translate-y-1'}`}
            >
              {currentIndex === quiz.questions.length - 1 ? 'تەمامکرن' : 'دویڤدا'}
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default QuizTaker;