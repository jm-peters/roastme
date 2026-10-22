// src/services/userService.ts
import { firestore, collections, FieldValue, Timestamp, auth } from '../lib/firebase-admin.ts';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export interface AppUser {
  id: string;
  username: string;
  usernameLower: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  createdAt: any;
  lastLoginAt: any;
  lastLoginIp?: string | null;
  
  // Economy
  rmpBalance: number;
  coinBalance: number;
  totalRMPEarned: number;
  totalCoinsEarned: number;
  usdEarned: number;
  
  // Stats
  totalShares: number;
  totalReferrals: number;
  totalRoasts: number;
  totalChallenges: number;
  totalGamesPlayed: number;
  totalPageViews: number;
  
  // Referral
  referralCode: string;
  referredBy?: string | null;
  
  // Security
  passwordHash?: string;
  isActive: boolean;
  isBanned: boolean;
  isVerified: boolean;
  verificationToken?: string | null;
  
  // Withdrawal
  withdrawalAddress?: string | null;
  withdrawalMethod?: string | null;
  pendingWithdrawal: number;
  lastWithdrawalAt?: any | null;

  // Retention Features
  streakFreezeAvailable?: number;
  streakFrozen?: boolean;
  avatarFrame?: string;
  profileBg?: string;
  roastTitle?: string;
}

export class UserService {
  private static instance: UserService;
  
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  
  // Create new user (Firebase Auth + Firestore)
  async createUser(
    username: string,
    password: string,
    email?: string,
    name?: string,
    referralCode?: string
  ): Promise<{ user: AppUser; firebaseUid: string; token: string }> {
    
    const usernameLower = username.toLowerCase();
    
    // Check if username exists
    const existingUser = await collections.users!.where('usernameLower', '==', usernameLower).get();
    if (!existingUser.empty) {
      throw new Error('Username already taken');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create Firebase Auth user
    const firebaseUser = await auth.createUser({
      email: email || `${username}@roastme.temp`,
      password,
      displayName: name || username,
      emailVerified: !!email,
    });
    
    // Generate referral code
    const userReferralCode = `${username.substring(0, 5)}${nanoid(6)}`.toLowerCase();
    
    // Create user document in Firestore
    const userId = firebaseUser.uid;
    const now = Timestamp.now();
    
    const userData: Omit<AppUser, 'id'> = {
      username,
      usernameLower,
      email: email || null,
      name: name || username,
      image: null,
      bio: null,
      createdAt: now,
      lastLoginAt: now,
      lastLoginIp: null,
      rmpBalance: 0,
      coinBalance: 0,
      totalRMPEarned: 0,
      totalCoinsEarned: 0,
      usdEarned: 0,
      totalShares: 0,
      totalReferrals: 0,
      totalRoasts: 0,
      totalChallenges: 0,
      totalGamesPlayed: 0,
      totalPageViews: 0,
      referralCode: userReferralCode,
      referredBy: null,
      passwordHash,
      isActive: true,
      isBanned: false,
      isVerified: !!email,
      verificationToken: null,
      withdrawalAddress: null,
      withdrawalMethod: null,
      pendingWithdrawal: 0,
      lastWithdrawalAt: null,
    };
    
    await collections.users!.doc(userId).set(userData);
    
    // Handle referral
    if (referralCode) {
      const referrerQuery = await collections.users!.where('referralCode', '==', referralCode).limit(1).get();
      if (!referrerQuery.empty) {
        const referrer = referrerQuery.docs[0];
        await collections.referrals!.doc().set({
          referrerId: referrer.id,
          referredId: userId,
          referredUsername: username,
          status: 'pending',
          createdAt: Timestamp.now(),
        });
        
        // Update referrer's referral count
        await collections.users!.doc(referrer.id).update({
          totalReferrals: FieldValue.increment(1),
        });
      }
    }
    
    // Generate custom token for session
    const token = await auth.createCustomToken(userId);
    
    return {
      user: { id: userId, ...userData },
      firebaseUid: userId,
      token,
    };
  }
  
  // Authenticate user
  async authenticateUser(username: string, password: string): Promise<{ user: AppUser; token: string }> {
    const usernameLower = username.toLowerCase();
    
    const userQuery = await collections.users!.where('usernameLower', '==', usernameLower).limit(1).get();
    
    if (userQuery.empty) {
      throw new Error('Invalid username or password');
    }
    
    const userDoc = userQuery.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() } as AppUser;
    
    if (!userData.isActive || userData.isBanned) {
      throw new Error('Account is disabled or banned');
    }
    
    const isValid = await bcrypt.compare(password, userData.passwordHash || '');
    if (!isValid) {
      throw new Error('Invalid username or password');
    }
    
    // Update last login
    await collections.users!.doc(userDoc.id).update({
      lastLoginAt: Timestamp.now(),
    });
    
    // Create token
    const token = await auth.createCustomToken(userDoc.id);
    
    return { user: userData, token };
  }
  
  // Get user by ID
  async getUserById(userId: string): Promise<AppUser | null> {
    const userDoc = await collections.users!.doc(userId).get();
    if (!userDoc.exists) return null;
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  
  // Get user by username
  async getUserByUsername(username: string): Promise<AppUser | null> {
    const usernameLower = username.toLowerCase();
    const userQuery = await collections.users!.where('usernameLower', '==', usernameLower).limit(1).get();
    if (userQuery.empty) return null;
    const userDoc = userQuery.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  
  // Get user by referral code
  async getUserByReferralCode(referralCode: string): Promise<AppUser | null> {
    const userQuery = await collections.users!.where('referralCode', '==', referralCode).limit(1).get();
    if (userQuery.empty) return null;
    const userDoc = userQuery.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  
  // Update user
  async updateUser(userId: string, updates: Partial<AppUser>): Promise<void> {
    const updateData: any = { ...updates };
    delete updateData.id;
    delete updateData.usernameLower;
    await collections.users!.doc(userId).update(updateData);
  }
  
  // Delete user (soft delete)
  async deleteUser(userId: string): Promise<void> {
    await collections.users!.doc(userId).update({
      isActive: false,
      username: `deleted_${userId.substring(0, 8)}`,
      usernameLower: `deleted_${userId.substring(0, 8)}`,
    });
  }
}

export const userService = UserService.getInstance();
