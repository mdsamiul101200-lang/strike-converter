import fs from 'node:fs/promises';
import path from 'node:path';
import {config} from '../config.js';
import {allJobs,updateJob,cleanupExpired} from '../services/jobs.js';
import {resolve} from '../services/registry.js';
import {validateOutput} from '../services/convert.js';
async function tick(){for(const job of allJobs()){if(job.status!=='QUEUED')continue;updateJob(job.id,{status:'PROCESSING',progress:null});try{const output=await resolve(job.inputFormat,job.outputFormat)({jobDir:job.jobDir,input:job.inputPath,base:job.base});const stat=await validateOutput(output,job.outputFormat);updateJob(job.id,{status:'COMPLETED',progress:1,outputPath:output,outputName:path.basename(output),outputSize:stat.size});}catch(e){updateJob(job.id,{status:'FAILED',error:mapError(e)});}}await cleanupExpired();}
function mapError(e){const m={INVALID_FILE:'INVALID FILE',FILE_TOO_LARGE:'FILE TOO LARGE',UNSAFE_ARCHIVE:'PROCESSING ERROR',NO_HTML_CONTENT:'PROCESSING ERROR',NO_RECOVERABLE_HTML:'PROCESSING ERROR',SAME_FORMAT:'PROCESSING ERROR',UNSUPPORTED_CONTENT:'PROCESSING ERROR',UNSUPPORTED_CONVERSION:'PROCESSING ERROR',OUTPUT_VALIDATION_FAILED:'OUTPUT VALIDATION FAILED',PROCESS_TIMEOUT:'PROCESSING ERROR'};return m[e.message]||'PROCESSING ERROR';}
setInterval(()=>tick().catch(()=>{}),config.workerPollMs);tick().catch(()=>{});
