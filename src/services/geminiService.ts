import { auth } from "../firebase";

export async function generateAIRoast(params: {
  persona: string;
  intensity: string;
  inputType: string;
  userInput: string;
  profile: any;
}) {
  const { persona, intensity, inputType, userInput, profile } = params;
  const userId = localStorage.getItem('userId') || 'guest_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('userId', userId);
  
  const systemPrompt = `
    You are a professional roast engine. 
    Persona: ${persona}
    Intensity: ${intensity} (friendly, roasted, savage, scorched)
    User Info: ${JSON.stringify(profile)}
    Input Type: ${inputType}

    Generate a short, devastating, and witty roast. 
    Keep it under 280 characters.
    Do not include any pleasantries or "Here is your roast".
    Just the roast text.
  `;

  const userPrompt = `User Input: ${userInput}`;

  try {
    const response = await fetch('/api/roast/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ systemPrompt, userPrompt, userId })
    });
    
    if (!response.ok) throw new Error('Failed to generate roast');
    
    const data = await response.json();
    return data.roastText || "The AI is too stunned to speak right now.";
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Even the AI is too disappointed in you to generate a roast right now.";
  }
}

export async function generateAIDefenseJudgment(comeback: string, persona: string) {
  const userId = localStorage.getItem('userId') || 'guest_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('userId', userId);

  try {
    const response = await fetch('/api/roast/v2/judge-defense', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comeback, persona, userId })
    });

    if (!response.ok) throw new Error('Failed to judge defense');
    
    return await response.json();
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return { quality: 'weak', judgmentText: "Your defense was so bad it crashed the judging engine." };
  }
}
