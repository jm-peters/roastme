import FeedPage from './FeedPage';

export default function TrendingPage() {
  // TrendingPage is just FeedPage with 'trending' filter by default
  // The FeedPage already handles this via searchParams, but we can wrap it
  return <FeedPage />;
}
