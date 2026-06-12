import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Layers } from 'lucide-react';

function SectionBlock({ title, description, children }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, className = '', children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function fieldProps(readOnly) {
  return readOnly ? { disabled: true, readOnly: true } : {};
}

export default function PrototypeBlueprintSection({ form, onChange, readOnly = false }) {
  const set = (key, val) => onChange(key, val);

  return (
    <div className="md:col-span-2 space-y-5 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold font-heading">Prototype Blueprint</h3>
          <p className="text-xs text-muted-foreground">
            Define the prototype before build and demo
          </p>
        </div>
      </div>

      <SectionBlock title="Identity" description="Name and core problem framing">
        <Field label="Prototype Name" className="md:col-span-2">
          <Input
            value={form.prototype_name}
            onChange={(e) => set('prototype_name', e.target.value)}
            placeholder="Working title for the prototype"
            {...fieldProps(readOnly)}
          />
        </Field>
        <Field label="Problem Statement" className="md:col-span-2">
          <Textarea
            value={form.problem_statement}
            onChange={(e) => set('problem_statement', e.target.value)}
            placeholder="What problem are we solving?"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
      </SectionBlock>

      <SectionBlock title="User & Value" description="Who benefits and why it matters">
        <Field label="Target Persona">
          <Input
            value={form.target_persona}
            onChange={(e) => set('target_persona', e.target.value)}
            placeholder="Primary user or stakeholder"
            {...fieldProps(readOnly)}
          />
        </Field>
        <Field label="Value Hypothesis">
          <Textarea
            value={form.value_hypothesis}
            onChange={(e) => set('value_hypothesis', e.target.value)}
            placeholder="Expected business or user value"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
      </SectionBlock>

      <SectionBlock title="Scope & Success" description="MVP boundaries and measurable outcomes">
        <Field label="Minimum Viable Functionality" className="md:col-span-2">
          <Textarea
            value={form.minimum_viable_functionality}
            onChange={(e) => set('minimum_viable_functionality', e.target.value)}
            placeholder="Smallest feature set to validate the idea"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
        <Field label="Success Criteria">
          <Textarea
            value={form.success_criteria}
            onChange={(e) => set('success_criteria', e.target.value)}
            placeholder="How we know the prototype succeeded"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
        <Field label="Acceptance Criteria">
          <Textarea
            value={form.acceptance_criteria}
            onChange={(e) => set('acceptance_criteria', e.target.value)}
            placeholder="Conditions required to accept delivery"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
      </SectionBlock>

      <SectionBlock title="Demo & Build" description="How we will demonstrate and implement">
        <Field label="Demo Scenario" className="md:col-span-2">
          <Textarea
            value={form.demo_scenario}
            onChange={(e) => set('demo_scenario', e.target.value)}
            placeholder="Walkthrough script for executive demo"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
        <Field label="Technical Approach" className="md:col-span-2">
          <Textarea
            value={form.technical_approach}
            onChange={(e) => set('technical_approach', e.target.value)}
            placeholder="Stack, architecture, and implementation notes"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
      </SectionBlock>

      <SectionBlock title="Differentiation" description="What makes this prototype stand out">
        <Field label="Market Differentiator" className="md:col-span-2">
          <Textarea
            value={form.market_differentiator}
            onChange={(e) => set('market_differentiator', e.target.value)}
            placeholder="Unique advantage vs alternatives"
            rows={2}
            {...fieldProps(readOnly)}
          />
        </Field>
      </SectionBlock>
    </div>
  );
}
