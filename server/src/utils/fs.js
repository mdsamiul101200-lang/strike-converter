import fs from 'node:fs/promises';
import path from 'node:path';
export async function ensureDir(p){await fs.mkdir(p,{recursive:true});}
export async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
export function safeJoin(root, name){const resolved=path.resolve(root,name);const base=path.resolve(root)+path.sep;if(!resolved.startsWith(base)) throw new Error('PATH_TRAVERSAL');return resolved;}
export async function removeDir(p){await fs.rm(p,{recursive:true,force:true});}
