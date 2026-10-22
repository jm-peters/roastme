import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const importAdd = `import { MASTER_QUESTION_BANK } from "./src/services/triviaQuestions.ts";\n`;
code = code.replace(/import { GoogleGenAI/, importAdd + 'import { GoogleGenAI');

const varsAdd = `
let dailyQuestionPools: Record<string, any> = {};
let userSeenQuestions: Record<string, Set<string>> = {};
let quickBattles: Record<string, any> = {};
let gauntletRuns: Record<string, any> = {};

const GAUNTLET_REWARDS = [
  { milestone: 10, rmp: 20, coins: 0, badge: null },
  { milestone: 25, rmp: 50, coins: 0, badge: "Survivor" },
  { milestone: 50, rmp: 100, coins: 5, badge: "Gauntlet Runner" },
  { milestone: 100, rmp: 500, coins: 10, badge: "Legend" }
];
`;
code = code.replace('let notifications: Record<string, any[]> = {};', 'let notifications: Record<string, any[]> = {};\n' + varsAdd);


const apiAdd = `
  // ========================================== //
  // ======== TRIVIA ARCADE SYSTEM API ======== //
  // ========================================== //

  app.get("/api/trivia/daily-questions", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const today = new Date().toISOString().split('T')[0];
    
    if (!dailyQuestionPools[today]) {
      const shuffled = [...MASTER_QUESTION_BANK].sort(() => Math.random() - 0.5);
      dailyQuestionPools[today] = shuffled.slice(0, 10);
    }
    
    if (!userSeenQuestions[userId]) {
      userSeenQuestions[userId] = new Set();
    }
    
    const formattedQuestions = dailyQuestionPools[today].map((q: any) => ({
      ...q,
      alreadySeen: userSeenQuestions[userId].has(q.id)
    }));
    
    res.json(formattedQuestions);
  });

  app.post("/api/trivia/daily-questions/seen", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { questionId } = req.body;
    
    if (!userSeenQuestions[userId]) {
      userSeenQuestions[userId] = new Set();
    }
    userSeenQuestions[userId].add(questionId);
    res.json({ success: true });
  });

  // Quick Battle
  app.post("/api/trivia/quick-battle/start", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const username = users[userId]?.username || "Player";
    
    // Find waiting
    const waitingId = Object.keys(quickBattles).find(
      id => quickBattles[id].status === 'waiting' && quickBattles[id].player1Id !== userId
    );
    
    if (waitingId) {
      const battle = quickBattles[waitingId];
      battle.player2Id = userId;
      battle.player2Name = username;
      battle.status = 'active';
      return res.json({ battle, questions: battle.questions, isNew: false });
    }
    
    // Create new
    const battleId = Math.random().toString(36).substring(2, 10);
    const shuffled = [...MASTER_QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, 5);
    
    quickBattles[battleId] = {
      id: battleId,
      player1Id: userId,
      player1Name: username,
      player1Score: 0,
      player2Score: 0,
      questions: shuffled,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
    
    res.json({ battle: quickBattles[battleId], questions: shuffled, isNew: true });
  });

  app.get("/api/trivia/quick-battle/:id/status", authenticate, async (req: any, res) => {
    const battleId = req.params.id;
    const battle = quickBattles[battleId];
    if (!battle) return res.status(404).json({ error: "Not found" });
    res.json(battle);
  });

  app.post("/api/trivia/quick-battle/answer", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { battleId, questionIndex, answer, responseTime } = req.body;
    
    const battle = quickBattles[battleId];
    if (!battle) return res.status(404).json({ error: "Not found" });
    
    const isCorrect = battle.questions[questionIndex].correctAnswer === answer;
    const points = isCorrect ? 10 : 0;
    
    if (userId === battle.player1Id) battle.player1Score += points;
    else if (userId === battle.player2Id) battle.player2Score += points;
    
    res.json({ isCorrect, pointsEarned: points });
  });

  app.post("/api/trivia/quick-battle/end", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { battleId } = req.body;
    
    const battle = quickBattles[battleId];
    if (!battle || battle.status === 'completed') return res.json(battle || {});
    
    battle.status = 'completed';
    battle.completedAt = new Date().toISOString();
    
    if (battle.player1Score > battle.player2Score) {
      battle.winnerId = battle.player1Id;
      battle.winnerName = battle.player1Name;
    } else if (battle.player2Score > battle.player1Score) {
      battle.winnerId = battle.player2Id;
      battle.winnerName = battle.player2Name;
    } else {
      battle.winnerId = 'tie';
    }
    
    if (battle.winnerId && battle.winnerId !== 'tie') {
      try {
        await awardRMP(battle.winnerId, 50, 'QUICK_BATTLE_WIN', 'Won quick battle');
        const loser = battle.winnerId === battle.player1Id ? battle.player2Id : battle.player1Id;
        if (loser) await awardRMP(loser, 10, 'QUICK_BATTLE_LOSS', 'Lost quick battle');
      } catch (err) {}
    }
    
    saveData();
    res.json(battle);
  });

  // Gauntlet
  app.post("/api/trivia/gauntlet/start", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const username = users[userId]?.username || "Player";
    
    // Find active or create
    const activeRunId = Object.keys(gauntletRuns).find(
      id => gauntletRuns[id].userId === userId && !gauntletRuns[id].completed
    );
    
    if (activeRunId) return res.json(gauntletRuns[activeRunId]);
    
    const runId = Math.random().toString(36).substring(2, 10);
    gauntletRuns[runId] = {
      id: runId,
      userId,
      username,
      score: 0,
      livesUsed: 0,
      highestQuestion: 0,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    res.json(gauntletRuns[runId]);
  });

  app.get("/api/trivia/gauntlet/question", authenticate, async (req: any, res) => {
    const shuffled = [...MASTER_QUESTION_BANK].sort(() => Math.random() - 0.5);
    res.json(shuffled[0]);
  });

  app.post("/api/trivia/gauntlet/answer", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { runId, isCorrect, questionNumber } = req.body;
    
    const run = gauntletRuns[runId];
    if (!run || run.completed || run.userId !== userId) return res.status(404).json({ error: "Run not found" });
    
    let reward = null;
    
    if (isCorrect) {
      const oldScore = run.score;
      run.score += 10;
      
      for (const r of GAUNTLET_REWARDS) {
        if (run.score >= r.milestone && oldScore < r.milestone) {
          try {
            await awardRMP(userId, r.rmp, 'GAUNTLET_MILESTONE', \`Reached \${r.milestone} questions in Gauntlet!\`);
            // if coins > 0 add coins
          } catch (e) {}
          reward = r;
        }
      }
      
      if (run.score % 100 === 0 && run.score > 0) {
        run.livesUsed = Math.max(0, run.livesUsed - 1);
      }
    } else {
      run.livesUsed += 1;
      if (run.livesUsed >= 3) {
        run.completed = true;
        try {
          await awardRMP(userId, run.score, 'GAUNTLET_FINAL', \`Completed Gauntlet with \${run.score} points\`);
        } catch (e) {}
      }
    }
    if (questionNumber > run.highestQuestion) {
       run.highestQuestion = questionNumber;
    }
    
    saveData();
    
    res.json({
      newScore: run.score,
      livesLeft: 3 - run.livesUsed,
      gameOver: run.completed,
      reward
    });
  });

  app.get("/api/trivia/gauntlet/leaderboard", async (req: any, res) => {
    const runs = Object.values(gauntletRuns)
      .filter((r: any) => r.completed)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 100);
      
    res.json(runs);
  });
`;

code = code.replace('// BIBLE TRIVIA APIS', apiAdd + '\n  // BIBLE TRIVIA APIS');

fs.writeFileSync(serverFile, code);
console.log('Done!');
