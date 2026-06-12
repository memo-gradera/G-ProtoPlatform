import React from 'react';
import { Card } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { User, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function KanbanCard({ idea, onClick, provided, isDragging }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onClick(idea)}
      style={{
        ...provided.draggableProps.style,
        opacity: isDragging ? 0.9 : provided.draggableProps.style?.opacity,
      }}
    >
      <Card className="p-3.5 cursor-pointer hover:shadow-md transition-all duration-200 border border-border/60 bg-card group">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {idea.solution_name}
          </h4>
          <PriorityBadge priority={idea.priority} />
        </div>

        {idea.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {idea.short_description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{idea.owner}</span>
          </div>
          <div className="flex items-center gap-2">
            {idea.eta && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(idea.eta), 'MMM d')}</span>
              </div>
            )}
            {idea.prototype_url && (
              <ExternalLink className="w-3 h-3 text-primary" />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}