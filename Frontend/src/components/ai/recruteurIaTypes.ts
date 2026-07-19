export interface InterviewQuestion {
  question: string;
  type: string;
}

export interface InterviewFeedback {
  rating: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    experience: number;
    totalRating: number;
  };
  summary: string;
  recommendation: boolean;
  recommendationMessage: string;
}

export type InterviewPageStep = 'form' | 'questions' | 'interview' | 'feedback';

export interface InterviewFormData {
  job_position: string;
  job_description: string;
  duration: string;
  interview_type: string;
}
