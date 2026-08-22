/* MY EDITOR V126.1 — exact live-paper preview/export only */
(() => {
  function installV126(){
    const $=id=>document.getElementById(id);
    const livePaper=$('paper');
    if(!livePaper || typeof current!=='function') return;
    document.documentElement.dataset.previewEngine='126.1';

    function cleanCloneUI(clone){
      clone.querySelectorAll('.selected,.v115-selected,.v117-selected,.v109-sticker-tools,.v112-sticker-tools,.v115-sticker-tools').forEach(el=>{
        el.classList.remove('selected','v115-selected','v117-selected');
        if(/sticker-tools/.test(el.className||'')) el.remove();
      });
      clone.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
      const srcInputs=livePaper.querySelectorAll('input');
      const dstInputs=clone.querySelectorAll('input');
      srcInputs.forEach((src,i)=>{const dst=dstInputs[i];if(dst){dst.value=src.value;dst.setAttribute('value',src.value);dst.readOnly=true;dst.tabIndex=-1;}});
    }

    function cloneVisiblePaper(){
      const rect=livePaper.getBoundingClientRect();
      const clone=livePaper.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
      clone.classList.add('render-clone','v126-exact-clone');
      clone.style.setProperty('width',rect.width+'px','important');
      clone.style.setProperty('height',rect.height+'px','important');
      clone.style.setProperty('min-width',rect.width+'px','important');
      clone.style.setProperty('max-width',rect.width+'px','important');
      clone.style.setProperty('min-height',rect.height+'px','important');
      clone.style.setProperty('max-height',rect.height+'px','important');
      clone.style.setProperty('aspect-ratio','auto','important');
      cleanCloneUI(clone);
      return clone;
    }

    window.clonePageForIndex=function(pageIndex,{forExport=false}={}){
      try{saveCurrent?.(false)}catch{}
      const s=current();
      const wanted=Math.max(0,Math.min(s.pages.length-1,pageIndex));
      const original=s.currentPageIndex||0;
      if(wanted===original){
        const clone=cloneVisiblePaper();
        if(forExport)clone.classList.add('export-render-clone');
        return clone;
      }
      s.currentPageIndex=wanted;
      try{renderAll?.()}catch{}
      const clone=cloneVisiblePaper();
      if(forExport)clone.classList.add('export-render-clone');
      s.currentPageIndex=original;
      try{renderAll?.()}catch{}
      return clone;
    };

    const previewBtn=$('previewBtn');
    if(previewBtn){
      previewBtn.addEventListener('click',()=>{
        requestAnimationFrame(()=>{
          const host=$('previewHost');
          if(!host)return;
          const s=current();
          const visibleIndex=s.currentPageIndex||0;
          if((window.previewPageIndex??visibleIndex)===visibleIndex){
            host.innerHTML='';
            host.appendChild(cloneVisiblePaper());
            requestAnimationFrame(()=>requestAnimationFrame(()=>{try{fitPreviewPage?.()}catch{}}));
          }
        });
      },true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV126,0),{once:true});
  else setTimeout(installV126,0);
})();