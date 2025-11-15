import { WorkoutDocument } from '@/types/firestore';
import { Workout } from '@/stores/workoutStore';

/**
 * Converts a WorkoutDocument from Firestore to the Workout format used in the app
 */
export const convertWorkoutDocumentToWorkout = (workoutDoc: WorkoutDocument): Workout | null => {
  try {
    if (!workoutDoc || !workoutDoc.id) {
      return null;
    }

    // Safely get date - handle various date formats
    let workoutDate: string;
    let createdAt: Date;
    let completedAt: Date | undefined;
    
    try {
      const completedDate = workoutDoc.completedAt 
        ? (workoutDoc.completedAt instanceof Date 
            ? workoutDoc.completedAt 
            : (workoutDoc.completedAt as any)?.toDate?.() || new Date(workoutDoc.completedAt))
        : null;
      const createdDate = workoutDoc.createdAt 
        ? (workoutDoc.createdAt instanceof Date 
            ? workoutDoc.createdAt 
            : (workoutDoc.createdAt as any)?.toDate?.() || new Date(workoutDoc.createdAt))
        : new Date();
      
      if (completedDate) {
        workoutDate = completedDate.toISOString().split('T')[0];
        completedAt = completedDate;
      } else if (createdDate) {
        workoutDate = createdDate.toISOString().split('T')[0];
      } else {
        workoutDate = new Date().toISOString().split('T')[0];
      }
      
      createdAt = createdDate || new Date();
    } catch (dateError) {
      console.warn('Date conversion error:', dateError);
      workoutDate = new Date().toISOString().split('T')[0];
      createdAt = new Date();
      completedAt = undefined;
    }

    // Safely convert exercises - handle missing or malformed data
    let exercises: any[] = [];
    
    try {
      if (Array.isArray(workoutDoc.exercises)) {
        exercises = workoutDoc.exercises
          .map((ex: any, exIndex: number) => {
            try {
              if (!ex || typeof ex !== 'object') {
                return null;
              }
              
              const exId = ex.id || `ex-${exIndex}`;
              const exName = ex.name || 'Unknown Exercise';
              
              let sets: any[] = [];
              if (Array.isArray(ex.sets)) {
                sets = ex.sets
                  .map((set: any, setIndex: number) => {
                    try {
                      if (!set || typeof set !== 'object') {
                        return null;
                      }
                      
                      const setId = set.id || `set-${setIndex}`;
                      const reps = (set.reps !== null && set.reps !== undefined && !isNaN(Number(set.reps))) 
                        ? Number(set.reps) 
                        : null;
                      const weight = (set.weight !== null && set.weight !== undefined && !isNaN(Number(set.weight))) 
                        ? Number(set.weight) 
                        : null;
                      
                      return {
                        id: String(setId),
                        reps,
                        weight,
                        style: 'normal' as const,
                      };
                    } catch (setError) {
                      console.warn('Error converting set:', setError);
                      return null;
                    }
                  })
                  .filter((set: any) => set !== null);
              }
              
              return {
                id: String(exId),
                name: String(exName),
                sets,
                type: 'strength' as const,
              };
            } catch (exError) {
              console.warn('Error converting exercise:', exError);
              return null;
            }
          })
          .filter((ex: any) => ex !== null);
      }
    } catch (exercisesError) {
      console.warn('Error converting exercises:', exercisesError);
      exercises = [];
    }

    return {
      id: String(workoutDoc.id),
      title: String(workoutDoc.name || 'Untitled Workout'),
      date: workoutDate,
      exercises,
      createdAt,
      completedAt,
    };
  } catch (error) {
    console.error('Error converting workout:', error);
    return null;
  }
};

