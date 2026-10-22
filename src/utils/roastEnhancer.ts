// src/utils/roastEnhancer.ts

interface RoastConfig {
  intensity: 'mild' | 'medium' | 'brutal';
  languageComplexity: 'simple' | 'standard' | 'complex';
  includeSalvage: boolean;
  roastType: 'comeback' | 'self_deprecating' | 'challenge' | 'existential';
}

export function enhanceRoast(originalRoast: string, config: RoastConfig): string {
  let enhanced = originalRoast;
  
  // Add savage modifiers based on intensity
  const savagePrefixes = {
    mild: ['', 'Lowkey ', 'Kinda ', 'Maybe '],
    medium: ['Bruh ', 'Ngl ', 'Deadass ', 'Honestly ', 'Fam '],
    brutal: ['AYOO ', 'BET ', 'NO CAP ', 'ON GOD ', 'BRUH MOMENT ', '💀💀💀 ']
  };
  
  const savageSuffixes = {
    mild: [' 😬', ' 🤷', ' lol', ' ngl'],
    medium: [' 🔥', ' 💀', ' 😭', ' LMAO', ' SHEESH'],
    brutal: [' 💀💀💀', ' 🔥🔥🔥', ' 😭😭😭', ' YOU GOT BODIED', ' PACK IT UP']
  };
  
  // Add prefix based on intensity
  const prefix = savagePrefixes[config.intensity][Math.floor(Math.random() * savagePrefixes[config.intensity].length)];
  const suffix = savageSuffixes[config.intensity][Math.floor(Math.random() * savageSuffixes[config.intensity].length)];
  
  enhanced = prefix + enhanced + suffix;
  
  // Apply language complexity transformation
  enhanced = transformLanguageComplexity(enhanced, config.languageComplexity);
  
  // Add roast type specific flavor
  enhanced = addRoastTypeFlavor(enhanced, config.roastType);
  
  return enhanced;
}

function transformLanguageComplexity(text: string, complexity: 'simple' | 'standard' | 'complex'): string {
  const simpleMap: Record<string, string> = {
    'look': 'bro look',
    'honestly': 'for real',
    'deadass': 'seriously',
    'unfortunately': 'sadly',
    'apparently': 'it looks like',
    'clearly': 'obviously',
    'absolutely': 'for sure',
    'extraordinary': 'wild',
    'devastating': 'crazy',
    'hilarious': 'funny'
  };
  
  const complexMap: Record<string, string> = {
    'bro': 'indeed',
    'bruh': 'my dear fellow',
    'ngl': 'to be transparent',
    'deadass': 'with utmost sincerity',
    'bruh moment': 'a most unfortunate circumstance',
    'lol': 'I find this rather amusing',
    'lmao': 'I am thoroughly entertained',
    'sheesh': 'goodness gracious',
    'ayo': 'I must express',
    'bet': 'I accept this challenge'
  };
  
  if (complexity === 'simple') {
    for (const [key, value] of Object.entries(simpleMap)) {
      text = text.replace(new RegExp(key, 'gi'), value);
    }
  } else if (complexity === 'complex') {
    for (const [key, value] of Object.entries(complexMap)) {
      text = text.replace(new RegExp(key, 'gi'), value);
    }
    // Add sophisticated vocabulary
    const sophisticated = ['indeed', 'fascinating', 'remarkable', 'unfortunate', 'curious', 'peculiar'];
    if (Math.random() > 0.7) {
      text += ` ${sophisticated[Math.floor(Math.random() * sophisticated.length)]}.`;
    }
  }
  
  return text;
}

function addRoastTypeFlavor(text: string, roastType: string): string {
  const flavors = {
    comeback: [
      ' Try me.',
      ' Your turn to explain yourself.',
      ' I\'ll wait.',
      ' Thoughts?',
      ' Care to respond?'
    ],
    self_deprecating: [
      ' But same tbh.',
      ' We in the same boat fr.',
      ' But who am I to judge.',
      ' No shade but same.',
      ' Mirror moment.'
    ],
    challenge: [
      ' You can\'t handle this heat.',
      ' Roast me back if you got hands.',
      ' I dare you to roast me back.',
      ' You won\'t roast me back.',
      ' Scared to roast back?'
    ],
    existential: [
      ' This your villain origin story.',
      ' Time to rethink everything.',
      ' Who hurt you?',
      ' This is your legacy now.',
      ' Frame this one.'
    ]
  };
  
  const flavorList = flavors[roastType as keyof typeof flavors] || flavors.comeback;
  const shouldAddFlavor = Math.random() > 0.6;
  
  if (shouldAddFlavor) {
    const flavor = flavorList[Math.floor(Math.random() * flavorList.length)];
    text += flavor;
  }
  
  return text;
}

// Salvage mode: DISABLED as per user request for pure roasts
export function addSalvageMode(roast: string, salvageLevel: 'none' | 'light' | 'heavy'): string {
  // Always return the pure roast without disclaimers or apologies
  return roast;
}

export function getFallbackRoast(mode: 'roast' | 'hype', input: string = ''): string {
  const roasts = [
    "You look like the 'before' picture in a commercial for a product that doesn't work.",
    "Your personality is the human equivalent of a participation trophy.",
    "I'd roast you, but my mom told me not to burn trash.",
    "You're the reason the gene pool needs a lifeguard.",
    "If laughter is the best medicine, your face must be curing the world.",
    "You're like a cloud. When you disappear, it's a beautiful day.",
    "I'm not saying you're stupid, but you're definitely having bad luck thinking.",
    "You have so many layers, and all of them are annoying.",
    "I'd give you a nasty look but you already have one.",
    "You're about as useful as a screen door on a submarine."
  ];

  const hypes = [
    "You're not just a legend, you're the whole epic poem! 🚀",
    "If energy had a name, it would definitely be yours. Goated! 🔥",
    "The world isn't ready for your level of brilliance. Stay winning! 💎",
    "You're the main character in a world of NPCs. Absolute unit! 👑",
    "Your vibe is so immaculate, even the stars are taking notes. ✨",
    "Absolute legend status achieved. You're actually goated! 🐐",
    "You don't just set the bar, you are the bar! Infinite Ws only! 🏆"
  ];

  const list = mode === 'roast' ? roasts : hypes;
  let text = list[Math.floor(Math.random() * list.length)];
  
  if (input) {
    text = `Regarding "${input}": ` + text;
  }
  
  return text;
}
