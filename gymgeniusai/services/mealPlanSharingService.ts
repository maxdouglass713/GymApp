import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  Unsubscribe,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SharedMealPlan {
  id?: string;
  mealPlanId: string;
  mealPlanName: string;
  mealPlanData: any; // Contains meals (breakfast, lunch, dinner, snacks) and totalMacros
  coachId: string;
  coachName: string;
  teamId: string;
  teamName: string;
  assignedPlayers: string[];
  assignedPlayerNames: string[];
  createdAt: string; // ISO string timestamp
  date: string; // Date of the meal plan (YYYY-MM-DD)
  completedBy?: string[]; // Array of player IDs who have completed the meal plan
  completionStatus?: Record<string, {
    completed: boolean;
    completedAt?: string;
  }>; // Player ID -> completion status
  playerEdits?: Record<string, {
    mealPlanData: any;
    playerName: string;
    editedAt: string;
  }>; // Player ID -> their edited meal plan data
}

export const mealPlanSharingService = {
  // Share a meal plan with specific players
  async shareMealPlanWithPlayers(
    mealPlan: any,
    coachId: string,
    coachName: string,
    teamId: string,
    teamName: string,
    playerIds: string[],
    playerNames: string[]
  ): Promise<boolean> {
    try {
      console.log('📤 Starting meal plan sharing process...');
      console.log('📤 Meal Plan:', mealPlan);
      console.log('📤 Coach ID:', coachId);
      console.log('📤 Coach Name:', coachName);
      console.log('📤 Team ID:', teamId);
      console.log('📤 Team Name:', teamName);
      console.log('📤 Player IDs:', playerIds);
      console.log('📤 Player Names:', playerNames);

      // Validate inputs
      if (!playerIds || playerIds.length === 0) {
        console.error('❌ No player IDs provided');
        return false;
      }

      if (!coachId) {
        console.error('❌ No coach ID provided');
        return false;
      }

      // Clean and validate player IDs
      const cleanPlayerIds = playerIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
      if (cleanPlayerIds.length === 0) {
        console.error('❌ No valid player IDs after cleaning');
        return false;
      }

      console.log('📤 Cleaned player IDs:', cleanPlayerIds);

      // Create shared meal plan document
      const sharedMealPlanData = {
        mealPlanId: `meal_plan_${Date.now()}`,
        mealPlanName: `Meal Plan - ${mealPlan.date || new Date().toISOString().split('T')[0]}`,
        mealPlanData: mealPlan,
        coachId,
        coachName,
        teamId,
        teamName,
        assignedPlayers: cleanPlayerIds,
        assignedPlayerNames: playerNames.slice(0, cleanPlayerIds.length), // Match length
        createdAt: serverTimestamp(),
        date: mealPlan.date || new Date().toISOString().split('T')[0],
      };

      console.log('📤 Creating shared meal plan document...');
      const sharedMealPlanRef = await addDoc(
        collection(db, 'sharedMealPlans'),
        sharedMealPlanData
      );

      console.log('✅ Shared meal plan document created:', sharedMealPlanRef.id);
      console.log('📋 Meal plan saved to sharedMealPlans collection - will be visible in coach assignments');

      // Add to each player's inbox
      // IMPORTANT: This ensures the meal plan appears in both coach assignments (via sharedMealPlans collection)
      // and player inboxes (via userInbox.sharedMealPlans array) - keeping them in sync
      const inboxPromises = cleanPlayerIds.map(async (playerId) => {
        try {
          // Check if player has an inbox document
          const inboxQuery = query(
            collection(db, 'userInbox'),
            where('userId', '==', playerId)
          );
          const inboxSnapshot = await getDocs(inboxQuery);

          if (!inboxSnapshot.empty) {
            // Update existing inbox
            const inboxDoc = inboxSnapshot.docs[0];
            const inboxData = inboxDoc.data();
            const existingMealPlans = inboxData.sharedMealPlans || [];
            
            await updateDoc(inboxDoc.ref, {
              sharedMealPlans: arrayUnion({
                id: sharedMealPlanRef.id,
                mealPlanId: sharedMealPlanData.mealPlanId,
                mealPlanName: sharedMealPlanData.mealPlanName,
                mealPlanData: sharedMealPlanData.mealPlanData,
                coachId,
                coachName,
                teamId,
                teamName,
                createdAt: new Date().toISOString(),
                date: sharedMealPlanData.date,
                status: 'pending',
              }),
              updatedAt: serverTimestamp(),
            });
            console.log(`✅ Added meal plan to inbox for player ${playerId}`);
          } else {
            // Create new inbox document
            await addDoc(collection(db, 'userInbox'), {
              userId: playerId,
              sharedMealPlans: [{
                id: sharedMealPlanRef.id,
                mealPlanId: sharedMealPlanData.mealPlanId,
                mealPlanName: sharedMealPlanData.mealPlanName,
                mealPlanData: sharedMealPlanData.mealPlanData,
                coachId,
                coachName,
                teamId,
                teamName,
                createdAt: new Date().toISOString(),
                date: sharedMealPlanData.date,
                status: 'pending',
              }],
              sharedWorkouts: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            console.log(`✅ Created new inbox and added meal plan for player ${playerId}`);
          }
        } catch (error) {
          console.error(`❌ Error adding meal plan to inbox for player ${playerId}:`, error);
        }
      });

      await Promise.all(inboxPromises);

      console.log('✅ Meal plan shared successfully with all players');
      return true;
    } catch (error) {
      console.error('❌ Error sharing meal plan:', error);
      return false;
    }
  },

  // Get meal plans for a specific player
  async getPlayerMealPlans(playerId: string): Promise<SharedMealPlan[]> {
    try {
      const inboxQuery = query(
        collection(db, 'userInbox'),
        where('userId', '==', playerId)
      );
      const inboxSnapshot = await getDocs(inboxQuery);

      if (inboxSnapshot.empty) {
        return [];
      }

      const inboxDoc = inboxSnapshot.docs[0];
      const inboxData = inboxDoc.data();
      const mealPlans = inboxData.sharedMealPlans || [];

      return mealPlans.map((mp: any) => ({
        id: mp.id,
        mealPlanId: mp.mealPlanId,
        mealPlanName: mp.mealPlanName,
        mealPlanData: mp.mealPlanData,
        coachId: mp.coachId,
        coachName: mp.coachName,
        teamId: mp.teamId,
        teamName: mp.teamName,
        assignedPlayers: [playerId],
        assignedPlayerNames: [mp.coachName || 'Coach'],
        createdAt: mp.createdAt || new Date().toISOString(),
        date: mp.date,
      }));
    } catch (error) {
      console.error('❌ Error getting player meal plans:', error);
      return [];
    }
  },

  // Subscribe to real-time meal plans for a player
  subscribeToPlayerMealPlans(
    playerId: string,
    callback: (mealPlans: SharedMealPlan[]) => void
  ): Unsubscribe {
    console.log('👂 Setting up real-time listener for player meal plans:', playerId);
    
    const inboxQuery = query(
      collection(db, 'userInbox'),
      where('userId', '==', playerId)
    );

    const unsubscribe = onSnapshot(
      inboxQuery,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          callback([]);
          return;
        }

        const inboxDoc = querySnapshot.docs[0];
        const inboxData = inboxDoc.data();
        const mealPlans = inboxData.sharedMealPlans || [];

        const sharedMealPlans: SharedMealPlan[] = mealPlans.map((mp: any) => ({
          id: mp.id,
          mealPlanId: mp.mealPlanId,
          mealPlanName: mp.mealPlanName,
          mealPlanData: mp.mealPlanData,
          coachId: mp.coachId,
          coachName: mp.coachName,
          teamId: mp.teamId,
          teamName: mp.teamName,
          assignedPlayers: [playerId],
          assignedPlayerNames: [mp.coachName || 'Coach'],
          createdAt: mp.createdAt || new Date().toISOString(),
          date: mp.date,
          completedBy: mp.completedBy || [],
          completionStatus: mp.completionStatus || {},
          playerEdits: mp.playerEdits || {},
        }));

        console.log('💬 Real-time meal plans update received:', sharedMealPlans.length, 'meal plans');
        callback(sharedMealPlans);
      },
      (error) => {
        console.error('❌ Error in player meal plans real-time listener:', error);
        callback([]);
      }
    );

    return unsubscribe;
  },

  // Get meal plan assignments for a coach (to display in team management)
  async getCoachMealPlanAssignments(coachId: string, teamId: string): Promise<SharedMealPlan[]> {
    try {
      console.log('👨‍💼 Getting meal plan assignments for coach:', coachId, 'team:', teamId);
      
      // Query without orderBy first to avoid index requirement
      // We'll sort in memory instead
      const assignmentsQuery = query(
        collection(db, 'sharedMealPlans'),
        where('coachId', '==', coachId),
        where('teamId', '==', teamId)
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      const assignments: SharedMealPlan[] = [];
      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
          assignments.push({
            id: doc.id,
            mealPlanId: data.mealPlanId,
            mealPlanName: data.mealPlanName,
            mealPlanData: data.mealPlanData,
            coachId: data.coachId,
            coachName: data.coachName,
            teamId: data.teamId,
            teamName: data.teamName,
            assignedPlayers: data.assignedPlayers || [],
            assignedPlayerNames: data.assignedPlayerNames || [],
            createdAt: data.createdAt?.toDate?.() ? new Date(data.createdAt.toDate()).toISOString() : data.createdAt || new Date().toISOString(),
            date: data.date,
          completedBy: data.completedBy || [],
          completionStatus: data.completionStatus || {},
          playerEdits: data.playerEdits || {},
        });
      });
      
      // Sort by createdAt in descending order (newest first)
      assignments.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      console.log('✅ Found', assignments.length, 'meal plan assignments for coach');
      return assignments;
    } catch (error) {
      console.error('❌ Error getting coach meal plan assignments:', error);
      return [];
    }
  },

  // Subscribe to real-time meal plan assignments for a coach
  subscribeToCoachMealPlanAssignments(
    coachId: string,
    teamId: string,
    callback: (mealPlans: SharedMealPlan[]) => void
  ): Unsubscribe {
    console.log('👂 Setting up real-time listener for coach meal plan assignments:', coachId, 'team:', teamId);
    
    // Query without orderBy to avoid index requirement
    // We'll sort in memory in the callback
    const assignmentsQuery = query(
      collection(db, 'sharedMealPlans'),
      where('coachId', '==', coachId),
      where('teamId', '==', teamId)
    );
    
    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (querySnapshot) => {
        const assignments: SharedMealPlan[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          assignments.push({
            id: doc.id,
            mealPlanId: data.mealPlanId,
            mealPlanName: data.mealPlanName,
            mealPlanData: data.mealPlanData,
            coachId: data.coachId,
            coachName: data.coachName,
            teamId: data.teamId,
            teamName: data.teamName,
            assignedPlayers: data.assignedPlayers || [],
            assignedPlayerNames: data.assignedPlayerNames || [],
            createdAt: data.createdAt?.toDate?.() ? new Date(data.createdAt.toDate()).toISOString() : data.createdAt || new Date().toISOString(),
            date: data.date,
          completedBy: data.completedBy || [],
          completionStatus: data.completionStatus || {},
          playerEdits: data.playerEdits || {},
        });
        });
        
        // Sort by createdAt in descending order (newest first)
        assignments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        console.log('🔄 Real-time coach meal plan assignments update received:', assignments.length, 'assignments');
        callback(assignments);
      },
      (error) => {
        console.error('❌ Error in coach meal plan assignments real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  },

  // Delete a meal plan assignment (removes from sharedMealPlans and player inboxes)
  // Accepts either the Firestore document ID or the mealPlanId field value
  async deleteMealPlanAssignment(mealPlanIdOrDocId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting meal plan assignment:', mealPlanIdOrDocId);
      
      let mealPlanDocRef: any = null;
      let mealPlanData: any = null;
      let mealPlanDocId: string = '';
      
      // First, try to find by document ID (direct reference)
      try {
        const docRef = doc(db, 'sharedMealPlans', mealPlanIdOrDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          mealPlanDocRef = docRef;
          mealPlanData = docSnap.data();
          mealPlanDocId = docSnap.id;
          console.log('✅ Found meal plan by document ID');
        }
      } catch (error) {
        console.log('⚠️ Not a document ID, trying to find by mealPlanId field...');
      }
      
      // If not found by document ID, try to find by mealPlanId field
      if (!mealPlanDocRef) {
        const mealPlanQuery = query(
          collection(db, 'sharedMealPlans'),
          where('mealPlanId', '==', mealPlanIdOrDocId)
        );
        const mealPlanSnapshot = await getDocs(mealPlanQuery);
        
        if (mealPlanSnapshot.empty) {
          console.error('❌ Meal plan not found by mealPlanId either:', mealPlanIdOrDocId);
          return false;
        }
        
        const mealPlanDoc = mealPlanSnapshot.docs[0];
        mealPlanDocRef = mealPlanDoc.ref;
        mealPlanData = mealPlanDoc.data();
        mealPlanDocId = mealPlanDoc.id;
        console.log('✅ Found meal plan by mealPlanId field');
      }
      
      const assignedPlayers = mealPlanData.assignedPlayers || [];
      const mealPlanIdField = mealPlanData.mealPlanId;
      
      console.log('📋 Meal plan details:', {
        docId: mealPlanDocId,
        mealPlanId: mealPlanIdField,
        assignedPlayers: assignedPlayers.length
      });
      
      // Delete from sharedMealPlans collection using deleteDoc function
      await deleteDoc(mealPlanDocRef);
      console.log('✅ Deleted meal plan from sharedMealPlans collection');
      
      // Remove from each player's inbox
      // Check by both document ID and mealPlanId field to ensure we catch all references
      const inboxUpdatePromises = assignedPlayers.map(async (playerId: string) => {
        try {
          const inboxQuery = query(
            collection(db, 'userInbox'),
            where('userId', '==', playerId)
          );
          const inboxSnapshot = await getDocs(inboxQuery);
          
          if (!inboxSnapshot.empty) {
            const inboxDoc = inboxSnapshot.docs[0];
            const inboxData = inboxDoc.data();
            const sharedMealPlans = inboxData.sharedMealPlans || [];
            
            // Filter out by both document ID and mealPlanId to catch all variations
            const filteredMealPlans = sharedMealPlans.filter((mp: any) => {
              const matchesDocId = mp.id === mealPlanDocId;
              const matchesMealPlanId = mp.mealPlanId === mealPlanIdField;
              return !matchesDocId && !matchesMealPlanId;
            });
            
            if (filteredMealPlans.length !== sharedMealPlans.length) {
              await updateDoc(inboxDoc.ref, {
                sharedMealPlans: filteredMealPlans,
                updatedAt: serverTimestamp(),
              });
              console.log(`✅ Removed meal plan from player ${playerId} inbox (removed ${sharedMealPlans.length - filteredMealPlans.length} entry/entries)`);
            } else {
              console.log(`ℹ️ No meal plan found in player ${playerId} inbox to remove`);
            }
          }
        } catch (error) {
          console.error(`❌ Error removing meal plan from player ${playerId} inbox:`, error);
        }
      });
      
      await Promise.all(inboxUpdatePromises);
      
      console.log('✅ Meal plan assignment deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting meal plan assignment:', error);
      return false;
    }
  },

  // Mark meal plan as complete (player clicks completion button)
  // Accepts either the Firestore document ID or the mealPlanId field value
  async markMealPlanComplete(
    mealPlanIdOrDocId: string,
    playerId: string
  ): Promise<boolean> {
    try {
      console.log('✅ Marking meal plan as complete:', { mealPlanIdOrDocId, playerId });
      
      if (!mealPlanIdOrDocId || !playerId) {
        console.error('❌ Missing required parameters:', { mealPlanIdOrDocId, playerId });
        return false;
      }
      
      let mealPlanDocRef: any = null;
      let mealPlanData: any = null;
      let foundBy = '';
      
      // First, try to find by document ID (direct reference)
      try {
        const docRef = doc(db, 'sharedMealPlans', mealPlanIdOrDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          mealPlanDocRef = docRef;
          mealPlanData = docSnap.data();
          foundBy = 'document ID';
          console.log('✅ Found meal plan by document ID:', mealPlanIdOrDocId);
        } else {
          console.log('⚠️ Document not found with ID:', mealPlanIdOrDocId);
        }
      } catch (error: any) {
        console.log('⚠️ Error checking document ID:', error.message);
      }
      
      // If not found by document ID, try to find by mealPlanId field
      if (!mealPlanDocRef) {
        try {
          const mealPlanQuery = query(
            collection(db, 'sharedMealPlans'),
            where('mealPlanId', '==', mealPlanIdOrDocId)
          );
          const mealPlanSnapshot = await getDocs(mealPlanQuery);
          
          if (!mealPlanSnapshot.empty) {
            const mealPlanDoc = mealPlanSnapshot.docs[0];
            mealPlanDocRef = mealPlanDoc.ref;
            mealPlanData = mealPlanDoc.data();
            foundBy = 'mealPlanId field';
            console.log('✅ Found meal plan by mealPlanId field:', mealPlanIdOrDocId);
            console.log('📋 Document ID:', mealPlanDoc.id);
          } else {
            console.error('❌ Meal plan not found by mealPlanId:', mealPlanIdOrDocId);
            // Try to list all meal plans to debug
            const allMealPlansQuery = query(collection(db, 'sharedMealPlans'));
            const allSnap = await getDocs(allMealPlansQuery);
            console.log('📋 All meal plans in collection:', allSnap.docs.map(d => ({
              docId: d.id,
              mealPlanId: d.data().mealPlanId,
              coachId: d.data().coachId
            })));
            return false;
          }
        } catch (queryError: any) {
          console.error('❌ Error querying by mealPlanId:', queryError);
          return false;
        }
      }
      
      if (!mealPlanDocRef || !mealPlanData) {
        console.error('❌ Could not find meal plan document');
        return false;
      }
      
      // Get document ID safely
      const docId = mealPlanDocRef.id || 'unknown';
      console.log('📋 Found meal plan:', {
        foundBy,
        docId: docId,
        mealPlanId: mealPlanData.mealPlanId || 'unknown',
        assignedPlayers: mealPlanData.assignedPlayers || []
      });
      
      // Get current completion status
      const currentStatus = mealPlanData.completionStatus || {};
      const playerStatus = currentStatus[playerId] || {
        completed: false,
        completedAt: null,
      };
      
      // Mark as completed
      playerStatus.completed = true;
      playerStatus.completedAt = new Date().toISOString();
      
      // Add to completedBy array if not already there
      const completedBy = mealPlanData.completedBy || [];
      if (!completedBy.includes(playerId)) {
        completedBy.push(playerId);
      }
      
      console.log('🎉 Meal plan marked as complete by player:', playerId);
      console.log('📋 Updating completion status:', {
        playerId,
        completed: playerStatus.completed,
        completedAt: playerStatus.completedAt
      });
      
      await updateDoc(mealPlanDocRef, {
        completionStatus: {
          ...currentStatus,
          [playerId]: playerStatus,
        },
        completedBy: completedBy,
        updatedAt: serverTimestamp(),
      });
      
      // Also update the userInbox with the completion status
      try {
        const inboxQuery = query(
          collection(db, 'userInbox'),
          where('userId', '==', playerId)
        );
        const inboxSnapshot = await getDocs(inboxQuery);
        
        if (!inboxSnapshot.empty) {
          const inboxDoc = inboxSnapshot.docs[0];
          const inboxData = inboxDoc.data();
          const sharedMealPlans = inboxData.sharedMealPlans || [];
          
          // Update the meal plan in the inbox with completion status
          const updatedMealPlans = sharedMealPlans.map((mp: any) => {
            const matchesDocId = mp.id === docId;
            const matchesMealPlanId = mp.mealPlanId === mealPlanData.mealPlanId;
            
            if (matchesDocId || matchesMealPlanId) {
              // Update completion status in the inbox entry
              const inboxCompletionStatus = mp.completionStatus || {};
              return {
                ...mp,
                completionStatus: {
                  ...inboxCompletionStatus,
                  [playerId]: playerStatus,
                },
                completedBy: [...(mp.completedBy || []), ...(mp.completedBy?.includes(playerId) ? [] : [playerId])],
              };
            }
            return mp;
          });
          
          await updateDoc(inboxDoc.ref, {
            sharedMealPlans: updatedMealPlans,
            updatedAt: serverTimestamp(),
          });
          console.log('✅ Updated completion status in userInbox');
        }
      } catch (inboxError) {
        console.error('⚠️ Error updating userInbox completion status (non-critical):', inboxError);
        // Don't fail the whole operation if inbox update fails
      }
      
      console.log('✅ Meal plan completion status updated successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error marking meal plan as complete:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  },

  // Update meal plan with player's edits (send back to coach)
  // Accepts either the Firestore document ID or the mealPlanId field value
  async updateMealPlanWithPlayerEdits(
    mealPlanIdOrDocId: string,
    playerId: string,
    editedMealPlanData: any,
    playerName: string
  ): Promise<boolean> {
    try {
      console.log('📤 Updating meal plan with player edits:', { mealPlanIdOrDocId, playerId, playerName });
      
      let mealPlanDocRef: any = null;
      let mealPlanData: any = null;
      
      // First, try to find by document ID (direct reference)
      try {
        const docRef = doc(db, 'sharedMealPlans', mealPlanIdOrDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          mealPlanDocRef = docRef;
          mealPlanData = docSnap.data();
          console.log('✅ Found meal plan by document ID');
        }
      } catch (error: any) {
        console.log('⚠️ Not a document ID, trying to find by mealPlanId field...');
      }
      
      // If not found by document ID, try to find by mealPlanId field
      if (!mealPlanDocRef) {
        const mealPlanQuery = query(
          collection(db, 'sharedMealPlans'),
          where('mealPlanId', '==', mealPlanIdOrDocId)
        );
        const mealPlanSnapshot = await getDocs(mealPlanQuery);
        
        if (mealPlanSnapshot.empty) {
          console.error('❌ Meal plan not found by mealPlanId either:', mealPlanIdOrDocId);
          return false;
        }
        
        const mealPlanDoc = mealPlanSnapshot.docs[0];
        mealPlanDocRef = mealPlanDoc.ref;
        mealPlanData = mealPlanDoc.data();
        console.log('✅ Found meal plan by mealPlanId field');
      }
      
      // Store player edits in a separate field
      const playerEdits = mealPlanData.playerEdits || {};
      playerEdits[playerId] = {
        mealPlanData: editedMealPlanData,
        playerName: playerName,
        editedAt: new Date().toISOString(),
      };
      
      await updateDoc(mealPlanDocRef, {
        playerEdits: playerEdits,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Meal plan updated with player edits successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error updating meal plan with player edits:', error);
      return false;
    }
  },
};


