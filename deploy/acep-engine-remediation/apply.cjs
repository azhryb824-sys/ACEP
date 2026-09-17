'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const dir=__dirname,m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const root=path.resolve(process.argv[2]||'.acep-release/ACEP');
const stable=o=>Array.isArray(o)?o.map(stable):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])])):o;
const {sourceTreeSha256,...payload}=m;
if(sha(JSON.stringify(stable(payload)))!==sourceTreeSha256)throw new Error('Release manifest identity mismatch');
function destination(name){if(!name||path.isAbsolute(name)||name.split('/').includes('..'))throw new Error('Unsafe release path');return path.join(root,name);}
for(const row of [...m.files,...m.remove]){
 const file=destination(row.path);
 if(row.beforeSha256 && (!fs.existsSync(file)||sha(fs.readFileSync(file))!==row.beforeSha256))throw new Error('Unexpected baseline file: '+row.path);
 if(row.beforeSha256===null && fs.existsSync(file))throw new Error('Unexpected baseline addition: '+row.path);
}
for(const row of m.files){const input=fs.readFileSync(path.join(dir,'files',row.path));if(sha(input)!==row.sha256)throw new Error('Release file checksum mismatch: '+row.path);const out=destination(row.path);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,input);}
for(const row of m.remove)fs.unlinkSync(destination(row.path));
fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify({schemaVersion:1,sourceTreeSha256,datasetManifestSha256:m.datasetManifestSha256,engineeringReleaseApproved:false},null,2)+'\n');
console.log(JSON.stringify({applied:m.files.length,removed:m.remove.length,sourceTreeSha256}));
