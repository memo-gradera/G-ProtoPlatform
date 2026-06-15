import { ROLES } from '@/domain/rbac';

export const roleLabels = {
  admin: 'Admin',
  innovation_lead: 'Innovation Lead',
  developer: 'Developer',
  executive_reviewer: 'Executive Reviewer',
  viewer: 'Viewer',
};

export const roleBadgeColors = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  innovation_lead: 'bg-violet-50 text-violet-700 border-violet-200',
  developer: 'bg-blue-50 text-blue-700 border-blue-200',
  executive_reviewer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  viewer: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  suspended: 'Suspended',
};

export const statusBadgeColors = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-50 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
};

export const USER_ROLES = ROLES;

export function getRoleLabel(role) {
  return roleLabels[role] || role || 'Viewer';
}

export function getStatusLabel(status) {
  return statusLabels[status] || status || 'Unknown';
}
