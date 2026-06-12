import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PrototypeBlueprintSection from '@/components/shared/PrototypeBlueprintSection';
import IdeaStatusHistorySection from '@/components/shared/IdeaStatusHistorySection';
import { mergeIdeaForm } from '@/components/shared/ideaFormConfig';

export default function IdeaDetailDrawer({
  open,
  onClose,
  onSave,
  idea,
  loading,
  readOnly = false,
  canChangeStatus = true,
}) {
  const [form, setForm] = useState(mergeIdeaForm(null));

  useEffect(() => {
    if (open && idea) {
      setForm(mergeIdeaForm(idea));
    }
  }, [idea, open]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (readOnly) return;
    if (!form.solution_name?.trim() || !form.owner?.trim()) return;
    onSave(form);
  };

  const fieldDisabled = readOnly;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden">
        <DrawerHeader className="shrink-0 border-b border-border/40 px-6 pb-4 text-left">
          <DrawerTitle className="font-heading text-lg">
            {idea?.solution_name || 'Idea Details'}
          </DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Edit pipeline fields and prototype blueprint
          </p>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 pb-24">
            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Idea Overview
              </p>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Solution Name *</Label>
              <Input
                value={form.solution_name}
                onChange={(e) => set('solution_name', e.target.value)}
                disabled={fieldDisabled}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Short Description *</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => set('short_description', e.target.value)}
                rows={2}
                disabled={fieldDisabled}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Why It Matters</Label>
              <Textarea
                value={form.why_it_matters}
                onChange={(e) => set('why_it_matters', e.target.value)}
                rows={2}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target User</Label>
              <Input
                value={form.target_user}
                onChange={(e) => set('target_user', e.target.value)}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner *</Label>
              <Input
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)} disabled={fieldDisabled}>
                <SelectTrigger disabled={fieldDisabled}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)} disabled={fieldDisabled}>
                <SelectTrigger disabled={fieldDisabled}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_ml">AI / ML</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="ux">UX</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set('status', v)}
                disabled={fieldDisabled || !canChangeStatus}
              >
                <SelectTrigger disabled={fieldDisabled || !canChangeStatus}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ideas">Ideas</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready_4_demo">Ready 4 Demo</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ETA</Label>
              <Input
                type="date"
                value={form.eta}
                onChange={(e) => set('eta', e.target.value)}
                disabled={fieldDisabled}
              />
            </div>

            <PrototypeBlueprintSection
              form={form}
              onChange={readOnly ? () => {} : set}
              readOnly={readOnly}
            />

            <div className="md:col-span-2 space-y-4 pt-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pipeline & Demo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Prototype URL</Label>
                  <Input
                    value={form.prototype_url}
                    onChange={(e) => set('prototype_url', e.target.value)}
                    placeholder="https://..."
                    disabled={fieldDisabled}
                  />
                </div>
                {form.status === 'blocked' && (
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Blocker Reason</Label>
                    <Textarea
                      value={form.blocker_reason}
                      onChange={(e) => set('blocker_reason', e.target.value)}
                      rows={2}
                      disabled={fieldDisabled}
                    />
                  </div>
                )}
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Demo Notes</Label>
                  <Textarea
                    value={form.demo_notes}
                    onChange={(e) => set('demo_notes', e.target.value)}
                    placeholder="Executive decision notes / demo session notes"
                    rows={2}
                    disabled={fieldDisabled}
                  />
                </div>
              </div>
            </div>

            {idea?.id && (
              <IdeaStatusHistorySection ideaId={idea.id} open={open} />
            )}
          </div>
        </div>

        <DrawerFooter className="shrink-0 border-t border-border/40 bg-background px-6 py-4 flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={loading || !form.solution_name?.trim() || !form.owner?.trim()}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
