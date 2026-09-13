import {convert} from './convert.js';
const formats=['PDF','HTML','APK','ZIP','DOCX','TXT'];
export function listFormats(){return formats;}
export function resolve(input,output){return async ctx=>convert(ctx,input,output);}
