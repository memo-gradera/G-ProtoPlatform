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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { filesService } from '@/services/filesService';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Trash2 } from 'lucide-react';
import { mergePrototypeForm } from '@/services/apiMappers';
import {
  ACCEPTED_SCREENSHOT_ACCEPT,
  applyScreenshotUrlsToPrototypeForm,
  getCoverScreenshotUrl,
  MAX_PROTOTYPE_SCREENSHOTS,
  validatePrototypeScreenshotSelection,
} from '@/lib/prototypeScreenshots';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_development', label: 'In Development' },
  { value: 'demo_ready', label: 'Demo Ready', transitionAction: 'prototype.publish' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived', transitionAction: 'prototype.archive' },
];

const emptyProto = {
  name: '', category: 'other', status: 'draft', owner: '',
  demo_url: '', screenshot_url: '', screenshot_urls: [], tags: [], related_idea_id: '', description: ''
};

function screenshotsFromPrototype(prototype) {
  if (!prototype) return [];
  const urls = Array.isArray(prototype.screenshot_urls) && prototype.screenshot_urls.length
    ? prototype.screenshot_urls
    : prototype.screenshot_url
      ? [prototype.screenshot_url]
      : [];
  return urls.map((url, index) => ({ id: `${url}-${index}`, url }));
}

export default function PrototypeFormDialog({
  open,
  onClose,
  onSave,
  onDelete,
  prototype,
  loading,
  deleting = false,
  canDelete = false,
  ideas = [],
}) {
  const [form, setForm] = useState(emptyProto);
  const [screenshots, setScreenshots] = useState([]);
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
      const merged = mergePrototypeForm(prototype, emptyProto);
      const nextScreenshots = screenshotsFromPrototype(merged);
      setForm({
        ...merged,
        screenshot_url: getCoverScreenshotUrl(nextScreenshots),
        screenshot_urls: nextScreenshots.map((item) => item.url),
      });
      setScreenshots(nextScreenshots);
    } else {
      setForm(emptyProto);
      setScreenshots([]);
    }
  }, [prototype, open]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const syncScreenshots = (nextScreenshots) => {
    setScreenshots(nextScreenshots);
    setForm((prev) => ({
      ...prev,
      screenshot_url: getCoverScreenshotUrl(nextScreenshots),
      screenshot_urls: nextScreenshots.map((item) => item.url),
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      set('tags', [...form.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => set('tags', form.tags.filter(t => t !== tag));

  const removeScreenshot = (id) => {
    syncScreenshots(screenshots.filter((item) => item.id !== id));
  };

  const handleScreenshotUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    const validation = validatePrototypeScreenshotSelection(
      selectedFiles,
      screenshots.length,
    );
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: validation.message,
      });
      return;
    }

    setUploading(true);
    try {
      const result = await filesService.uploadPrototypeScreenshots(selectedFiles);
      const uploaded = result.urls.map((url, index) => ({
        id: `${url}-${Date.now()}-${index}`,
        url,
      }));
      syncScreenshots([...screenshots, ...uploaded]);
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

  const coverUrl = getCoverScreenshotUrl(screenshots);
  const canAddMoreScreenshots = screenshots.length < MAX_PROTOTYPE_SCREENSHOTS;

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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Screenshots</Label>
              <span className="text-xs text-muted-foreground">
                {screenshots.length}/{MAX_PROTOTYPE_SCREENSHOTS} · first image is cover
              </span>
            </div>

            {coverUrl ? (
              <div className="rounded-lg border overflow-hidden bg-muted">
                <img
                  src={coverUrl}
                  alt="Prototype cover"
                  className="w-full h-28 object-cover"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed h-28 flex items-center justify-center bg-muted/40">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {form.name?.charAt(0) || '?'}
                  </span>
                </div>
              </div>
            )}

            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {screenshots.map((shot, index) => (
                  <div key={shot.id} className="relative">
                    <img
                      src={shot.url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-16 h-10 object-cover rounded border"
                    />
                    {index === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[10px] font-medium">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeScreenshot(shot.id)}
                      className="absolute -right-1 -top-1 rounded-full bg-background border p-0.5 shadow-sm"
                      aria-label={`Remove screenshot ${index + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition-colors ${
                canAddMoreScreenshots && !uploading
                  ? 'cursor-pointer hover:bg-muted'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload screenshots'}
              <input
                type="file"
                accept={ACCEPTED_SCREENSHOT_ACCEPT}
                multiple
                disabled={!canAddMoreScreenshots || uploading}
                onChange={handleScreenshotUpload}
                className="hidden"
              />
            </label>
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
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {canDelete && prototype?.id && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    disabled={loading || deleting}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Prototype</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove &quot;{prototype.name}&quot;. This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(prototype.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => onSave(applyScreenshotUrlsToPrototypeForm(form, screenshots))}
              disabled={loading || deleting || !form.name || !form.owner}
            >
              {loading ? 'Saving...' : prototype ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
