import {describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {projectSummaryWithJoin} from './projects.repository.js';

describe.skipIf(process.env.RUN_DB_TESTS!=='true')('PostgreSQL project summary JOIN',()=>{
 it('counts related scans and findings through foreign key joins',async()=>{
  const db=new PrismaClient();
  const user=await db.user.create({data:{name:'JOIN test',email:`join-${Date.now()}@example.test`,passwordHash:'test-only'}});
  try{
   const project=await db.project.create({data:{name:'JOIN fixture',userId:user.id}});
   const scan=await db.scan.create({data:{projectId:project.id,status:'COMPLETED'}});
   await db.finding.create({data:{scanId:scan.id,ruleId:'TEST-001',title:'Test fixture',description:'Fixture only',severity:'LOW',filePath:'fixture.yml',line:1,evidence:'redacted fixture',explanation:'test',remediation:'delete fixture',confidence:'test'}});
   await expect(projectSummaryWithJoin(db,project.id,user.id)).resolves.toEqual([{id:project.id,name:'JOIN fixture',scanCount:1,findingCount:1}]);
   await expect(projectSummaryWithJoin(db,project.id,'different-user')).resolves.toEqual([]);
  }finally{await db.user.delete({where:{id:user.id}});await db.$disconnect();}
 });
});
