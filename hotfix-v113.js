/* MY EDITOR V117 — single-owner sticker selection, drag, resize and deselection */
(() => {
  function installStickerEngine(){
    const paper=document.getElementById('paper');if(!paper||typeof current!=='function')return;
    let selectedId=null,drag=null,resize=null;
    const list=()=>{const s=current();if(!s.background)s.background=typeof defaultBackground==='function'?defaultBackground():{};if(!Array.isArray(s.background.stickers))s.background.stickers=[];return s.background.stickers};
    const layer=()=>paper.querySelector(':scope > .v109-sticker-layer');
    const dataFor=n=>list().find(s=>s.id===n?.dataset?.stickerId)||null;
    const persistSafe=()=>{try{persist?.()}catch(e){console.error(e)}};

    function removeTools(root=layer()){root?.querySelectorAll('.v115-tool,.v115-resize').forEach(n=>n.remove())}
    function clearVisualSelection(root=layer()){
      removeTools(root);root?.querySelectorAll('.v109-sticker-node.selected').forEach(n=>n.classList.remove('selected'));
      document.querySelectorAll('.v112-sticker-row.active').forEach(n=>n.classList.remove('active'));
    }
    function clearSelection(){selectedId=null;clearVisualSelection()}
    function markList(){
      document.querySelectorAll('.v112-sticker-row').forEach(row=>row.classList.toggle('active',row.dataset.stickerId===selectedId));
    }
    function positionTools(node){
      const l=layer();if(!l||!node)return;const lr=l.getBoundingClientRect(),r=node.getBoundingClientRect();
      const lock=l.querySelector('.v115-lock'),del=l.querySelector('.v115-delete'),handle=l.querySelector('.v115-resize');
      if(lock){lock.style.left=`${r.left-lr.left}px`;lock.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(del){del.style.left=`${r.right-lr.left}px`;del.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(handle){handle.style.left=`${r.right-lr.left}px`;handle.style.top=`${r.bottom-lr.top}px`}
    }
    function deleteSticker(data){
      const a=list(),i=a.findIndex(x=>x.id===data.id);if(i>=0)a.splice(i,1);clearSelection();persistSafe();try{renderAll?.()}catch{}
    }
    function addTools(node,data){
      const l=layer();if(!l||paper.classList.contains('v110-capturing'))return;removeTools(l);
      const lock=document.createElement('button'),del=document.createElement('button');
      lock.type=del.type='button';lock.className='v115-tool v115-lock';del.className='v115-tool v115-delete';
      lock.textContent=data.locked?'🔒':'🔓';lock.title=data.locked?'위치 고정 해제':'위치 고정';del.textContent='×';del.title='삭제';
      for(const b of [lock,del])b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation()},true);
      lock.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();data.locked=!data.locked;persistSafe();bindNodes()});
      del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteSticker(data)});
      l.append(lock,del);
      if(!data.locked){
        const h=document.createElement('span');h.className='v115-resize';h.title='드래그해서 크기 변경';l.appendChild(h);
        h.addEventListener('pointerdown',e=>{
          e.preventDefault();e.stopImmediatePropagation();const pr=paper.getBoundingClientRect();
          resize={node,data,startX:e.clientX,startWidth:Number(data.width||24),paperWidth:pr.width};
          const move=ev=>{if(!resize)return;ev.preventDefault();data.width=Math.max(4,Math.min(95,resize.startWidth+((ev.clientX-resize.startX)/resize.paperWidth)*100));node.style.width=`${data.width}%`;positionTools(node)};
          const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);resize=null;persistSafe();bindNodes()};
          window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
        },true);
      }
      positionTools(node);
    }
    function selectNode(node,data){
      selectedId=data.id;const l=layer();if(!l)return;
      l.querySelectorAll('.v109-sticker-node').forEach(n=>n.classList.toggle('selected',n.dataset.stickerId===selectedId));markList();addTools(node,data);
    }
    function startDrag(e,node,data){
      e.preventDefault();e.stopImmediatePropagation();selectNode(node,data);if(data.locked)return;
      const pr=paper.getBoundingClientRect(),cx=pr.left+(Number(data.x??50)/100)*pr.width,cy=pr.top+(Number(data.y??50)/100)*pr.height;
      drag={node,data,rect:pr,dx:e.clientX-cx,dy:e.clientY-cy};node.classList.add('v115-dragging');
      const move=ev=>{if(!drag)return;ev.preventDefault();data.x=Math.max(0,Math.min(100,((ev.clientX-drag.dx-drag.rect.left)/drag.rect.width)*100));data.y=Math.max(0,Math.min(100,((ev.clientY-drag.dy-drag.rect.top)/drag.rect.height)*100));node.style.left=`${data.x}%`;node.style.top=`${data.y}%`;positionTools(node)};
      const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);node.classList.remove('v115-dragging');drag=null;persistSafe();bindNodes()};
      window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
    }
    function bindNode(node){
      const data=dataFor(node);if(!data)return;
      node.style.left=`${Number(data.x??50)}%`;node.style.top=`${Number(data.y??50)}%`;node.style.width=`${Number(data.width??24)}%`;node.style.transform='translate(-50%,-50%)';node.style.opacity='1';
      node.style.pointerEvents='auto';node.style.touchAction='none';node.classList.toggle('selected',data.id===selectedId);node.classList.toggle('v115-locked',!!data.locked);
      if(node.dataset.v117Bound==='1')return;node.dataset.v117Bound='1';
      node.addEventListener('pointerdown',e=>startDrag(e,node,data),true);node.addEventListener('dragstart',e=>e.preventDefault());
    }
    function bindNodes(){
      if(drag||resize)return;const l=layer();if(!l)return;removeTools(l);l.style.pointerEvents='none';l.style.zIndex='100';
      l.querySelectorAll('.v109-sticker-node').forEach(bindNode);
      const selected=l.querySelector(`.v109-sticker-node[data-sticker-id="${CSS.escape(selectedId||'')}"]`),data=selected?dataFor(selected):null;
      if(selected&&data)addTools(selected,data);markList();
    }

    /* Deselect on the pointer-down that starts interaction elsewhere. Using pointerdown instead
       of click means no later render can resurrect a stale selection. */
    document.addEventListener('pointerdown',e=>{
      if(e.target.closest?.('.v109-sticker-node,.v115-tool,.v115-resize,.v112-sticker-row,.v112-add-sticker'))return;
      clearSelection();
    },true);

    document.addEventListener('click',e=>{
      const row=e.target.closest?.('.v112-sticker-row');if(!row||e.target.closest?.('.v112-sticker-actions'))return;
      const id=row.dataset.stickerId;if(!id)return;selectedId=id;requestAnimationFrame(bindNodes);
    },true);

    const oldRender=window.renderAll;
    if(typeof oldRender==='function'&&!oldRender.__v117Sticker){
      const wrapped=function(...args){const out=oldRender.apply(this,args);requestAnimationFrame(()=>requestAnimationFrame(bindNodes));return out};
      wrapped.__v117Sticker=true;window.renderAll=renderAll=wrapped;
    }

    /* Preview clones must never contain editor-only selection outlines or handles. */
    const oldClone=window.clonePageForIndex;
    if(typeof oldClone==='function'&&!oldClone.__v117StickerClean){
      const wrapped=function(...args){const clone=oldClone.apply(this,args);if(clone){clone.querySelectorAll('.v109-sticker-node.selected').forEach(n=>n.classList.remove('selected'));removeTools(clone.querySelector('.v109-sticker-layer'));}return clone};
      wrapped.__v117StickerClean=true;window.clonePageForIndex=clonePageForIndex=wrapped;
    }

    requestAnimationFrame(()=>requestAnimationFrame(bindNodes));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installStickerEngine,0),{once:true});
  else setTimeout(installStickerEngine,0);
})();
