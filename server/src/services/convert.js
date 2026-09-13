import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import AdmZip from 'adm-zip';
import archiver from 'archiver';
import {run} from '../utils/process.js';
import {ensureDir,removeDir} from '../utils/fs.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const androidTemplate=path.join(root,'android-template');
function outPath(ctx,ext){return path.join(ctx.jobDir,`${ctx.base}.${ext}`);}
async function zipDir(src,dest){await new Promise((res,rej)=>{const o=archiver('zip',{zlib:{level:9}}),s=createWriteStream(dest);o.on('error',rej);s.on('close',res);o.pipe(s);o.directory(src,false);o.finalize();});}
function zipEntriesSafe(zip){for(const e of zip.getEntries()){const n=e.entryName.replaceAll('\\','/');if(n.startsWith('/')||n.split('/').includes('..'))throw new Error('UNSAFE_ARCHIVE');}}
async function extractZipSafe(file,dest){const zip=new AdmZip(file);zipEntriesSafe(zip);await ensureDir(dest);for(const e of zip.getEntries()){const n=e.entryName.replaceAll('\\','/');if(e.isDirectory)continue;const target=path.resolve(dest,n);if(!target.startsWith(path.resolve(dest)+path.sep))throw new Error('UNSAFE_ARCHIVE');await ensureDir(path.dirname(target));await fs.writeFile(target,e.getData());}return zip;}
async function validPdf(p){const b=await fs.readFile(p);return b.subarray(0,5).toString()==='%PDF-'&&b.length>100;}
async function validZip(p){try{const z=new AdmZip(p);z.getEntries();return (await fs.stat(p)).size>22;}catch{return false;}}
async function validDocx(p){try{const z=new AdmZip(p);return !!z.getEntry('[Content_Types].xml')&&!!z.getEntry('word/document.xml');}catch{return false;}}
async function validApk(p){try{const z=new AdmZip(p);return !!z.getEntry('AndroidManifest.xml')&&!!z.getEntry('resources.arsc');}catch{return false;}}
async function validHtml(p){const s=await fs.readFile(p,'utf8');return /<html\b|<!doctype\s+html/i.test(s);}
async function txtFromPdf(input,output){await run('pdftotext',[input,output],{timeout:120000});}
async function pdfFromHtml(input,output){await run('chromium',['--headless','--no-sandbox','--disable-gpu',`--print-to-pdf=${output}`,`file://${input}`],{timeout:120000});}
async function pdfFromDocx(input,output,work){await run('libreoffice',['--headless','--convert-to','pdf','--outdir',work,input],{timeout:120000});const generated=path.join(work,path.basename(input).replace(/\.docx$/i,'.pdf'));await fs.rename(generated,output);}
async function docxFromText(input,output){const py=`from docx import Document\nd=Document();\nfor line in open(r'''${input.replaceAll('\\','/') }''',encoding='utf-8',errors='replace'):\n d.add_paragraph(line.rstrip('\\n'))\nd.save(r'''${output.replaceAll('\\','/')}''')`;await run('python3',['-c',py],{timeout:120000});}
async function docxFromHtml(input,output){await run('pandoc',[input,'-o',output],{timeout:120000});}
async function textFromDocx(input,output){await run('pandoc',[input,'-t','plain','-o',output],{timeout:120000});}
async function htmlFromPdf(input,output){await run('pdftohtml',['-s','-noframes',input,output],{timeout:120000});}
async function htmlFromDocx(input,output){await run('pandoc',[input,'-t','html','-o',output],{timeout:120000});}
async function htmlFromZip(input,output){const d=path.join(ctxTemp(),'ziphtml-'+Date.now());await extractZipSafe(input,d);const candidates=['index.html','index.htm'];let found=null;for(const c of candidates){const p=path.join(d,c);if(await exists(p)){found=p;break;}}if(!found)throw new Error('NO_HTML_CONTENT');await fs.copyFile(found,output);await removeDir(d);}
function ctxTemp(){return os.tmpdir();}
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function buildApkFromWeb(inputDirOrHtml,output,ctx){const build=path.join(ctx.jobDir,'android-project');await fs.cp(androidTemplate,build,{recursive:true});const assets=path.join(build,'app/src/main/assets');await ensureDir(assets);if((await fs.stat(inputDirOrHtml)).isDirectory()){await fs.cp(inputDirOrHtml,assets,{recursive:true});}else await fs.copyFile(inputDirOrHtml,path.join(assets,'index.html'));
 await run('gradle',['--no-daemon','assembleDebug'],{cwd:build,timeout:600000,env:{...process.env,GRADLE_USER_HOME:path.join(ctx.jobDir,'.gradle'),ANDROID_SDK_ROOT:process.env.ANDROID_SDK_ROOT||'/opt/android-sdk'}});const apk=path.join(build,'app/build/outputs/apk/debug/app-debug.apk');await fs.copyFile(apk,output);}
async function extractApkWeb(input,output,ctx){const d=path.join(ctx.jobDir,'apk-extracted');await extractZipSafe(input,d);const hits=[];async function walk(p){for(const n of await fs.readdir(p,{withFileTypes:true})){const q=path.join(p,n.name);if(n.isDirectory())await walk(q);else if(/\.(html?|xhtml)$/i.test(n.name))hits.push(q);}}await walk(d);if(!hits.length)throw new Error('NO_RECOVERABLE_HTML');await fs.copyFile(hits[0],output);}
export async function convert(ctx,input,output){
 if(input===output)throw new Error('SAME_FORMAT');
 const base=ctx.base;
 if(output==='TXT'){
   const out=outPath(ctx,'txt');
   if(input==='HTML'){const s=await fs.readFile(ctx.input,'utf8');await fs.writeFile(out,s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),'utf8');}
   else if(input==='PDF')await txtFromPdf(ctx.input,out);
   else if(input==='DOCX')await textFromDocx(ctx.input,out);
   else if(input==='APK'){const html=outPath(ctx,'html');await extractApkWeb(ctx.input,html,ctx);const s=await fs.readFile(html,'utf8');await fs.writeFile(out,s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 if(output==='HTML'){
   const out=outPath(ctx,'html');
   if(input==='TXT')await fs.writeFile(out,`<!doctype html><html><head><meta charset="utf-8"><title>${base}</title></head><body><pre>${escapeHtml(await fs.readFile(ctx.input,'utf8'))}</pre></body></html>`);
   else if(input==='PDF')await htmlFromPdf(ctx.input,out);
   else if(input==='DOCX')await htmlFromDocx(ctx.input,out);
   else if(input==='APK')await extractApkWeb(ctx.input,out,ctx);
   else if(input==='ZIP')await htmlFromZip(ctx.input,out);
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 if(output==='PDF'){
   const out=outPath(ctx,'pdf');
   if(input==='HTML')await pdfFromHtml(ctx.input,out);
   else if(input==='DOCX')await pdfFromDocx(ctx.input,out,ctx.jobDir);
   else if(input==='TXT'){const html=outPath(ctx,'html');await fs.writeFile(html,`<!doctype html><html><body><pre>${escapeHtml(await fs.readFile(ctx.input,'utf8'))}</pre></body></html>`);await pdfFromHtml(html,out);}
   else if(input==='PDF')throw new Error('SAME_FORMAT');
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 if(output==='DOCX'){
   const out=outPath(ctx,'docx');
   if(input==='TXT')await docxFromText(ctx.input,out);
   else if(input==='HTML')await docxFromHtml(ctx.input,out);
   else if(input==='PDF'){const txt=outPath(ctx,'txt');await txtFromPdf(ctx.input,txt);await docxFromText(txt,out);}
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 if(output==='ZIP'){
   const out=outPath(ctx,'zip');
   if(input==='HTML'||input==='TXT'||input==='PDF'||input==='DOCX'){const d=path.join(ctx.jobDir,'package');await ensureDir(d);await fs.copyFile(ctx.input,path.join(d,path.basename(ctx.input)));await zipDir(d,out);}
   else if(input==='APK'){await fs.copyFile(ctx.input,out);}
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 if(output==='APK'){
   const out=outPath(ctx,'apk');
   if(input==='HTML')await buildApkFromWeb(ctx.input,out,ctx);
   else if(input==='ZIP'){const d=path.join(ctx.jobDir,'webzip');await extractZipSafe(ctx.input,d);const index=path.join(d,'index.html');if(!(await exists(index)))throw new Error('NO_HTML_CONTENT');await buildApkFromWeb(d,out,ctx);}
   else throw new Error('UNSUPPORTED_CONTENT');
   return out;
 }
 throw new Error('UNSUPPORTED_CONVERSION');
}
function escapeHtml(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
export async function validateOutput(p,fmt){const st=await fs.stat(p);if(st.size<1)throw new Error('OUTPUT_VALIDATION_FAILED');const checks={PDF:validPdf,ZIP:validZip,DOCX:validDocx,APK:validApk,HTML:validHtml};if(checks[fmt]&&!await checks[fmt](p))throw new Error('OUTPUT_VALIDATION_FAILED');return st;}
