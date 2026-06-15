export type AppRole =
  | "admin"
  | "innovation_lead"
  | "developer"
  | "executive_reviewer"
  | "viewer";

export type IdeaStatus =
  | "ideas"
  | "in_progress"
  | "ready_for_demo"
  | "approved"
  | "blocked"
  | "rejected";

export type PrototypeStatus =
  | "draft"
  | "attached"
  | "published"
  | "archived"
  | "in_production";

export type ReviewDecision = "pending" | "approved" | "rejected";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  priority: number;
  ownerId: string;
  assigneeId: string | null;
  innovationTheme: string | null;
  blockedAt: string | null;
  blockedReason: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Prototype {
  id: string;
  ideaId: string;
  name: string;
  summary: string | null;
  demoUrl: string | null;
  repoUrl: string | null;
  status: PrototypeStatus;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  prototypeId: string;
  reviewerId: string;
  decision: ReviewDecision;
  rejectionReasonId: string | null;
  rejectionNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface DashboardKpis {
  ideasCount: number;
  inProgressCount: number;
  readyCount: number;
  approvedCount: number;
  blockedCount: number;
  avgDaysToApprove: number | null;
}

export type DomainErrorCode =
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "REJECTION_REASON_REQUIRED"
  | "PROTOTYPE_NOT_READY";

export interface DomainError {
  code: DomainErrorCode;
  message: string;
}
