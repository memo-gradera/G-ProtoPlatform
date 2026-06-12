import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function RejectionChart({ ideas }) {
  const rejected = ideas.filter(i => i.status === 'rejected');
  const reasonMap = {};
  rejected.forEach(i => {
    const reason = i.rejection_reason || 'No reason given';
    reasonMap[reason] = (reasonMap[reason] || 0) + 1;
  });
  const data = Object.entries(reasonMap).map(([reason, count]) => ({
    reason: reason.length > 25 ? reason.slice(0, 25) + '…' : reason,
    count
  }));

  if (data.length === 0) {
    return (
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rejection Reasons</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No rejections yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Rejection Reasons</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(252 60% 52%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}