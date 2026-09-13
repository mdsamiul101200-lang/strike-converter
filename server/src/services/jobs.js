import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {config} from '../config.js';
import {ensureDir} from '../utils/fs.js';
const jobs=new Map();
export async function initJobs(){await ensureDir(config.storageDir);}
export function createJob(data){const id=randomUUID();const job={id,status:'QUEUED',createdAt:Date.now(),updatedAt:Date.now(),progress:null,error:null,...data};jobs.set(id,job);return job;}
export function getJob(id){return jobs.get(id);}
export function updateJob(id,patch){const j=jobs.get(id);if(!j)return null;Object.assign(j,patch,{updatedAt:Date.now()});return j;}
export function allJobs(){return [...jobs.values()];}
export async function persistUpload(jobId,buffer,filename){const dir=path.join(config.storageDir,jobId);await ensureDir(dir);const input=path.join(dir,filename);await fs.writeFile(input,buffer);return input;}
export async function cleanupExpired(){const now=Date.now(),ttl=config.ttlHours*3600000;for(const [id,j] of jobs){if(now-j.updatedAt>ttl){await fs.rm(path.join(config.storageDir,id),{recursive:true,force:true});jobs.delete(id);}}}
