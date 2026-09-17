'use strict';
// Run after graceful shutdown so related JSON stores form one consistent snapshot.
const fs=require('fs');const path=require('path');const crypto=require('crypto');
const {runtimeRoot}=require('../packages/runtime/paths');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(root,relative=''){return fs.readdirSync(path.join(root,relative),{withFileTypes:true}).flatMap(e=>{
 const name=path.join(relative,e.name);if(e.isSymbolicLink())throw new Error('Symlinks are not permitted in runtime backups');return e.isDirectory()?files(root,name):[name];});}
function backup(destination){
 if(!process.argv.includes('--service-stopped'))throw new Error('Stop the service and pass --service-stopped before a consistent backup');
 const target=path.resolve(destination||'');if(target===runtimeRoot||target.startsWith(runtimeRoot+path.sep))throw new Error('Backup destination must be outside live runtime');
 if(fs.existsSync(target))throw new Error('Backup destination must be new');fs.mkdirSync(target,{recursive:true,mode:0o700});
 const records=[];for(const file of files(runtimeRoot)){if(file.endsWith('.worker-lock')||file.endsWith('.tmp'))continue;const bytes=fs.readFileSync(path.join(runtimeRoot,file));const out=path.join(target,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,bytes,{mode:0o600});records.push({path:file,bytes:bytes.length,sha256:sha(bytes)});}
 fs.writeFileSync(path.join(target,'backup-manifest.json'),JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString(),consistency:'operator_confirmed_service_stopped',files:records},null,2),{mode:0o600});
 return {files:records.length,sha256:sha(JSON.stringify(records))};
}
function restore(source,destination){
 const input=path.resolve(source),target=path.resolve(destination);if(fs.existsSync(target))throw new Error('Restore target must be new; never overwrite a live runtime');
 const realInput=fs.realpathSync(input);
 const manifest=JSON.parse(fs.readFileSync(path.join(input,'backup-manifest.json'),'utf8'));
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.files)||manifest.files.length>100000)throw new Error('Invalid backup manifest');
 const names=new Set();
 const verified=manifest.files.map(row=>{
  if(typeof row.path!=='string'||!row.path||path.isAbsolute(row.path)||row.path.includes('\\')||row.path.split('/').some(p=>!p||p==='.'||p==='..')||names.has(row.path)||row.path==='backup-manifest.json')throw new Error('Invalid backup path');
  names.add(row.path);const file=path.resolve(input,row.path),realFile=fs.realpathSync(file);
  if(!realFile.startsWith(realInput+path.sep)||!fs.lstatSync(file).isFile())throw new Error('Invalid backup path');
  const bytes=fs.readFileSync(file);if(sha(bytes)!==row.sha256||bytes.length!==row.bytes)throw new Error('Backup checksum mismatch');return {row,bytes};});
 fs.mkdirSync(target,{recursive:true,mode:0o700});for(const {row,bytes}of verified){const file=path.resolve(target,row.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{mode:0o600});}
 return {restored:verified.length};
}
if(require.main===module){const [action,source,dest]=process.argv.slice(2);if(action==='backup')console.log(JSON.stringify(backup(source)));else if(action==='restore')console.log(JSON.stringify(restore(source,dest)));else throw new Error('Usage: backup-runtime.js backup NEW_DEST --service-stopped | restore SOURCE NEW_DEST');}
module.exports={backup,restore};
