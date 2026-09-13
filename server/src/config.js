import path from 'node:path';
import process from 'node:process';
export const config={
  port:Number(process.env.PORT||8080),
  maxUploadBytes:Number(process.env.MAX_UPLOAD_BYTES||50*1024*1024),
  ttlHours:Number(process.env.JOB_TTL_HOURS||6),
  storageDir:path.resolve(process.env.STORAGE_DIR||'./storage'),
  workerPollMs:Number(process.env.WORKER_POLL_MS||500),
  androidSdkRoot:process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME||'/opt/android-sdk'
};
