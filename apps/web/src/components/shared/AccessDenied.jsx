import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AccessDenied({ title = 'Access denied', message, showHomeLink = true }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold font-heading text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {showHomeLink && (
        <Button asChild className="mt-6" variant="outline">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      )}
    </div>
  );
}
