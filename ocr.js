(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReceiptOCR=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function paperBox(data,w,h){
 const hist=new Uint32Array(256);for(let i=0;i<data.length;i+=4)hist[Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114)]++;
 const total=w*h;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let n=0,s=0,best=0,threshold=128;
 for(let t=0;t<255;t++){n+=hist[t];s+=t*hist[t];if(!n||n===total)continue;const d=s/n-(sum-s)/(total-n),v=n*(total-n)*d*d;if(v>best){best=v;threshold=t}}
 threshold=Math.max(110,Math.min(210,threshold+8));
 const rows=[];for(let y=0;y<h;y+=3){let first=-1,last=-1,count=0;for(let x=0;x<w;x+=3){const i=(y*w+x)*4;if(data[i]*.299+data[i+1]*.587+data[i+2]*.114>threshold){if(first<0)first=x;last=x;count++}}if(count>w/3*.48)rows.push({y,first,last});}
 if(rows.length<h/3*.35)return{x:0,y:0,width:w,height:h,detected:false};
 // Le papier forme une bande continue ; les reflets isolés sont écartés.
 let runs=[],run=[];for(const row of rows){if(run.length&&row.y-run[run.length-1].y>15){runs.push(run);run=[]}run.push(row)}runs.push(run);runs.sort((a,b)=>b.length-a.length);const r=runs[0];
 if(!r||r.length*3<h*.35)return{x:0,y:0,width:w,height:h,detected:false};
 const quant=(values,q)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*q)];
 const left=Math.max(0,quant(r.map(v=>v.first),.10)-6),right=Math.min(w,quant(r.map(v=>v.last),.90)+6);
 const top=Math.max(0,r[0].y-6),bottom=Math.min(h,r[r.length-1].y+9);
 if(right-left<w*.4)return{x:0,y:0,width:w,height:h,detected:false};
 return{x:left,y:top,width:right-left,height:bottom-top,detected:!((right-left)>w*.96&&(bottom-top)>h*.96)};
}
function enhance(data,w,h,mode='gray'){
 const g=new Uint8ClampedArray(w*h),hist=new Uint32Array(256);for(let i=0;i<g.length;i++){g[i]=Math.round(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114);hist[g[i]]++}
 const quant=q=>{let s=0;for(let i=0;i<256;i++){s+=hist[i];if(s>=g.length*q)return i}return 255};const lo=quant(.01),hi=quant(.99),scale=255/Math.max(35,hi-lo);
 const normal=new Uint8ClampedArray(g.length);for(let i=0;i<g.length;i++)normal[i]=(g[i]-lo)*scale;
 const result=new Uint8ClampedArray(g.length);
 if(mode==='binary'){
  const stride=w+1,integral=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=normal[y*w+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row}}
  const radius=Math.max(15,Math.round(w/40));for(let y=0;y<h;y++){const y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0));result[y*w+x]=normal[y*w+x]<mean-12?0:255}}
 }else{
  result.set(normal);
 }
 const rgba=new Uint8ClampedArray(data.length);for(let i=0;i<result.length;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=result[i];rgba[i*4+3]=255}return rgba;
}

const numeric=s=>String(s).replace(/[O]/g,'0').replace(/[IL|!)]/g,'1').replace(/Z/g,'2').replace(/S/g,'5').replace(/B/g,'8');
const title=s=>s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
function parse(raw){
 const T=String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(),o={};let m;
 const date=T.match(/\b([0-3OILZ]\d)\s*[/.\-]\s*([01OIL]\d)\s*[/.\-]\s*(20[0-9OILZSB]{2})\b/);
 if(date){const day=+numeric(date[1]),month=+numeric(date[2]),year=+numeric(date[3]),d=new Date(Date.UTC(year,month-1,day));
  if(year>=2000&&year<=new Date().getFullYear()+1&&d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day)o.date=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
 if(m=T.match(/\b([012OIL]?\d)\s*[:]\s*([0-5OIL][0-9OIL!)])(?:\b|\s|$)/)){const h=+numeric(m[1]),min=+numeric(m[2]);if(h<24&&min<60)o.heure=String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');}
 if(m=T.match(/P[O0]MPE\s*[:;.=\-]?\s*([0-9OILZ]{1,2})\b/))o.pompe=numeric(m[1]);
 if(m=T.match(/CHR[O0][MN]O\s*[:;.=\-]?\s*(\d{3,8})\s*[\/]\s*(\d{3,8})\b/))o.ticket=m[1]+'/'+m[2];
 if(m=T.match(/UN[I1L]TA[I1L]RE\s*[:;.=\-]?\s*(\d{3,4})\b/)){const v=+m[1];if(v>=100&&v<=5000)o.pu=v;}
 if(m=T.match(/\bTOTAL\s*[:;.=\-]?\s*(\d[\d \t.,]{1,14})\s*CF[A4]/))o.montant=+m[1].replace(/\D/g,'');
 if(m=T.match(/\bSOLDE\s*[:;.=\-]?\s*(\d[\d \t.,]{0,14})\s*CF[A4]/))o.solde=+m[1].replace(/\D/g,'');
 if(m=T.match(/\b(SUPER\s*SP|SUPER|GASOIL|GAZOLE)\b/)){
  o.produit=/SUPER/.test(m[1])?'Super SP':title(m[1]);
  const after=T.slice(m.index+m[0].length,m.index+m[0].length+85);
  const qty=after.match(/^\s*([0-9]{1,3})\s*[.,]\s*([0-9%]{1,3})(?!\d)/);
  if(qty){const v=+(qty[1]+'.'+qty[2].replace(/%/g,'5'));if(v>0&&v<1000)o.litres=v;}
 }
 if(m=T.match(/P[O0]MP[I1L][S5][T1I][E3]\s*[:;.=\-]?\s*([A-Z][A-Z' \-]{2,49})/)){const name=m[1].trim().replace(/\s+/g,' ');if(name.length>=4)o.pompiste=title(name);}
 return o;
}
function merge(readings){
 const keys=['date','heure','pompe','ticket','produit','pu','montant','litres','solde','pompiste'],fields={},uncertain=[],computed=[];
 for(const key of keys){const values=new Map();for(const r of readings){const o=r.fields||parse(r.text||'');if(o[key]==null)continue;const id=String(o[key]);const current=values.get(id)||{value:o[key],score:0,count:0};current.count++;current.score+=1+Math.max(0,Math.min(100,r.confidence||50))/500+(r.mode===6?.04:0);values.set(id,current);}
  const ranked=[...values.values()].sort((a,b)=>b.score-a.score);if(ranked.length){fields[key]=ranked[0].value;if(ranked.length>1)uncertain.push(key);}
 }
 if(fields.montant&&fields.pu){const expected=fields.montant/fields.pu;
  const candidates=readings.map(r=>(r.fields||parse(r.text||'')).litres).filter(v=>v>0);
  const close=candidates.filter(v=>Math.abs(v-expected)<=Math.max(.05,expected*.005));
  if(close.length)fields.litres=close.sort((a,b)=>Math.abs(a-expected)-Math.abs(b-expected))[0];
  else if(fields.litres==null){fields.litres=+expected.toFixed(2);computed.push('litres');}
  else if(Math.abs(fields.litres-expected)>Math.max(.15,expected*.02))uncertain.push('litres','montant','pu');
 }
 if(uncertain.includes('pompiste'))delete fields.pompiste;
 if(fields.pompiste&&readings.filter(r=>r.confidence>=80).length===0)uncertain.push('pompiste');
 const missing=['date','heure','pompe','ticket','pu','montant','litres','solde','pompiste'].filter(k=>fields[k]==null);
 return{fields,uncertain:[...new Set(uncertain)],missing,computed};
}

return{paperBox,enhance,parse,merge};
});
