export interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  year?: number;
  funFact?: string;
}

// ==================== FOOTBALL TRIVIA ====================
export const footballQuestions: TriviaQuestion[] = [
  { id: "foot_001", category: "football", question: "Which country won the 2022 FIFA World Cup?", options: ["Argentina", "France", "Croatia", "Morocco"], correctAnswer: "Argentina", difficulty: "easy", year: 2022, funFact: "Argentina's third World Cup title, first since 1986." },
  { id: "foot_002", category: "football", question: "Who won the Golden Ball at the 2022 World Cup?", options: ["Lionel Messi", "Kylian Mbappé", "Julián Álvarez", "Luka Modrić"], correctAnswer: "Lionel Messi", difficulty: "easy", year: 2022 },
  { id: "foot_003", category: "football", question: "Who scored a hat-trick in the 2022 World Cup final?", options: ["Kylian Mbappé", "Lionel Messi", "Ángel Di María", "Olivier Giroud"], correctAnswer: "Kylian Mbappé", difficulty: "easy", year: 2022 },
  { id: "foot_004", category: "football", question: "Which African team reached the semi-finals of the 2022 World Cup?", options: ["Morocco", "Senegal", "Tunisia", "Ghana"], correctAnswer: "Morocco", difficulty: "easy", year: 2022 },
  { id: "foot_005", category: "football", question: "Who won the 2024 Copa América?", options: ["Argentina", "Colombia", "Brazil", "Uruguay"], correctAnswer: "Argentina", difficulty: "easy", year: 2024 },
  { id: "foot_006", category: "football", question: "Which country won the 2024 UEFA European Championship?", options: ["Spain", "England", "Germany", "France"], correctAnswer: "Spain", difficulty: "easy", year: 2024 },
  { id: "foot_007", category: "football", question: "Who is the all-time top scorer in World Cup history?", options: ["Miroslav Klose", "Ronaldo", "Lionel Messi", "Pele"], correctAnswer: "Miroslav Klose", difficulty: "medium", funFact: "16 goals in 24 matches." },
  { id: "foot_008", category: "football", question: "Which club has won the most Champions League titles?", options: ["Real Madrid", "AC Milan", "Bayern Munich", "Liverpool"], correctAnswer: "Real Madrid", difficulty: "easy" },
  { id: "foot_009", category: "football", question: "Who won the 2024 Champions League?", options: ["Real Madrid", "Borussia Dortmund", "Bayern Munich", "Manchester City"], correctAnswer: "Real Madrid", difficulty: "easy", year: 2024 },
  { id: "foot_010", category: "football", question: "Which club won the 2023-24 Premier League?", options: ["Manchester City", "Arsenal", "Liverpool", "Aston Villa"], correctAnswer: "Manchester City", difficulty: "easy", year: 2024 },
  { id: "foot_011", category: "football", question: "Who is the manager of Liverpool as of late 2024?", options: ["Jurgen Klopp", "Arne Slot", "Xabi Alonso", "Pep Guardiola"], correctAnswer: "Arne Slot", difficulty: "medium", year: 2024 },
  { id: "foot_012", category: "football", question: "Which country won the 2010 World Cup?", options: ["Netherlands", "Spain", "Germany", "Uruguay"], correctAnswer: "Spain", difficulty: "easy", year: 2010 },
  { id: "foot_013", category: "football", question: "Who scored the winning goal in the 2014 World Cup final?", options: ["Mario Götze", "Thomas Müller", "Lionel Messi", "Miroslav Klose"], correctAnswer: "Mario Götze", difficulty: "medium", year: 2014 },
  { id: "foot_014", category: "football", question: "Which club is known as 'The Old Lady'?", options: ["Inter Milan", "AC Milan", "Juventus", "AS Roma"], correctAnswer: "Juventus", difficulty: "medium" },
  { id: "foot_015", category: "football", question: "Who won the 2021 Ballon d'Or?", options: ["Robert Lewandowski", "Lionel Messi", "Jorginho", "Karim Benzema"], correctAnswer: "Lionel Messi", difficulty: "medium", year: 2021 },
  { id: "foot_016", category: "football", question: "Which city is the stadium 'San Siro' in?", options: ["Rome", "Milan", "Turin", "Naples"], correctAnswer: "Milan", difficulty: "easy" },
  { id: "foot_017", category: "football", question: "Who is nicknamed 'The Special One'?", options: ["Pep Guardiola", "Arsène Wenger", "José Mourinho", "Alex Ferguson"], correctAnswer: "José Mourinho", difficulty: "easy" },
  { id: "foot_018", category: "football", question: "Which country hosted the 2006 World Cup?", options: ["Italy", "France", "Germany", "South Korea"], correctAnswer: "Germany", difficulty: "easy", year: 2006 },
  { id: "foot_019", category: "football", question: "Who won the Golden Boot at the 2018 World Cup?", options: ["Harry Kane", "Kylian Mbappé", "Luka Modrić", "Cristiano Ronaldo"], correctAnswer: "Harry Kane", difficulty: "medium", year: 2018 },
  { id: "foot_020", category: "football", question: "Which club plays at Anfield?", options: ["Everton", "Liverpool", "Manchester United", "Arsenal"], correctAnswer: "Liverpool", difficulty: "easy" },
];

// ==================== BIBLE TRIVIA ====================
export const bibleQuestions: TriviaQuestion[] = [
  { id: "bib_001", category: "bible-trivia", question: "Who was called the father of faith?", options: ["Abraham", "Moses", "David", "Isaac"], correctAnswer: "Abraham", difficulty: "easy" },
  { id: "bib_002", category: "bible-trivia", question: "Who was called a man after God's own heart?", options: ["David", "Solomon", "Paul", "Peter"], correctAnswer: "David", difficulty: "easy" },
  { id: "bib_003", category: "bible-trivia", question: "How many disciples did Jesus have?", options: ["12", "10", "14", "8"], correctAnswer: "12", difficulty: "easy" },
  { id: "bib_004", category: "bible-trivia", question: "Who betrayed Jesus?", options: ["Judas", "Peter", "John", "James"], correctAnswer: "Judas", difficulty: "easy" },
  { id: "bib_005", category: "bible-trivia", question: "Where was Jesus born?", options: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"], correctAnswer: "Bethlehem", difficulty: "easy" },
  { id: "bib_006", category: "bible-trivia", question: "Who built the Ark?", options: ["Noah", "Moses", "Abraham", "Jacob"], correctAnswer: "Noah", difficulty: "easy" },
  { id: "bib_007", category: "bible-trivia", question: "Which sea did Moses part?", options: ["Red Sea", "Dead Sea", "Mediterranean Sea", "Galilee"], correctAnswer: "Red Sea", difficulty: "easy" },
  { id: "bib_008", category: "bible-trivia", question: "Who was swallowed by a great fish?", options: ["Jonah", "Elijah", "Elisha", "Job"], correctAnswer: "Jonah", difficulty: "easy" },
  { id: "bib_009", category: "bible-trivia", question: "How many books are in the New Testament?", options: ["39", "27", "66", "12"], correctAnswer: "27", difficulty: "medium" },
  { id: "bib_010", category: "bible-trivia", question: "Who wrote the book of Revelation?", options: ["Paul", "Peter", "John", "James"], correctAnswer: "John", difficulty: "medium" },
  { id: "bib_011", category: "bible-trivia", question: "What is the shortest verse in the Bible?", options: ["God is love", "Jesus wept", "Rejoice always", "I am"], correctAnswer: "Jesus wept", difficulty: "medium" },
  { id: "bib_012", category: "bible-trivia", question: "Who was the mother of Samuel?", options: ["Sarah", "Hannah", "Rachel", "Leah"], correctAnswer: "Hannah", difficulty: "medium" },
  { id: "bib_013", category: "bible-trivia", question: "Who was the Roman governor who sentenced Jesus?", options: ["Herod", "Pontius Pilate", "Felix", "Festus"], correctAnswer: "Pontius Pilate", difficulty: "easy" },
  { id: "bib_014", category: "bible-trivia", question: "Who was the first Christian martyr?", options: ["James", "Stephen", "Philip", "Peter"], correctAnswer: "Stephen", difficulty: "medium" },
  { id: "bib_015", category: "bible-trivia", question: "What is the last book of the Bible?", options: ["Revelation", "Jude", "Hebrews", "Acts"], correctAnswer: "Revelation", difficulty: "easy" },
];

// ==================== GENERAL KNOWLEDGE ====================
export const generalQuestions: TriviaQuestion[] = [
  { id: "gen_001", category: "educational-trivia", question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: "Paris", difficulty: "easy" },
  { id: "gen_002", category: "educational-trivia", question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"], correctAnswer: "Da Vinci", difficulty: "easy" }
];

// ==================== SCIENCE & NATURE ====================
export const scienceQuestions: TriviaQuestion[] = [
  { id: "sci_001", category: "educational-trivia", question: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Pb"], correctAnswer: "Au", difficulty: "easy" }
];

// ==================== TECHNOLOGY ====================
export const techQuestions: TriviaQuestion[] = [
  { id: "tec_001", category: "educational-trivia", question: "Who founded Microsoft?", options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"], correctAnswer: "Bill Gates", difficulty: "easy" }
];

// ==================== ENTERTAINMENT ====================
export const entertainmentQuestions: TriviaQuestion[] = [
  { id: "ent_001", category: "educational-trivia", question: "Who played Iron Man in the MCU?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Scarlett Johansson"], correctAnswer: "Robert Downey Jr.", difficulty: "easy" }
];

// ==================== HISTORY & POLITICS ====================
export const historyQuestions: TriviaQuestion[] = [
  { id: "his_001", category: "educational-trivia", question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correctAnswer: "George Washington", difficulty: "easy" }
];

// ==================== GEOGRAPHY ====================
export const geographyQuestions: TriviaQuestion[] = [
  { id: "geo_001", category: "educational-trivia", question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: "Nile", difficulty: "easy" }
];

// ==================== MASTER POOL FOR QUICK BATTLE & GAUNTLET ====================
export const masterTriviaPool: TriviaQuestion[] = [
  ...footballQuestions,
  ...bibleQuestions,
  ...generalQuestions,
  ...scienceQuestions,
  ...techQuestions,
  ...entertainmentQuestions,
  ...historyQuestions,
  ...geographyQuestions,
];

// Export it as MASTER_QUESTION_BANK as well to not break too many things if needed.
export const MASTER_QUESTION_BANK = masterTriviaPool;

// ==================== HELPER FUNCTIONS ====================
export function getDailyQuestions(excludeIds: string[], count: number = 10): TriviaQuestion[] {
  const available = masterTriviaPool.filter(q => !excludeIds.includes(q.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getGauntletQuestion(score: number): TriviaQuestion {
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (score >= 500) difficulty = 'hard';
  else if (score >= 200) difficulty = 'medium';
  
  const pool = masterTriviaPool.filter(q => q.difficulty === difficulty);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getQuestionsByCategory(category: string, excludeIds: string[], limit: number = 10): TriviaQuestion[] {
  const pool = masterTriviaPool.filter(q => q.category === category && !excludeIds.includes(q.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
