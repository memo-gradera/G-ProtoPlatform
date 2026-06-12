import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { User, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const categoryLabels = {
  ai_ml: 'AI / ML', automation: 'Automation', analytics: 'Analytics',
  ux: 'UX', infrastructure: 'Infrastructure', integration: 'Integration', other: 'Other'
};

export default function PrototypeCard({ prototype, onClick }) {
  return (
    <Card
      className="overflow-hidden border border-border/60 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => onClick(prototype)}
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {prototype.screenshot_url ? (
          <img
            src={prototype.screenshot_url}
            alt={prototype.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{prototype.name?.charAt(0)}</span>
            </div>
          </div>
        )}
        {prototype.demo_url && (
          <a
            href={prototype.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{prototype.name}</h3>
          <StatusBadge status={prototype.status} />
        </div>

        {prototype.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{prototype.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {prototype.category && (
            <Badge variant="secondary" className="text-[10px]">
              {categoryLabels[prototype.category] || prototype.category}
            </Badge>
          )}
          {prototype.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span>{prototype.owner}</span>
          </div>
          {prototype.created_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(prototype.created_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}