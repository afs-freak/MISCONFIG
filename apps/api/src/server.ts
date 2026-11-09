import express,{NextFunction,Request,Response} from 'express';
import {Readable} from 'node:stream';
import helmet from 'helmet';import cors from 'cors';import rateLimit from 'express-rate-limit';import multer from 'multer';import AdmZip from 'adm-zip';import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';import yaml from 'js-yaml';import {z,ZodError} from 'zod';import crypto from 'node:crypto';
import {env} from './config.js';import {connectMongo,deleteEvidence,prisma,ScanEvidence,ConfigurationObservation,AIAnalysisMetadata} from './database/index.js';import {correlate,redact,scanFiles,InputFile} from './scanner/engine.js';import {projectSummaryWithJoin} from './modules/projects.repository.js';import {requestAdvice} from './providers/ai.js';
const app=express();app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:env.WEB_ORIGIN,credentials:true}));app.use(express.json({limit:'1mb'}));app.use('/api',rateLimit({windowMs:60_000,limit:120,standardHeaders:true,legacyHeaders:false}));
type AuthRequest=Request&{userId?:string};
function auth(req:AuthRequest,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({error:{message:'Authentication required'}});try{const p=jwt.verify(h.slice(7),env.JWT_SECRET) as {sub:string};req.userId=p.sub;next();}catch{return res.status(401).json({error:{message:'Session expired or invalid'}});}}
const asyncRoute=(fn:(req:AuthRequest,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req as AuthRequest,res)).catch(next);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:env.MAX_UPLOAD_MB*1024*1024,files:25}});
const wrap=<T>(data:T)=>({data});
app.get('/api/health',(_req,res)=>res.json(wrap({status:'ok'})));

app.post('/api/auth/register',asyncRoute(async(req,res)=>{
  const b=z.object({
    name:z.string().trim().min(2).max(80),
    email:z.string().email().max(254),
    password:z.string().min(10).max(128)
  }).parse(req.body);

  const email=b.email.toLowerCase();

  if(await prisma.user.findUnique({where:{email}}))
    return res.status(409).json({
      error:{message:'An account with this email already exists'}
    });

  const user=await prisma.user.create({
    data:{
      name:b.name,
      email,
      passwordHash:await bcrypt.hash(b.password,12)
    }
  });

  const token=jwt.sign(
    {sub:user.id},
    env.JWT_SECRET,
    {expiresIn:'8h'}
  );

  res.status(201).json(wrap({
    token,
    user:{
      id:user.id,
      name:user.name,
      email:user.email
    }
  }));
}));

app.post('/api/auth/login',asyncRoute(async(req,res)=>{const b=z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);const user=await prisma.user.findUnique({where:{email:b.email.toLowerCase()}});if(!user||!await bcrypt.compare(b.password,user.passwordHash))return res.status(401).json({error:{message:'Email or password is incorrect'}});res.json(wrap({token:jwt.sign({sub:user.id},env.JWT_SECRET,{expiresIn:'8h'}),user:{id:user.id,name:user.name,email:user.email}}));}));
app.get('/api/auth/me',auth,asyncRoute(async(req,res)=>{const user=await prisma.user.findUnique({where:{id:req.userId},select:{id:true,name:true,email:true}});if(!user)return res.status(401).json({error:{message:'Account no longer exists'}});res.json(wrap(user));}));
app.use('/api',auth);
app.get('/api/dashboard',asyncRoute(async(req,res)=>{const [projects,scans,findings,scenarios,recent]=await Promise.all([prisma.project.count({where:{userId:req.userId}}),prisma.scan.count({where:{project:{userId:req.userId}}}),prisma.finding.findMany({where:{scan:{project:{userId:req.userId}},status:{in:['OPEN','IN_PROGRESS']}},select:{severity:true}}),prisma.riskScenario.count({where:{scan:{project:{userId:req.userId}}}}),prisma.scan.findMany({where:{project:{userId:req.userId}},include:{project:{select:{name:true}},_count:{select:{findings:true,scenarios:true}}},orderBy:{createdAt:'desc'},take:6})]);res.json(wrap({projects,scans,openFindings:findings.length,critical:findings.filter(x=>x.severity==='CRITICAL').length,high:findings.filter(x=>x.severity==='HIGH').length,scenarios,severity:Object.fromEntries(['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(s=>[s,findings.filter(f=>f.severity===s).length])),recent}));}));
app.get('/api/projects',asyncRoute(async(req,res)=>res.json(wrap(await prisma.project.findMany({where:{userId:req.userId},include:{scans:{include:{findings:true,_count:{select:{findings:true,scenarios:true}}},orderBy:{createdAt:'desc'}},_count:{select:{scans:true}}},orderBy:{updatedAt:'desc'}})))));
app.post('/api/projects',asyncRoute(async(req,res)=>{const b=z.object({name:z.string().trim().min(1).max(100),description:z.string().max(500).optional()}).parse(req.body);res.status(201).json(wrap(await prisma.project.create({data:{...b,userId:req.userId!}})));}));
app.get('/api/projects/:projectId',asyncRoute(async(req,res)=>{const p=await prisma.project.findFirst({where:{id:req.params.projectId,userId:req.userId},include:{scans:{include:{_count:{select:{findings:true,scenarios:true}}},orderBy:{createdAt:'desc'}}}});if(!p)return res.status(404).json({error:{message:'Project not found'}});res.json(wrap(p));}));
app.get('/api/projects/:projectId/summary',asyncRoute(async(req,res)=>{const rows=await projectSummaryWithJoin(prisma,req.params.projectId,req.userId!);if(!rows.length)return res.status(404).json({error:{message:'Project not found'}});res.json(wrap(rows[0]));}));
app.patch('/api/projects/:projectId',asyncRoute(async(req,res)=>{const b=z.object({name:z.string().trim().min(1).max(100).optional(),description:z.string().max(500).optional()}).parse(req.body);const found=await prisma.project.findFirst({where:{id:req.params.projectId,userId:req.userId}});if(!found)return res.status(404).json({error:{message:'Project not found'}});res.json(wrap(await prisma.project.update({where:{id:found.id},data:b})));}));
app.delete('/api/projects/:projectId',asyncRoute(async(req,res)=>{const p=await prisma.project.findFirst({where:{id:req.params.projectId,userId:req.userId}});if(!p)return res.status(404).json({error:{message:'Project not found'}});const ids=await prisma.scan.findMany({where:{projectId:p.id},select:{id:true}});for(const s of ids)await deleteEvidence(s.id);await prisma.project.delete({where:{id:p.id}});res.status(204).end();}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const b = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
  }).parse(req.body);

  const email = b.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({
      error: { message: 'An account with this email already exists' },
    });
  }

  const passwordHash = await bcrypt.hash(b.password, 12);

  const user = await prisma.user.create({
    data: {
      name: b.name,
      email,
      passwordHash,
    },
  });

  const token = jwt.sign(
    { sub: user.id },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.status(201).json(wrap({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  }));
}));
function allowedFile(filePath: string): boolean {
  const name = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';

  return (
    name === 'dockerfile' ||
    name.endsWith('.dockerfile') ||
    name.endsWith('.yml') ||
    name.endsWith('.yaml') ||
    name.endsWith('.json') ||
    name.endsWith('.conf') ||
    name.endsWith('.config') ||
    name.endsWith('.tf') ||
    name === '.env.example'
  );
}
export function filesFromRequest(req:Request):InputFile[]{const all=(req.files as Express.Multer.File[]|undefined)||[];if(!all.length)throw Object.assign(new Error('Upload at least one supported configuration file.'),{status:422});const files:InputFile[]=[];for(const f of all){if(f.originalname.toLowerCase().endsWith('.zip')){const zip=new AdmZip(f.buffer);const entries=zip.getEntries().filter(e=>!e.isDirectory);if(entries.length>100)throw Object.assign(new Error('Archive contains more than 100 files.'),{status:422});let total=0;for(const e of entries){const name=e.entryName.replace(/\\/g,'/');if(name.startsWith('/')||/^[a-z]:/i.test(name)||name.includes(String.fromCharCode(0))||name.split('/').includes('..'))throw Object.assign(new Error('Archive contains an unsafe path.'),{status:422});if(name.split('/').length>8)throw Object.assign(new Error('Archive nesting exceeds the limit.'),{status:422});total+=e.header.size;if(total>20*1024*1024)throw Object.assign(new Error('Expanded archive exceeds 20 MB.'),{status:413});if(allowedFile(name)){if(e.header.size>2*1024*1024)throw Object.assign(new Error('A file in the archive exceeds 2 MB.'),{status:413});files.push({path:name,content:e.getData().toString('utf8')});}}}else if(allowedFile(f.originalname)){files.push({path:f.originalname.replace(/\\/g,'/').split('/').pop()!,content:f.buffer.toString('utf8')});}}
 if(!files.length)throw Object.assign(new Error('No supported files found. Upload Docker, YAML, JSON, Nginx, Terraform, or .env.example configuration.'),{status:422});if(files.length>100)throw Object.assign(new Error('Scan contains more than 100 supported files.'),{status:422});if(new Set(files.map(f=>f.path)).size!==files.length)throw Object.assign(new Error('The upload contains duplicate file paths.'),{status:422});for(const f of files){if(f.content.includes('\0'))throw Object.assign(new Error(`File ${f.path} is not text.`),{status:422});if(/\.(?:ya?ml)$/i.test(f.path)){try{yaml.load(f.content);}catch{throw Object.assign(new Error(`Invalid YAML in ${f.path}.`),{status:422});}}if(/\.json$/i.test(f.path)){try{JSON.parse(f.content);}catch{throw Object.assign(new Error(`Invalid JSON in ${f.path}.`),{status:422});}}}return files;}
app.post('/api/projects/:projectId/scans',upload.array('files',25),asyncRoute(async(req,res)=>{
 const project=await prisma.project.findFirst({where:{id:req.params.projectId,userId:req.userId}});
 if(!project)return res.status(404).json({error:{message:'Project not found'}});
 const files=filesFromRequest(req);
 const scan=await prisma.scan.create({data:{projectId:project.id,status:'RUNNING',files:{create:files.map(f=>({path:f.path}))}}});
 try{
  const result=scanFiles(files),scenarios=correlate(result.findings);
  await prisma.$transaction(async tx=>{
   for(const f of result.findings)await tx.finding.create({data:{...f,scanId:scan.id}});
   for(const s of scenarios){
    const connected=await Promise.all(s.findingIndexes.map(i=>{const f=result.findings[i];return tx.finding.findFirstOrThrow({where:{scanId:scan.id,ruleId:f.ruleId,filePath:f.filePath,line:f.line}});}));
    await tx.riskScenario.create({data:{scanId:scan.id,ruleId:s.ruleId,name:s.name,severity:s.severity,explanation:s.explanation,impact:s.impact,remediation:s.remediation,findings:{create:connected.map(f=>({findingId:f.id}))}}});
   }
  });
  try{await ScanEvidence.insertMany(result.evidence.map(e=>({scanId:scan.id,path:e.path,sha256:e.sha256,observations:e.observations.map(o=>({...o,evidence:redact(o.evidence)}))})),{ordered:true});await ConfigurationObservation.insertMany(result.findings.map(o=>({scanId:scan.id,path:o.filePath,ruleId:o.ruleId,severity:o.severity,line:o.line,redactedEvidence:redact(o.evidence)})),{ordered:false});}
  catch{try{await deleteEvidence(scan.id);}catch{}await prisma.scan.delete({where:{id:scan.id}});throw new Error('Evidence store is unavailable; scan was rolled back. Retry after MongoDB is available.');}
  await prisma.scan.update({where:{id:scan.id},data:{status:'COMPLETED',completedAt:new Date()}});
  const saved=await prisma.scan.findUnique({where:{id:scan.id},include:{findings:true,scenarios:{include:{findings:{include:{finding:true}}}}}});
  res.status(201).json(wrap(saved));
 }catch(err){try{await deleteEvidence(scan.id);}catch{}await prisma.scan.updateMany({where:{id:scan.id},data:{status:'FAILED',error:'Scan persistence failed'}});throw err;}
}));
app.get('/api/projects/:projectId/scans',asyncRoute(async(req,res)=>{const project=await prisma.project.findFirst({where:{id:req.params.projectId,userId:req.userId}});if(!project)return res.status(404).json({error:{message:'Project not found'}});res.json(wrap(await prisma.scan.findMany({where:{projectId:project.id},include:{findings:true,_count:{select:{findings:true,scenarios:true}}},orderBy:{createdAt:'desc'}})));}));
async function ownedScan(id:string,userId:string){return prisma.scan.findFirst({where:{id,project:{userId}}});}
app.get('/api/scans/:scanId',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});res.json(wrap(await prisma.scan.findUnique({where:{id:req.params.scanId},include:{project:{select:{id:true,name:true}},findings:true,scenarios:{include:{findings:{include:{finding:true}}}},reports:true}})));}));
app.get('/api/scans/:scanId/findings',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});res.json(wrap(await prisma.finding.findMany({where:{scanId:req.params.scanId},orderBy:[{severity:'asc'},{createdAt:'asc'}]})));}));
app.get('/api/findings/:findingId',asyncRoute(async(req,res)=>{const f=await prisma.finding.findFirst({where:{id:req.params.findingId,scan:{project:{userId:req.userId}}},include:{scan:{select:{id:true,projectId:true}},remediationRecords:{orderBy:{createdAt:'desc'}}}});if(!f)return res.status(404).json({error:{message:'Finding not found'}});res.json(wrap(f));}));
app.patch('/api/findings/:findingId/status',asyncRoute(async(req,res)=>{const b=z.object({status:z.enum(['OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_RISK']),note:z.string().max(500).optional()}).parse(req.body);const f=await prisma.finding.findFirst({where:{id:req.params.findingId,scan:{project:{userId:req.userId}}}});if(!f)return res.status(404).json({error:{message:'Finding not found'}});const result=await prisma.$transaction(async tx=>{await tx.finding.update({where:{id:f.id},data:{status:b.status}});await tx.remediationRecord.create({data:{findingId:f.id,fromStatus:f.status,toStatus:b.status,note:b.note}});return tx.finding.findUniqueOrThrow({where:{id:f.id},include:{remediationRecords:{orderBy:{createdAt:'desc'}}}});});res.json(wrap(result));}));
app.get('/api/scans/:scanId/scenarios',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});res.json(wrap(await prisma.riskScenario.findMany({where:{scanId:req.params.scanId},include:{findings:{include:{finding:true}}}})));}));
app.get('/api/scans/:scanId/evidence',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});res.json(wrap(await ScanEvidence.find({scanId:req.params.scanId},{_id:0,__v:0}).lean()));}));
app.patch('/api/scans/:scanId/evidence/:path',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});const b=z.object({reviewNote:z.string().max(500)}).parse(req.body);const updated=await ScanEvidence.findOneAndUpdate({scanId:req.params.scanId,path:decodeURIComponent(req.params.path)},{$set:{reviewNote:b.reviewNote}},{new:true,projection:{_id:0,__v:0}}).lean();if(!updated)return res.status(404).json({error:{message:'Evidence not found'}});res.json(wrap(updated));}));
app.get('/api/scenarios/:scenarioId',asyncRoute(async(req,res)=>{const s=await prisma.riskScenario.findFirst({where:{id:req.params.scenarioId,scan:{project:{userId:req.userId}}},include:{findings:{include:{finding:true}},scan:{select:{id:true}}}});if(!s)return res.status(404).json({error:{message:'Scenario not found'}});res.json(wrap(s));}));
function safeSummary(f:{ruleId:string;title:string;severity:string;filePath:string;line:number|null;evidence:string;remediation:string}){return {ruleId:f.ruleId,title:f.title,severity:f.severity,filePath:f.filePath,line:f.line,evidence:redact(f.evidence),remediation:f.remediation};}
const aiHandler=async(req:AuthRequest,res:Response)=>{const b=z.object({findingId:z.string().min(1)}).parse(req.body);const f=await prisma.finding.findFirst({where:{id:b.findingId,scan:{project:{userId:req.userId}}}});if(!f)return res.status(404).json({error:{message:'Finding not found'}});const key=env.AI_PROVIDER==='openai'?env.OPENAI_API_KEY:env.GEMINI_API_KEY;if(!key)return res.status(503).json({error:{message:`AI is not configured. Set ${env.AI_PROVIDER==='openai'?'OPENAI_API_KEY':'GEMINI_API_KEY'} on the server.`}});let parsed:Awaited<ReturnType<typeof requestAdvice>>;console.log('AI REQUEST DEBUG:', { provider: env.AI_PROVIDER, findingId: f.id, promptData: safeSummary(f) });
try{parsed=await requestAdvice(env.AI_PROVIDER,key,safeSummary(f));}catch(error){console.error('AI PROVIDER DEBUG:', error); const providerStatus=typeof error==='object'&&error!==null&&'status'in error?Number((error as {status:unknown}).status):0;if(providerStatus===429)return res.status(429).json({error:{message:'AI provider rate limit reached. Try again shortly.'}});if(error instanceof Error&&error.message.includes('timed out'))return res.status(504).json({error:{message:'AI provider timed out. Try again shortly.'}});return res.status(502).json({error:{message:'AI provider request failed. Check server configuration and try again.'}});}await AIAnalysisMetadata.create({scanId:f.scanId,findingId:f.id,provider:env.AI_PROVIDER,promptVersion:'v1'});res.json(wrap({...parsed,advisory:true,provider:env.AI_PROVIDER}));};app.post('/api/ai/explain',asyncRoute(aiHandler));
app.post('/api/ai/remediate',asyncRoute(aiHandler));
app.get('/api/scans/:scanId/reports',asyncRoute(async(req,res)=>{if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});res.json(wrap(await prisma.report.findMany({where:{scanId:req.params.scanId},orderBy:{createdAt:'desc'}})));}));
app.post('/api/scans/:scanId/reports',asyncRoute(async(req,res)=>{const b=z.object({format:z.enum(['json','html'])}).parse(req.body);if(!await ownedScan(req.params.scanId,req.userId!))return res.status(404).json({error:{message:'Scan not found'}});const report=await prisma.report.create({data:{scanId:req.params.scanId,format:b.format}});res.status(201).json(wrap(report));}));
app.get('/api/reports/:reportId',asyncRoute(async(req,res)=>{const r=await prisma.report.findFirst({where:{id:req.params.reportId,scan:{project:{userId:req.userId}}},include:{scan:{include:{project:true,findings:true,scenarios:{include:{findings:{include:{finding:true}}}}}}}});if(!r)return res.status(404).json({error:{message:'Report not found'}});res.json(wrap(r));}));
app.get('/api/reports/:reportId/download',asyncRoute(async(req,res)=>{const r=await prisma.report.findFirst({where:{id:req.params.reportId,scan:{project:{userId:req.userId}}},include:{scan:{include:{project:true,findings:true,scenarios:{include:{findings:{include:{finding:true}}}}}}}});if(!r)return res.status(404).json({error:{message:'Report not found'}});const data={reportId:r.id,generatedAt:r.createdAt,project:r.scan.project.name,scanId:r.scanId,findings:r.scan.findings.map(safeSummary),scenarios:r.scan.scenarios};if(r.format==='json'){res.type('application/json').attachment(`misconfig-${r.scanId}.json`).send(JSON.stringify(data,null,2));}else{const html=`<!doctype html><meta charset="utf-8"><title>MISCONFIG report</title><style>body{font:16px system-ui;max-width:900px;margin:3rem auto;color:#17242c}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ddd;text-align:left}</style><h1>MISCONFIG Security Report</h1><p>${escapeHtml(r.scan.project.name)} · ${r.scanId}</p><h2>Findings</h2><table><tr><th>Severity</th><th>Finding</th><th>Location</th><th>Remediation</th></tr>${data.findings.map(f=>`<tr><td>${f.severity}</td><td>${escapeHtml(f.title)}</td><td>${escapeHtml(f.filePath)}:${f.line??'?'}</td><td>${escapeHtml(f.remediation)}</td></tr>`).join('')}</table><h2>Risk scenarios</h2>${data.scenarios.map(s=>`<h3>${escapeHtml(s.name)} (${s.severity})</h3><p>${escapeHtml(s.impact)}</p><p>${escapeHtml(s.remediation)}</p>`).join('')}</html>`;res.type('text/html').attachment(`misconfig-${r.scanId}.html`);Readable.from([html]).on('error',e=>res.destroy(e)).pipe(res);}}));
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
app.get('/api/settings',auth,(_req,res)=>res.json(wrap({aiProvider:env.AI_PROVIDER,aiConfigured:env.AI_PROVIDER==='openai'?Boolean(env.OPENAI_API_KEY):Boolean(env.GEMINI_API_KEY),security:{sessionHours:8,uploadLimitMb:env.MAX_UPLOAD_MB}})));
app.patch('/api/settings/profile',auth,asyncRoute(async(req,res)=>{const b=z.object({name:z.string().trim().min(2).max(80).optional(),email:z.string().email().max(254).optional()}).refine(v=>Object.keys(v).length>0).parse(req.body);if(b.email){const existing=await prisma.user.findUnique({where:{email:b.email.toLowerCase()}});if(existing&&existing.id!==req.userId)return res.status(409).json({error:{message:'That email is already in use'}});}const user=await prisma.user.update({where:{id:req.userId},data:{...b,email:b.email?.toLowerCase()},select:{id:true,name:true,email:true}});res.json(wrap(user));}));
app.use((err:Error&{status?:number},_req:Request,res:Response,_next:NextFunction)=>{if(err instanceof ZodError)return res.status(400).json({error:{message:'Request validation failed',details:err.issues.map(x=>({path:x.path.join('.'),message:x.message}))}});if(err instanceof multer.MulterError)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:{message:err.message}});const status=err.status||500;res.status(status).json({error:{message:status===500?'Unexpected server error':err.message}});if(status===500)console.error('Request failed:',err.message);});
export {app};
if(process.env.NODE_ENV!=='test'){connectMongo().then(()=>app.listen(env.PORT,()=>console.log(`MISCONFIG API listening on ${env.PORT}`))).catch(e=>{console.error('Database startup failed',e);process.exit(1);});}
