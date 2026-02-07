'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createAnnouncement, updateAnnouncement } from '@/app/actions/announcements';

interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  expires_at: string | null;
}

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: AnnouncementData | null;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0, 16);
}

export function AnnouncementForm({ open, onOpenChange, announcement }: AnnouncementFormProps) {
  const isEdit = !!announcement;

  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [publishedAt, setPublishedAt] = useState(toDatetimeLocal(announcement?.published_at ?? null));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(announcement?.expires_at ?? null));
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setTitle('');
    setBody('');
    setPublishedAt('');
    setExpiresAt('');
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function handlePublishNow() {
    setPublishedAt(new Date().toISOString().slice(0, 16));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Body is required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        body: body.trim(),
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (isEdit) {
        const result = await updateAnnouncement(announcement.id, data);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Announcement updated');
      } else {
        const result = await createAnnouncement(data);
        if (result.error) {
          toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
          return;
        }
        toast.success('Announcement created');
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Announcement' : 'New Announcement'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Holiday Schedule Update"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-body">Body</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Announcement content..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-published">Publish Date</Label>
            <div className="flex gap-2">
              <Input
                id="ann-published"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={handlePublishNow}>
                Now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to save as draft</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-expires">Expires</Label>
            <Input
              id="ann-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional — leave empty for no expiry</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : isEdit ? 'Update' : publishedAt ? 'Publish' : 'Save Draft'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
