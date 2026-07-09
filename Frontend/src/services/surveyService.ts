import api from './api';

// Backend: /api/v1/surveys/surveys/

export type QuestionType = 'text' | 'rating' | 'single_choice' | 'multiple_choice';

export interface SurveyQuestion {
  id: number;
  text: string;
  question_type: QuestionType;
  question_type_display: string;
  options: string[];
  order: number;
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  is_anonymous: boolean;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'closed';
  status_display: string;
  created_at: string;
  questions: SurveyQuestion[];
  has_responded: boolean;
}

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  is_anonymous?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  questions: { text: string; question_type: QuestionType; options?: string[] }[];
}

export interface SubmitAnswerPayload {
  question: number;
  text_answer?: string;
  selected_options?: string[];
}

export interface SurveyQuestionResult {
  question_id: number;
  text: string;
  question_type: QuestionType;
  average?: number | null;
  response_count?: number;
  option_counts?: Record<string, number>;
  text_answers?: string[];
}

export interface SurveyResults {
  total_responses: number;
  questions: SurveyQuestionResult[];
}

export const surveyService = {
  getAll: async (): Promise<{ results?: Survey[] } | Survey[]> => {
    const { data } = await api.get('/surveys/surveys/');
    return data;
  },

  create: async (payload: CreateSurveyPayload): Promise<Survey> => {
    const { data } = await api.post('/surveys/surveys/', payload);
    return data;
  },

  activate: async (id: number): Promise<Survey> => {
    const { data } = await api.patch(`/surveys/surveys/${id}/`, { status: 'active' });
    return data;
  },

  close: async (id: number): Promise<Survey> => {
    const { data } = await api.patch(`/surveys/surveys/${id}/`, { status: 'closed' });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/surveys/surveys/${id}/`);
  },

  respond: async (surveyId: number, answers: SubmitAnswerPayload[]): Promise<void> => {
    await api.post(`/surveys/surveys/${surveyId}/respond/`, { answers });
  },

  getResults: async (surveyId: number): Promise<SurveyResults> => {
    const { data } = await api.get(`/surveys/surveys/${surveyId}/results/`);
    return data;
  },
};
