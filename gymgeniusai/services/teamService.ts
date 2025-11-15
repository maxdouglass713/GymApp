import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TeamDocument, TeamMember } from '@/types/firestore';

const COLLECTIONS = {
  TEAMS: 'teams',
} as const;

// Helper function to convert Firestore timestamps
const convertTimestamps = (data: any) => {
  const converted = { ...data };
  
  // Convert Firestore timestamps to Date objects
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  
  return converted;
};

export const teamService = {
  /**
   * Create a new team
   */
  async createTeam(teamData: Omit<TeamDocument, 'id' | 'createdAt' | 'updatedAt' | 'members'>): Promise<string> {
    try {
      console.log('🏫 Creating team:', teamData.name);
      
      const teamRef = doc(collection(db, COLLECTIONS.TEAMS));
      const teamDoc: TeamDocument = {
        id: teamRef.id,
        ...teamData,
        members: [], // Start with empty members array
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(teamRef, {
        ...teamDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Team created successfully:', teamDoc.id);
      return teamDoc.id;
    } catch (error) {
      console.error('❌ Error creating team:', error);
      throw error;
    }
  },

  /**
   * Get team by invite code
   */
  async getTeamByInviteCode(inviteCode: string): Promise<TeamDocument | null> {
    try {
      console.log('🔍 Looking up team with invite code:', inviteCode);
      
      const q = query(
        collection(db, COLLECTIONS.TEAMS),
        where('inviteCode', '==', inviteCode.toUpperCase()),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('❌ No team found with invite code:', inviteCode);
        return null;
      }
      
      const teamDoc = querySnapshot.docs[0];
      const teamData = convertTimestamps({ id: teamDoc.id, ...teamDoc.data() }) as TeamDocument;
      
      console.log('✅ Team found:', teamData.name);
      return teamData;
    } catch (error) {
      console.error('❌ Error looking up team:', error);
      throw error;
    }
  },

  /**
   * Join a team as a player
   */
  async joinTeam(teamId: string, userId: string, userName: string): Promise<boolean> {
    try {
      console.log('👤 Joining team:', teamId, 'as user:', userId);
      
      const teamRef = doc(db, COLLECTIONS.TEAMS, teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (!teamDoc.exists()) {
        console.log('❌ Team not found:', teamId);
        return false;
      }
      
      const teamData = convertTimestamps({ id: teamDoc.id, ...teamDoc.data() }) as TeamDocument;
      
      // Check if user is already a member
      const existingMember = teamData.members.find(member => member.userId === userId);
      if (existingMember) {
        console.log('⚠️ User already a member of this team');
        return false;
      }
      
      // Add user as a player
      const newMember: TeamMember = {
        userId,
        name: userName,
        role: 'player',
        joinedAt: new Date(),
        status: 'active',
      };
      
      console.log('👤 Adding new member to team:', newMember);
      console.log('👤 userName parameter received:', userName);
      console.log('👤 userName type:', typeof userName);
      console.log('👤 userName length:', userName?.length);
      console.log('👥 Current team members before adding:', teamData.members);
      
      await updateDoc(teamRef, {
        members: arrayUnion(newMember),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Successfully joined team:', teamData.name);
      console.log('👥 Team members after adding:', [...teamData.members, newMember]);
      
      // Verify what was actually stored by re-fetching the team
      console.log('🔍 Verifying stored data by re-fetching team...');
      const verifyTeamDoc = await getDoc(teamRef);
      const verifyTeamData = convertTimestamps({ id: verifyTeamDoc.id, ...verifyTeamDoc.data() }) as TeamDocument;
      console.log('🔍 Verified team members:', verifyTeamData.members);
      console.log('🔍 Verified player names:', verifyTeamData.members?.filter(m => m.role === 'player').map(m => m.name));
      
      return true;
    } catch (error) {
      console.error('❌ Error joining team:', error);
      throw error;
    }
  },

  /**
   * Get teams for a user (teams they're a member of)
   */
  async getUserTeams(userId: string): Promise<TeamDocument[]> {
    try {
      console.log('📋 Getting teams for user:', userId);
      
      const q = query(
        collection(db, COLLECTIONS.TEAMS),
        where('members', 'array-contains', { userId }),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const teams = querySnapshot.docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() }) as TeamDocument
      );
      
      console.log('✅ Found', teams.length, 'teams for user');
      return teams;
    } catch (error) {
      console.error('❌ Error getting user teams:', error);
      throw error;
    }
  },

  /**
   * Get team by ID
   */
  async getTeamById(teamId: string): Promise<TeamDocument | null> {
    try {
      console.log('🔍 Getting team by ID:', teamId);
      
      const teamRef = doc(db, COLLECTIONS.TEAMS, teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (!teamDoc.exists()) {
        console.log('❌ Team not found:', teamId);
        return null;
      }
      
      const teamData = convertTimestamps({ id: teamDoc.id, ...teamDoc.data() }) as TeamDocument;
      console.log('✅ Team found:', teamData.name);
      console.log('👥 Team members from Firebase:', teamData.members);
      console.log('👥 Member count:', teamData.members?.length);
      console.log('👥 Players:', teamData.members?.filter(m => m.role === 'player'));
      return teamData;
    } catch (error) {
      console.error('❌ Error getting team:', error);
      throw error;
    }
  },

  /**
   * Generate a unique invite code
   */
  generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Validate invite code format
   */
  validateInviteCode(code: string): boolean {
    return code.length === 6 && /^[A-Z0-9]+$/.test(code);
  },

  /**
   * Subscribe to real-time updates for a team
   */
  subscribeToTeam(teamId: string, callback: (team: TeamDocument | null) => void): Unsubscribe {
    console.log('👂 Setting up real-time listener for team:', teamId);
    
    const teamRef = doc(db, COLLECTIONS.TEAMS, teamId);
    
    const unsubscribe = onSnapshot(
      teamRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const teamData = convertTimestamps({ id: docSnapshot.id, ...docSnapshot.data() }) as TeamDocument;
          console.log('🔄 Real-time team update received:', teamData.name, 'Members:', teamData.members?.length || 0);
          callback(teamData);
        } else {
          console.log('⚠️ Team document does not exist');
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Error in team real-time listener:', error);
        callback(null);
      }
    );
    
    return unsubscribe;
  },

  /**
   * Subscribe to real-time updates for all teams a user is a member of
   */
  subscribeToUserTeams(userId: string, callback: (teams: TeamDocument[]) => void): Unsubscribe {
    console.log('👂 Setting up real-time listener for user teams:', userId);
    
    // Note: This query requires a Firestore index if using array-contains
    // For now, we'll use a different approach - listen to all teams and filter client-side
    // For production, you should create a composite index or use a different data structure
    const teamsRef = collection(db, COLLECTIONS.TEAMS);
    
    const unsubscribe = onSnapshot(
      teamsRef,
      (querySnapshot) => {
        const allTeams = querySnapshot.docs
          .map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as TeamDocument)
          .filter(team => team.members?.some(member => member.userId === userId));
        
        console.log('🔄 Real-time user teams update received:', allTeams.length, 'teams');
        callback(allTeams);
      },
      (error) => {
        console.error('❌ Error in user teams real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  },
};

