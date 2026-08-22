/* MY EDITOR V113/V114 — sticker edit mode with pointer priority */
(() => {
  function installStickerEngine(){
    const paper=document.getElementById('paper');
    const backgroundPanel=document.querySelector('.panel-body[data-panel="background"]');
    if(!paper||!backgroundPanel||typeof current!=='function')return;

    let selectedId=null,drag=null,resize=null;
    const list=()=>{const s=current();if(!s.background)s.background=typeof defaultBackground==='function'?defaultBackground():{};if(!Array.isArray(s.background.stickers))s.background.stickers=[];return s.background.stickers};
    const layer=()=>paper.querySelector(':scope > .v109-sticker-layer');
    const dataFor=n=>list().find(s=>s.id===n?.dataset?.stickerId)||null;
    const persistSafe=()=>{try{persist?.()}catch(e){console.error(e)}};

    function modeActive(){return backgroundPanel.classList.contains('active')&&!paper.classList.contains('v110-capturing')}
    function syncMode(){paper.classList.toggle('v114-sticker-mode',modeActive());refresh();}

    function removeTools(){layer()?.querySelectorAll('.v114-sticker-tool,.v114-resize').forEach(n=>n.remove())}
    function positionTools(node){
      const l=layer();if(!l||!node)return;
      const lr=l.getBoundingClientRect(),r=node.getBoundingClientRect();
      const lock=l.querySelector('.v114-lock'),del=l.querySelector('.v114-delete'),handle=l.querySelector('.v114-resize');
      if(lock){lock.style.left=`${r.left-lr.left}px`;lock.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(del){del.style.left=`${r.right-lr.left}px`;del.style.top=`${Math.max(7,r.top-lr.top-13)}px`}
      if(handle){handle.style.left=`${r.right-lr.left}px`;handle.style.top=`${r.bottom-lr.top}px`}
    }

    function deleteSticker(data){
      const a=list(),i=a.findIndex(x=>x.id===data.id);if(i>=0)a.splice(i,1);
      selectedId=null;persistSafe();try{renderAll?.()}catch{};requestAnimationFrame(refresh);
    }

    function addTools(node,data){
      const l=layer();if(!l||!modeActive())return;
      const lock=document.createElement('button'),del=document.createElement('button');
      lock.type=del.type='button';lock.className='v114-sticker-tool v114-lock';del.className='v114-sticker-tool v114-delete';
      lock.textContent=data.locked?'🔒':'🔓';del.textContent='×';
      lock.onpointerdown=del.onpointerdown=e=>{e.preventDefault();e.stopPropagation()};
      lock.onclick=e=>{e.preventDefault();e.stopPropagation();data.locked=!data.locked;persistSafe();refresh()};
      del.onclick=e=>{e.preventDefault();e.stopPropagation();deleteSticker(data)};
      l.append(lock,del);
      if(!data.locked){
        const h=document.createElement('span');h.className='v114-resize';l.appendChild(h);
        h.addEventListener('pointerdown',e=>{
          e.preventDefault();e.stopPropagation();
          const pr=paper.getBoundingClientRect();resize={node,data,startX:e.clientX,startWidth:Number(data.width||24),paperWidth:pr.width};
          const move=ev=>{if(!resize)return;data.width=Math.max(4,Math.min(95,resize.startWidth+((ev.clientX-resize.startX)/resize.paperWidth)*100));node.style.width=`${data.width}%`;positionTools(node)};
          const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);resize=null;persistSafe()};
          window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
        },true);
      }
      positionTools(node,data);
    }

    function refresh(){
      const l=layer();if(!l)return;removeTools();
      l.querySelectorAll('.v109-sticker-node').forEach(node=>{
        const d=dataFor(node);if(!d)return;
        node.style.left=`${Number(d.x??50)}%`;node.style.top=`${Number(d.y??50)}%`;node.style.width=`${Number(d.width??24)}%`;
        node.style.transform='translate(-50%,-50%)';node.style.opacity='1';
        node.classList.toggle('selected',d.id===selectedId);node.classList.toggle('v114-locked',!!d.locked);
        if(d.id===selectedId&&modeActive())addTools(node,d);
      });
    }

    /* Capture at PAPER, before editor/old sticker listeners. In sticker mode this is the
       single owner of pointer input, so dragging can never turn into text selection. */
    paper.addEventListener('pointerdown',e=>{
      if(!modeActive())return;
      const node=e.target.closest?.('.v109-sticker-node');
      if(!node){selectedId=null;refresh();return;}
      const data=dataFor(node);if(!data)return;
      e.preventDefault();e.stopImmediatePropagation();
      selectedId=data.id;refresh();
      if(data.locked)return;
      const pr=paper.getBoundingClientRect();
      const centerX=pr.left+(Number(data.x??50)/100)*pr.width,centerY=pr.top+(Number(data.y??50)/100)*pr.height;
      drag={node,data,rect:pr,dx:e.clientX-centerX,dy:e.clientY-centerY};
      node.classList.add('v114-dragging');
      const move=ev=>{
        if(!drag)return;ev.preventDefault();
        data.x=Math.max(0,Math.min(100,((ev.clientX-drag.dx-pr.left)/pr.width)*100));
        data.y=Math.max(0,Math.min(100,((ev.clientY-drag.dy-pr.top)/pr.height)*100));
        node.style.left=`${data.x}%`;node.style.top=`${data.y}%`;positionTools(node);
      };
      const up=()=>{
        window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);
        node.classList.remove('v114-dragging');drag=null;persistSafe();refresh();
      };
      window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
    },true);

    document.addEventListener('click',e=>{
      if(e.target.closest?.('.tab,[data-tab],.right-panel'))requestAnimationFrame(syncMode);
      const row=e.target.closest?.('.v112-sticker-row');if(row)requestAnimationFrame(()=>{const active=document.querySelector('.v112-sticker-row.active');if(active){const rows=[...document.querySelectorAll('.v112-sticker-row')],idx=rows.indexOf(active),rev=[...list()].reverse();if(rev[idx])selectedId=rev[idx].id;}refresh()});
    },true);

    const oldRender=window.renderAll;
    if(typeof oldRender==='function'&&!oldRender.__v114Sticker){
      const wrapped=function(...args){const out=oldRender.apply(this,args);requestAnimationFrame(()=>requestAnimationFrame(()=>{syncMode();refresh()}));return out};
      wrapped.__v114Sticker=true;window.renderAll=renderAll=wrapped;
    }

    requestAnimationFrame(()=>requestAnimationFrame(syncMode));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installStickerEngine,0),{once:true});else setTimeout(installStickerEngine,0);
})();
