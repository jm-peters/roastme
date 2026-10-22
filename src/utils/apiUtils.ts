
import { auth } from '../firebase';

/**
 * Fetches with Firebase ID Token in the Authorization header.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const status = response.status;
    let message = errorData.error || `Error (${status})`;

    if (status === 401) message = "Session expired. Please log in again.";
    if (status === 403) message = "You don't have permission to perform this action.";
    if (status === 404) message = "The requested resource was not found.";
    if (status === 429) message = "Too many requests. Please slow down!";
    if (status === 500) message = "Server error. We're working on it!";
    if (status === 503) message = "Service is temporarily unavailable. Try again in a minute.";

    throw new Error(message);
  }

  // Pre-emptively intercept HTML responses even if status is 200
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error('Server returned HTML instead of JSON');
  }

  return response;
}

/**
 * Retries a function with exponential backoff.
 * @param fn The function to retry.
 * @param maxRetries Maximum number of retries.
 * @param initialDelay Initial delay in milliseconds.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Check if it's a retryable error (e.g., 503, 429, or network error)
      const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
      const isRetryable = 
        errorStr.includes('503') || 
        errorStr.includes('429') || 
        errorStr.includes('UNAVAILABLE') || 
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('Failed to fetch') ||
        errorStr.includes('NetworkError') ||
        errorStr.includes('Load failed');
      
      if (!isRetryable) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, retries - 1);
      console.log(`Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}
