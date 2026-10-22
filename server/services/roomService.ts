// src/services/roomService.ts
import { collections, Timestamp, FieldValue } from '../lib/firebase-admin.ts';

export interface RoomPlayer {
  userId: string;
  username: string;
  ready: boolean;
  joinedAt: any;
}

export interface ChallengeRoom {
  id: string;
  roomCode: string;
  hostId: string;
  hostName: string;
  gameType: string; // truth_dare, roast_battle, quick_battle, trivia_tournament, friendship
  status: 'waiting' | 'active' | 'completed' | 'expired';
  maxPlayers: number;
  currentPlayers: number;
  players: RoomPlayer[];
  gameData?: any;
  createdAt: any;
  expiresAt: any;
  completedAt?: any;
}

export class RoomService {
  private static instance: RoomService;

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  // Generate 6-character room code (excludes O,0,I,1)
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async createRoom(
    hostId: string,
    hostName: string,
    gameType: string,
    maxPlayers: number = 2,
    gameData: any = null
  ): Promise<ChallengeRoom> {
    let roomCode = this.generateRoomCode();
    
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const existing = await collections.challengeRooms!.where('roomCode', '==', roomCode).where('status', '==', 'waiting').get();
      if (existing.empty) break;
      roomCode = this.generateRoomCode();
      attempts++;
    }

    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 3600, now.nanoseconds); // 1 hour

    const roomId = Math.random().toString(36).substring(2, 12);
    
    const room: Omit<ChallengeRoom, 'id'> = {
      roomCode,
      hostId,
      hostName,
      gameType,
      status: 'waiting',
      maxPlayers,
      currentPlayers: 1,
      players: [
        {
          userId: hostId,
          username: hostName,
          ready: false,
          joinedAt: now
        }
      ],
      gameData,
      createdAt: now,
      expiresAt: expiresAt
    };

    await collections.challengeRooms!.doc(roomId).set(room);
    return { id: roomId, ...room };
  }

  async joinRoom(roomCode: string, userId: string, username: string): Promise<ChallengeRoom> {
    const roomQuery = await collections.challengeRooms!
      .where('roomCode', '==', roomCode.toUpperCase())
      .where('status', '==', 'waiting')
      .limit(1)
      .get();

    if (roomQuery.empty) throw new Error('Room not found or no longer waiting');
    
    const roomDoc = roomQuery.docs[0];
    const room = { id: roomDoc.id, ...roomDoc.data() } as ChallengeRoom;

    if (room.currentPlayers >= room.maxPlayers) throw new Error('Room is full');
    if (room.players.some(p => p.userId === userId)) return room; // Already in

    const newPlayer: RoomPlayer = {
      userId,
      username,
      ready: false,
      joinedAt: Timestamp.now()
    };

    await collections.challengeRooms!.doc(room.id).update({
      players: FieldValue.arrayUnion(newPlayer),
      currentPlayers: FieldValue.increment(1)
    });

    room.players.push(newPlayer);
    room.currentPlayers += 1;
    return room;
  }

  async setPlayerReady(roomCode: string, userId: string): Promise<void> {
    const roomQuery = await collections.challengeRooms!
      .where('roomCode', '==', roomCode.toUpperCase())
      .limit(1)
      .get();

    if (roomQuery.empty) throw new Error('Room not found');
    
    const roomDoc = roomQuery.docs[0];
    const room = { id: roomDoc.id, ...roomDoc.data() } as ChallengeRoom;

    const updatedPlayers = room.players.map(p => 
      p.userId === userId ? { ...p, ready: true } : p
    );

    const allReady = updatedPlayers.every(p => p.ready) && updatedPlayers.length >= 2; // Min 2 players or maxPlayers logic
    const statusUpdate = allReady && updatedPlayers.length === room.maxPlayers ? 'active' : 'waiting';

    await collections.challengeRooms!.doc(room.id).update({
      players: updatedPlayers,
      status: statusUpdate
    });
  }

  async getRoomByCode(roomCode: string): Promise<ChallengeRoom | null> {
    const roomQuery = await collections.challengeRooms!
      .where('roomCode', '==', roomCode.toUpperCase())
      .limit(1)
      .get();

    if (roomQuery.empty) return null;
    const roomDoc = roomQuery.docs[0];
    return { id: roomDoc.id, ...roomDoc.data() } as ChallengeRoom;
  }

  // Matchmaking
  async joinMatchmaking(userId: string, username: string, gameType: string): Promise<void> {
    // Check if already in queue
    const existing = await collections.matchmakingQueue!
      .where('userId', '==', userId)
      .where('gameType', '==', gameType)
      .get();
    
    if (!existing.empty) return;

    await collections.matchmakingQueue!.add({
      userId,
      username,
      gameType,
      joinedAt: Timestamp.now()
    });
  }

  async findMatch(gameType: string): Promise<{ roomId: string; roomCode: string } | null> {
    // Basic matchmaking: find oldest 2 people in queue for this gameType
    const queueQuery = await collections.matchmakingQueue!
      .where('gameType', '==', gameType)
      .orderBy('joinedAt', 'asc')
      .limit(2)
      .get();

    if (queueQuery.docs.length < 2) return null;

    const p1 = queueQuery.docs[0].data();
    const p2 = queueQuery.docs[1].data();

    // Create room
    const room = await this.createRoom(p1.userId, p1.username, gameType, 2);
    await this.joinRoom(room.roomCode, p2.userId, p2.username);

    // Remove from queue
    const batch = collections.matchmakingQueue!.firestore.batch();
    batch.delete(queueQuery.docs[0].ref);
    batch.delete(queueQuery.docs[1].ref);
    await batch.commit();

    return { roomId: room.id, roomCode: room.roomCode };
  }
}

export const roomService = RoomService.getInstance();
