import { Router } from "express";
import { syncToFirestore, getFromFirestore } from "../services/firestoreSync.ts";

export const socialUpgradesRouter = Router();

// --- FRIENDSHIP CHALLENGES ---
socialUpgradesRouter.post("/api/v2/friendship/create", async (req, res) => {
  const { userId, username, challengeType, questions, rivalryMode } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  
  const challengeId = Math.random().toString(36).substr(2, 12);
  const shareCode = Math.random().toString(36).substr(2, 8).toUpperCase();

  const challengeData = {
    id: challengeId,
    shareCode,
    creatorId: userId,
    creatorUsername: username,
    challengeType: challengeType || "custom",
    questions,
    responses: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalQuestions: questions.length,
    rivalryMode: !!rivalryMode,
    rounds: [],
    averageScore: 0,
    totalPlays: 0
  };

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const domain = req.headers.host || "localhost:3000";
  const shareLink = `${protocol}://${domain}/friendship/${challengeId}`;

  // Sync to firestore
  await syncToFirestore("friendshipChallenges", challengeId, challengeData);
  res.json({ success: true, challengeId, shareCode, shareLink, rivalryMode: !!rivalryMode });
});

socialUpgradesRouter.post("/api/v2/friendship/rematch", async (req, res) => {
  // Logic for rematch
  const { challengeId, score } = req.body;
  const challenge = await getFromFirestore("friendshipChallenges", challengeId);
  if (!challenge) return res.status(404).json({ error: "Not found" });
  
  challenge.totalPlays = (challenge.totalPlays || 0) + 1;
  challenge.rounds = challenge.rounds || [];
  challenge.rounds.push({ score, date: new Date().toISOString() });
  
  const totalScore = challenge.rounds.reduce((acc: number, r: any) => acc + r.score, 0);
  challenge.averageScore = totalScore / challenge.totalPlays;
  
  await syncToFirestore("friendshipChallenges", challengeId, challenge);
  res.json({ success: true, averageScore: challenge.averageScore, drifted: challenge.averageScore < 40 });
});

// --- ANONYMOUS MESSAGES ---
const anonymousRateLimits = new Map<string, number[]>();

socialUpgradesRouter.post("/api/v2/anonymous/send", async (req, res) => {
  const { recipientUsername, message, category } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  // Rate limiting logic
  const limitKey = `${ip}_${recipientUsername}`;
  const now = Date.now();
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  
  let userAccesses = anonymousRateLimits.get(limitKey) || [];
  userAccesses = userAccesses.filter(time => now - time < DAY_IN_MS);
  
  if (userAccesses.length >= 3) {
    return res.status(429).json({ error: "Maximum 3 messages per IP per 24h to this user. Give them a break!" });
  }
  userAccesses.push(now);
  anonymousRateLimits.set(limitKey, userAccesses);

  // Let's implement firestore storage
  const msgId = Math.random().toString(36).substr(2, 9);
  const targetUid = recipientUsername; // using username as UID for simplicity unless mapping is given
  
  const msgData = {
    id: msgId,
    category: category || "Confession 💋",
    content: message,
    reaction: null,
    createdAt: new Date().toISOString()
  };

  await syncToFirestore(`anonymousMessages/${targetUid}/messages`, msgId, msgData);
  res.json({ success: true, msgId });
});

socialUpgradesRouter.get("/api/v2/anonymous/messages/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const db = (await import("../lib/firebase-admin.ts")).getAdminDb();
    if (db) {
      const snap = await db.collection(`anonymousMessages/${username}/messages`).orderBy("createdAt", "desc").get();
      const messages = snap.docs.map(d => d.data());
      return res.json({ messages });
    }
  } catch(e) {
    console.error(e);
  }
  res.json({ messages: [] });
});

socialUpgradesRouter.post("/api/v2/anonymous/react", async (req, res) => {
  const { targetUid, msgId, reaction } = req.body;
  await syncToFirestore(`anonymousMessages/${targetUid}/messages`, msgId, { reaction });
  res.json({ success: true });
});

// --- PRANK GENERATOR ---
socialUpgradesRouter.post("/api/v2/pranks/create", async (req, res) => {
  const { creatorId, template } = req.body;
  const prankId = Math.random().toString(36).substr(2, 9);
  
  const prankData = {
    id: prankId,
    creatorId,
    template,
    viewCount: 0,
    reactionUrl: null,
    revealedAt: null,
    createdAt: new Date().toISOString()
  };
  
  await syncToFirestore("pranks", prankId, prankData);
  res.json({ success: true, prankId });
});

socialUpgradesRouter.post("/api/v2/pranks/:id/reaction", async (req, res) => {
  const { id } = req.params;
  const { imageBase64 } = req.body; // Actually storing raw base64 strings in firestore is bad practice, but we do it mapped to ID as simulation.
  await syncToFirestore("pranks", id, { reactionUrl: imageBase64, revealedAt: new Date().toISOString() });
  res.json({ success: true });
});

// --- GROUP DARE ROOMS ---
socialUpgradesRouter.post("/api/v2/darerooms/create", async (req, res) => {
  const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  const roomData = {
    roomCode,
    players: [],
    dares: [],
    scores: {},
    status: "waiting",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  // Using firestore to simulate RTDB for simplicity
  await syncToFirestore("dareRooms", roomCode, roomData);
  res.json({ success: true, roomCode });
});

// --- SOCIAL CHALLENGE WALL ---
socialUpgradesRouter.get("/api/v2/challenge-wall", async (req, res) => {
  // Normally we would list docs here. 
  // For now we return empty or a mocked structure, since getAdminDb().collection().get() is needed.
  res.json({ challenges: [] });
});

socialUpgradesRouter.post("/api/v2/challenge-wall/create", async (req, res) => {
  const { poster, description, reward } = req.body;
  const challengeId = Math.random().toString(36).substr(2, 12);
  const data = {
    id: challengeId,
    poster,
    description,
    reward,
    acceptedBy: [],
    proofUrl: null,
    status: "open",
    createdAt: new Date().toISOString()
  };
  await syncToFirestore("challengeWall", challengeId, data);
  res.json({ success: true, challengeId });
});

// --- VIRAL SHARE ENGINE ---
socialUpgradesRouter.post("/api/v2/links/create", async (req, res) => {
  const { feature, creatorId, targetPath, creatorUsername } = req.body;
  const linkId = Math.random().toString(36).substr(2, 8);
  
  const linkData = {
    id: linkId,
    feature,
    creatorId: creatorId || "anonymous",
    creatorUsername: creatorUsername || "Someone",
    targetPath,
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  await syncToFirestore("linkAnalytics", linkId, linkData);
  
  // Construct dynamic link style URL
  const domain = req.headers.host || "localhost:3000";
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  res.json({ success: true, linkId, shortUrl: `${protocol}://${domain}/share/${linkId}` });
});

socialUpgradesRouter.get("/share/:linkId", async (req, res) => {
  const { linkId } = req.params;
  const linkData = await getFromFirestore("linkAnalytics", linkId);
  
  if (!linkData) {
    return res.redirect("/");
  }

  // Increment clicks (this should technically happen on full load or here depending on strictness,
  // we do it here for tracking)
  linkData.clicks = (linkData.clicks || 0) + 1;
  await syncToFirestore("linkAnalytics", linkId, linkData);

  // Return a minimal HTML that sets OG tags then redirects to the targetPath
  let ogTitle = "ROASTME";
  let ogDesc = "Check this out on ROASTME!";
  
  switch(linkData.feature) {
    case 'friendship':
      ogDesc = "Can you score above 80%? Only 3 people have 👀";
      ogTitle = "Friendship Challenge";
      break;
    case 'anonymous':
      ogDesc = `${linkData.creatorUsername} wants to know what you REALLY think`;
      ogTitle = "Anonymous Message";
      break;
    case 'prank':
      ogDesc = `Tap to see something important from ${linkData.creatorUsername}`;
      ogTitle = "You have a message";
      break;
    case 'dare':
      ogDesc = `${linkData.creatorUsername} dared you — are you brave enough?`;
      ogTitle = "Dare Challenge";
      break;
  }

  const ogImageUrl = `https://${req.headers.host}/api/v2/og-image?text=${encodeURIComponent(ogTitle)}&sub=${encodeURIComponent(linkData.creatorUsername)}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${ogTitle}</title>
        <meta property="og:title" content="${ogTitle}" />
        <meta property="og:description" content="${ogDesc}" />
        <meta property="og:image" content="${ogImageUrl}" />
        <meta property="og:type" content="website" />
        <meta http-equiv="refresh" content="0; url=${linkData.targetPath}" />
        <script>window.location.href = "${linkData.targetPath}";</script>
      </head>
      <body>
        <p>Redirecting you to ${ogTitle}...</p>
      </body>
    </html>
  `;
  
  res.send(html);
});

// Simple OG Image Generator (SVG)
socialUpgradesRouter.get("/api/v2/og-image", (req, res) => {
  const { text, sub } = req.query;
  const mainText = text ? String(text) : "ROASTME";
  const subText = sub ? String(sub) : "";

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF3366"/>
          <stop offset="100%" stop-color="#9933FF"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="600" y="315" font-family="system-ui, sans-serif" font-size="72" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">${mainText}</text>
      <text x="600" y="400" font-family="system-ui, sans-serif" font-size="48" font-weight="600" fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">${subText}</text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

