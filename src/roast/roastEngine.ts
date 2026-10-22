import { ROAST_LIBRARY } from './roastLibrary';

export interface RoastProfile {
  jobTitle?: string;
  hobby?: string;
  habit?: string;
  streak?: number;
}

export interface Criteria {
  persona: string;
  intensity: string;
  inputType: string;
  profile?: RoastProfile;
  seen?: string[];
}

export const getDayName = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

export const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 6) return 'middle of the night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'late night';
};

export const injectVariables = (text: string, vars: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    jobTitle: 'professional human being',
    hobby: 'existing',
    habit: 'making questionable choices',
    dayOfWeek: getDayName(),
    timeOfDay: getTimeOfDay(),
    streak: '1',
    opponentName: 'your opponent',
  };
  const merged = { ...defaults, ...vars };
  return text.replace(/\{(\w+)\}/g, (_, k) => merged[k] ?? `{${k}}`);
};

export function scoreRoast(template: any, criteria: Criteria) {
  const { persona, intensity, inputType, profile = {}, seen = [] } = criteria;
  if (seen.includes(template.id)) return -1;

  let s = 0;
  if (template.persona.includes(persona)) s += 30; else s += 2;
  
  if (template.intensity.includes(intensity)) {
    s += 25;
  } else {
    const order = ['friendly', 'roasted', 'savage', 'scorched'];
    const targetIdx = order.indexOf(intensity);
    const templateIdx = order.findIndex(i => template.intensity.includes(i));
    if (Math.abs(targetIdx - templateIdx) === 1) s += 10;
  }

  if (template.inputTypes.includes(inputType)) s += 20;

  const profileTags = [];
  if (profile.jobTitle) profileTags.push('job');
  if (profile.hobby) profileTags.push('hobby');
  if (profile.habit) profileTags.push('habit');

  const matchingTags = template.tags.filter((t: string) => profileTags.includes(t));
  s += Math.round((matchingTags.length / (profileTags.length || 1)) * 15);

  if (template.dayOfWeek?.includes(new Date().getDay())) s += 5;

  return s;
}

export function pickTemplate(criteria: Criteria) {
  const { inputType } = criteria;
  const pool = ROAST_LIBRARY.filter(t => {
    if (inputType === 'defend') return t.inputTypes.includes('defend');
    if (inputType === 'battle') return t.inputTypes.includes('battle');
    if (inputType === 'daily') return t.inputTypes.includes('daily') || t.inputTypes.includes('text');
    return !t.inputTypes.includes('defend') && !t.inputTypes.includes('battle');
  });

  const scored = pool.map(t => ({ t, s: scoreRoast(t, criteria) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!scored.length) return pool[Math.floor(Math.random() * pool.length)] || ROAST_LIBRARY[0];
  
  const topCount = Math.min(3, scored.length);
  const topSet = scored.slice(0, topCount);
  return topSet[Math.floor(Math.random() * topSet.length)].t;
}

export function evaluateComeback(text: string = '') {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 4) return 'weak';

  const wit = [/at least/i, /unlike you/i, /the irony/i, /projection/i, /look who/i, /that's rich/i, /says the/i, /bold words/i];
  const weak = [/whatever/i, /ok$/i, /sure$/i, /fine$/i, /no u/i, /shut up/i];

  if (weak.some(r => r.test(text)) && words < 10) return 'weak';
  if (wit.some(r => r.test(text)) && words > 10) return 'strong';
  if (wit.some(r => r.test(text)) || words > 12) return 'ok';
  
  return 'weak';
}

export function extractJob(text: string = '') {
  const jobs = ['developer', 'designer', 'manager', 'engineer', 'analyst', 'teacher', 'doctor', 'lawyer', 'marketer', 'writer', 'student', 'founder', 'ceo', 'intern', 'freelancer'];
  return jobs.find(k => text.toLowerCase().includes(k)) || null;
}

export function extractHobby(text: string = '') {
  const hobbies = ['gaming', 'cooking', 'reading', 'running', 'gym', 'yoga', 'painting', 'coding', 'hiking', 'cycling', 'photography', 'music', 'travel', 'netflix', 'sleeping'];
  return hobbies.find(k => text.toLowerCase().includes(k)) || null;
}

export interface RoastParams {
  persona?: string;
  intensity?: string;
  inputType?: string;
  userInput?: string;
  profile?: RoastProfile;
  seen?: string[];
  opponentName?: string | null;
}

const SIGNOFFS: Record<string, string> = {
  comedian: '— mic drop',
  shakespeare: '— exeunt with shame',
  corporate: '— best regards',
  genz: '— not ur bestie',
  british: '— cheerio',
  dad: '— *long sigh*',
  philosopher: '— go touch grass, as the ancients did'
};

export function deliverRoast(params: RoastParams) {
  const { 
    persona = 'comedian', 
    intensity = 'roasted', 
    inputType = 'text', 
    userInput = '', 
    profile = {}, 
    seen = [], 
    opponentName = null 
  } = params;

  const template = pickTemplate({ persona, intensity, inputType, profile, seen });
  const vars = {
    jobTitle: profile.jobTitle || extractJob(userInput) || 'professional human being',
    hobby: profile.hobby || extractHobby(userInput) || 'existing',
    habit: profile.habit || 'making questionable choices',
    streak: String(profile.streak || 1),
    dayOfWeek: getDayName(),
    timeOfDay: getTimeOfDay(),
    opponentName: opponentName || 'your opponent'
  };

  return {
    templateId: template.id,
    roastText: injectVariables(template.text, vars),
    signoff: SIGNOFFS[persona] || '',
    persona,
    intensity,
    tags: template.tags
  };
}

export function engineDefend(text: string, persona: string) {
  const quality = evaluateComeback(text);
  const pool = ROAST_LIBRARY.filter(t => t.inputTypes.includes('defend') && t.comebackQuality === quality);
  const template = pool.length ? pool[Math.floor(Math.random() * pool.length)] : ROAST_LIBRARY.find(x => x.inputTypes.includes('defend'));
  
  return {
    judgmentText: injectVariables(template?.text || 'The defense rests. Poorly.', {}),
    quality,
    won: quality === 'strong'
  };
}
