// src/utils/linkGenerator.ts
export function generateChallengeLink(page: string, username: string, challengeId: string): string {
  const host = "https://games.roastme.site";
  // page usually truthordare, friendship, etc
  return `${host}/${page}/${username}/${challengeId}`;
}

export function generateInviteLink(page: string, username: string, code: string): string {
  const host = "https://games.roastme.site";
  return `${host}/${page}/${username}/${code}`;
}

export function generateShareLink(username: string, roastId: string): string {
  const host = "https://games.roastme.site";
  return `${host}/roast/${username}/${roastId}`;
}

