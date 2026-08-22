/* MY EDITOR V115 — direct sticker interaction, independent of tab state */
(() => {
  function installStickerEngine(){
    const paper=document.getElementById('paper');
    if(!paper||typeof current!=='function')return;

    let selectedId=null,drag=null,resize=null;
    const list=()=>{const s=current();if(!s.background)s.background=typeof defaultBackground==='function'?defaultBackground():{};if(!Array.isArray(s.background.stickers))s.background.stickers=[];return s.background.stickers};
    const layer=()=>paper.querySelector(':scope > .v109-sticker-layer');
    const dataFor=n=>list().find(s=>s.id===n?.dataset?.stickerId)||null;
    const persistSafe=()=>{try{if(typeof persist==='function')persist()}catch(e){console.error(e)}};

    function removeTools(){layer()?.querySelectorAll('.v115-tool,.v115-resize').forEach(n=>n.remove())}
    function positionTools(node){
      const l=layer();if(!l||!node)return;
      const lr=l.getBoundingClientRect(),r=node.getBoundingClientRect();
      const lock=l.querySelector('.v115-lock'),del=l.querySelector('.v115-delete'),handle=l.querySelector('.v115-resize');
      if(lock){lock.style.left=`${r.left-lr.left}px`;lock.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(del){del.style.left=`${r.right-lr.left}px`;del.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(handle){handle.style.left=`${r.right-lr.left}px`;handle.style.top=`${r.bottom-lr.top}px`}
    }
    function deleteSticker(data){
      const a=list(),i=a.findIndex(x=>x.id===data.id);if(i>=0)a.splice(i,1);
      selectedId=null;persistSafe();try{if(typeof renderAll==='function')renderAll()}catch{};requestAnimationFrame(bindNodes);
    }
    function addTools(node,data){
      const l=layer();if(!l||paper.classList.contains('v110-capturing'))return;
      const lock=document.createElement('button'),del=document.createElement('button');
      lock.type=del.type='button';lock.className='v115-tool v115-lock';del.className='v115-tool v115-delete';
      lock.textContent=data.locked?'🔒':'🔓';lock.title=data.locked?'위치 고정 해제':'위치 고정';del.textContent='×';del.title='삭제';
      lock.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
      del.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
      lock.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();data.locked=!data.locked;persistSafe();bindNodes()});
      del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteSticker(data)});
      l.append(lock,del);
      if(!data.locked){
        const h=document.createElement('span');h.className='v115-resize';h.title='드래그해서 크기 변경';l.appendChild(h);
        h.addEventListener('pointerdown',e=>{
          e.preventDefault();e.stopImmediatePropagation();
          const pr=paper.getBoundingClientRect();resize={node,data,startX:e.clientX,startWidth:Number(data.width||24),paperWidth:pr.width};
          const move=ev=>{if(!resize)return;ev.preventDefault();data.width=Math.max(4,Math.min(95,resize.startWidth+((ev.clientX-resize.startX)/resize.paperWidth)*100));node.style.width=`${data.width}%`;positionTools(node)};
          const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);resize=null;persistSafe();bindNodes()};
          window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
        },true);
      }
      positionTools(node);
    }

    function selectNode(node,data){
      selectedId=data.id;
      const l=layer();if(!l)return;
      l.querySelectorAll('.v109-sticker-node').forEach(n=>n.classList.toggle('selected',n.dataset.stickerId===selectedId));
      removeTools();addTools(node,data);
    }

    function startDrag(e,node,data){
      e.preventDefault();e.stopImmediatePropagation();
      selectNode(node,data);
      if(data.locked)return;
      const pr=paper.getBoundingClientRect();
      const cx=pr.left+(Number(data.x??50)/100)*pr.width,cy=pr.top+(Number(data.y??50)/100)*pr.height;
      drag={node,data,rect:pr,dx:e.clientX-cx,dy:e.clientY-cy};node.classList.add('v115-dragging');
      try{node.setPointerCapture?.(e.pointerId)}catch{}
      const move=ev=>{
        if(!drag)return;ev.preventDefault();
        data.x=Math.max(0,Math.min(100,((ev.clientX-drag.dx-drag.rect.left)/drag.rect.width)*100));
        data.y=Math.max(0,Math.min(100,((ev.clientY-drag.dy-drag.rect.top)/drag.rect.height)*100));
        node.style.left=`${data.x}%`;node.style.top=`${data.y}%`;positionTools(node);
      };
      const up=()=>{
        window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);
        node.classList.remove('v115-dragging');drag=null;persistSafe();bindNodes();
      };
      window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
    }

    function cleanAndBind(oldNode){
      const data=dataFor(oldNode);if(!data)return null;
      /* v109 attached its own pointer listener directly to each image. Replacing the node
         removes every old listener, then V115 becomes the only drag owner. */
      const node=oldNode.cloneNode(true);oldNode.replaceWith(node);
      node.style.left=`${Number(data.x??50)}%`;node.style.top=`${Number(data.y??50)}%`;node.style.width=`${Number(data.width??24)}%`;
      node.style.transform='translate(-50%,-50%)';node.style.opacity='1';node.style.pointerEvents='auto';node.style.touchAction='none';
      node.classList.toggle('selected',data.id===selectedId);node.classList.toggle('v115-locked',!!data.locked);
      node.addEventListener('pointerdown',e=>startDrag(e,node,data),true);
      node.addEventListener('dragstart',e=>e.preventDefault());
      return node;
    }

    function bindNodes(){
      if(drag||resize)return;
      const l=layer();if(!l)return;removeTools();
      l.style.pointerEvents='none';l.style.zIndex='100';
      let selectedNode=null,selectedData=null;
      [...l.querySelectorAll('.v109-sticker-node')].forEach(old=>{const d=dataFor(old);if(!d)return;const node=cleanAndBind(old);if(d.id===selectedId){selectedNode=node;selectedData=d}});
      if(selectedNode&&selectedData)addTools(selectedNode,selectedData);
    }

    const oldRender=window.renderAll;
    if(typeof oldRender==='function'&&!oldRender.__v115Sticker){
      const wrapped=function(...args){const out=oldRender.apply(this,args);requestAnimationFrame(()=>requestAnimationFrame(bindNodes));return out};
      wrapped.__v115Sticker=true;window.renderAll=renderAll=wrapped;
    }

    document.addEventListener('click',e=>{
      const row=e.target.closest?.('.v112-sticker-row');if(!row)return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const rows=[...document.querySelectorAll('.v112-sticker-row')],idx=rows.indexOf(row),rev=[...list()].reverse();
        if(rev[idx])selectedId=rev[idx].id;bindNodes();
      }));
    },true);

    requestAnimationFrame(()=>requestAnimationFrame(bindNodes));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installStickerEngine,0),{once:true});else setTimeout(installStickerEngine,0);
})();
