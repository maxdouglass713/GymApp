import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UserDocument,
  PointEventDocument,
  FeatureUnlockDocument,
  FeatureCatalogDocument,
  WorkoutDocument,
  MealDocument,
  ProgressDocument,
  CommunityChallengeDocument,
  UserChallengeDocument,
  PersonalCommunityDocument,
  CommunityMemberDocument,
  CommunityFeedDocument,
  COLLECTIONS,
} from '../types/firestore';

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (typeof converted[key] === 'object' && converted[key] !== null) {
      converted[key] = convertTimestamps(converted[key]);
    }
  });
  
  return converted;
};

// Helper function to convert Date objects to Firestore timestamps
const prepareForFirestore = (data: any): any => {
  if (!data) return data;
  
  const prepared = { ...data };
  Object.keys(prepared).forEach(key => {
    if (prepared[key] instanceof Date) {
      prepared[key] = Timestamp.fromDate(prepared[key]);
    } else if (typeof prepared[key] === 'object' && prepared[key] !== null) {
      prepared[key] = prepareForFirestore(prepared[key]);
    }
  });
  
  return prepared;
};

// User operations
export const userService = {
  async createUser(uid: string, userData: Omit<UserDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userDoc: UserDocument = {
      id: uid,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(userRef, prepareForFirestore(userDoc));
    return uid;
  },

  async getUser(uid: string): Promise<UserDocument | null> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return convertTimestamps({ id: userSnap.id, ...userSnap.data() }) as UserDocument;
  },

  async updateUser(uid: string, updates: Partial<UserDocument>): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, prepareForFirestore(updateData));
  },

  async deleteUser(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await deleteDoc(userRef);
  },
};

// Points operations
export const pointsService = {
  async addPointEvent(eventData: Omit<PointEventDocument, 'id' | 'createdAt'>): Promise<string> {
    const eventRef = doc(collection(db, COLLECTIONS.POINT_EVENTS));
    const eventDoc: PointEventDocument = {
      id: eventRef.id,
      ...eventData,
      createdAt: new Date(),
    };
    
    await setDoc(eventRef, prepareForFirestore(eventDoc));
    return eventRef.id;
  },

  async getUserPointEvents(uid: string, limitCount: number = 50): Promise<PointEventDocument[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTIONS.POINT_EVENTS),
      where('uid', '==', uid),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as PointEventDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getUserTotalPoints(uid: string): Promise<number> {
    const q = query(
      collection(db, COLLECTIONS.POINT_EVENTS),
      where('uid', '==', uid)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.reduce((total, doc) => {
      const data = doc.data();
      return total + (data.amount || 0);
    }, 0);
  },
};

// Feature operations
export const featureService = {
  async unlockFeature(unlockData: Omit<FeatureUnlockDocument, 'id' | 'createdAt'>): Promise<string> {
    const unlockRef = doc(collection(db, COLLECTIONS.FEATURE_UNLOCKS));
    const unlockDoc: FeatureUnlockDocument = {
      id: unlockRef.id,
      ...unlockData,
      createdAt: new Date(),
    };
    
    await setDoc(unlockRef, prepareForFirestore(unlockDoc));
    return unlockRef.id;
  },

  async getUserUnlockedFeatures(uid: string): Promise<FeatureUnlockDocument[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTIONS.FEATURE_UNLOCKS),
      where('uid', '==', uid)
    );
    
    const querySnapshot = await getDocs(q);
    const features = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as FeatureUnlockDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return features.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getFeatureCatalog(): Promise<FeatureCatalogDocument[]> {
    const q = query(
      collection(db, COLLECTIONS.FEATURE_CATALOG),
      where('isActive', '==', true),
      orderBy('pointsRequired', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as FeatureCatalogDocument
    );
  },
};

// Workout operations
export const workoutService = {
  async createWorkout(workoutData: Omit<WorkoutDocument, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('🔥 Starting workout creation process...');
      
      // Validate required fields
      if (!workoutData.uid) {
        throw new Error('User UID is required');
      }
      if (!workoutData.name) {
        throw new Error('Workout name is required');
      }
      if (!workoutData.exercises || workoutData.exercises.length === 0) {
        throw new Error('At least one exercise is required');
      }

      console.log('🔥 Creating workout document in Firebase:', {
        uid: workoutData.uid,
        name: workoutData.name,
        exerciseCount: workoutData.exercises.length,
        hasCompletedAt: !!workoutData.completedAt
      });

      // Create document reference
      const workoutRef = doc(collection(db, COLLECTIONS.WORKOUTS));
      
      // Build the workout document with proper structure
      const workoutDoc: WorkoutDocument = {
        id: workoutRef.id,
        uid: workoutData.uid,
        name: workoutData.name,
        exercises: workoutData.exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets.map(set => ({
            id: set.id,
            reps: set.reps || 0,
            weight: set.weight || 0,
            notes: set.notes || '',
          })),
          notes: exercise.notes || '',
        })),
        completedAt: workoutData.isTemplate
          ? workoutData.completedAt
          : workoutData.completedAt || new Date(),
        isTemplate: workoutData.isTemplate || false,
        status: workoutData.status || (workoutData.isTemplate ? 'saved' : 'completed'),
        scheduledDate: workoutData.scheduledDate,
        createdAt: new Date(),
        // Store original workout ID if provided (for point deduction)
        originalWorkoutId: (workoutData as any).originalWorkoutId,
      };
      
      console.log('📄 Workout document structure:', {
        id: workoutDoc.id,
        uid: workoutDoc.uid,
        name: workoutDoc.name,
        exerciseCount: workoutDoc.exercises.length,
        createdAt: workoutDoc.createdAt,
        completedAt: workoutDoc.completedAt
      });
      
      // Prepare for Firestore (convert dates to timestamps)
      const preparedDoc = prepareForFirestore(workoutDoc);
      console.log('📄 Prepared document for Firestore:', {
        id: preparedDoc.id,
        uid: preparedDoc.uid,
        name: preparedDoc.name,
        exerciseCount: preparedDoc.exercises?.length || 0
      });
      
      // Save to Firestore
      await setDoc(workoutRef, preparedDoc);
      console.log('✅ Workout document saved successfully with ID:', workoutRef.id);
      
      return workoutRef.id;
    } catch (error) {
      console.error('❌ Error in createWorkout:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Workout data that failed:', {
        uid: workoutData.uid,
        name: workoutData.name,
        exerciseCount: workoutData.exercises?.length || 0,
        hasCompletedAt: !!workoutData.completedAt
      });
      throw error;
    }
  },

  async getUserWorkouts(uid: string, limitCount: number = 50): Promise<WorkoutDocument[]> {
    try {
      console.log('🔥 Firebase: Getting workouts for user:', uid);
      
      if (!uid) {
        throw new Error('User UID is required');
      }

      // Query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, COLLECTIONS.WORKOUTS),
        where('uid', '==', uid),
        limit(limitCount)
      );
      
      console.log('🔥 Firebase: Executing query...');
      const querySnapshot = await getDocs(q);
      console.log('🔥 Firebase: Query executed, found', querySnapshot.docs.length, 'documents');
      
      const workouts = querySnapshot.docs.map(doc => {
        try {
          const data = doc.data();
          console.log('🔥 Firebase: Processing workout document:', doc.id);
          return convertTimestamps({ id: doc.id, ...data }) as WorkoutDocument;
        } catch (docError) {
          console.error('❌ Error processing workout document:', docError, doc.id);
          return null;
        }
      }).filter(Boolean);
      
      console.log('🔥 Firebase: Successfully processed', workouts.length, 'workouts');
      
      // Sort locally instead of using orderBy in the query
      return workouts.filter((w): w is WorkoutDocument => w !== null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      let errorCode = 'No code';
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      if (error && typeof error === 'object' && 'code' in error) {
        errorCode = String(error.code);
      }
      
      // Only log actual errors, not normal cases like "no workouts found"
      if (errorCode !== 'not-found' && !errorMessage.includes('no workouts')) {
        console.log('⚠️ Firebase getUserWorkouts issue:', errorMessage);
        console.log('⚠️ Error code:', errorCode);
      }
      
      throw error;
    }
  },

  async updateWorkout(workoutId: string, updates: Partial<WorkoutDocument>): Promise<void> {
    const workoutRef = doc(db, COLLECTIONS.WORKOUTS, workoutId);
    await updateDoc(workoutRef, prepareForFirestore(updates));
  },

  async deleteWorkout(workoutId: string): Promise<void> {
    const workoutRef = doc(db, COLLECTIONS.WORKOUTS, workoutId);
    await deleteDoc(workoutRef);
  },

  async deleteWorkoutByOriginalId(uid: string, originalWorkoutId: string): Promise<void> {
    try {
      console.log('🔥 Firebase: Deleting workout by original ID:', originalWorkoutId);

      // Attempt direct delete first in case the document ID matches the original ID
      try {
        await workoutService.deleteWorkout(originalWorkoutId);
        console.log('✅ Deleted workout by document ID (matched original ID)');
      } catch (directDeleteError) {
        console.log('ℹ️ Direct delete by document ID failed (expected if IDs differ):', directDeleteError instanceof Error ? directDeleteError.message : directDeleteError);
      }

      const q = query(
        collection(db, COLLECTIONS.WORKOUTS),
        where('uid', '==', uid),
        where('originalWorkoutId', '==', originalWorkoutId),
        limit(20)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('ℹ️ No workouts found with original ID:', originalWorkoutId);
        return;
      }

      await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        try {
          await deleteDoc(docSnapshot.ref);
          console.log('✅ Deleted workout document with Firebase ID:', docSnapshot.id);
        } catch (deleteError) {
          console.error('❌ Error deleting workout document:', docSnapshot.id, deleteError);
        }
      }));

      console.log('✅ Completed deletion for workouts with original ID:', originalWorkoutId);
    } catch (error) {
      console.error('❌ Error deleting workout by original ID:', error);
      throw error;
    }
  },
};

// Meal operations
export const mealService = {
  async createMeal(mealData: Omit<MealDocument, 'createdAt'> & { createdAt?: Date; id?: string }): Promise<string> {
    const { id, createdAt, ...rest } = mealData;

    const mealRef = id
      ? doc(db, COLLECTIONS.MEALS, id)
      : doc(collection(db, COLLECTIONS.MEALS));

    const mealDoc: MealDocument = {
      id: mealRef.id,
      ...rest,
      createdAt: createdAt || new Date(),
    } as MealDocument;
    
    await setDoc(mealRef, prepareForFirestore(mealDoc));
    return mealRef.id;
  },

  async getUserMeals(uid: string, limitCount: number = 50): Promise<MealDocument[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTIONS.MEALS),
      where('uid', '==', uid),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const meals = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as MealDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return meals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async updateMeal(mealId: string, updates: Partial<MealDocument>): Promise<void> {
    const mealRef = doc(db, COLLECTIONS.MEALS, mealId);
    await updateDoc(mealRef, prepareForFirestore(updates));
  },

  async deleteMeal(mealId: string): Promise<void> {
    const mealRef = doc(db, COLLECTIONS.MEALS, mealId);
    await deleteDoc(mealRef);
  },

  async getMealsByDate(uid: string, date: Date): Promise<MealDocument[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTIONS.MEALS),
      where('uid', '==', uid),
      where('mealTime', '>=', Timestamp.fromDate(startOfDay)),
      where('mealTime', '<=', Timestamp.fromDate(endOfDay))
    );
    
    const querySnapshot = await getDocs(q);
    const meals = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as MealDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return meals.sort((a, b) => a.mealTime.getTime() - b.mealTime.getTime());
  },
};

// Progress operations
export const progressService = {
  async addProgressEntry(progressData: Omit<ProgressDocument, 'id' | 'createdAt'>): Promise<string> {
    const progressRef = doc(collection(db, COLLECTIONS.PROGRESS));
    const progressDoc: ProgressDocument = {
      id: progressRef.id,
      ...progressData,
      createdAt: new Date(),
    };
    
    await setDoc(progressRef, prepareForFirestore(progressDoc));
    return progressRef.id;
  },

  async getUserProgress(uid: string, type?: string): Promise<ProgressDocument[]> {
    // Query without orderBy to avoid composite index requirement
    let q = query(
      collection(db, COLLECTIONS.PROGRESS),
      where('uid', '==', uid)
    );
    
    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    const querySnapshot = await getDocs(q);
    const progress = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as ProgressDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return progress.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};

// Community operations
export const communityService = {
  async getActiveChallenges(): Promise<CommunityChallengeDocument[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_CHALLENGES),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as CommunityChallengeDocument
    );
  },

  async joinChallenge(challengeData: Omit<UserChallengeDocument, 'id' | 'joinedAt'>): Promise<string> {
    const challengeRef = doc(collection(db, COLLECTIONS.USER_CHALLENGES));
    const challengeDoc: UserChallengeDocument = {
      id: challengeRef.id,
      ...challengeData,
      joinedAt: new Date(),
    };
    
    await setDoc(challengeRef, prepareForFirestore(challengeDoc));
    return challengeRef.id;
  },

  async getUserChallenges(uid: string): Promise<UserChallengeDocument[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTIONS.USER_CHALLENGES),
      where('uid', '==', uid)
    );
    
    const querySnapshot = await getDocs(q);
    const challenges = querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as UserChallengeDocument
    );
    
    // Sort locally instead of using orderBy in the query
    return challenges.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
  },

  async createPersonalCommunity(input: {
    name: string;
    description?: string;
    type: 'friends' | 'work';
    ownerId: string;
    ownerName: string;
  }): Promise<PersonalCommunityDocument> {
    const inviteCode = await this.generateUniqueCommunityCode();
    const communityRef = doc(collection(db, COLLECTIONS.COMMUNITIES));
    const now = new Date();

    const communityDoc: PersonalCommunityDocument = {
      id: communityRef.id,
      name: input.name,
      ...(input.description ? { description: input.description.trim() } : {}),
      type: input.type,
      inviteCode,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      createdAt: now,
      updatedAt: now,
      membersCount: 1,
    };

    if (
      typeof (communityDoc as Partial<PersonalCommunityDocument>).description ===
      'undefined'
    ) {
      delete (communityDoc as Partial<PersonalCommunityDocument>).description;
    }

    await setDoc(communityRef, prepareForFirestore(communityDoc));

    const memberDoc: CommunityMemberDocument = {
      id: `${communityRef.id}_${input.ownerId}`,
      communityId: communityRef.id,
      uid: input.ownerId,
      displayName: input.ownerName,
      role: 'owner',
      status: 'active',
      joinedAt: now,
    };

    await setDoc(
      doc(db, COLLECTIONS.COMMUNITY_MEMBERS, memberDoc.id),
      prepareForFirestore(memberDoc)
    );

    return communityDoc;
  },

  async createCommunityChallenge(input: {
    communityId: string;
    title: string;
    description: string;
    target?: number;
    createdBy: string;
    createdByName?: string;
  }): Promise<CommunityChallengeDocument> {
    const challengeRef = doc(collection(db, COLLECTIONS.COMMUNITY_CHALLENGES));
    const now = new Date();

    const challengeDoc: CommunityChallengeDocument = {
      id: challengeRef.id,
      communityId: input.communityId,
      name: input.title,
      description: input.description,
      type: 'workout',
      target: input.target ?? 0,
      unit: 'custom',
      startDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      participants: [],
      rewards: {
        points: 0,
      },
      isActive: true,
      createdAt: now,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
    };

    await setDoc(challengeRef, prepareForFirestore(challengeDoc));

    await updateDoc(doc(db, COLLECTIONS.COMMUNITIES, input.communityId), {
      updatedAt: serverTimestamp(),
    });

    return challengeDoc;
  },

  async getCommunityChallenges(communityId: string): Promise<CommunityChallengeDocument[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_CHALLENGES),
      where('communityId', '==', communityId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const challenges = snapshot.docs.map((docSnap) =>
      convertTimestamps({ id: docSnap.id, ...docSnap.data() })
    ) as CommunityChallengeDocument[];

    return challenges.sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  },

  async addCommunityFeedEntry(data: {
    communityId: string;
    userId: string;
    displayName: string;
    message: string;
    workoutId?: string;
    challengeId?: string;
  }): Promise<CommunityFeedDocument> {
    const feedRef = doc(collection(db, COLLECTIONS.COMMUNITY_FEED));
    const now = new Date();

    const feedDoc: CommunityFeedDocument = {
      id: feedRef.id,
      communityId: data.communityId,
      userId: data.userId,
      displayName: data.displayName,
      message: data.message,
      createdAt: now,
    };

    if (typeof data.workoutId === 'string') {
      const trimmed = data.workoutId.trim();
      if (trimmed.length > 0) {
        feedDoc.workoutId = trimmed;
      } else {
        delete (feedDoc as any).workoutId;
      }
    } else {
      delete (feedDoc as any).workoutId;
    }

    if (typeof data.challengeId === 'string') {
      const trimmedChallengeId = data.challengeId.trim();
      if (trimmedChallengeId.length > 0) {
        feedDoc.challengeId = trimmedChallengeId;
      } else {
        delete (feedDoc as any).challengeId;
      }
    } else {
      delete (feedDoc as any).challengeId;
    }

    await setDoc(feedRef, prepareForFirestore(feedDoc));

    await updateDoc(doc(db, COLLECTIONS.COMMUNITIES, data.communityId), {
      updatedAt: serverTimestamp(),
    });

    return feedDoc;
  },

  async deleteCommunityFeedEntriesByChallengeId(challengeId: string): Promise<void> {
    if (!challengeId) {
      return;
    }

    const feedQuery = query(
      collection(db, COLLECTIONS.COMMUNITY_FEED),
      where('challengeId', '==', challengeId)
    );

    const snapshot = await getDocs(feedQuery);
    if (snapshot.empty) {
      return;
    }

    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  },

  async getCommunityFeedEntries(communityId: string): Promise<CommunityFeedDocument[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_FEED),
      where('communityId', '==', communityId)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((docSnap) =>
      convertTimestamps({ id: docSnap.id, ...docSnap.data() })
    ) as CommunityFeedDocument[];

    return entries.sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  },

  async deleteCommunityChallenge(challengeId: string): Promise<void> {
    if (!challengeId) {
      return;
    }

    const challengeRef = doc(db, COLLECTIONS.COMMUNITY_CHALLENGES, challengeId);
    await deleteDoc(challengeRef);
  },

  subscribeToCommunityFeed(
    communityId: string,
    callback: (entries: CommunityFeedDocument[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_FEED),
      where('communityId', '==', communityId)
    );

    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((docSnap) =>
        convertTimestamps({ id: docSnap.id, ...docSnap.data() })
      ) as CommunityFeedDocument[];

      const getTimestamp = (date?: Date) => {
        if (date && typeof date.getTime === 'function') {
          return date.getTime();
        }
        return 0;
      };

      entries.sort(
        (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
      );

      callback(entries);
    });
  },

  async getCommunityByInviteCode(inviteCode: string): Promise<PersonalCommunityDocument | null> {
    const normalized = inviteCode.toUpperCase();
    const q = query(
      collection(db, COLLECTIONS.COMMUNITIES),
      where('inviteCode', '==', normalized),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const community = convertTimestamps({
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    }) as PersonalCommunityDocument;

    return community;
  },

  async joinPersonalCommunity(input: {
    communityId: string;
    uid: string;
    displayName: string;
  }): Promise<{
    community: PersonalCommunityDocument;
    membership: CommunityMemberDocument;
    members: CommunityMemberDocument[];
  } | null> {
    const communityRef = doc(db, COLLECTIONS.COMMUNITIES, input.communityId);
    const communitySnap = await getDoc(communityRef);

    if (!communitySnap.exists()) {
      return null;
    }

    const membershipRef = doc(
      db,
      COLLECTIONS.COMMUNITY_MEMBERS,
      `${input.communityId}_${input.uid}`
    );
    const membershipSnap = await getDoc(membershipRef);
    const now = new Date();

    if (!membershipSnap.exists()) {
      const membershipDoc: CommunityMemberDocument = {
        id: membershipRef.id,
        communityId: input.communityId,
        uid: input.uid,
        displayName: input.displayName,
        role: 'member',
        status: 'active',
        joinedAt: now,
      };

      await setDoc(membershipRef, prepareForFirestore(membershipDoc));
      await updateDoc(communityRef, {
        membersCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    const membersQuery = query(
      collection(db, COLLECTIONS.COMMUNITY_MEMBERS),
      where('communityId', '==', input.communityId)
    );
    const membersSnapshot = await getDocs(membersQuery);

    const members = membersSnapshot.docs.map((docSnap) =>
      convertTimestamps({ id: docSnap.id, ...docSnap.data() })
    ) as CommunityMemberDocument[];

    const community = convertTimestamps({
      id: communitySnap.id,
      ...communitySnap.data(),
    }) as PersonalCommunityDocument;

    const membershipDoc =
      members.find((member) => member.uid === input.uid) ||
      (convertTimestamps({ id: membershipRef.id, ...membershipSnap.data() }) as
        | CommunityMemberDocument
        | undefined);

    return {
      community,
      membership: membershipDoc!,
      members,
    };
  },

  async getUserCommunities(uid: string): Promise<
    Array<{
      community: PersonalCommunityDocument;
      membership: CommunityMemberDocument;
      members: CommunityMemberDocument[];
    }>
  > {
    const membershipsQuery = query(
      collection(db, COLLECTIONS.COMMUNITY_MEMBERS),
      where('uid', '==', uid)
    );
    const membershipSnapshot = await getDocs(membershipsQuery);

    if (membershipSnapshot.empty) {
      return [];
    }

    const memberships = membershipSnapshot.docs.map((docSnap) =>
      convertTimestamps({ id: docSnap.id, ...docSnap.data() })
    ) as CommunityMemberDocument[];

    const results: Array<{
      community: PersonalCommunityDocument;
      membership: CommunityMemberDocument;
      members: CommunityMemberDocument[];
    }> = [];

    for (const membership of memberships) {
      const communityRef = doc(db, COLLECTIONS.COMMUNITIES, membership.communityId);
      const communitySnap = await getDoc(communityRef);

      if (!communitySnap.exists()) {
        continue;
      }

      const membersQuery = query(
        collection(db, COLLECTIONS.COMMUNITY_MEMBERS),
        where('communityId', '==', membership.communityId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const members = membersSnapshot.docs.map((docSnap) =>
        convertTimestamps({ id: docSnap.id, ...docSnap.data() })
      ) as CommunityMemberDocument[];

      results.push({
        community: convertTimestamps({
          id: communitySnap.id,
          ...communitySnap.data(),
        }) as PersonalCommunityDocument,
        membership,
        members,
      });
    }

    return results;
  },

  subscribeToCommunity(
    communityId: string,
    callback: (
      community: PersonalCommunityDocument,
      members: CommunityMemberDocument[]
    ) => void
  ): () => void {
    const communityRef = doc(db, COLLECTIONS.COMMUNITIES, communityId);
    const membersQuery = query(
      collection(db, COLLECTIONS.COMMUNITY_MEMBERS),
      where('communityId', '==', communityId)
    );

    let currentCommunity: PersonalCommunityDocument | null = null;
    let currentMembers: CommunityMemberDocument[] = [];

    const emitUpdate = () => {
      if (currentCommunity) {
        callback(currentCommunity, currentMembers);
      }
    };

    const unsubscribeCommunity = onSnapshot(communityRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      currentCommunity = convertTimestamps({
        id: snapshot.id,
        ...snapshot.data(),
      }) as PersonalCommunityDocument;

      emitUpdate();
    });

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      currentMembers = snapshot.docs.map((docSnap) =>
        convertTimestamps({ id: docSnap.id, ...docSnap.data() })
      ) as CommunityMemberDocument[];

      emitUpdate();
    });

    return () => {
      unsubscribeCommunity();
      unsubscribeMembers();
    };
  },

  async generateUniqueCommunityCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const generate = () => {
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generate();
    let exists = await this.getCommunityByInviteCode(code);

    while (exists) {
      code = generate();
      exists = await this.getCommunityByInviteCode(code);
    }

    return code;
  },
};

