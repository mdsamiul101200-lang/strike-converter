import path from 'node:path';
import {fileTypeFromBuffer} from 'file-type';
const FORMATS=new Set(['PDF','HTML','APK','ZIP','DOCX','TXT']);
export function normalizeFormat(x){return String(x||'').trim().toUpperCase();}
export function assertFormat(x){const f=normalizeFormat(x);if(!FORMATS.has(f))throw new Error('INVALID_FORMAT');return f;}
export async function validateInput(buffer,fmt){
  if(!buffer?.length)throw new Error('INVALID_FILE');
  const t=await fileTypeFromBuffer(buffer);
  if(fmt==='PDF' && t?.mime!=='application/pdf' && !buffer.subarray(0,5).toString().startsWith('%PDF-'))throw new Error('INVALID_FILE');
  if(fmt==='ZIP'||fmt==='APK'){if(!(t?.mime==='application/zip'||t?.mime==='application/java-archive'||buffer.length>=4&&buffer.readUInt32LE(0)===0x04034b50))throw new Error('INVALID_FILE');}
  if(fmt==='DOCX'){if(!(t?.mime==='application/zip'||buffer.length>=4&&buffer.readUInt32LE(0)===0x04034b50))throw new Error('INVALID_FILE');}
  if(fmt==='HTML'){const s=buffer.toString('utf8',0,Math.min(buffer.length,200000));if(!/<(?:!doctype\s+html|html\b|body\b|head\b)/i.test(s))throw new Error('INVALID_FILE');}
  return {detected:t?.mime||'text/plain',extension:path.extname('x.'+fmt.toLowerCase())};
}
