const fs=require('fs'), os=require('os'), path=require('path'), crypto=require('crypto');
const {restore}=require('../scripts/backup-runtime');
const {inspectSafetensors}=require('../packages/vision-training/models/safetensors-format');
describe('artifact and restore integrity',()=>{
 let root; beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'acep-integrity-'));});
 afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
 function archive(file='nested/state.json') {
   const source=path.join(root,'backup');fs.mkdirSync(path.join(source,'nested'),{recursive:true});
   const bytes=Buffer.from('{"revision":8}');fs.writeFileSync(path.join(source,'nested/state.json'),bytes);
   const manifest={schemaVersion:1,files:[{path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}]};
   fs.writeFileSync(path.join(source,'backup-manifest.json'),JSON.stringify(manifest));return source;
 }
 test('restores exact contents and refuses a preexisting target',()=>{
  const source=archive(),dest=path.join(root,'restore');expect(restore(source,dest).restored).toBe(1);
  expect(fs.readFileSync(path.join(dest,'nested/state.json'),'utf8')).toBe('{"revision":8}');expect(()=>restore(source,dest)).toThrow('must be new');
 });
 test.each(['../outside','/tmp/escape','nested/../state','nested\\state'])('rejects unsafe archive path %s before writing',file=>{
  const source=archive(file),dest=path.join(root,'restore');expect(()=>restore(source,dest)).toThrow('Invalid backup path');expect(fs.existsSync(dest)).toBe(false);
 });
 test('rejects nested symlink escapes and altered content',()=>{
  const source=archive(),dest=path.join(root,'restore');fs.renameSync(path.join(source,'nested'),path.join(root,'outside'));
  fs.symlinkSync(path.join(root,'outside'),path.join(source,'nested'));expect(()=>restore(source,dest)).toThrow('Invalid backup path');
  fs.unlinkSync(path.join(source,'nested'));fs.renameSync(path.join(root,'outside'),path.join(source,'nested'));fs.appendFileSync(path.join(source,'nested/state.json'),'x');expect(()=>restore(source,dest)).toThrow('checksum');expect(fs.existsSync(dest)).toBe(false);
 });
 function tensor(header,data=Buffer.alloc(4)) {const h=Buffer.from(header),n=Buffer.alloc(8);n.writeBigUInt64LE(BigInt(h.length));const file=path.join(root,'weights.safetensors');fs.writeFileSync(file,Buffer.concat([n,h,data]));return file;}
 test('rejects JSON disguised as weights, malformed shape, duplicate keys and gaps',()=>{
  const fake=path.join(root,'fake.safetensors');fs.writeFileSync(fake,JSON.stringify({trained:true,simulation:true}));expect(()=>inspectSafetensors(fake)).toThrow();
  expect(inspectSafetensors(tensor('{"w":{"dtype":"F32","shape":[1],"data_offsets":[0,4]}}')).tensorCount).toBe(1);
  for(const h of ['{"w":{"dtype":"F32","shape":[2],"data_offsets":[0,4]}}','{"w":{"dtype":"F32","shape":[1],"shape":[1],"data_offsets":[0,4]}}','{"w":{"dtype":"U8","shape":[3],"data_offsets":[1,4]}}'])expect(()=>inspectSafetensors(tensor(h))).toThrow();
 });
});
