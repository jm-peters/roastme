// src/utils/userLookup.ts

/**
 * Client-side utility for user lookup and identification.
 * Note: Actual database logic resides in server.ts for this project.
 */

export async function findUserByUsername(username: string) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('User lookup error:', err);
    return null;
  }
}

export async function userExists(username: string): Promise<boolean> {
  const user = await findUserByUsername(username);
  return user !== null;
}

export async function searchUsers(query: string) {
  try {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch (err) {
    console.error('User search error:', err);
    return [];
  }
}

export function formatUsername(username: string): string {
  return username.trim().toLowerCase();
}
