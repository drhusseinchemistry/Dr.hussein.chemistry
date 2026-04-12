import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType } from "../types";

export const generateQuizAI = async (topic: string, count: number, customApiKey?: string): Promise<Question[]> => {
  // Use custom API key if provided, otherwise fallback to environment
  let apiKey = customApiKey || '';
  
  if (!apiKey) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("Could not access process.env");
    }
  }

  if (!apiKey) {
    console.warn("API Key missing");
    throw new Error("API Key missing. Please provide a Gemini API key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const prompt = `Generate a quiz about "${topic}" in Kurdish (Badini/Sorani mix acceptable). 
  Create ${count} questions. Mix between Multiple Choice, True/False, and Fill in the blank.
  
  For True/False: Options should be empty. Correct Answer should be "rast" or "xelat".
  For Multiple Choice: Provide 4 options. Correct Answer must be one of the options.
  For Fill in Blank: Options empty. Correct Answer is the missing word.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text in Kurdish" },
              type: { type: Type.STRING, enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK"] },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of options for MC. Empty for others."
              },
              correctAnswer: { type: Type.STRING, description: "The correct answer text" }
            },
            required: ["text", "type", "correctAnswer"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Map to our internal type and add IDs
    return rawData.map((q: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: q.text,
      type: q.type as QuestionType,
      options: q.options || [],
      correctAnswer: q.correctAnswer
    }));

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};