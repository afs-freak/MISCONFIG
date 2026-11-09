import{afterAll,beforeAll,describe,it,expect}from'vitest';
import mongoose from'mongoose';

const enabled=process.env.RUN_MONGO_TESTS==='true';
describe.skipIf(!enabled)('MongoDB evidence CRUD integration',()=>{
 let ScanEvidence:any;
 beforeAll(async()=>{process.env.JWT_SECRET||='test-secret-that-is-at-least-thirty-two-characters';process.env.DATABASE_URL||='postgresql://misconfig:misconfig@localhost:5432/misconfig?schema=public';const db=await import('./index.js');ScanEvidence=db.ScanEvidence;await mongoose.connect(process.env.MONGODB_TEST_URI||'mongodb://localhost:27017/misconfig_test');});
 afterAll(async()=>{await ScanEvidence.deleteMany({scanId:'mongo-crud-test'});await mongoose.disconnect();});
 it('creates, reads, updates and deletes an evidence document',async()=>{
  await ScanEvidence.deleteMany({scanId:'mongo-crud-test'});
  await ScanEvidence.create({scanId:'mongo-crud-test',path:'fixture.yml',sha256:'test-only-hash',observations:[],reviewNote:''});
  expect(await ScanEvidence.findOne({scanId:'mongo-crud-test'}).then((x:{path?:string}|null)=>x?.path)).toBe('fixture.yml');
  await ScanEvidence.updateOne({scanId:'mongo-crud-test'},{$set:{reviewNote:'reviewed test fixture'}});
  expect(await ScanEvidence.findOne({scanId:'mongo-crud-test'}).then((x:{reviewNote?:string}|null)=>x?.reviewNote)).toBe('reviewed test fixture');
  await ScanEvidence.deleteMany({scanId:'mongo-crud-test'});
  expect(await ScanEvidence.countDocuments({scanId:'mongo-crud-test'})).toBe(0);
 });
});
