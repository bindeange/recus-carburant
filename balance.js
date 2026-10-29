(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReceiptBalance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
function stamp(r){return String(r.date||'')+String(r.heure||'');}
function valid(v){return v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=0;}
function history(records){
 const unique=new Map();for(const r of records)unique.set(r.id,r);const rows=[...unique.values()].sort((a,b)=>stamp(a).localeCompare(stamp(b))||((a.created||0)-(b.created||0)));let state=null;
 for(const r of rows){if(valid(r.solde)&&r.soldeSource!=='estime'){state={solde:Number(r.solde),soldeSource:r.soldeSource||'lu',date:r.date,heure:r.heure,id:r.id,pu:r.pu,baseId:r.id,baseStamp:stamp(r),baseSolde:Number(r.solde),includedIds:[r.id]};}
 else if(state&&Number.isFinite(Number(r.montant))&&Number(r.montant)>0){const next=state.solde-Number(r.montant);state=next<0?null:{...state,solde:next,soldeSource:'estime',date:r.date,heure:r.heure,id:r.id,pu:r.pu||state.pu,includedIds:[...state.includedIds,r.id]};}}
 if(state&&state.pu)state.litres_restants=Math.round(state.solde/state.pu*10)/10;return state;
}
function estimate(records,draft,remote){
 if(!draft.date||!draft.heure||!Number.isFinite(Number(draft.montant))||Number(draft.montant)<=0)return null;
 const eligible=records.filter(r=>r.id!==draft.id&&stamp(r)<=stamp(draft));let candidates=eligible.filter(r=>valid(r.solde));
 if(remote&&valid(remote.solde)&&remote.id!==draft.id&&stamp(remote)<=stamp(draft))candidates.push({...remote,remote:true});
 candidates.sort((a,b)=>stamp(b).localeCompare(stamp(a))||Number(!!b.remote)-Number(!!a.remote)||(b.created||0)-(a.created||0));const base=candidates[0];if(!base)return null;
 const ids=new Set(base.includedIds||[base.id]);let debit=Number(draft.montant);const seen=new Set([draft.id,base.id]);
 for(const r of eligible){if(seen.has(r.id)||ids.has(r.id))continue;seen.add(r.id);const later=stamp(r)>stamp(base);const pendingBeforeSnapshot=base.remote&&!r.synced&&stamp(r)>(base.baseStamp||stamp(base));if((later||pendingBeforeSnapshot)&&Number(r.montant)>0)debit+=Number(r.montant);}
 const solde=Number(base.solde)-debit;if(solde<0)return null;return{solde,soldeSource:'estime',baseId:base.id,baseSolde:Number(base.solde),debit,date:draft.date,heure:draft.heure,id:draft.id,pu:draft.pu};
}
return{history,estimate,stamp};
});
