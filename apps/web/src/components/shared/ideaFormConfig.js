/** Default empty values for idea forms */
export const EMPTY_IDEA = {
  solution_name: '',
  short_description: '',
  why_it_matters: '',
  target_user: '',
  minimum_viability: '',
  what_makes_it_unique: '',
  acceptance_criteria: '',
  owner: '',
  priority: 'medium',
  status: 'ideas',
  eta: '',
  blocker_reason: '',
  prototype_url: '',
  demo_notes: '',
  decision_notes: '',
  executive_decision: 'pending',
  rejection_reason: '',
  category: 'other',
  // Prototype Blueprint
  prototype_name: '',
  problem_statement: '',
  target_persona: '',
  value_hypothesis: '',
  minimum_viable_functionality: '',
  success_criteria: '',
  demo_scenario: '',
  technical_approach: '',
  market_differentiator: '',
};

export const BLUEPRINT_FIELD_KEYS = [
  'prototype_name',
  'problem_statement',
  'target_persona',
  'value_hypothesis',
  'minimum_viable_functionality',
  'success_criteria',
  'demo_scenario',
  'technical_approach',
  'market_differentiator',
  'acceptance_criteria',
];

export function mergeIdeaForm(idea) {
  return idea ? { ...EMPTY_IDEA, ...idea } : { ...EMPTY_IDEA };
}
