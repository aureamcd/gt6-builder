export type QuestionType = 
  | 'TEXT_SHORT' 
  | 'TEXT_LONG' 
  | 'RADIO_SINGLE' 
  | 'CHECKBOX_MULTIPLE' 
  | 'GRID_LIKERT' 
  | 'DYNAMIC_REPEATER' 
  | 'CONDITIONAL_LOGIC';

export interface Option {
  id: string;
  label: string;
  weight?: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  options?: Option[];
  allow_add_item?: boolean;
  // For dynamic repeaters or conditionals
  trigger_source_question_id?: string; 
  sub_question_template?: Partial<Question>;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  blocks: Question[];
}

export interface FormSchema {
  form_id: string;
  title: string;
  sections: Section[];
}
