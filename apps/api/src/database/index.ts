import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { env } from '../config.js';
export const prisma = new PrismaClient();
const EvidenceSchema=new mongoose.Schema({scanId:{type:String,required:true,index:true},path:{type:String,required:true},sha256:{type:String,required:true},observations:{type:[mongoose.Schema.Types.Mixed],default:[]},reviewNote:{type:String,default:''}},{timestamps:true});
EvidenceSchema.index({scanId:1,path:1},{unique:true});
export const ScanEvidence=mongoose.models.ScanEvidence||mongoose.model('ScanEvidence',EvidenceSchema);
const ObservationSchema=new mongoose.Schema({scanId:{type:String,required:true,index:true},path:{type:String,required:true},ruleId:{type:String,required:true,index:true},severity:{type:String,required:true},line:{type:Number,default:null},redactedEvidence:{type:String,required:true}},{timestamps:true});
ObservationSchema.index({scanId:1,path:1,ruleId:1,line:1});
export const ConfigurationObservation=mongoose.models.ConfigurationObservation||mongoose.model('ConfigurationObservation',ObservationSchema);
const AIAnalysisMetadataSchema=new mongoose.Schema({scanId:{type:String,required:true,index:true},findingId:{type:String,required:true,index:true},provider:{type:String,required:true},promptVersion:{type:String,required:true},createdAt:{type:Date,default:Date.now}},{versionKey:false});
export const AIAnalysisMetadata=mongoose.models.AIAnalysisMetadata||mongoose.model('AIAnalysisMetadata',AIAnalysisMetadataSchema);
export async function connectMongo(){await mongoose.connect(env.MONGODB_URI);}
export async function deleteEvidence(scanId:string){await Promise.all([ScanEvidence.deleteMany({scanId}),ConfigurationObservation.deleteMany({scanId}),AIAnalysisMetadata.deleteMany({scanId})]);}
