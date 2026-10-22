# 🚨 Emergency Rollback Plan

## Scenario A: API Failure (Gemini Down)
1. **Immediate Action**: Toggle "Maintenance Mode" in `App.tsx` (hardcoded flag).
2. **Fallback**: Switch to a static list of "Classic Roasts" to keep the UI interactive.
3. **Communication**: Update the marquee with "AI is currently recharging its fire. Back soon!"

## Scenario B: Traffic Spike (100K+ DAU)
1. **Auto-Scaling**: Cloud Run handles this, but monitor the "Cold Start" latency.
2. **Database**: If using a DB, ensure indexing is correct.
3. **Rate Limiting**: Tighten `express-rate-limit` to 5 requests per minute per IP.

## Scenario C: Malicious Content
1. **Prompt Engineering**: Update the system instruction to be more restrictive if roasts become toxic.
2. **Reporting**: Enable the "Report" button to flag and auto-hide content.

## Rollback Procedure
1. **Git**: Revert to the last stable commit.
2. **Deploy**: `npm run build` and push to Cloud Run.
3. **Verify**: Check `/api/health` immediately after deployment.
