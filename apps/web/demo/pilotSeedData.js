/**
 * Innovation Hub pilot demo seed data.
 * Used by scripts/seedPilotDemo.mjs — not loaded at runtime.
 *
 * Each idea includes a stable `seedKey` for idempotent seeding (matched via solution_name).
 */

export const PILOT_IDEAS = [
  {
    seedKey: 'secuphi-access-sentinel',
    solution_name: 'SecuPHI Access Sentinel',
    short_description: 'Real-time visibility into PHI access patterns across clinical apps.',
    why_it_matters:
      'Reduces audit prep time and helps security teams spot anomalous access before incidents escalate.',
    target_user: 'Security operations and compliance analysts',
    minimum_viable_functionality:
      'Ingest access logs from two source systems, flag high-risk reads, and export a weekly summary.',
    value_hypothesis:
      'If analysts see consolidated PHI access signals, they will resolve review queues 40% faster.',
    success_criteria: '80% of flagged events reviewed within 48 hours during pilot.',
    acceptance_criteria:
      'Dashboard loads under 3s; supports filtering by user, patient cohort, and application.',
    owner: 'Alex Rivera',
    priority: 'high',
    status: 'ideas',
    category: 'infrastructure',
    executive_decision: 'pending',
    prototype_name: 'Access Sentinel MVP',
    problem_statement: 'PHI access reviews are fragmented across tools and spreadsheets.',
    target_persona: 'SOC analyst responsible for HIPAA access monitoring',
    demo_scenario: 'Show suspicious bulk chart access detected overnight and escalated to compliance.',
    technical_approach: 'Stream ingestion + rules engine + read-only audit UI',
    market_differentiator: 'Purpose-built for healthcare access patterns, not generic SIEM alerts',
  },
  {
    seedKey: 'secuphi-audit-shield',
    solution_name: 'SecuPHI Audit Shield',
    short_description: 'Automated evidence collection for HIPAA technical safeguard audits.',
    why_it_matters:
      'Audit cycles consume hundreds of engineering hours; automation improves consistency and traceability.',
    target_user: 'Compliance managers and platform engineers',
    minimum_viable_functionality:
      'Pull control evidence from IAM, backup jobs, and encryption configs into one export bundle.',
    value_hypothesis:
      'Structured evidence packs cut audit preparation from weeks to days for core controls.',
    success_criteria: 'Generate a complete control packet for 5 priority safeguards.',
    acceptance_criteria:
      'Each evidence item links to source system timestamp and responsible owner.',
    owner: 'Jordan Kim',
    priority: 'critical',
    status: 'in_progress',
    category: 'automation',
    executive_decision: 'pending',
    prototype_name: 'Audit Shield Collector',
    problem_statement: 'Manual audit evidence gathering is error-prone and not repeatable.',
    target_persona: 'Compliance program manager',
    demo_scenario: 'One-click export of encryption-at-rest evidence for Q2 audit.',
    technical_approach: 'Scheduled collectors + immutable storage + PDF/CSV export',
    market_differentiator: 'Maps directly to HIPAA safeguard categories',
  },
  {
    seedKey: 'testphi-regression-hub',
    solution_name: 'TestPHI Regression Hub',
    short_description: 'Synthetic PHI-safe datasets for regression testing clinical workflows.',
    why_it_matters:
      'Teams delay releases because production-like test data is hard to provision safely.',
    target_user: 'QA engineers and clinical application developers',
    minimum_viable_functionality:
      'Generate de-identified patient cohorts and run three standard admission/discharge scenarios.',
    value_hypothesis:
      'Ready-made safe datasets increase regression coverage without compliance review delays.',
    success_criteria: 'Cut test-data setup time from 2 days to 2 hours for pilot squads.',
    acceptance_criteria:
      'All generated records pass internal de-identification checks; scenarios are reproducible.',
    owner: 'Sam Patel',
    priority: 'high',
    status: 'ready_4_demo',
    category: 'integration',
    executive_decision: 'pending',
    prototype_url: 'https://demo.example.com/testphi-regression-hub',
    demo_notes: 'Demo covers admission, transfer, and discharge flows with audit trail.',
    prototype_name: 'Regression Hub Sandbox',
    problem_statement: 'PHI-safe regression environments are slow to stand up per release.',
    target_persona: 'QA lead on a patient portal squad',
    demo_scenario: 'Spin up a cohort, run regression pack, view pass/fail summary.',
    technical_approach: 'Synthetic data generator + scenario runner + results dashboard',
    market_differentiator: 'Healthcare-specific scenarios, not generic faker libraries',
  },
  {
    seedKey: 'testphi-coverage-radar',
    solution_name: 'TestPHI Coverage Radar',
    short_description: 'Maps test coverage gaps against regulated workflow paths.',
    why_it_matters:
      'Untested PHI workflows create release risk and compliance exposure.',
    target_user: 'Engineering managers and QA strategists',
    minimum_viable_functionality:
      'Visualize coverage of top 20 regulated workflows and highlight untested paths.',
    value_hypothesis:
      'Workflow-aware coverage views prioritize testing where compliance risk is highest.',
    success_criteria: 'Identify top 5 untested high-risk paths per product line.',
    acceptance_criteria:
      'Coverage map updates nightly from CI results and manual workflow tags.',
    owner: 'Morgan Lee',
    priority: 'medium',
    status: 'blocked',
    category: 'analytics',
    executive_decision: 'pending',
    blocker_reason:
      'Waiting on CI pipeline export format from Platform team — ETA next sprint.',
    prototype_name: 'Coverage Radar Map',
    problem_statement: 'Teams cannot see which regulated paths lack automated tests.',
    target_persona: 'QA manager preparing release readiness reviews',
    demo_scenario: 'Highlight untested medication reconciliation path before release.',
    technical_approach: 'Workflow taxonomy + CI ingestion + heatmap visualization',
    market_differentiator: 'Links coverage to compliance workflows, not just code lines',
  },
  {
    seedKey: 'productphi-roadmap-lens',
    solution_name: 'ProductPHI Roadmap Lens',
    short_description: 'Prioritizes innovation backlog items by PHI impact and delivery effort.',
    why_it_matters:
      'Product leaders need a shared view of which ideas reduce compliance friction fastest.',
    target_user: 'Product directors and innovation leads',
    minimum_viable_functionality:
      'Score ideas on compliance impact, user reach, and engineering effort; rank top opportunities.',
    value_hypothesis:
      'Transparent scoring reduces debate time and aligns exec reviews with measurable outcomes.',
    success_criteria: 'Exec review cycle time reduced by 25% in pilot quarter.',
    acceptance_criteria:
      'Ranking model documented; scores visible on idea detail and review screens.',
    owner: 'Taylor Brooks',
    priority: 'high',
    status: 'approved',
    category: 'analytics',
    executive_decision: 'approved',
    prototype_url: 'https://demo.example.com/productphi-roadmap-lens',
    demo_notes: 'Approved for Q3 pilot with Innovation Ops sponsorship.',
    decision_notes: 'Strong alignment with portfolio KPIs; fund one squad for 6-week pilot.',
    prototype_name: 'Roadmap Lens Scorer',
    problem_statement: 'Backlog prioritization is subjective without compliance-aware scoring.',
    target_persona: 'Innovation lead preparing executive review packets',
    demo_scenario: 'Compare two ideas side-by-side with impact/effort matrix.',
    technical_approach: 'Weighted scoring model + Kanban integration + exec summary export',
    market_differentiator: 'Built for regulated product portfolios',
  },
  {
    seedKey: 'productphi-vendor-compare',
    solution_name: 'ProductPHI Vendor Compare',
    short_description: 'Side-by-side evaluation framework for PHI-adjacent vendor tools.',
    why_it_matters:
      'Vendor selection delays block roadmap items when security review lacks a standard template.',
    target_user: 'Product managers and procurement partners',
    minimum_viable_functionality:
      'Compare three vendors on security controls, integration effort, and total cost.',
    value_hypothesis:
      'Standardized comparisons shorten vendor decisions and improve audit readiness.',
    success_criteria: 'Complete one vendor bake-off using the template in under 5 business days.',
    acceptance_criteria:
      'Template includes BAA checklist, API maturity, and data residency fields.',
    owner: 'Casey Nguyen',
    priority: 'low',
    status: 'rejected',
    category: 'other',
    executive_decision: 'rejected',
    rejection_reason:
      'Deferred — existing procurement tooling will cover this use case in H2; revisit if gaps remain.',
    prototype_name: 'Vendor Compare Worksheet',
    problem_statement: 'Vendor evaluations are inconsistent across product lines.',
    target_persona: 'Product manager evaluating a new analytics vendor',
    demo_scenario: 'Walk through scoring three vendors on PHI handling controls.',
    technical_approach: 'Structured rubric + attachment store + export to PDF',
    market_differentiator: 'Healthcare-specific vendor control checklist',
  },
  {
    seedKey: 'codephi-safe-refactor',
    solution_name: 'CodePHI Safe Refactor Assistant',
    short_description: 'Guides developers when refactoring modules that touch PHI fields.',
    why_it_matters:
      'Refactors in legacy clinical code often introduce logging and exposure regressions.',
    target_user: 'Software engineers on patient-facing services',
    minimum_viable_functionality:
      'Scan changed files for PHI field usage and suggest safe patterns before merge.',
    value_hypothesis:
      'Inline guidance reduces PHI-related code review findings on refactors by half.',
    success_criteria: 'Detect 90% of known anti-patterns in pilot repository set.',
    acceptance_criteria:
      'Integrates with PR checks; findings link to remediation playbooks.',
    owner: 'Dev Owner',
    priority: 'medium',
    status: 'in_progress',
    category: 'ai_ml',
    executive_decision: 'pending',
    prototype_name: 'Safe Refactor Linter',
    problem_statement: 'Engineers lack contextual guardrails when editing PHI-touching code.',
    target_persona: 'Backend developer maintaining an EHR integration service',
    demo_scenario: 'Open a PR diff and show PHI field warnings with fix suggestions.',
    technical_approach: 'Static analysis + PHI field registry + PR bot comments',
    market_differentiator: 'Healthcare-tuned rules beyond generic secret scanners',
  },
  {
    seedKey: 'codephi-phi-lint-gateway',
    solution_name: 'CodePHI PHI Lint Gateway',
    short_description: 'CI gate that blocks merges when new PHI exposure paths are detected.',
    why_it_matters:
      'Preventing issues pre-merge is cheaper than incident response and audit remediation.',
    target_user: 'Platform engineers and squad tech leads',
    minimum_viable_functionality:
      'Run lint rules on changed files and fail builds when critical PHI patterns appear.',
    value_hypothesis:
      'A mandatory gateway increases compliance confidence without slowing teams materially.',
    success_criteria: 'Zero critical PHI lint bypasses without recorded exception in pilot.',
    acceptance_criteria:
      'Policy exceptions require approver, reason, and expiry date.',
    owner: 'Dev Owner',
    priority: 'high',
    status: 'ideas',
    category: 'infrastructure',
    executive_decision: 'pending',
    prototype_name: 'PHI Lint Gateway',
    problem_statement: 'PHI safety checks are optional and inconsistent across repositories.',
    target_persona: 'Tech lead owning a monorepo with multiple clinical services',
    demo_scenario: 'Demonstrate blocked merge with clear remediation steps.',
    technical_approach: 'CI plugin + policy engine + exception workflow',
    market_differentiator: 'Policy-aware gateway integrated with innovation pipeline',
  },
];

export const PILOT_PROTOTYPES = [
  {
    seedKey: 'proto-secuphi-audit-shield',
    name: 'SecuPHI Audit Shield — Evidence Pack',
    description: 'Working prototype of automated HIPAA evidence collection and export.',
    category: 'automation',
    status: 'in_development',
    owner: 'Jordan Kim',
    demo_url: 'https://demo.example.com/secuphi-audit-shield',
    tags: ['SecuPHI', 'compliance', 'audit'],
    relatedIdeaSeedKey: 'secuphi-audit-shield',
  },
  {
    seedKey: 'proto-testphi-regression-hub',
    name: 'TestPHI Regression Hub Sandbox',
    description: 'Synthetic PHI-safe datasets and scenario runner for QA teams.',
    category: 'integration',
    status: 'demo_ready',
    owner: 'Sam Patel',
    demo_url: 'https://demo.example.com/testphi-regression-hub',
    tags: ['TestPHI', 'QA', 'synthetic-data'],
    relatedIdeaSeedKey: 'testphi-regression-hub',
  },
  {
    seedKey: 'proto-productphi-roadmap-lens',
    name: 'ProductPHI Roadmap Lens',
    description: 'Compliance-aware idea scoring and executive summary views.',
    category: 'analytics',
    status: 'approved',
    owner: 'Taylor Brooks',
    demo_url: 'https://demo.example.com/productphi-roadmap-lens',
    tags: ['ProductPHI', 'prioritization', 'exec-review'],
    relatedIdeaSeedKey: 'productphi-roadmap-lens',
  },
  {
    seedKey: 'proto-codephi-safe-refactor',
    name: 'CodePHI Safe Refactor Assistant',
    description: 'PR-time guidance for refactors touching PHI field registries.',
    category: 'ai_ml',
    status: 'draft',
    owner: 'Dev Owner',
    demo_url: 'https://demo.example.com/codephi-safe-refactor',
    tags: ['CodePHI', 'developer-tools', 'static-analysis'],
    relatedIdeaSeedKey: 'codephi-safe-refactor',
  },
];

/** Optional status history rows for demo timeline (linked after ideas are created). */
export const PILOT_STATUS_HISTORY = [
  {
    ideaSeedKey: 'testphi-regression-hub',
    previous_status: 'in_progress',
    new_status: 'ready_4_demo',
    changed_by: 'Sam Patel',
    reason: 'Prototype URL verified in staging; ready for executive demo.',
    metadata: { prototype_url: 'https://demo.example.com/testphi-regression-hub' },
  },
  {
    ideaSeedKey: 'productphi-roadmap-lens',
    previous_status: 'ready_4_demo',
    new_status: 'approved',
    changed_by: 'exec.reviewer@example.com',
    reason: 'Approved for Q3 pilot with Innovation Ops sponsorship.',
    metadata: { decision_notes: 'Strong alignment with portfolio KPIs; fund one squad for 6-week pilot.' },
  },
  {
    ideaSeedKey: 'productphi-vendor-compare',
    previous_status: 'ready_4_demo',
    new_status: 'rejected',
    changed_by: 'exec.reviewer@example.com',
    reason: 'Deferred — existing procurement tooling will cover this use case in H2.',
    metadata: {
      rejection_reason:
        'Deferred — existing procurement tooling will cover this use case in H2; revisit if gaps remain.',
    },
  },
];
