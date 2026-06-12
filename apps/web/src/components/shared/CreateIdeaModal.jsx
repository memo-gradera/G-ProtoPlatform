import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import PrototypeBlueprintSection from '@/components/shared/PrototypeBlueprintSection';
import { EMPTY_IDEA, mergeIdeaForm } from '@/components/shared/ideaFormConfig';

export default function CreateIdeaModal({ open, onClose, onSave, loading }) {
  const [form, setForm] = useState(EMPTY_IDEA);

  useEffect(() => {
    if (open) {
      setForm(mergeIdeaForm(null));
    }
  }, [open]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.solution_name?.trim() || !form.owner?.trim()) return;
    onSave({ ...form, status: 'ideas', executive_decision: 'pending' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading text-lg">Submit New Idea</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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
                placeholder="Name your solution"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Short Description *</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => set('short_description', e.target.value)}
                placeholder="Describe the idea briefly"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner *</Label>
              <Input
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Responsible person"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger>
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
            <div className="space-y-1.5 md:col-span-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="max-w-xs">
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

            <PrototypeBlueprintSection form={form} onChange={set} />
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !form.solution_name?.trim() || !form.owner?.trim()}
          >
            {loading ? 'Saving...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
