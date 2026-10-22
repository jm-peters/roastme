import { GoogleGenAI } from "@google/genai";

export async function callClaudeAPI({ systemPrompt, userPrompt }: { systemPrompt: string, userPrompt: string }) {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6KCopmsqXal-ugQ5RRhNYvepNfig_wbvCLynyacrc5F_A";
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'missing_key') {
    console.warn('AI API key not configured');
    return "";
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
      }
    });

    return response.text || "";
  } catch (err) {
    console.error("AI Call failed in callClaudeAPI:", err);
    return "";
  }
}
