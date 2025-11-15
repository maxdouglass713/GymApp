import { create } from 'zustand';

// Video attachment interface
export interface VideoAttachment {
  id: string;
  workoutId: string;
  exerciseId: string;
  setId: string;
  uri: string;
  duration: number; // in seconds
  createdAt: Date;
  thumbnailUri?: string;
}

// Form analysis interface
export interface FormAnalysis {
  id: string;
  videoAttachmentId: string;
  repCount: number;
  avgTempo: number; // seconds per rep
  romPercentage: number; // range of motion percentage
  estimatedRPE: number; // 1-10
  userAdjustedRPE?: number; // user override
  cues: FormCue[];
  progressionSuggestion: string;
  analyzedAt: Date;
}

// Form cue interface
export interface FormCue {
  category: string; // 'depth', 'bar_path', 'knee_tracking', 'back_angle', etc.
  status: 'good' | 'warning' | 'poor'; // green/amber/red
  message: string;
  score: number; // 0-100
}

// Video store interface
export interface VideoStore {
  // Data
  videoAttachments: VideoAttachment[];
  formAnalyses: FormAnalysis[];
  
  // Actions
  addVideoAttachment: (attachment: Omit<VideoAttachment, 'id' | 'createdAt'>) => string;
  removeVideoAttachment: (attachmentId: string) => void;
  getVideoAttachment: (workoutId: string, exerciseId: string, setId: string) => VideoAttachment | null;
  
  addFormAnalysis: (analysis: Omit<FormAnalysis, 'id' | 'analyzedAt'>) => string;
  updateFormAnalysis: (analysisId: string, updates: Partial<FormAnalysis>) => void;
  getFormAnalysis: (videoAttachmentId: string) => FormAnalysis | null;
  
  // Mock analysis generation
  generateMockAnalysis: (exerciseName: string, repCount: number, weight: number) => FormAnalysis;
  
  // Utility functions
  deleteVideoKeepAnalysis: (attachmentId: string) => void;
  getAnalysisForSet: (workoutId: string, exerciseId: string, setId: string) => FormAnalysis | null;
}

// Mock form cues based on exercise type
const getExerciseCues = (exerciseName: string): FormCue[] => {
  const exercise = exerciseName.toLowerCase();
  
  if (exercise.includes('squat')) {
    return [
      { category: 'depth', status: 'good', message: 'Good depth - hip crease below knee', score: 85 },
      { category: 'bar_path', status: 'good', message: 'Vertical bar path maintained', score: 90 },
      { category: 'knee_tracking', status: 'warning', message: 'Slight knee cave on ascent', score: 70 },
      { category: 'back_angle', status: 'good', message: 'Neutral spine maintained', score: 88 },
    ];
  } else if (exercise.includes('bench') || exercise.includes('press')) {
    return [
      { category: 'depth', status: 'good', message: 'Full range of motion achieved', score: 92 },
      { category: 'bar_path', status: 'good', message: 'Smooth bar path', score: 88 },
      { category: 'stability', status: 'warning', message: 'Minor shoulder instability', score: 75 },
      { category: 'tempo', status: 'good', message: 'Controlled tempo throughout', score: 85 },
    ];
  } else if (exercise.includes('deadlift')) {
    return [
      { category: 'setup', status: 'good', message: 'Proper starting position', score: 90 },
      { category: 'bar_path', status: 'good', message: 'Vertical bar path', score: 88 },
      { category: 'back_angle', status: 'warning', message: 'Slight rounding on heavy reps', score: 72 },
      { category: 'lockout', status: 'good', message: 'Full hip extension achieved', score: 87 },
    ];
  } else {
    // Generic cues for other exercises
    return [
      { category: 'form', status: 'good', message: 'Good overall form', score: 80 },
      { category: 'tempo', status: 'good', message: 'Controlled movement', score: 85 },
      { category: 'range', status: 'good', message: 'Full range of motion', score: 82 },
    ];
  }
};

// Generate progression suggestion based on RPE
const getProgressionSuggestion = (rpe: number): string => {
  if (rpe <= 7) {
    return '+2.5–5 lb next time';
  } else if (rpe <= 8.5) {
    return 'repeat weight, aim +1 rep';
  } else {
    return '-2.5–5 lb or reduce reps';
  }
};

export const useVideoStore = create<VideoStore>((set, get) => ({
  // Initial state
  videoAttachments: [],
  formAnalyses: [],
  
  addVideoAttachment: (attachmentData) => {
    const id = Date.now().toString();
    const attachment: VideoAttachment = {
      ...attachmentData,
      id,
      createdAt: new Date(),
    };
    
    set((state) => ({
      videoAttachments: [...state.videoAttachments, attachment],
    }));
    
    return id;
  },
  
  removeVideoAttachment: (attachmentId) => {
    set((state) => ({
      videoAttachments: state.videoAttachments.filter(att => att.id !== attachmentId),
    }));
  },
  
  getVideoAttachment: (workoutId, exerciseId, setId) => {
    const { videoAttachments } = get();
    return videoAttachments.find(att => 
      att.workoutId === workoutId && 
      att.exerciseId === exerciseId && 
      att.setId === setId
    ) || null;
  },
  
  addFormAnalysis: (analysisData) => {
    const id = Date.now().toString();
    const analysis: FormAnalysis = {
      ...analysisData,
      id,
      analyzedAt: new Date(),
    };
    
    set((state) => ({
      formAnalyses: [...state.formAnalyses, analysis],
    }));
    
    return id;
  },
  
  updateFormAnalysis: (analysisId, updates) => {
    set((state) => ({
      formAnalyses: state.formAnalyses.map(analysis =>
        analysis.id === analysisId ? { ...analysis, ...updates } : analysis
      ),
    }));
  },
  
  getFormAnalysis: (videoAttachmentId) => {
    const { formAnalyses } = get();
    return formAnalyses.find(analysis => analysis.videoAttachmentId === videoAttachmentId) || null;
  },
  
  generateMockAnalysis: (exerciseName, repCount, weight) => {
    const cues = getExerciseCues(exerciseName);
    const avgTempo = 2.5 + Math.random() * 1.5; // 2.5-4 seconds per rep
    const romPercentage = 85 + Math.random() * 15; // 85-100%
    const estimatedRPE = 6 + Math.random() * 3; // 6-9 RPE
    
    const analysis: Omit<FormAnalysis, 'id' | 'analyzedAt'> = {
      videoAttachmentId: '', // Will be set when attached
      repCount,
      avgTempo,
      romPercentage,
      estimatedRPE,
      cues,
      progressionSuggestion: getProgressionSuggestion(estimatedRPE),
    };
    
    return analysis as FormAnalysis;
  },
  
  deleteVideoKeepAnalysis: (attachmentId) => {
    // Remove video but keep analysis metadata
    set((state) => ({
      videoAttachments: state.videoAttachments.filter(att => att.id !== attachmentId),
    }));
  },
  
  getAnalysisForSet: (workoutId, exerciseId, setId) => {
    const { videoAttachments, formAnalyses } = get();
    const attachment = videoAttachments.find(att => 
      att.workoutId === workoutId && 
      att.exerciseId === exerciseId && 
      att.setId === setId
    );
    
    if (!attachment) return null;
    
    return formAnalyses.find(analysis => analysis.videoAttachmentId === attachment.id) || null;
  },
}));
