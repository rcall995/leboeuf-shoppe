'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAnnouncement } from '@/app/actions/announcements';
import { AnnouncementForm } from './announcement-form';

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by_profile: { full_name: string } | null;
}

interface AnnouncementsListProps {
  announcements: Announcement[];
}

function getStatus(a: { published_at: string | null; expires_at: string | null }) {
  const now = new Date();
  if (!a.published_at) return 'draft';
  if (new Date(a.published_at) > now) return 'scheduled';
  if (a.expires_at && new Date(a.expires_at) < now) return 'expired';
  return 'active';
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired', label: 'Expired' },
];

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isPending, startTransition] = useTransition();

  const withStatus = announcements.map((a) => ({ ...a, status: getStatus(a) }));
  const filtered = filter === 'all' ? withStatus : withStatus.filter((a) => a.status === filter);

  const statusCounts: Record<string, number> = {};
  for (const a of withStatus) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }

  function handleEdit(a: Announcement) {
    setEditing(a);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditing(null);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAnnouncement(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Announcement deleted');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Announcement
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all' ? announcements.length : (statusCounts[tab.key] ?? 0);
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id} className="shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{a.title}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[a.status] ?? ''}`}>
                        {a.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {a.created_by_profile && <span>By {a.created_by_profile.full_name}</span>}
                      {a.published_at && (
                        <span>
                          Published {new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {a.expires_at && (
                        <span>
                          Expires {new Date(a.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {filter === 'all' ? 'No announcements yet' : `No ${filter} announcements`}
          </p>
        </div>
      )}

      <AnnouncementForm
        open={formOpen}
        onOpenChange={handleFormClose}
        announcement={editing}
      />
    </div>
  );
}
