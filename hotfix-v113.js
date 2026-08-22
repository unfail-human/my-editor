/* MY EDITOR V113 — isolated sticker pointer engine */
(() => {
  function installV113(){
    const paper=document.getElementById('paper');
    if(!paper || typeof current!=='function') return;

    let selectedId=null;
    let drag=null;
    let resize=null;

    const getStickers=()=>{
      const s=current();
      if(!s.background) s.background=typeof defaultBackground==='function'?defaultBackground():{};
      if(!Array.isArray(s.background.stickers)) s.background.stickers=[];
      return s.background.stickers;
    };
    const getLayer=()=>paper.querySelector(':scope > .v109-sticker-layer');

    function persistSafe(){ try{ if(typeof persist==='function') persist(); }catch(err){ console.error(err); } }

    function removeTools(){
      getLayer()?.querySelectorAll('.v113-tool,.v113-resize').forEach(n=>n.remove());
    }

    function dataFor(node){
      return getStickers().find(s=>s.id===node?.dataset?.stickerId)||null;
    }

    function positionTools(node){
      const layer=getLayer(); if(!layer||!node)return;
      const lr=layer.getBoundingClientRect(), r=node.getBoundingClientRect();
      const lock=layer.querySelector('.v113-lock');
      const del=layer.querySelector('.v113-delete');
      const handle=layer.querySelector('.v113-resize');
      if(lock){lock.style.left=`${r.left-lr.left}px`;lock.style.top=`${Math.max(5,r.top-lr.top-12)}px`;}
      if(del){del.style.left=`${r.right-lr.left}px`;del.style.top=`${Math.max(5,r.top-lr.top-12)}px`;}
      if(handle){handle.style.left=`${r.right-lr.left}px`;handle.style.top=`${r.bottom-lr.top}px`;}
    }

    function selectNode(node,data){
      const layer=getLayer(); if(!layer)return;
      selectedId=data.id;
      layer.querySelectorAll('.v109-sticker-node').forEach(n=>n.classList.toggle('selected',n===node));
      removeTools();

      const lock=document.createElement('button');
      lock.type='button'; lock.className='v113-tool v113-lock';
      lock.textContent=data.locked?'🔒':'🔓';
      lock.title=data.locked?'위치 고정 해제':'위치 고정';
      lock.addEventListener('pointerdown',e=>e.stopPropagation());
      lock.addEventListener('click',e=>{
        e.preventDefault(); e.stopPropagation();
        data.locked=!data.locked; persistSafe();
        bindCleanNodes();
      });

      const del=document.createElement('button');
      del.type='button'; del.className='v113-tool v113-delete';
      del.textContent='×'; del.title='삭제';
      del.addEventListener('pointerdown',e=>e.stopPropagation());
      del.addEventListener('click',e=>{
        e.preventDefault(); e.stopPropagation();
        const list=getStickers(),i=list.findIndex(s=>s.id===data.id);
        if(i>=0) list.splice(i,1);
        selectedId=null; persistSafe();
        try{if(typeof renderAll==='function')renderAll();}catch{}
        requestAnimationFrame(bindCleanNodes);
      });
      layer.append(lock,del);

      if(!data.locked){
        const handle=document.createElement('span');
        handle.className='v113-resize'; handle.title='드래그해서 크기 변경';
        handle.addEventListener('pointerdown',e=>{
          e.preventDefault();e.stopPropagation();
          const rect=paper.getBoundingClientRect();
          resize={node,data,startX:e.clientX,startWidth:Number(data.width||24),paperWidth:rect.width};
          const move=ev=>{
            if(!resize)return;
            data.width=Math.max(4,Math.min(95,resize.startWidth+((ev.clientX-resize.startX)/resize.paperWidth)*100));
            node.style.width=`${data.width}%`;
            positionTools(node);
          };
          const up=()=>{
            window.removeEventListener('pointermove',move,true);
            window.removeEventListener('pointerup',up,true);
            window.removeEventListener('pointercancel',up,true);
            resize=null;persistSafe();
          };
          window.addEventListener('pointermove',move,true);
          window.addEventListener('pointerup',up,true);
          window.addEventListener('pointercancel',up,true);
        });
        layer.appendChild(handle);
      }
      positionTools(node);
    }

    function startDrag(e,node,data){
      e.preventDefault();
      e.stopImmediatePropagation();
      selectNode(node,data);
      if(data.locked)return;

      const rect=paper.getBoundingClientRect();
      const cx=rect.left+(Number(data.x??50)/100)*rect.width;
      const cy=rect.top+(Number(data.y??50)/100)*rect.height;
      drag={node,data,rect,dx:e.clientX-cx,dy:e.clientY-cy};
      node.classList.add('v113-dragging');

      const move=ev=>{
        if(!drag)return;
        const x=((ev.clientX-drag.dx-drag.rect.left)/drag.rect.width)*100;
        const y=((ev.clientY-drag.dy-drag.rect.top)/drag.rect.height)*100;
        data.x=Math.max(0,Math.min(100,x));
        data.y=Math.max(0,Math.min(100,y));
        node.style.left=`${data.x}%`;
        node.style.top=`${data.y}%`;
        positionTools(node);
      };
      const up=()=>{
        window.removeEventListener('pointermove',move,true);
        window.removeEventListener('pointerup',up,true);
        window.removeEventListener('pointercancel',up,true);
        node.classList.remove('v113-dragging');
        drag=null;persistSafe();
      };
      window.addEventListener('pointermove',move,true);
      window.addEventListener('pointerup',up,true);
      window.addEventListener('pointercancel',up,true);
    }

    function cleanNode(oldNode){
      const data=dataFor(oldNode); if(!data)return oldNode;
      // cloneNode removes every addEventListener handler installed by older sticker engines.
      const node=oldNode.cloneNode(true);
      oldNode.replaceWith(node);
      node.style.pointerEvents='auto';
      node.style.touchAction='none';
      node.style.userSelect='none';
      node.style.webkitUserDrag='none';
      node.style.left=`${Number(data.x??50)}%`;
      node.style.top=`${Number(data.y??50)}%`;
      node.style.width=`${Number(data.width??24)}%`;
      node.style.transform='translate(-50%,-50%)';
      node.style.opacity='1';
      node.classList.toggle('selected',data.id===selectedId);
      node.classList.toggle('v113-locked',!!data.locked);
      node.addEventListener('pointerdown',e=>startDrag(e,node,data),true);
      return node;
    }

    function bindCleanNodes(){
      if(drag||resize)return;
      const layer=getLayer(); if(!layer)return;
      removeTools();
      let selectedNode=null, selectedData=null;
      [...layer.querySelectorAll('.v109-sticker-node')].forEach(old=>{
        const data=dataFor(old); if(!data)return;
        const node=cleanNode(old);
        if(data.id===selectedId){selectedNode=node;selectedData=data;}
      });
      if(selectedNode&&selectedData) selectNode(selectedNode,selectedData);
    }

    // Run after every render because v109 recreates sticker images during renderAll().
    const previousRenderAll=window.renderAll;
    if(typeof previousRenderAll==='function'&&!previousRenderAll.__v113Sticker){
      const wrapped=function(...args){
        const out=previousRenderAll.apply(this,args);
        requestAnimationFrame(()=>requestAnimationFrame(bindCleanNodes));
        return out;
      };
      wrapped.__v113Sticker=true;
      window.renderAll=renderAll=wrapped;
    }

    // Selecting from the sticker list should also select the matching canvas item.
    document.addEventListener('click',e=>{
      const row=e.target.closest?.('.v112-sticker-row');
      if(!row)return;
      requestAnimationFrame(()=>requestAnimationFrame(bindCleanNodes));
    },true);

    requestAnimationFrame(()=>requestAnimationFrame(bindCleanNodes));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installV113,0),{once:true});
  else setTimeout(installV113,0);
})();
