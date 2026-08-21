/* MY EDITOR V112 — safe paper background + simple sticker editor */
(() => {
  function installV112(){
    const $id=id=>document.getElementById(id);
    const editor=$id('editor');
    const paper=$id('paper');
    const workspace=document.querySelector('.workspace');
    const backgroundPanel=document.querySelector('[data-panel="background"]');
    if(!editor||!paper||!backgroundPanel||typeof current!=='function') return;

    const FIXED_WORK='#dedbd4';
    let selectedStickerId=null;
    let resizeSession=null;

    function restoreWorkSurface(){
      document.documentElement.style.setProperty('--work',FIXED_WORK);
      document.body.style.setProperty('background-color',FIXED_WORK,'important');
      if(workspace){
        workspace.style.setProperty('background',FIXED_WORK,'important');
        workspace.style.setProperty('background-color',FIXED_WORK,'important');
        workspace.style.setProperty('background-image','none','important');
      }
    }

    function applyPaperBackground(){
      const b=current().background||{};
      const mode=b.mode||'solid';
      if(mode==='gradient'){
        if(!Number.isFinite(Number(b.angle)))b.angle=135;
        const g1=b.grad1||'#ffffff';
        const g2=b.grad2||'#e8e2da';
        paper.style.setProperty('background-color',g1,'important');
        paper.style.setProperty('background-image',`linear-gradient(${Number(b.angle)}deg, ${g1}, ${g2})`,'important');
        paper.style.setProperty('background-size','100% 100%','important');
        paper.style.setProperty('background-repeat','no-repeat','important');
      }else if(mode==='solid'){
        const solid=b.solid||'#ffffff';
        paper.style.setProperty('background-color',solid,'important');
        paper.style.setProperty('background-image','none','important');
      }
      restoreWorkSurface();
    }

    const priorApplyBackground=window.applyBackground;
    if(typeof priorApplyBackground==='function'&&!priorApplyBackground.__v112PaperOnly){
      const wrapped=function(...args){
        const out=priorApplyBackground.apply(this,args);
        applyPaperBackground();
        return out;
      };
      wrapped.__v112PaperOnly=true;
      window.applyBackground=applyBackground=wrapped;
    }

    document.querySelectorAll('.bg-mode').forEach(btn=>btn.addEventListener('click',()=>{
      const b=current().background;
      b.mode=btn.dataset.mode;
      if(b.mode==='gradient'&&!Number.isFinite(Number(b.angle)))b.angle=135;
      try{persist()}catch{}
      requestAnimationFrame(()=>{try{applyBackground()}catch{};applyPaperBackground()});
    },true));

    ['solidColor','grad1','grad2','gradAngle'].forEach(id=>{
      const el=$id(id);if(!el)return;
      el.addEventListener('input',()=>{
        const b=current().background;
        if(id==='solidColor'){b.mode='solid';b.solid=el.value}
        if(id==='grad1'){b.mode='gradient';b.grad1=el.value}
        if(id==='grad2'){b.mode='gradient';b.grad2=el.value}
        if(id==='gradAngle'){b.mode='gradient';b.angle=Number(el.value)}
        try{persist()}catch{}
        try{if(typeof syncControls==='function')syncControls()}catch{}
        try{applyBackground()}catch{}
        applyPaperBackground();
      },true);
    });

    const b0=current().background||{};
    if(!Number.isFinite(Number(b0.angle))){b0.angle=135;try{persist()}catch{}}
    if($id('gradAngle')){
      $id('gradAngle').value=String(b0.angle??135);
      if($id('gradAngleOut'))$id('gradAngleOut').textContent=`${b0.angle??135}°`;
    }

    function stickers(){
      const s=current();
      if(!s.background)s.background=typeof defaultBackground==='function'?defaultBackground():{};
      if(!Array.isArray(s.background.stickers))s.background.stickers=[];
      s.background.stickers.forEach(st=>{st.rotation=0;st.opacity=100;if(st.locked==null)st.locked=false});
      return s.background.stickers;
    }

    function layer(){return paper.querySelector(':scope > .v109-sticker-layer')}

    function fileToSrc(file){
      return new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(file),img=new Image();
        img.onload=()=>{
          try{
            const max=700,scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
            const c=document.createElement('canvas');
            c.width=Math.max(1,Math.round(img.naturalWidth*scale));
            c.height=Math.max(1,Math.round(img.naturalHeight*scale));
            c.getContext('2d').drawImage(img,0,0,c.width,c.height);
            let src;try{src=c.toDataURL('image/webp',.86)}catch{src=c.toDataURL('image/png')}
            URL.revokeObjectURL(url);resolve(src);
          }catch(err){URL.revokeObjectURL(url);reject(err)}
        };
        img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('이미지를 읽을 수 없습니다.'))};
        img.src=url;
      });
    }

    async function addStickerFile(file){
      if(!file?.type?.startsWith('image/'))return;
      try{
        const src=await fileToSrc(file);
        const data={id:crypto.randomUUID?.()||`sticker-${Date.now()}`,src,x:50,y:50,width:24,rotation:0,opacity:100,locked:false};
        stickers().push(data);selectedStickerId=data.id;persist();
        if(typeof renderAll==='function')renderAll();
        requestAnimationFrame(()=>{refreshSurface();renderList()});
      }catch(err){console.error(err);alert('스티커를 추가하지 못했습니다.')}
    }

    function installPanel(){
      $id('v109StickerSection')?.remove();
      if($id('v112StickerSection'))return;
      const section=document.createElement('section');
      section.id='v112StickerSection';section.className='v112-sticker-section';
      section.innerHTML=`<div class="v112-sticker-head"><strong>스티커</strong><label class="v112-add-sticker">＋ 이미지 추가<input id="v112StickerFile" type="file" accept="image/*" hidden></label></div><div id="v112StickerList" class="v112-sticker-list"></div>`;
      backgroundPanel.appendChild(section);
      $id('v112StickerFile').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(f)await addStickerFile(f)});
    }

    function moveLayer(id,delta){
      const list=stickers(),i=list.findIndex(s=>s.id===id);if(i<0)return;
      const to=Math.max(0,Math.min(list.length-1,i+delta));if(to===i)return;
      const [item]=list.splice(i,1);list.splice(to,0,item);selectedStickerId=id;persist();
      if(typeof renderAll==='function')renderAll();requestAnimationFrame(()=>{refreshSurface();renderList()});
    }

    function deleteSticker(id){
      const list=stickers(),i=list.findIndex(s=>s.id===id);if(i<0)return;
      list.splice(i,1);if(selectedStickerId===id)selectedStickerId=null;persist();
      if(typeof renderAll==='function')renderAll();requestAnimationFrame(()=>{refreshSurface();renderList()});
    }

    function renderList(){
      const host=$id('v112StickerList');if(!host)return;
      const list=stickers();host.innerHTML='';
      if(!list.length){host.innerHTML='<div class="v112-sticker-empty">추가된 스티커가 없습니다.</div>';return}
      [...list].reverse().forEach((s,ri)=>{
        const idx=list.length-1-ri;
        const row=document.createElement('div');row.className='v112-sticker-row'+(s.id===selectedStickerId?' active':'');
        row.innerHTML=`<button type="button" class="v112-sticker-thumb"><img src="${s.src}" alt=""><span>${s.locked?'고정됨':'스티커 '+String(idx+1).padStart(2,'0')}</span></button><div class="v112-sticker-actions"><button type="button" data-act="up" title="레이어 위로">↑</button><button type="button" data-act="down" title="레이어 아래로">↓</button><button type="button" data-act="delete" class="danger" title="삭제">×</button></div>`;
        row.querySelector('.v112-sticker-thumb').onclick=()=>{selectedStickerId=s.id;refreshSurface();renderList()};
        row.querySelector('[data-act="up"]').onclick=()=>moveLayer(s.id,1);
        row.querySelector('[data-act="down"]').onclick=()=>moveLayer(s.id,-1);
        row.querySelector('[data-act="delete"]').onclick=()=>deleteSticker(s.id);
        host.appendChild(row);
      });
    }

    function removeTools(){layer()?.querySelectorAll('.v112-sticker-tool,.v112-resize-handle').forEach(n=>n.remove())}

    function positionTools(node){
      const l=layer();if(!l||!node)return;
      const lr=l.getBoundingClientRect(),r=node.getBoundingClientRect();
      const lock=l.querySelector('.v112-lock-tool'),del=l.querySelector('.v112-delete-tool'),handle=l.querySelector('.v112-resize-handle');
      if(lock){lock.style.left=`${r.left-lr.left}px`;lock.style.top=`${Math.max(2,r.top-lr.top-12)}px`}
      if(del){del.style.left=`${r.right-lr.left}px`;del.style.top=`${Math.max(2,r.top-lr.top-12)}px`}
      if(handle){handle.style.left=`${r.right-lr.left}px`;handle.style.top=`${r.bottom-lr.top}px`}
    }

    function addTools(node,data){
      const l=layer();if(!l||!node||paper.classList.contains('v110-capturing'))return;
      const lock=document.createElement('button');lock.type='button';lock.className='v112-sticker-tool v112-lock-tool';lock.textContent=data.locked?'🔒':'🔓';lock.title=data.locked?'고정 해제':'위치 고정';
      const del=document.createElement('button');del.type='button';del.className='v112-sticker-tool v112-delete-tool';del.textContent='×';del.title='삭제';
      lock.onclick=e=>{e.preventDefault();e.stopPropagation();data.locked=!data.locked;persist();refreshSurface();renderList()};
      del.onclick=e=>{e.preventDefault();e.stopPropagation();deleteSticker(data.id)};
      l.append(lock,del);
      if(!data.locked){
        const handle=document.createElement('span');handle.className='v112-resize-handle';handle.title='드래그해서 크기 변경';l.appendChild(handle);
        handle.addEventListener('pointerdown',e=>{
          e.preventDefault();e.stopPropagation();handle.setPointerCapture?.(e.pointerId);
          resizeSession={startX:e.clientX,startWidth:Number(data.width||24),paperWidth:paper.getBoundingClientRect().width};
          const move=ev=>{if(!resizeSession)return;data.width=Math.max(4,Math.min(95,resizeSession.startWidth+((ev.clientX-resizeSession.startX)/resizeSession.paperWidth)*100));node.style.width=`${data.width}%`;positionTools(node)};
          const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);resizeSession=null;persist()};
          handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
        });
      }
      positionTools(node);
    }

    function refreshSurface(){
      const l=layer();if(!l)return;
      removeTools();
      l.querySelectorAll('.v109-sticker-node').forEach(node=>{
        const data=stickers().find(s=>s.id===node.dataset.stickerId);if(!data)return;
        node.style.transform='translate(-50%,-50%)';node.style.opacity='1';node.style.width=`${Number(data.width||24)}%`;
        node.classList.toggle('selected',data.id===selectedStickerId);
        node.classList.toggle('v112-locked',!!data.locked);
        if(data.id===selectedStickerId)addTools(node,data);
      });
    }

    window.addEventListener('paste',event=>{
      const hasImage=[...(event.clipboardData?.items||[])].some(i=>i.kind==='file'&&i.type.startsWith('image/'));
      if(!hasImage)return;
      if(editor.contains(event.target)||document.activeElement===editor)return;
      event.preventDefault();event.stopImmediatePropagation();
    },true);

    paper.addEventListener('pointerdown',event=>{
      const node=event.target.closest?.('.v109-sticker-node');if(!node)return;
      const data=stickers().find(s=>s.id===node.dataset.stickerId);if(!data)return;
      selectedStickerId=data.id;renderList();requestAnimationFrame(refreshSurface);
      if(data.locked){event.preventDefault();event.stopImmediatePropagation()}
    },true);
    document.addEventListener('pointerup',()=>requestAnimationFrame(()=>{refreshSurface();renderList()}),true);

    const priorRenderAll=window.renderAll;
    if(typeof priorRenderAll==='function'&&!priorRenderAll.__v112Wrapped){
      const wrapped=function(...args){
        const out=priorRenderAll.apply(this,args);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{applyPaperBackground();refreshSurface();renderList()}));
        return out;
      };
      wrapped.__v112Wrapped=true;window.renderAll=renderAll=wrapped;
    }

    installPanel();renderList();restoreWorkSurface();
    try{applyBackground()}catch{}
    applyPaperBackground();requestAnimationFrame(()=>requestAnimationFrame(refreshSurface));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV112,0),{once:true});
  else setTimeout(installV112,0);
})();
