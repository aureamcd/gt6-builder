export type QuestionType = 
  | 'TEXT_SHORT' 
  | 'TEXT_LONG' 
  | 'RADIO_SINGLE' 
  | 'CHECKBOX_MULTIPLE' 
  | 'GRID_LIKERT' 
  | 'DROPDOWN'
  | 'DATE_TIME'
  | 'FILE_UPLOAD'
  | 'DYNAMIC_REPEATER' 
  | 'CONDITIONAL_LOGIC'
  | 'MEDIA_VIDEO'
  | 'MEDIA_AUDIO'
  | 'MEDIA_IMAGE'
  | 'TEXT_MARKDOWN';

export interface Form {
  id: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at?: string;
  user_id: string;
  share_token?: string;
  settings?: any;
  sections?: Section[];
  is_shared?: boolean;
}

export interface FormComment {
  id: string;
  form_id: string;
  element_id: string;
  text: string;
  status: 'open' | 'resolved';
  created_at: string;
}

export interface Section {
  id: string;
  form_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  unlock_at_seconds?: number | null;
  tags?: string[] | null;
  order_index: number;
  created_at: string;
  questions?: Question[];
}

export interface Question {
  id: string;
  section_id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  allow_add_item: boolean;
  trigger_source_question_id?: string | null;
  sub_question_template?: any | null; // jsonb
  video_url?: string | null; // Added for MEDIA_VIDEO, serialized into sub_question_template
  tags?: string[]; // Added for analytics (TIMAPS, SIMAPS, etc.)
  order_index: number;
  created_at: string;
  options?: Option[];
}

export interface Option {
  id: string;
  question_id: string;
  label: string;
  weight?: number | null;
  order_index: number;
  created_at: string;
}

export interface Submission {
  id: string;
  form_id: string;
  answers: any; // JSONB
  created_at: string;
}
