/** Header-based CSV input for statistical fitting. No silent numeric coercion. */
const fs = require('node:fs');
function readCSV(file, required) {
 const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
 const rows=[]; let row=[],field='',quoted=false,closed=false;
 const finish=()=>{row.push(field); if(row.some(v=>v.trim()!==''))rows.push(row); row=[];field='';closed=false;};
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c===','){row.push(field);field='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finish();}
  else if(c==='"'){if(field||closed)throw Error('Invalid CSV quote');quoted=true;}
  else {if(closed)throw Error('Text after closing CSV quote');field+=c;}
 }
 if(quoted)throw Error('Unterminated CSV quote');
 if(field||row.length)finish();
 const headers=(rows.shift()||[]).map(x=>x.trim());
 if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV header');
 for(const h of required)if(!headers.includes(h))throw Error('Missing CSV header: '+h);
 const audit={rows:rows.length,accepted:0,rejected:0};
 const records=rows.map((r,index)=>({values:r.length===headers.length?Object.fromEntries(headers.map((h,i)=>[h,r[i].trim()])):null,row:index+2}));
 return {records,audit};
}
function number(value, min=0) {
 if(typeof value!=='string'||!value.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(value))throw Error('Invalid numeric value');
 const n=Number(value);if(!Number.isFinite(n)||n<min)throw Error('Out-of-range numeric value');return n;
}
function load(file,required,map){const {records,audit}=readCSV(file,required);const data=[];
 for(const r of records){try{if(!r.values)throw Error('Column count');for(const h of required)if(!r.values[h])throw Error('Empty field');data.push(map(r.values));audit.accepted++;}catch(e){audit.rejected++;}}
 if(!data.length)throw Error('No valid records: '+file);return {data,audit};
}
function unit(value){const s=String(value||'').trim().toLowerCase();return ({'م²':'m2','م³':'m3','طن':'ton','م':'m','وحدة':'no','واحدة':'no','باب':'no','مصعد':'no'})[s]||s;}
module.exports={readCSV,number,load,unit};
