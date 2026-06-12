import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { cn } from '@/lib/utils';

const columnMeta = {
  ideas: { label: 'Ideas', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500' },
  ready_4_demo: { label: 'Ready 4 Demo', color: 'bg-violet-500' },
  blocked: { label: 'Blocked', color: 'bg-red-500' },
  approved: { label: 'Approved', color: 'bg-emerald-500' },
  rejected: { label: 'Rejected', color: 'bg-slate-400' },
};

export default function KanbanColumn({ columnId, ideas, onCardClick, isDragDisabled }) {
  const meta = columnMeta[columnId] || { label: columnId, color: 'bg-slate-400' };

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className={cn("w-2.5 h-2.5 rounded-full", meta.color)} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {ideas.length}
        </span>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2.5 min-h-[200px] p-2 rounded-xl transition-colors duration-200",
              snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/40"
            )}
          >
            {ideas.map((idea, index) => (
              <Draggable
                key={idea.id}
                draggableId={idea.id}
                index={index}
                isDragDisabled={isDragDisabled?.(idea) ?? false}
              >
                {(provided, snapshot) => (
                  <KanbanCard
                    idea={idea}
                    onClick={onCardClick}
                    provided={provided}
                    isDragging={snapshot.isDragging}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}