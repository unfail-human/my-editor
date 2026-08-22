/* MY EDITOR V126 — exact live-paper clone + fill earlier page whitespace */
(() => {
  function installV126(){
    const $=id=>document.getElementById(id);
    const livePaper=$('paper'), liveEditor=$('editor');
    if(!livePaper || !liveEditor || typeof current!=='function') return;
    document.documentElement.dataset.previewEngine='126';

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

    /* Clone the paper currently visible on screen. Do NOT renderAll/recalculate it. */
    function cloneVisiblePaper(){
      const rect=livePaper.getBoundingClientRect();
      const clone=livePaper.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
      clone.classList.add('render-clone','v126-exact-clone');
      for(const prop of ['width','height','min-width','max-width','min-height','max-height']){
        clone.style.setProperty(prop,(prop.includes('width')?rect.width:rect.height)+'px','important');
      }
      clone.style.setProperty('aspect-ratio','auto','important');
      cleanCloneUI(clone);
      return clone;
    }

    /* For another page, temporarily load it through the SAME live renderer, clone it,
       then restore. For the current page there is zero rerendering. */
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

    function bodyBottomLimit(){
      const er=liveEditor.getBoundingClientRect();
      const footer=livePaper.querySelector('.paper-footer');
      const fr=footer?.getBoundingClientRect();
      return fr ? Math.max(0,fr.top-er.top-10) : liveEditor.clientHeight;
    }
    function editorHasRoom(){
      const limit=bodyBottomLimit();
      const last=[...liveEditor.children].filter(el=>el.offsetParent!==null).at(-1);
      if(!last) return true;
      const er=liveEditor.getBoundingClientRect(), lr=last.getBoundingClientRect();
      return (lr.bottom-er.top) < limit-6;
    }
    function fitsNow(){
      const limit=bodyBottomLimit();
      const last=[...liveEditor.children].filter(el=>el.offsetParent!==null).at(-1);
      if(!last)return true;
      const er=liveEditor.getBoundingClientRect(),lr=last.getBoundingClientRect();
      return lr.bottom-er.top <= limit;
    }

    /* Pull complete leading blocks from following pages whenever the current page
       has visible room. This deliberately works backwards page-by-page so deleting
       text on page 1 immediately draws page 2/3 content forward. */
    function pullForwardFromFollowingPages(){
      const s=current();
      if(!s?.pages?.length || s.currentPageIndex>=s.pages.length-1 || !editorHasRoom()) return false;
      let changed=false;
      const original=s.currentPageIndex;
      let guard=0;
      while(guard++<120 && s.currentPageIndex<s.pages.length-1 && editorHasRoom()){
        const next=s.pages[s.currentPageIndex+1];
        const box=document.createElement('div'); box.innerHTML=next.content||'';
        const first=box.firstElementChild || (box.firstChild && box.firstChild.nodeType===3 ? box.firstChild : null);
        if(!first) break;
        const candidate=first.cloneNode(true);
        liveEditor.appendChild(candidate);
        if(!fitsNow()) { candidate.remove(); break; }
        first.remove();
        next.content=box.innerHTML;
        currentPage().content=liveEditor.innerHTML;
        changed=true;
        if(!strip?.(next.content||'')?.trim?.() && !(next.content||'').replace(/<[^>]*>/g,'').trim()){
          if(s.pages.length>1) s.pages.splice(s.currentPageIndex+1,1);
        }
      }
      s.currentPageIndex=original;
      if(changed){try{persist?.()}catch{} try{renderAll?.()}catch{}}
      return changed;
    }

    let pullTimer=null;
    function schedulePull(){clearTimeout(pullTimer);pullTimer=setTimeout(()=>requestAnimationFrame(pullForwardFromFollowingPages),80);}
    liveEditor.addEventListener('input',schedulePull,false);
    liveEditor.addEventListener('keyup',e=>{if(e.key==='Backspace'||e.key==='Delete')schedulePull()},false);

    /* Preview current page must be an exact clone of what the user is looking at. */
    const previewBtn=$('previewBtn');
    if(previewBtn){
      previewBtn.addEventListener('click',()=>{
        requestAnimationFrame(()=>{
          const host=$('previewHost');
          if(!host)return;
          const s=current();
          if((window.previewPageIndex??s.currentPageIndex)===(s.currentPageIndex||0)){
            host.innerHTML=''; host.appendChild(cloneVisiblePaper());
            requestAnimationFrame(()=>requestAnimationFrame(()=>{try{fitPreviewPage?.()}catch{}}));
          }
        });
      },true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV126,0),{once:true});
  else setTimeout(installV126,0);
})();