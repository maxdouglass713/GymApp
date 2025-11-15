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
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SharedWorkout {
  id?: string;
  workoutId: string;
  workoutName: string;
  workoutData: any;
  coachId: string;
  coachName: string;
  teamId: string;
  teamName: string;
  assignedPlayers: string[];
  assignedPlayerNames: string[];
  createdAt: string; // ISO string timestamp
  assignedDate?: string; // ISO string timestamp - the date the workout is assigned for
  dueDate?: string; // ISO string timestamp
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'overdue';
  completedBy?: string[];
}

export const workoutSharingService = {
  // Share a workout with specific players
  async shareWorkoutWithPlayers(
    workout: any,
    coachId: string,
    coachName: string,
    teamId: string,
    teamName: string,
    playerIds: string[],
    playerNames: string[],
    priority: 'low' | 'medium' | 'high' = 'medium',
    assignedDate?: Date
  ): Promise<boolean> {
    try {
      console.log('📤 Starting workout sharing process...');
      console.log('📤 Workout:', workout);
      console.log('📤 Coach ID:', coachId, 'Type:', typeof coachId);
      console.log('📤 Coach Name:', coachName);
      console.log('📤 Team ID:', teamId, 'Type:', typeof teamId);
      console.log('📤 Team Name:', teamName);
      console.log('📤 Player IDs:', playerIds, 'Count:', playerIds.length);
      console.log('📤 Player Names:', playerNames, 'Count:', playerNames.length);
      console.log('📤 Priority:', priority);

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

      console.log('📤 Workout object being shared:', workout);
      console.log('📤 Workout type:', typeof workout);
      console.log('📤 Workout keys:', Object.keys(workout));
      console.log('📤 Workout exercises:', workout.exercises);
      console.log('📤 Workout exercises type:', typeof workout.exercises);
      console.log('📤 Workout exercises length:', workout.exercises ? workout.exercises.length : 'null');

      // Use assigned date if provided, otherwise use workout date or today
      const targetDate = assignedDate 
        ? assignedDate.toISOString().split('T')[0]
        : workout.date || new Date().toISOString().split('T')[0];
      
      // Ensure workout data is properly structured
      const structuredWorkout = {
        id: workout.id || `workout_${Date.now()}`,
        title: workout.title || workout.name || 'Assigned Workout',
        exercises: workout.exercises || [],
        date: targetDate, // Use assigned date
        assignedDate: assignedDate ? assignedDate.toISOString() : undefined, // Store assigned date separately
        createdAt: workout.createdAt || new Date().toISOString(),
        completedAt: workout.completedAt || new Date().toISOString()
      };

      console.log('📤 Structured workout:', structuredWorkout);
      console.log('📤 Structured workout exercises:', structuredWorkout.exercises);
      console.log('📤 Structured workout exercises length:', structuredWorkout.exercises.length);
      
      // Debug each exercise in detail
      if (structuredWorkout.exercises && structuredWorkout.exercises.length > 0) {
        structuredWorkout.exercises.forEach((exercise, index) => {
          console.log(`📤 Exercise ${index + 1} details:`, {
            name: exercise.name,
            equipment: exercise.equipment,
            sets: exercise.sets,
            setsLength: exercise.sets?.length
          });
          
          if (exercise.sets) {
            exercise.sets.forEach((set, setIndex) => {
              console.log(`📤 Exercise ${index + 1} Set ${setIndex + 1}:`, {
                weight: set.weight,
                reps: set.reps,
                completed: set.completed
              });
            });
          }
        });
      }

      const sharedWorkout: Omit<SharedWorkout, 'id'> = {
        workoutId: structuredWorkout.id,
        workoutName: structuredWorkout.title,
        workoutData: structuredWorkout, // Use the structured workout
        coachId,
        coachName,
        teamId,
        teamName,
        assignedPlayers: cleanPlayerIds,
        assignedPlayerNames: playerNames,
        createdAt: new Date().toISOString(), // Use ISO string instead of serverTimestamp
        assignedDate: assignedDate ? assignedDate.toISOString() : undefined, // Store assigned date
        priority,
        status: 'pending'
      };

      console.log('📤 Shared workout object:', sharedWorkout);

      // Save to shared workouts collection
      console.log('📤 Saving to sharedWorkouts collection...');
      const docRef = await addDoc(collection(db, 'sharedWorkouts'), sharedWorkout);
      console.log('✅ Shared workout saved with ID:', docRef.id);

      // Update each player's inbox
      for (const playerId of cleanPlayerIds) {
        try {
          console.log('📬 Starting inbox update for player:', playerId);
          console.log('📬 Player ID type:', typeof playerId, 'Value:', playerId);
          
          const inboxData = {
            id: docRef.id,
            workoutId: sharedWorkout.workoutId,
            workoutName: sharedWorkout.workoutName,
            workoutData: sharedWorkout.workoutData, // Include the full workout data!
            coachId,
            coachName,
            teamId,
            teamName,
            createdAt: new Date().toISOString(), // Use ISO string instead of serverTimestamp
            assignedDate: assignedDate ? assignedDate.toISOString() : undefined, // Include assigned date
            priority,
            status: 'pending'
          };
          
          console.log('📬 Inbox data to save:', inboxData);
          
          // Try to find existing inbox document
          console.log('📬 Querying for existing inbox...');
          const inboxQuery = query(collection(db, 'userInbox'), where('userId', '==', playerId));
          const inboxSnapshot = await getDocs(inboxQuery);
          
          console.log('📬 Query result - empty?', inboxSnapshot.empty, 'size:', inboxSnapshot.size);
          
          if (!inboxSnapshot.empty) {
            // Document exists, update it
            console.log('📬 Updating existing inbox document...');
            const existingDoc = inboxSnapshot.docs[0];
            const existingData = existingDoc.data();
            console.log('📬 Existing inbox data:', existingData);
            
            const existingWorkouts = existingData.sharedWorkouts || [];
            console.log('📬 Existing workouts count:', existingWorkouts.length);
            
            const updatedWorkouts = [...existingWorkouts, inboxData];
            console.log('📬 Updated workouts count:', updatedWorkouts.length);
            
            await updateDoc(existingDoc.ref, {
              sharedWorkouts: updatedWorkouts
            });
            console.log('✅ Successfully updated existing inbox for player:', playerId);
            
            // Verify the data was saved correctly
            const verifyQuery = query(collection(db, 'userInbox'), where('userId', '==', playerId));
            const verifySnapshot = await getDocs(verifyQuery);
            if (!verifySnapshot.empty) {
              const verifyData = verifySnapshot.docs[0].data();
              console.log('✅ Verification - Player inbox updated with workouts:', verifyData.sharedWorkouts?.length || 0);
              console.log('✅ Verification - Latest workout data available:', verifyData.sharedWorkouts?.[verifyData.sharedWorkouts.length - 1]?.workoutData ? 'YES' : 'NO');
            }
          } else {
            // Document doesn't exist, create it
            console.log('📬 Creating new inbox document...');
            const newInboxDoc = {
              userId: playerId,
              sharedWorkouts: [inboxData]
            };
            console.log('📬 New inbox document:', newInboxDoc);
            
            const newDocRef = await addDoc(collection(db, 'userInbox'), newInboxDoc);
            console.log('✅ Successfully created new inbox for player:', playerId, 'Doc ID:', newDocRef.id);
            
            // Verify the data was saved correctly
            const verifyQuery = query(collection(db, 'userInbox'), where('userId', '==', playerId));
            const verifySnapshot = await getDocs(verifyQuery);
            if (!verifySnapshot.empty) {
              const verifyData = verifySnapshot.docs[0].data();
              console.log('✅ Verification - Player inbox created with workouts:', verifyData.sharedWorkouts?.length || 0);
              console.log('✅ Verification - Workout data available:', verifyData.sharedWorkouts?.[0]?.workoutData ? 'YES' : 'NO');
            }
          }
        } catch (error) {
          console.error('❌ Detailed error updating inbox for player:', playerId);
          console.error('❌ Error type:', error.constructor.name);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error code:', error.code);
          console.error('❌ Full error object:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error sharing workout:', error);
      return false;
    }
  },

  // Get shared workouts for a player
  async getPlayerInbox(playerId: string): Promise<SharedWorkout[]> {
    try {
      console.log('📬 Getting inbox for player:', playerId);
      
      const inboxQuery = query(
        collection(db, 'userInbox'),
        where('userId', '==', playerId)
      );
      
      const inboxSnapshot = await getDocs(inboxQuery);
      
      if (inboxSnapshot.empty) {
        console.log('📬 No inbox found for player:', playerId);
        return [];
      }

      const inboxData = inboxSnapshot.docs[0].data();
      console.log('📬 Raw inbox data from Firebase:', inboxData);
      console.log('📬 Inbox data keys:', Object.keys(inboxData));
      
      const sharedWorkouts = inboxData.sharedWorkouts || [];
      console.log('📬 Shared workouts array:', sharedWorkouts);
      console.log('📬 Shared workouts length:', sharedWorkouts.length);
      
      if (sharedWorkouts.length > 0) {
        console.log('📬 First shared workout:', sharedWorkouts[0]);
        console.log('📬 First workout keys:', Object.keys(sharedWorkouts[0]));
        console.log('📬 First workout workoutData:', sharedWorkouts[0].workoutData);
        console.log('📬 First workout workoutData type:', typeof sharedWorkouts[0].workoutData);
        if (sharedWorkouts[0].workoutData) {
          console.log('📬 First workout workoutData keys:', Object.keys(sharedWorkouts[0].workoutData));
        }
      }
      
      return sharedWorkouts;
    } catch (error) {
      console.error('❌ Error getting player inbox:', error);
      return [];
    }
  },

  // Subscribe to real-time updates for coach assignments
  subscribeToCoachAssignments(coachId: string, teamId: string, callback: (workouts: SharedWorkout[]) => void): Unsubscribe {
    console.log('👂 Setting up real-time listener for coach assignments:', coachId, 'team:', teamId);
    
    const assignmentsQuery = query(
      collection(db, 'sharedWorkouts'),
      where('coachId', '==', coachId),
      where('teamId', '==', teamId)
    );
    
    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (querySnapshot) => {
        const assignments: SharedWorkout[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          assignments.push({
            id: doc.id,
            workoutId: data.workoutId,
            workoutName: data.workoutName || data.title || 'Assigned Workout',
            workoutData: data.workoutData,
            coachId: data.coachId,
            coachName: data.coachName || 'Coach',
            teamId: data.teamId,
            teamName: data.teamName || 'Team',
            assignedPlayers: data.assignedPlayers || [],
            assignedPlayerNames: data.assignedPlayerNames || [],
            createdAt: data.createdAt?.toDate?.() ? new Date(data.createdAt.toDate()).toISOString() : data.createdAt || new Date().toISOString(),
            dueDate: data.dueDate,
            priority: data.priority || 'medium',
            status: data.status || 'pending',
            completedBy: data.completedBy || [], // Array of player IDs who completed it
          } as SharedWorkout);
        });
        
        console.log('🔄 Real-time coach assignments update received:', assignments.length, 'assignments');
        callback(assignments);
      },
      (error) => {
        console.error('❌ Error in coach assignments real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  },

  // Get assigned workouts for a coach (to display in team management)
  async getCoachAssignments(coachId: string, teamId: string): Promise<SharedWorkout[]> {
    try {
      console.log('👨‍💼 Getting assignments for coach:', coachId, 'team:', teamId);
      
      const assignmentsQuery = query(
        collection(db, 'sharedWorkouts'),
        where('coachId', '==', coachId),
        where('teamId', '==', teamId)
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      const assignments: SharedWorkout[] = [];
      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          ...data
        } as SharedWorkout);
      });
      
      return assignments;
    } catch (error) {
      console.error('❌ Error getting coach assignments:', error);
      return [];
    }
  },

  // Update an assigned workout
  async updateAssignedWorkout(workoutId: string, updatedWorkoutData: any): Promise<boolean> {
    try {
      console.log('✏️ Updating assigned workout:', workoutId);
      
      // Update the main shared workout document
      const workoutRef = doc(db, 'sharedWorkouts', workoutId);
      await updateDoc(workoutRef, {
        workoutData: updatedWorkoutData,
        workoutName: updatedWorkoutData.title || updatedWorkoutData.name
      });
      
      // Update all player inboxes that have this workout
      const inboxQuery = query(collection(db, 'userInbox'));
      const inboxSnapshot = await getDocs(inboxQuery);
      
      for (const inboxDoc of inboxSnapshot.docs) {
        const inboxData = inboxDoc.data();
        const sharedWorkouts = inboxData.sharedWorkouts || [];
        
        const updatedWorkouts = sharedWorkouts.map((workout: any) => {
          if (workout.id === workoutId) {
            return {
              ...workout,
              workoutData: updatedWorkoutData,
              workoutName: updatedWorkoutData.title || updatedWorkoutData.name
            };
          }
          return workout;
        });
        
        if (JSON.stringify(updatedWorkouts) !== JSON.stringify(sharedWorkouts)) {
          await updateDoc(inboxDoc.ref, {
            sharedWorkouts: updatedWorkouts
          });
          console.log('✏️ Updated workout in player inbox:', inboxDoc.id);
        }
      }
      
      console.log('✅ Successfully updated assigned workout');
      return true;
    } catch (error) {
      console.error('❌ Error updating assigned workout:', error);
      return false;
    }
  },

  // Delete an assigned workout
  async deleteAssignedWorkout(workoutId: string): Promise<boolean> {
    try {
      if (!workoutId) {
        return false;
      }
      
      // Delete the main shared workout document
      const workoutRef = doc(db, 'sharedWorkouts', workoutId);
      await deleteDoc(workoutRef);
      
      // Remove from all player inboxes
      const inboxQuery = query(collection(db, 'userInbox'));
      const inboxSnapshot = await getDocs(inboxQuery);
      
      for (const inboxDoc of inboxSnapshot.docs) {
        const inboxData = inboxDoc.data();
        const sharedWorkouts = inboxData.sharedWorkouts || [];
        
        const filteredWorkouts = sharedWorkouts.filter((workout: any) => workout.id !== workoutId);
        
        if (filteredWorkouts.length !== sharedWorkouts.length) {
          await updateDoc(inboxDoc.ref, {
            sharedWorkouts: filteredWorkouts
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting assigned workout:', error);
      return false;
    }
  },

  // Verify that a player has workout data in their Firebase
  async verifyPlayerWorkoutData(playerId: string): Promise<boolean> {
    try {
      console.log('🔍 Verifying workout data for player:', playerId);
      
      const inboxQuery = query(
        collection(db, 'userInbox'),
        where('userId', '==', playerId)
      );
      
      const inboxSnapshot = await getDocs(inboxQuery);
      
      if (inboxSnapshot.empty) {
        console.log('🔍 No inbox found for player:', playerId);
        return false;
      }

      const inboxData = inboxSnapshot.docs[0].data();
      const sharedWorkouts = inboxData.sharedWorkouts || [];
      
      console.log('🔍 Player has', sharedWorkouts.length, 'shared workouts');
      
      if (sharedWorkouts.length > 0) {
        const latestWorkout = sharedWorkouts[sharedWorkouts.length - 1];
        console.log('🔍 Latest workout:', latestWorkout.workoutName);
        console.log('🔍 Latest workout has data:', latestWorkout.workoutData ? 'YES' : 'NO');
        
        if (latestWorkout.workoutData) {
          console.log('🔍 Workout data exercises:', latestWorkout.workoutData.exercises?.length || 0);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error verifying player workout data:', error);
      return false;
    }
  },

  // Mark workout as completed by player
  async markWorkoutCompleted(sharedWorkoutId: string, playerId: string): Promise<boolean> {
    try {
      console.log('✅ Marking workout as completed:', sharedWorkoutId, 'by player:', playerId);
      
      // Update the shared workout document - add player to completedBy array
      // Don't set global status to 'completed' since other players might not have completed it yet
      const sharedWorkoutRef = doc(db, 'sharedWorkouts', sharedWorkoutId);
      
      // First, get the current document to check if completedBy exists
      const currentDoc = await getDoc(sharedWorkoutRef);
      const currentData = currentDoc.data();
      console.log('📋 Current shared workout data:', {
        id: sharedWorkoutId,
        currentCompletedBy: currentData?.completedBy,
        assignedPlayers: currentData?.assignedPlayers
      });
      
      await updateDoc(sharedWorkoutRef, {
        completedBy: arrayUnion(playerId)
      });
      
      // Verify the update worked
      const updatedDoc = await getDoc(sharedWorkoutRef);
      const updatedData = updatedDoc.data();
      console.log('✅ Updated shared workout data:', {
        id: sharedWorkoutId,
        updatedCompletedBy: updatedData?.completedBy,
        playerInArray: updatedData?.completedBy?.includes(playerId)
      });

      // Remove completed workout from player's inbox (no longer show in inbox once completed)
      const inboxQuery = query(
        collection(db, 'userInbox'),
        where('userId', '==', playerId)
      );
      
      const inboxSnapshot = await getDocs(inboxQuery);
      if (!inboxSnapshot.empty) {
        const inboxDoc = inboxSnapshot.docs[0];
        const inboxData = inboxDoc.data();
        // Remove the completed workout from the inbox entirely
        const updatedWorkouts = inboxData.sharedWorkouts.filter((workout: any) => {
          return workout.id !== sharedWorkoutId;
        });
        
        await updateDoc(inboxDoc.ref, {
          sharedWorkouts: updatedWorkouts
        });
        
        console.log('✅ Removed completed workout from inbox. Remaining:', updatedWorkouts.length);
      }

      console.log('✅ Workout marked as completed');
      return true;
    } catch (error) {
      console.error('❌ Error marking workout as completed:', error);
      return false;
    }
  },

  // Get all assignments for a player (including completed ones from sharedWorkouts collection)
  async getAllPlayerAssignments(playerId: string, teamId?: string): Promise<SharedWorkout[]> {
    try {
      console.log('📋 Getting all assignments for player:', playerId);
      
      let assignmentsQuery = query(
        collection(db, 'sharedWorkouts'),
        where('assignedPlayers', 'array-contains', playerId)
      );
      
      if (teamId) {
        // If teamId is provided, also filter by team
        assignmentsQuery = query(
          collection(db, 'sharedWorkouts'),
          where('assignedPlayers', 'array-contains', playerId),
          where('teamId', '==', teamId)
        );
      }
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments: SharedWorkout[] = [];
      
      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          workoutId: data.workoutId,
          workoutName: data.workoutName || data.title || 'Assigned Workout',
          workoutData: data.workoutData,
          coachId: data.coachId,
          coachName: data.coachName || 'Coach',
          teamId: data.teamId,
          teamName: data.teamName || 'Team',
          assignedPlayers: data.assignedPlayers || [],
          assignedPlayerNames: data.assignedPlayerNames || [],
          createdAt: data.createdAt?.toDate?.() ? new Date(data.createdAt.toDate()).toISOString() : data.createdAt || new Date().toISOString(),
          dueDate: data.dueDate,
          priority: data.priority || 'medium',
          status: data.completedBy?.includes(playerId) ? 'completed' : (data.status || 'pending'),
          completedBy: data.completedBy || [], // Include completedBy array for filtering
        } as SharedWorkout);
      });
      
      console.log('📋 Found', assignments.length, 'total assignments for player');
      return assignments;
    } catch (error) {
      console.error('❌ Error getting all player assignments:', error);
      return [];
    }
  },

  // Subscribe to real-time updates for player inbox (pending assignments only)
  subscribeToPlayerInbox(playerId: string, callback: (workouts: SharedWorkout[]) => void): Unsubscribe {
    console.log('👂 Setting up real-time listener for player inbox:', playerId);
    
    const inboxQuery = query(
      collection(db, 'userInbox'),
      where('userId', '==', playerId)
    );
    
    const unsubscribe = onSnapshot(
      inboxQuery,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('📬 No inbox found for player');
          callback([]);
          return;
        }

        const inboxData = querySnapshot.docs[0].data();
        const sharedWorkouts = inboxData.sharedWorkouts || [];
        
        console.log('🔄 Real-time inbox update received:', sharedWorkouts.length, 'workouts');
        callback(sharedWorkouts);
      },
      (error) => {
        console.error('❌ Error in inbox real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  },

  // Subscribe to real-time updates for all player assignments (pending + completed)
  subscribeToPlayerAssignments(playerId: string, teamId: string | undefined, callback: (workouts: SharedWorkout[]) => void): Unsubscribe {
    console.log('👂 Setting up real-time listener for all player assignments:', playerId, 'team:', teamId);
    
    let assignmentsQuery;
    
    if (teamId) {
      assignmentsQuery = query(
        collection(db, 'sharedWorkouts'),
        where('assignedPlayers', 'array-contains', playerId),
        where('teamId', '==', teamId)
      );
    } else {
      assignmentsQuery = query(
        collection(db, 'sharedWorkouts'),
        where('assignedPlayers', 'array-contains', playerId)
      );
    }
    
    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (querySnapshot) => {
        const assignments: SharedWorkout[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const isCompleted = Array.isArray(data.completedBy) && data.completedBy.includes(playerId);
          
          const assignment: SharedWorkout = {
            id: doc.id,
            workoutId: data.workoutId,
            workoutName: data.workoutName || data.title || 'Assigned Workout',
            workoutData: data.workoutData,
            coachId: data.coachId,
            coachName: data.coachName || 'Coach',
            teamId: data.teamId,
            teamName: data.teamName || 'Team',
            assignedPlayers: data.assignedPlayers || [],
            assignedPlayerNames: data.assignedPlayerNames || [],
            createdAt: data.createdAt?.toDate?.() ? new Date(data.createdAt.toDate()).toISOString() : data.createdAt || new Date().toISOString(),
            dueDate: data.dueDate,
            priority: data.priority || 'medium',
            status: isCompleted ? 'completed' : (data.status || 'pending'),
            completedBy: Array.isArray(data.completedBy) ? data.completedBy : [], // Include completedBy array for filtering
          };
          
          console.log('📋 Assignment processed:', {
            id: assignment.id,
            name: assignment.workoutName,
            completedBy: assignment.completedBy,
            playerId,
            isCompleted,
            status: assignment.status
          });
          
          assignments.push(assignment);
        });
        
        console.log('🔄 Real-time assignments update received:', assignments.length, 'assignments');
        console.log('📊 Completion breakdown:', {
          completed: assignments.filter(a => a.status === 'completed').length,
          pending: assignments.filter(a => a.status !== 'completed').length
        });
        callback(assignments);
      },
      (error) => {
        console.error('❌ Error in assignments real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  }
};
