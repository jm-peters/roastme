# 🚀 ROASTME Launch Checklist

## Pre-Launch (Days 1-3)
- [ ] **Final QA**: Test on iOS, Android, and Desktop.
- [ ] **SEO Check**: Ensure meta tags are dynamic for shared roasts.
- [ ] **Analytics**: Verify PostHog/Google Analytics events are firing on "Generate" and "Share".
- [ ] **Rate Limiting**: Ensure Express server has `express-rate-limit` to prevent API abuse.

## Launch Day (Day 4)
- [ ] **Product Hunt**: Launch at 12:01 AM PST.
- [ ] **Twitter Thread**: Post a thread of the most hilarious AI roasts.
- [ ] **Influencer Outreach**: Send "Roast Me" links to tech influencers.
- [ ] **Reddit**: Post in r/funny, r/tech, and r/sideproject.

## Growth Phase (Days 5-15)
- [ ] **Leaderboard**: Highlight the top 10 most shared roasts.
- [ ] **User Feedback**: Implement a "Report Bad Roast" button to refine the prompt.
- [ ] **Monetization**: Add "Premium Roast" (longer, more detailed) behind email capture.
- [ ] **Partnerships**: Reach out to meme accounts for "Roast of the Week".

## Infrastructure
- [ ] **Scalability**: Monitor Cloud Run CPU/Memory usage.
- [ ] **API Quotas**: Monitor Gemini API usage in Google Cloud Console.
