import React, { useState } from 'react';
import { StudentInfo } from '../types';
import { User, School, ArrowLeft } from 'lucide-react';

interface StudentInfoFormProps {
  onSubmit: (info: StudentInfo) => void;
  onCancel: () => void;
}

const StudentInfoForm: React.FC<StudentInfoFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [section, setSection] = useState('');

  const sections = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && section) {
      onSubmit({ name, section });
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">پێزانینێن قوتابی</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              ناڤێ سیانی
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg"
              placeholder="ناڤێ خو بنڤیسە..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-500" />
              شوعبە (پۆل)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {sections.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={`p-3 rounded-xl font-bold text-lg transition-all border-2 ${
                    section === s
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !section}
            className={`w-full p-4 rounded-2xl font-bold text-xl transition-all shadow-lg ${
              name.trim() && section
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            دەستپێکرن
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentInfoForm;
