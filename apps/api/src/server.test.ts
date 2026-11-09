import {describe,it,expect} from 'vitest';
import request from 'supertest';
import AdmZip from 'adm-zip';

process.env.NODE_ENV='test';
process.env.JWT_SECRET='test-secret-that-is-at-least-thirty-two-characters';
process.env.DATABASE_URL='postgresql://misconfig:misconfig@localhost:5432/misconfig?schema=public';
const {app,filesFromRequest}=await import('./server.js');

describe('HTTP boundary',()=>{
 it('returns a JSON health envelope',async()=>{const response=await request(app).get('/api/health');expect(response.status).toBe(200);expect(response.body.data.status).toBe('ok');});
 it('requires a bearer token for protected project resources',async()=>{const response=await request(app).get('/api/projects');expect(response.status).toBe(401);expect(response.body.error.message).toMatch(/authentication/i);});
 it('returns 400 for malformed registration input before database access',async()=>{const response=await request(app).post('/api/auth/register').send({email:'not-an-email',password:'short'});expect(response.status).toBe(400);expect(response.body.error.message).toBe('Request validation failed');});
 it('rejects unsupported upload types safely',()=>{expect(()=>filesFromRequest({files:[{originalname:'private.env',buffer:Buffer.from('SECRET=value')}] } as any)).toThrow('No supported files');});
 it('rejects ZIP traversal entries',()=>{const zip=new AdmZip();zip.addFile('C:/docker-compose.yml',Buffer.from('services: {}'));expect(()=>filesFromRequest({files:[{originalname:'unsafe.zip',buffer:zip.toBuffer()}]} as any)).toThrow('unsafe path');});
 it('rejects an extracted ZIP file over the configured per-entry bound',()=>{const zip=new AdmZip();zip.addFile('compose.yml',Buffer.alloc(2*1024*1024+1,65));expect(()=>filesFromRequest({files:[{originalname:'large.zip',buffer:zip.toBuffer()}]} as any)).toThrow('exceeds 2 MB');});
});
