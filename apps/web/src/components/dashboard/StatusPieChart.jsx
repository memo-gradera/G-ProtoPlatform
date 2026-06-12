import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  ideas: '#3b82f6',
  in_progress: '#f59e0b',
  ready_4_demo: '#8b5cf6',
  blocked: '#ef4444',
  approved: '#10b981',
  rejected: '#64748b',
};

const LABELS = {
  ideas: 'Ideas',
  in_progress: 'In Progress',
  ready_4_demo: 'Ready 4 Demo',
  blocked: 'Blocked',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function StatusPieChart({ ideas }) {
  const statusCount = {};
  ideas.forEach(i => {
    statusCount[i.status] = (statusCount[i.status] || 0) + 1;
  });
  const data = Object.entries(statusCount).map(([status, count]) => ({
    name: LABELS[status] || status,
    value: count,
    color: COLORS[status] || '#94a3b8'
  }));

  if (data.length === 0) {
    return (
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No ideas yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}