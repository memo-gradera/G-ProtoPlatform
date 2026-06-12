import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { filesService } from '@/services/filesService';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import { Upload, X } from 'lucide-react';
import { mergePrototypeForm } from '@/services/apiMappers';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_development', label: 'In Development' },
  { value: 'demo_ready', label: 'Demo Ready', transitionAction: 'prototype.publish' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived', transitionAction: 'prototype.archive' },
];

const emptyProto = {
  name: '', category: 'other', status: 'draft', owner: '',
  demo_url: '', screenshot_url: '', tags: [], related_idea_id: '', description: ''
};

export default function PrototypeFormDialog({ open, onClose, onSave, prototype, loading, ideas = [] }) {
  const [form, setForm] = useState(emptyProto);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const { canPerformAction } = usePermissions();

  const canSelectStatus = (status) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    if (!option?.transitionAction) {
      return prototype
        ? canPerformAction('prototype.edit', { prototype })
        : canPerformAction('prototype.create');
    }
    if (prototype?.status === status) {
      return canPerformAction('prototype.edit', { prototype });
    }
    return canPerformAction(option.transitionAction, { prototype });
  };

  const visibleStatuses = STATUS_OPTIONS.filter(
    (o) => canSelectStatus(o.value) || form.status === o.value,
  );

  useEffect(() => {
    if (prototype) {
      setForm(mergePrototypeForm(prototype, emptyProto));
    } else {
      setForm(emptyProto);
    }
  }, [prototype, open]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      set('tags', [...form.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => set('tags', form.tags.filter(t => t !== tag));

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0];
    setUploading(true);
    try {
      const fileUrl = await filesService.uploadPrototypeScreenshot(file);
      set('screenshot_url', fileUrl);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'Screenshot upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {prototype ? 'Edit Prototype' : 'Add Prototype'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Prototype name" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibleStatuses.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Owner *</Label>
            <Input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Who owns this prototype?" />
          </div>
          <div className="space-y-1.5">
            <Label>Demo URL</Label>
            <Input value={form.demo_url} onChange={e => set('demo_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Related Idea</Label>
            <Select value={form.related_idea_id || 'none'} onValueChange={v => set('related_idea_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select an idea" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ideas.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.solution_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Screenshot</Label>
            <div className="flex items-center gap-3">
              {form.screenshot_url && (
                <img src={form.screenshot_url} alt="screenshot" className="w-16 h-10 object-cover rounded border" />
              )}
              <label className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-md">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.owner}>
            {loading ? 'Saving...' : prototype ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}