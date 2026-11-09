import type {PrismaClient} from '@prisma/client';

export type ProjectSummary={id:string;name:string;scanCount:number;findingCount:number};
/** A single parameterized SQL JOIN query for project summaries. */
export function projectSummaryWithJoin(db:PrismaClient,projectId:string,userId:string){
 return db.$queryRaw<ProjectSummary[]>`
  SELECT p."id", p."name",
    COUNT(DISTINCT s."id")::int AS "scanCount",
    COUNT(DISTINCT f."id")::int AS "findingCount"
  FROM "Project" p
  LEFT JOIN "Scan" s ON s."projectId" = p."id"
  LEFT JOIN "Finding" f ON f."scanId" = s."id"
  WHERE p."id" = ${projectId} AND p."userId" = ${userId}
  GROUP BY p."id", p."name"
 `;
}
