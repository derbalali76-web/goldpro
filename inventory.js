/* ═══════════ INVENTORY ═══════════ */
function addBar(type,w,k,desc,src){
    const bar={id:uid(),w,k:k||(type==='24'?1000:730),desc:desc||(type==='24'?'سبيكة':'قطعة'),dt:new Date().toLocaleDateString('fr-FR'),src:src||'يدوي',_ts:Date.now()};
    if(type==='24')g24.push(bar);else g730.push(bar);
    /* لا تستدع syncBal() هنا — تُستدعى هذه الدالة من _applyEvt أثناء _reproject،
       وsyncBal() تُنفَّذ مرة واحدة في نهاية _reproject بعد اكتمال كل الأحداث */
}
function removeFromInventory(type,weight){
    const bars=type==='24'?g24:g730;
    let rem=weight;
    for(let i=bars.length-1;i>=0&&rem>0.001;i--){
        if(bars[i].w<=rem+0.001){rem-=bars[i].w;bars.splice(i,1)}
        else{bars[i].w-=rem;rem=0}
    }
    /* لا تستدع syncBal() هنا — راجع التعليق في addBar */
}
window.openInventory=(type)=>{
    invType=type;
    if(window._meltSel)window._meltSel.clear();      /* صفّر التحديد عند فتح المخزون */
    document.getElementById('invModalTitle').textContent=type==='24'?'💎 مخزون سبائك الذهب (24)':'👑 مخزون ذهب 730';
    document.getElementById('invModal').classList.add('active');
    renderInvModal();
};
/* ═══ تحديد سبائك للتذويب ═══ */
window._meltSel=new Set();
window._toggleMeltSel=(id)=>{
    if(window._meltSel.has(id))window._meltSel.delete(id);else window._meltSel.add(id);
    _updateMeltToolbar();
};
window._clearMeltSel=()=>{ window._meltSel.clear(); renderInvModal(); };
function _updateMeltToolbar(){
    const tb=document.getElementById('meltToolbar'), n=window._meltSel.size;
    if(tb){ tb.style.display=n>0?'flex':'none'; const cEl=document.getElementById('meltSelCount'); if(cEl)cEl.textContent=n; }
}
function renderInvModal(){
    const bars=invType==='24'?g24:g730;
    const tw=bars.reduce((s,b)=>s+(b.w||0),0);
    document.getElementById('invCount').textContent=bars.length;
    document.getElementById('invTotalW').textContent=fmt(tw,2)+' g';
    const c=document.getElementById('invBarsList');
    if(!bars.length){c.innerHTML='<div style="text-align:center;padding:2rem;color:var(--t3)"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:.5rem"></i>المخزون فارغ</div>';_updateMeltToolbar();return}
    c.innerHTML=[...bars].reverse().map(b=>{
        const sel=window._meltSel.has(b.id);
        return `
        <div class="bar-item" style="${sel?'outline:2px solid #ea580c;outline-offset:-2px;border-radius:10px':''}">
            <label style="display:flex;align-items:center;cursor:pointer;padding:0 .4rem 0 0" title="تحديد للتذويب">
                <input type="checkbox" ${sel?'checked':''} onchange="_toggleMeltSel('${b.id}')" style="width:20px;height:20px;accent-color:#ea580c;cursor:pointer">
            </label>
            <div class="bar-info">
                <strong>${fmt(b.w,2)} غ</strong>
                <span style="font-size:.66rem;color:var(--g600);font-weight:700"> — عيار ${fmt(b.k||0,1)}</span>
                <small>${b.desc||''} | ${b.dt||''}</small>
            </div>
            <div class="bar-actions">
                <button class="bsm sell" onclick="startSell('${invType}','${b.id}')">بيع</button>
                <button class="bsm loan" onclick="startLoan('${invType}','${b.id}')">سلف</button>
                ${invType==='730'?(_rafSentIds.has(b.id)?`<button class="bsm" disabled style="border-color:#6b7280;color:#6b7280;background:rgba(107,114,128,.08);opacity:.5;cursor:not-allowed" title="أُضيفت للرافيناج">✅ أُضيفت</button>`:`<button class="bsm" onclick="sendBarToRaf('730','${b.id}')" style="border-color:#ea580c;color:#ea580c;background:rgba(234,88,12,.08)" title="تحويل للرافيناج">🔥 رافيناج</button>`):''}
            </div>
        </div>`;}).join('');
    _updateMeltToolbar();
}

/* ═══════════ تذويب عدة سبائك → سبيكة واحدة جديدة ═══════════ */
function _ensureMeltModal(){
    if(document.getElementById('meltModal'))return;
    const div=document.createElement('div');
    div.id='meltModal'; div.className='modal-overlay';
    div.onclick=(e)=>{ if(e.target===div)closeModal('meltModal'); };
    div.innerHTML=`
    <div class="modal" style="max-width:420px">
        <div class="modal-handle"></div>
        <h3 style="font-size:.95rem">🔥 تذويب سبائك</h3>
        <div id="meltSummary" style="font-size:.78rem;color:var(--t2);background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.55rem;margin-bottom:.6rem"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
            <div>
                <label style="font-size:.72rem;color:var(--t2);display:block;margin-bottom:.2rem">الميزان الجديد (غ)</label>
                <input id="meltW" type="text" inputmode="decimal" placeholder="الوزن" oninput="_updateMeltDiff()" style="padding:.6rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;text-align:center;background:var(--card);color:var(--t);width:100%">
            </div>
            <div>
                <label style="font-size:.72rem;color:var(--t2);display:block;margin-bottom:.2rem">العيار الجديد</label>
                <input id="meltK" type="text" inputmode="decimal" placeholder="العيار" oninput="_updateMeltDiff()" style="padding:.6rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;text-align:center;background:var(--card);color:var(--t);width:100%">
            </div>
        </div>
        <div id="meltDiff" style="margin-top:.55rem"></div>
        <div style="font-size:.68rem;color:var(--t3);margin:.45rem 0 .2rem">العيار ≥ 999 يدخل مخزون 24، وإلا مخزون 730.</div>
        <div class="mactions" style="margin-top:.6rem">
            <button class="bgy" onclick="closeModal('meltModal')">إلغاء</button>
            <button class="bg" onclick="confirmMelt()" style="background:#ea580c;color:#fff">🔥 تذويب</button>
        </div>
    </div>`;
    document.body.appendChild(div);
}
window.openMeltForm=()=>{
    const pool=invType, bars=pool==='24'?g24:g730;
    const sel=bars.filter(b=>window._meltSel.has(b.id));
    if(!sel.length)return toast('حدِّد سبيكة واحدة على الأقل','error');
    _ensureMeltModal();
    const sumW=sel.reduce((s,b)=>s+(b.w||0),0);
    /* خالص المحدَّد بمكافئ 730 = Σ (وزن × عيار ÷ 730) */
    const srcEq730=sel.reduce((s,b)=>s+(b.w||0)*((b.k||0)/730),0);
    const blendK=sumW>0?(sel.reduce((s,b)=>s+(b.w||0)*(b.k||0),0)/sumW):0;   /* العيار المخلوط (على 1000) */
    window._meltSrc={n:sel.length,sumW,eq730:srcEq730,blendK};
    document.getElementById('meltSummary').innerHTML=
        `عدد السبائك: <strong>${sel.length}</strong><br>`+
        `مجموع الوزن: <strong>${fmt(sumW,2)} غ</strong><br>`+
        `الخالص (مكافئ 730): <strong>${fmt(srcEq730,2)} غ</strong> · عيار ≈ ${fmt(blendK,0)}`;
    /* تعبئة مبدئية: الوزن = مجموع المحدَّد، العيار = العيار المخلوط (قابل للتعديل) */
    document.getElementById('meltW').value=fmt(sumW,2).replace(/\s/g,'');
    document.getElementById('meltK').value=fmt(blendK,0).replace(/\s/g,'')||(pool==='24'?1000:730);
    _updateMeltDiff();
    document.getElementById('meltModal').classList.add('active');
    setTimeout(()=>document.getElementById('meltW').focus(),300);
};
/* فرق حيّ قبل الحفظ: خالص الناتج والفرق — كله بمكافئ 730 */
window._updateMeltDiff=()=>{
    const box=document.getElementById('meltDiff'); if(!box||!window._meltSrc)return;
    const num=v=>{const n=parseFloat(String(v||'').replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:0;};
    const w=num(document.getElementById('meltW').value), k=num(document.getElementById('meltK').value);
    const outEq730=w*k/730;                       /* خالص الناتج بمكافئ 730 */
    const diff=outEq730-window._meltSrc.eq730;     /* الفرق (سالب = نقص) */
    const col=Math.abs(diff)<0.005?'var(--t2)':(diff<0?'#dc2626':'#16a34a');
    const sign=diff>0.005?'+':'';
    box.innerHTML=
        `<div style="display:flex;justify-content:space-between;gap:.5rem;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.5rem .65rem;font-size:.8rem">
            <span style="color:var(--t2)">خالص الناتج (مكافئ 730): <strong style="color:var(--t)">${fmt(outEq730,2)} غ</strong></span>
            <span style="color:${col};font-weight:800">الفرق: ${sign}${fmt(diff,2)} غ</span>
        </div>`;
};
window.confirmMelt=()=>{
    const srcPool=invType, bars=srcPool==='24'?g24:g730;
    const sel=bars.filter(b=>window._meltSel.has(b.id));
    if(!sel.length)return toast('لا سبائك محدَّدة','error');
    const num=v=>parseFloat(String(v||'').replace(/\s/g,'').replace(',','.'));
    const w=num(document.getElementById('meltW').value), k=num(document.getElementById('meltK').value);
    if(!(w>0))return toast('أدخل وزناً صالحاً','error');
    if(!(k>0))return toast('أدخل عياراً صالحاً','error');
    const newPool=(k>=999)?'24':'730';
    const barsRemove=sel.map(b=>b.id);
    const newId=uid();
    const newBar={id:newId,pool:newPool,w:parseFloat(w.toFixed(4)),k:parseFloat(k.toFixed(2))};
    const nowStr=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    const dt=new Date().toLocaleDateString('fr-FR');
    emitEvent('MELT',
        {barsRemove,barsAdd:[newBar],meltCount:sel.length},
        {bars:{[newId]:{desc:'تذويب',dt,src:'تذويب'}},
         op:{t:'تذويب سبائك',m:newPool==='24'?'ذهب 24':'ذهب 730',a:w,_ts:Date.now(),dt:nowStr,note:`${sel.length} سبائك → ${fmt(w,2)}غ عيار ${fmt(k,1)}`}}
    );
    window._meltSel.clear();
    closeModal('meltModal');
    renderInvModal();
    toast('🔥 تم التذويب — سبيكة جديدة في المخزون','success');
};

/* ═══════════ LOAN ═══════════ */
window.startLoan=(type,id)=>{
    const bars=type==='24'?g24:g730;targetBar=bars.find(b=>b.id===id);targetBarType=type;
    if(!targetBar)return;
    document.getElementById('loanInfo').innerHTML=`📦 ${targetBar.desc||'قطعة'} | الوزن: <strong>${fmt(targetBar.w,2)} غ</strong> | العيار: <strong>${fmt(targetBar.k||0,1)}</strong>`;
    document.getElementById('loanAmount').value=targetBar.w;
    document.getElementById('loanCustomer').value='';
    document.getElementById('loanBalBox').style.display='none';
    document.getElementById('loanModal').classList.add('active');
    closeModal('invModal');
    setTimeout(()=>document.getElementById('loanCustomer').focus(),350);
};
window.confirmLoan=()=>{
    if(!targetBar)return;
    const c=document.getElementById('loanCustomer').value.trim();
    const a=parseFloat(document.getElementById('loanAmount').value);
    if(!c)return toast('أدخل اسم الزبون','error');
    if(isNaN(a)||a<=0||a>targetBar.w+0.001)return toast('كمية غير صالحة','error');
    const realA=Math.min(a,targetBar.w);
    /* حساب حركة السبيكة */
    let barsRemove=[],barUpdates=[];
    if(realA>=targetBar.w-0.001){
        barsRemove=[targetBar.id];
    }else{
        barUpdates=[{id:targetBar.id,pool:targetBarType,newW:parseFloat((targetBar.w-realA).toFixed(4))}];
    }
    const loanEntry={id:uid(),c,w:realA,k:targetBar.k,desc:targetBar.desc||'',bt:targetBarType,dt:new Date().toLocaleDateString('fr-FR'),ret:false};
    const nowStr=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    const bt=targetBarType;
    targetBar=null;targetBarType=null;
    const eq730=bt==='24'?realA:parseFloat((realA*((loanEntry.k||730)/730)).toFixed(4)); /* دين السلف بمكافئ 730 موحّد */
    emitEvent('LOAN',
        {c,bt,w:realA,eq730,loanEntry,barsRemove,barUpdates},
        {op:{c,t:'سلف',m:bt==='24'?'ذهب 24':'ذهب 730',a:bt==='24'?realA:eq730,realW:bt==='24'?undefined:realA,realK:bt==='24'?undefined:(loanEntry.k||730),_ts:Date.now(),dt:nowStr}}
    );
    closeModal('loanModal');
    toast('🤝 تم التسليف بنجاح');
};
window.showLoanBalance=()=>{
    const c=document.getElementById('loanCustomer').value.trim(),box=document.getElementById('loanBalBox');
    if(!c){box.style.display='none';return}
    const m=targetBarType==='24'?'ذهب 24':'ذهب 730',b=getCustBal(c,m);
    box.innerHTML=`👤 رصيد ${m}: <strong>${fmt(b,2)} غ</strong>`;box.style.display='block';
};

/* ═══════════ SELL FROM INVENTORY ═══════════ */
let _sellPaid=true;
function setSellPaid(paid){
    _sellPaid=paid;
    document.getElementById('sellPaidBtn').style.background=paid?'var(--gr)':'transparent';
    document.getElementById('sellPaidBtn').style.color=paid?'#fff':'var(--t2)';
    document.getElementById('sellPaidBtn').style.borderColor=paid?'var(--gr)':'var(--border)';
    document.getElementById('sellUnpaidBtn').style.background=paid?'transparent':'var(--rd)';
    document.getElementById('sellUnpaidBtn').style.color=paid?'var(--t2)':'#fff';
    document.getElementById('sellUnpaidBtn').style.borderColor=paid?'var(--border)':'var(--rd)';
}
window.setSellPaid=setSellPaid;
window.startSell=(type,id)=>{
    const bars=type==='24'?g24:g730;targetBar=bars.find(b=>b.id===id);targetBarType=type;
    if(!targetBar)return;
    const k=targetBar.k||0;
    document.getElementById('sellInfo').innerHTML=`📦 ${targetBar.desc||'قطعة'} | الوزن: <strong>${fmt(targetBar.w,2)} غ</strong> | العيار: <strong>${fmt(k,1)}</strong>`;
    document.getElementById('sellCustomer').value='';
    document.getElementById('sellAmount').value=targetBar.w;
    document.getElementById('sellPrice').value=goldPrice;
    document.getElementById('sellTotal').textContent=fmt(targetBar.w*k/730*goldPrice,0)+' DZD';
    setSellPaid(true);
    document.getElementById('sellModal').classList.add('active');
    closeModal('invModal');
    setTimeout(()=>document.getElementById('sellCustomer').focus(),350);
};
window.confirmSell=()=>{
    if(!targetBar)return;
    const c=document.getElementById('sellCustomer').value.trim();
    if(!c)return toast('أدخل اسم الزبون','error');
    const a=parseFloat(document.getElementById('sellAmount').value);
    const p=parseFloat(document.getElementById('sellPrice').value);
    if(isNaN(a)||a<=0||a>targetBar.w+0.001)return toast('كمية غير صالحة','error');
    if(isNaN(p)||p<=0)return toast('السعر غير صالح','error');
    const k=targetBar.k||0,realA=Math.min(a,targetBar.w);
    const eq730=realA*k/730,total=Math.round(eq730*p),is1000=k>=999;
    const paid=_sellPaid;
    /* حساب حركة السبيكة */
    let barsRemove=[],barUpdates=[];
    if(realA>=targetBar.w-0.001){
        barsRemove=[targetBar.id];
    }else{
        barUpdates=[{id:targetBar.id,pool:targetBarType,newW:parseFloat((targetBar.w-realA).toFixed(4))}];
    }
    const iid='INV-'+uid();
    const dt=new Date().toLocaleDateString('fr-FR');
    const nowStr=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    const _inv={
        id:iid,c,t:'sell',ps:paid?'full':'credit',dt,
        items:[{id:uid(),w:realA,k,is1000,eq730,ppg:p,total,sbt:targetBarType,desc:targetBar.desc||''}],
        tp:total,akhd:paid?total:0
    };
    const _sbt=targetBarType; /* نحفظ القيمة قبل الإعادة لـ null */
    targetBar=null;targetBarType=null;
    emitEvent('SELL',
        {c,paid,total,barsRemove,barUpdates,iid},
        {invoice:_inv,op:{c,t:'بيع',m:'دينار',a:total,_ts:Date.now(),dt:nowStr,ppg:p,total,paid,eq730,iid,sbt:_sbt}}
    );
    closeModal('sellModal');
    toast(paid?'✅ تم البيع — خالص':'✅ تم البيع — غير خالص');
    setTimeout(()=>printInv(iid),400);
};

/* ═══════════ تحويل سبيكة مباشرة للرافيناج (بدون تنقل) ═══════════ */
window.sendBarToRaf=(type,id)=>{
    const bars=type==='24'?g24:g730;
    const bar=bars.find(b=>b.id===id);
    if(!bar)return;
    /* إيجاد أول صف فارغ في جدول الرافيناج */
    let targetRow=-1;
    for(let i=1;i<=rafRows;i++){
        const wEl=document.getElementById('rafW_'+i);
        if(wEl&&wEl.value.trim()===''){targetRow=i;break;}
    }
    /* إذا لا يوجد صف فارغ، أضف صفاً جديداً */
    if(targetRow===-1){
        addRafRow();
        targetRow=rafRows;
    }
    /* تعبئة الصف */
    const wEl=document.getElementById('rafW_'+targetRow);
    const kEl=document.getElementById('rafK_'+targetRow);
    if(wEl)wEl.value=bar.w;
    if(kEl)kEl.value=bar.k||730;
    if(typeof calcRaf==='function')calcRaf();
    /* تسجيل الـ ID لمنع الإضافة مرة ثانية */
    _rafSentIds.add(id);
    if(typeof _rafSentBars!=='undefined'&&!_rafSentBars.some(x=>x.id===id))_rafSentBars.push({id:bar.id,w:bar.w,k:bar.k||730});
    renderInvModal();
    /* رسالة تأكيد — بدون إغلاق المودال أو التنقل */
    toast(`🔥 أُضيفت للرافيناج — الصف ${targetRow}`,'success');
};
document.getElementById('sellAmount').addEventListener('input',function(){
    const a=parseFloat(this.value)||0,k=targetBar?.k||0,p=parseFloat(document.getElementById('sellPrice').value)||0;
    document.getElementById('sellTotal').textContent=fmt(a*k/730*p,0)+' DZD';
});
document.getElementById('sellPrice').addEventListener('input',function(){
    const a=parseFloat(document.getElementById('sellAmount').value)||0,k=targetBar?.k||0;
    document.getElementById('sellTotal').textContent=fmt(a*k/730*(parseFloat(this.value)||0),0)+' DZD';
});
