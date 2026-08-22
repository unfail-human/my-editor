/* MY EDITOR V109/V117 — render-only sticker layer + lightweight typography */
(() => {
  function installV109(){
    const paper=document.getElementById('paper');
    if(!paper||typeof current!=='function')return;

    function stickers(){
      const s=current();
      if(!s.background)s.background=typeof defaultBackground==='function'?defaultBackground():{};
      if(!Array.isArray(s.background.stickers))s.background.stickers=[];
      return s.background.stickers;
    }
    function ensureLayer(target=paper){
      let layer=target.querySelector(':scope > .v109-sticker-layer');
      if(!layer){
        layer=document.createElement('div');layer.className='v109-sticker-layer';
        const ed=target.querySelector('.editor');
        if(ed)target.insertBefore(layer,ed);else target.appendChild(layer);
      }
      return layer;
    }
    function renderStickers(target=paper){
      const layer=ensureLayer(target);layer.innerHTML='';
      for(const data of stickers()){
        const node=document.createElement('img');
        node.className='v109-sticker-node';node.dataset.stickerId=data.id;node.src=data.src;node.alt='';node.draggable=false;
        node.style.left=`${Number(data.x??50)}%`;node.style.top=`${Number(data.y??50)}%`;node.style.width=`${Number(data.width??24)}%`;
        node.style.opacity='1';node.style.transform='translate(-50%,-50%)';
        layer.appendChild(node);
      }
    }

    /* One renderer only. No selection state, no pointer handlers, no delayed page reflow. */
    const baseRender=window.renderAll;
    if(typeof baseRender==='function'&&!baseRender.__v117StickerRender){
      const wrapped=function(...args){const out=baseRender.apply(this,args);requestAnimationFrame(()=>renderStickers());return out};
      wrapped.__v117StickerRender=true;window.renderAll=renderAll=wrapped;
    }

    /* Keep only the inexpensive typography memoization from the old v109 patch. */
    if(typeof window.applyTypography==='function'&&!window.applyTypography.__v117Memoized){
      const base=window.applyTypography;let last='';
      const wrapped=function(){
        let sig='';
        try{const t=typeof effectiveTypography==='function'?effectiveTypography():null,l=typeof currentLayout==='function'?currentLayout():null;sig=JSON.stringify([t?.fontFamily,t?.fontSizePt,t?.letterSpacing,t?.lineHeight,t?.paragraphSpacing,t?.widthScale,t?.textColor,l?.writingMode,current()?.currentPageIndex]);}catch{}
        if(sig&&sig===last)return;last=sig;return base();
      };
      wrapped.__v117Memoized=true;window.applyTypography=applyTypography=wrapped;
    }

    renderStickers();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV109,0),{once:true});
  else setTimeout(installV109,0);
})();
