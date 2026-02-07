'use client';

import { useState, useTransition } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markAnnouncementRead } from '@/app/actions/announcements';

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
}

interface AnnouncementsBannerProps {
  announcements: AnnouncementItem[];
  readIds: Set<string>;
}

export function AnnouncementsBanner({ announcements, readIds }: AnnouncementsBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const unread = announcements.filter((a) => !readIds.has(a.id) && !dismissed.has(a.id));
  const read = announcements.filter((a) => readIds.has(a.id) && !dismissed.has(a.id));
  const [showRead, setShowRead] = useState(false);

  if (unread.length === 0 && read.length === 0) return null;

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markAnnouncementRead(id);
    });
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Unread announcements */}
      {unread.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900"
        >
          <Bell className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{a.title}</p>
            <p className="text-xs text-blue-700 mt-0.5">{a.body}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            disabled={isPending}
            onClick={() => handleDismiss(a.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {/* Read announcements toggle */}
      {read.length > 0 && unread.length === 0 && (
        <button
          onClick={() => setShowRead(!showRead)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRead ? 'Hide' : `${read.length} announcement${read.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Read announcements (collapsed) */}
      {showRead && read.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 text-muted-foreground"
        >
          <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{a.title}</p>
            <p className="text-xs mt-0.5 line-clamp-1">{a.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
