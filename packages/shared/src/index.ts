export const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type Severity = typeof severities[number];
export const findingStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "ACCEPTED_RISK"] as const;
export type FindingStatus = typeof findingStatuses[number];
export interface ApiEnvelope<T> { data: T; }
export interface ScanSummary { id: string; projectId: string; status: string; createdAt: string; findingCount: number; }
