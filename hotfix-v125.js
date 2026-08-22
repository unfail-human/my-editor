/* MY EDITOR V125 — clean text backgrounds, exact live-paper preview, tighter heading gap */
(() => {
  function installV125(){
    const $=id=>document.getElementById(id);
    const ed=$('editor');
    if(!ed || typeof current!=='function') return;
    document.documentElement.dataset.previewEngine='125';

    /* Keep backgrounds ONLY on the editor's explicit highlight spans. */
    function cleanAccidentalBackgrounds(root){
      if(!root) return;
      root.querySelectorAll('*').forEach(el=>{
        const isHighlight=el.matches?.("span.text-highlight[data-highlight='1']");
        if(isHighlight) return;
        if(el.style){
          el.style.removeProperty('background');
          el.style.removeProperty('background-color');
          el.style.removeProperty('background-image');
          el.removeAttribute('bgcolor');
          if(!el.getAttribute('style')?.trim()) el.removeAttribute('style');
        }
      });
    }
    function cleanHTML(html){
      const box=document.createElement('div');
      box.innerHTML=html||'';
      cleanAccidentalBackgrounds(box);
      return box.innerHTML;
    }
    function cleanSlotPages(){
      const s=current();
      if(!s?.pages) return;
      s.pages.forEach(p=>p.content=cleanHTML(p.content||''));
      cleanAccidentalBackgrounds(ed);
      try{persist?.()}catch{}
    }

    /* Every editor mutation is normalized after the browser finishes it. */
    ed.addEventListener('input',()=>requestAnimationFrame(()=>{
      cleanAccidentalBackgrounds(ed);
      const p=typeof currentPage==='function'?currentPage():null;
      if(p) p.content=ed.innerHTML;
      try{persist?.()}catch{}
    }),false);

    /* Allow a genuinely tighter title/body gap than the legacy zero floor. */
    const gap=$('templateHeadingGap');
    if(gap){
      gap.min='-120';
      gap.max='240';
      gap.step='1';
    }

    const originalApply=window.applyDocumentLayoutToElement;
    if(typeof originalApply==='function' && !originalApply.__v125Wrapped){
      const wrapped=function(paper,editor,title,subtitle,pageIndex,layout){
        originalApply(paper,editor,title,subtitle,pageIndex,layout);
        try{
          const ts=typeof ensureTemplateSettings==='function'?ensureTemplateSettings(layout||currentLayout()):null;
          const gapValue=Number(ts?.headingGap??0);
          if(gapValue<0 && paper){
            const hp=typeof headingPreset==='function'?headingPreset(ts?.headingPosition||layout?.headingPosition||'top-left',layout?.headingX,layout?.headingY):{y:0};
            const amount=Math.min(120,Math.abs(gapValue));
            if(hp.y<30){
              const raw=getComputedStyle(paper).getPropertyValue('--heading-safe-top').trim();
              const n=parseFloat(raw)||72;
              paper.style.setProperty('--heading-safe-top',Math.max(12,n-amount)+'px');
            }else if(hp.y<65){
              const raw=getComputedStyle(paper).getPropertyValue('--heading-safe-center').trim();
              const n=parseFloat(raw)||120;
              paper.style.setProperty('--heading-safe-center',Math.max(24,n-amount)+'px');
            }
          }
        }catch(e){console.warn('V125 heading gap adjustment',e)}
      };
      wrapped.__v125Wrapped=true;
      window.applyDocumentLayoutToElement=wrapped;
    }

    /* Preview/export clone = clone of the ACTUAL live paper after rendering that page.
       No second typography/layout calculation is allowed here. */
    window.clonePageForIndex=function(pageIndex,{forExport=false}={}){
      const s=current();
      const livePaper=$('paper');
      if(!s?.pages?.length || !livePaper) return document.createElement('div');

      try{saveCurrent?.(false)}catch{}
      cleanSlotPages();
      const originalIndex=s.currentPageIndex||0;
      const originalActive=document.activeElement;
      const originalScroll={x:window.scrollX,y:window.scrollY};

      s.currentPageIndex=Math.max(0,Math.min(s.pages.length-1,pageIndex));
      try{renderAll?.()}catch{}
      cleanAccidentalBackgrounds(ed);

      const rect=livePaper.getBoundingClientRect();
      const clone=livePaper.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
      clone.classList.add('render-clone','v125-exact-clone');
      if(forExport) clone.classList.add('export-render-clone');
      clone.style.setProperty('width',rect.width+'px','important');
      clone.style.setProperty('height',rect.height+'px','important');
      clone.style.setProperty('min-width',rect.width+'px','important');
      clone.style.setProperty('max-width',rect.width+'px','important');
      clone.style.setProperty('min-height',rect.height+'px','important');
      clone.style.setProperty('max-height',rect.height+'px','important');
      clone.style.setProperty('aspect-ratio','auto','important');

      /* cloned input values are not guaranteed to follow property values */
      const srcInputs=livePaper.querySelectorAll('input');
      const dstInputs=clone.querySelectorAll('input');
      srcInputs.forEach((src,i)=>{const dst=dstInputs[i];if(dst){dst.value=src.value;dst.setAttribute('value',src.value);dst.readOnly=true;dst.tabIndex=-1}});
      const cloneEd=clone.querySelector('.editor');
      if(cloneEd){
        cloneEd.removeAttribute('contenteditable');
        cleanAccidentalBackgrounds(cloneEd);
      }
      clone.querySelectorAll('.selected,.v115-selected,.v117-selected,.v109-sticker-tools,.v112-sticker-tools,.v115-sticker-tools').forEach(el=>{
        el.classList.remove('selected','v115-selected','v117-selected');
        if(el.classList.contains('v109-sticker-tools')||el.classList.contains('v112-sticker-tools')||el.classList.contains('v115-sticker-tools'))el.remove();
      });
      try{forceCenteredPageNumber?.(clone)}catch{}

      s.currentPageIndex=originalIndex;
      try{renderAll?.()}catch{}
      try{window.scrollTo(originalScroll.x,originalScroll.y)}catch{}
      try{if(originalActive && originalActive!==document.body) originalActive.focus({preventScroll:true})}catch{}
      return clone;
    };

    setTimeout(()=>{
      cleanSlotPages();
      try{renderAll?.()}catch{}
    },500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV125,0),{once:true});
  else setTimeout(installV125,0);
})();
