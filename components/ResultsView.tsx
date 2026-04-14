import React, { useState } from 'react';
import { QuizResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Award, CheckCircle, XCircle, Send, Loader2, Check } from 'lucide-react';
import PollSection from './PollSection';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ResultsViewProps {
  result: QuizResult;
  onHome: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onHome }) => {
  const [isSubmitted] = useState(true); // Always true since App.tsx auto-submits

  const data = [
    { name: 'راست', value: result.correctAnswers },
    { name: 'خەلەت', value: result.totalQuestions - result.correctAnswers },
  ];

  // handleSubmit removed as App.tsx handles it now

  const COLORS = ['#10B981', '#EF4444']; // Green, Red

  const getMessage = () => {
    if (result.scorePercentage >= 90) return "نایاب! تە گەلەک باش بەرسڤ دان.";
    if (result.scorePercentage >= 70) return "باشە! تە شیانێن باش هەنە.";
    if (result.scorePercentage >= 50) return "ناڤین، پێدڤیە پتر بخوینی.";
    return "لاواز، هەول بدە جارەکا دی.";
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-50 p-8 text-center border-b border-indigo-100">
          <Award className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
          <h2 className="text-3xl font-bold mb-2 text-indigo-900">ئەنجامێن تە</h2>
          {result.studentInfo && (
            <div className="mb-4">
              <span className="text-xl font-bold text-indigo-800">{result.studentInfo.name}</span>
              <span className="mx-2 text-indigo-400">|</span>
              <span className="text-lg font-medium text-indigo-600">شوعبا {result.studentInfo.section}</span>
            </div>
          )}
          <p className="text-indigo-600 text-lg">{getMessage()}</p>
          
          <div className="mt-6 text-6xl font-black tracking-tighter text-indigo-900">
            {Math.round(result.scorePercentage)}%
          </div>
          <div className="text-sm text-indigo-400 mt-2">رێژەیا سەرکەفتنێ</div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-4">
            <h3 className="font-bold text-gray-700 mb-4">رێژەیا بەرسڤێن راست و خەلەت</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">راست ({result.correctAnswers})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">خەلەت ({result.totalQuestions - result.correctAnswers})</span>
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
             <h3 className="font-bold text-gray-700">وردەکاری</h3>
             {result.answers.map((ans, idx) => (
               <div key={idx} className={`p-3 rounded-lg border-r-4 ${ans.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800">پرسیارا {idx + 1}</span>
                    {ans.isCorrect ? <CheckCircle className="w-5 h-5 text-green-600"/> : <XCircle className="w-5 h-5 text-red-600"/>}
                  </div>
                  <div className="text-sm text-gray-700 mb-2 font-medium">
                    {ans.questionText}
                  </div>
                  <div className="text-sm text-gray-600">
                     بەرسڤا تە: <span className={`font-bold ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{ans.answer}</span>
                  </div>
                  {!ans.isCorrect && (
                    <div className="text-sm text-green-700 mt-1 font-bold">
                      بەرسڤا راست: {ans.correctAnswer} (ئەڤە یا دروست بو لێ تە خەلەت هەلبژارت)
                    </div>
                  )}
               </div>
             ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-center">
          <button 
            onClick={onHome}
            className="bg-indigo-600 text-white px-12 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
          >
            زڤرین بو سەرەکی
          </button>
        </div>
      </div>

      <PollSection studentName={result.studentInfo?.name} />
    </div>
  );
};

export default ResultsView;