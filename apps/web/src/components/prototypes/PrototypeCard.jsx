import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getPrototypeOwnerLabel } from '@/services/apiMappers';
import { getPrototypeCoverState } from '@/lib/prototypeScreenshots';
import {
  getPrimaryVideoUrl,
  getPrototypeCategoryLabel,
} from '@/lib/prototypeMetadata';
import { User, ExternalLink, Calendar, Github, Video } from 'lucide-react';
import { format } from 'date-fns';

export default function PrototypeCard({ prototype, onClick }) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const cover = getPrototypeCoverState(prototype, imageLoadFailed);
  const primaryVideoUrl = getPrimaryVideoUrl(prototype);

  return (
    <Card
      className="overflow-hidden border border-border/60 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => onClick(prototype)}
    >
      <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
        {cover.showImage ? (
          <img
            src={cover.screenshotUrl}
            alt={prototype.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{cover.fallbackInitial}</span>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {prototype.github_repo_url && (
            <a
              href={prototype.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center"
              onClick={e => e.stopPropagation()}
              aria-label="Open GitHub repository"
            >
              <Github className="w-3.5 h-3.5 text-primary" />
            </a>
          )}
          {primaryVideoUrl && (
            <a
              href={primaryVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center"
              onClick={e => e.stopPropagation()}
              aria-label="Open demo video"
            >
              <Video className="w-3.5 h-3.5 text-primary" />
            </a>
          )}
          {prototype.demo_url && (
            <a
              href={prototype.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center"
              onClick={e => e.stopPropagation()}
              aria-label="Open demo URL"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
            </a>
          )}
        </div>
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
              {getPrototypeCategoryLabel(prototype.category)}
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
            <span>{getPrototypeOwnerLabel(prototype)}</span>
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
