/* MY EDITOR V120 — compact continuous pagination + first-page navigation */
(() => {
  function installContinuousPagination(){
    const $id=id=>document.getElementById(id), ed=$id('editor');
    if(!ed||typeof current!=='function'||typeof extractOverflowChunks!=='function')return;

    let running=false,timer=null,restoreSeq=0,lastInputType='',pasteJustHappened=false;
    try{if(typeof handleEditorInput==='function')ed.removeEventListener('input',handleEditorInput)}catch{}

    function textLength(html){
      if(typeof strip==='function')return strip(html||'').length;
      const box=document.createElement('div');box.innerHTML=html||'';return (box.textContent||'').length;
    }
    function localCaret(){
      const sel=getSelection();if(!sel?.rangeCount)return null;
      const r=sel.getRangeAt(0);if(!ed.contains(r.startContainer))return null;
      const pre=r.cloneRange();pre.selectNodeContents(ed);pre.setEnd(r.startContainer,r.startOffset);return pre.toString().length;
    }
    function isBoundary(page){return page?.userManualPage===true;}
    function rootIndex(slot,index){let i=Math.max(0,Math.min(index,slot.pages.length-1));while(i>0&&!isBoundary(slot.pages[i]))i--;return i;}
    function chainEnd(slot,root){let i=root+1;while(i<slot.pages.length&&!isBoundary(slot.pages[i]))i++;return i;}

    function markerForLiveCaret(){
      const slot=current(),index=slot.currentPageIndex||0,local=localCaret();if(local==null)return null;
      const root=rootIndex(slot,index);let absolute=local;
      for(let i=root;i<index;i++)absolute+=textLength(slot.pages[i]?.content||'');
      return {root,absolute};
    }
    function saveLive(){
      const slot=current(),p=slot.pages?.[slot.currentPageIndex||0];if(!p)return;
      if($id('titleInput'))p.title=$id('titleInput').value;
      if($id('subtitleInput'))p.subtitle=$id('subtitleInput').value;
      p.content=ed.innerHTML;slot.updatedAt=new Date().toISOString();
    }
    function loadForMeasure(slot,index){
      const p=slot.pages[index];slot.currentPageIndex=index;
      if($id('titleInput'))$id('titleInput').value=p.title||'';
      if($id('subtitleInput'))$id('subtitleInput').value=p.subtitle||'';
      ed.innerHTML=p.content||'';
      try{applyTypography?.()}catch{};try{applyDocumentLayout?.()}catch{};try{normalizeEditorTopLevel?.()}catch{};
      void ed.offsetHeight;
    }
    function targetForAbsolute(slot,root,absolute){
      let left=Math.max(0,Number(absolute)||0),end=chainEnd(slot,root);
      for(let i=root;i<end;i++){
        const len=textLength(slot.pages[i]?.content||'');
        if(left<=len||i===end-1)return {index:i,offset:Math.min(left,len)};
        left-=len;
      }
      return {index:root,offset:0};
    }
    function setCaret(offset){
      offset=Math.max(0,Number(offset)||0);
      const walker=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let total=0,node;
      while((node=walker.nextNode())){
        const len=node.nodeValue.length;
        if(offset<=total+len){const r=document.createRange();r.setStart(node,Math.max(0,offset-total));r.collapse(true);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);try{savedRange=r.cloneRange()}catch{};ed.focus({preventScroll:true});return;}
        total+=len;
      }
      const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);try{savedRange=r.cloneRange()}catch{};ed.focus({preventScroll:true});
    }
    function finish(slot,target,scrollState,focusCaret=true){
      slot.currentPageIndex=Math.max(0,Math.min(target.index,slot.pages.length-1));
      try{persist?.()}catch{};try{renderAll?.()}catch{}
      if(!focusCaret)return;
      const seq=++restoreSeq;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(seq!==restoreSeq)return;setCaret(target.offset);if(scrollState){try{window.scrollTo(scrollState.x,scrollState.y)}catch{}if(scrollState.workspace&&scrollState.workspaceEl){scrollState.workspaceEl.scrollLeft=scrollState.workspace.x;scrollState.workspaceEl.scrollTop=scrollState.workspace.y;}}}));
    }
    function liveOverflow(){return typeof editorOverflows==='function'?editorOverflows():(ed.scrollHeight>ed.clientHeight+1||ed.scrollWidth>ed.clientWidth+1);}
    function htmlOf(node){return typeof nodeHTML==='function'?nodeHTML(node):(node.outerHTML||node.textContent||'');}

    /* The old extractor stopped as soon as removing a whole trailing block made the page fit.
       That preserved the old page boundary and left visible blank space. This extractor then
       tries to put the FIRST moved block back and uses splitLastBlockToFit() to keep the
       longest prefix that actually fits. Therefore every page is packed to its real capacity. */
    function extractCompactOverflow(){
      try{normalizeEditorTopLevel?.()}catch{}
      const moved=[];let safety=0;
      while(liveOverflow()&&safety++<300){
        if(ed.childNodes.length>1){
          const node=ed.lastChild;moved.unshift(htmlOf(node));node.remove();continue;
        }
        const suffix=typeof splitLastBlockToFit==='function'?splitLastBlockToFit():null;
        if(suffix){moved.unshift(suffix);continue;}
        break;
      }

      /* Fill remaining room from the beginning of the overflow stream. */
      safety=0;
      while(moved.length&&safety++<300){
        const box=document.createElement('template');box.innerHTML=moved[0];
        const nodes=[...box.content.childNodes];if(!nodes.length){moved.shift();continue;}
        const appended=[];for(const n of nodes){const c=n.cloneNode(true);ed.appendChild(c);appended.push(c);}
        void ed.offsetHeight;
        if(!liveOverflow()){moved.shift();continue;}

        /* If the candidate is one splittable block, retain as much of its prefix as fits. */
        if(appended.length===1&&ed.lastChild===appended[0]&&typeof splitLastBlockToFit==='function'){
          const suffix=splitLastBlockToFit();
          if(suffix){moved[0]=suffix;break;}
        }
        appended.forEach(n=>{if(n.isConnected)n.remove()});
        break;
      }
      return moved;
    }

    function reflowCurrentChain({marker=null,announce=true,force=false,goFirst=false}={}){
      if(running||isPaginating)return false;
      const slot=current();if(!slot?.pages?.length)return false;
      saveLive();
      const original=slot.currentPageIndex||0,root=marker?.root??rootIndex(slot,original),end=chainEnd(slot,root);
      const scrollEl=document.querySelector('.workspace');
      const scrollState={x:window.scrollX,y:window.scrollY,workspaceEl:scrollEl,workspace:scrollEl?{x:scrollEl.scrollLeft,y:scrollEl.scrollTop}:null};
      const absolute=marker?.absolute??null;
      if(!force&&end-root===1&&original===root&&!liveOverflow()){try{persist?.();updateCount?.();renderSlots?.()}catch{};return false;}

      let combined='';for(let i=root;i<end;i++)combined+=slot.pages[i]?.content||'';
      const rootPage=slot.pages[root];
      slot.pages.splice(root+1,Math.max(0,end-root-1));rootPage.content=combined;

      running=true;isPaginating=true;let created=0;
      try{
        let index=root,carry=combined;
        while(true){
          const page=slot.pages[index];page.content=carry;loadForMeasure(slot,index);
          const moved=extractCompactOverflow();page.content=ed.innerHTML;
          if(!moved.length)break;
          carry=moved.join('');
          const next=newPage(index+2,true);next.autoGenerated=true;next.manualBreakBefore=false;next.userManualPage=false;
          next.title=rootPage.title||'';next.subtitle=rootPage.subtitle||'';next.content=carry;next.pageTypography={};next.pageDecorations=[];
          slot.pages.splice(index+1,0,next);index++;created++;if(created>200)throw new Error('pagination safety limit');
        }
        try{renumberPages?.()}catch{}
        const target=goFirst?{index:root,offset:0}:(absolute==null?{index:Math.min(original,slot.pages.length-1),offset:0}:targetForAbsolute(slot,root,absolute));
        if(announce&&created>0)try{showPageAddedNotice?.()}catch{}
        isPaginating=false;running=false;finish(slot,target,scrollState,!goFirst&&absolute!=null);return true;
      }catch(err){console.error('page flow failed',err);isPaginating=false;running=false;const target=goFirst?{index:root,offset:0}:(absolute==null?{index:Math.min(original,slot.pages.length-1),offset:0}:targetForAbsolute(slot,root,absolute));finish(slot,target,scrollState,!goFirst&&absolute!=null);return false;}
    }

    window.reflowAllAutoPagesFromCurrentSlot=reflowAllAutoPagesFromCurrentSlot=function(options={}){
      const marker=markerForLiveCaret();if(marker){reflowCurrentChain({marker,announce:false,force:!!options.force,goFirst:!!options.goFirst});return}
      const slot=current();if(!slot?.pages?.length)return;const original=slot.currentPageIndex||0;let root=0;
      while(root<slot.pages.length){slot.currentPageIndex=root;loadForMeasure(slot,root);reflowCurrentChain({marker:{root,absolute:null},announce:false,force:!!options.force,goFirst:false});root=chainEnd(slot,root);}
      slot.currentPageIndex=options.goFirst?0:Math.min(original,slot.pages.length-1);try{persist?.();renderAll?.()}catch{}
    };

    function schedule(marker,{delay=70,force=false,goFirst=false}={}){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>reflowCurrentChain({marker,announce:true,force,goFirst})),delay);}
    ed.addEventListener('paste',()=>{pasteJustHappened=true;},true);
    ed.addEventListener('beforeinput',e=>{lastInputType=String(e.inputType||'');},true);
    ed.addEventListener('input',()=>{
      saveLive();const marker=markerForLiveCaret();try{persist?.();updateCount?.();renderSlots?.()}catch{}
      const deleting=lastInputType.startsWith('delete');
      const pasting=pasteJustHappened||lastInputType==='insertFromPaste';
      schedule(marker,{delay:deleting?10:35,force:deleting||pasting,goFirst:pasting});lastInputType='';pasteJustHappened=false;
    });

    /* First-page button: visible label, not an ambiguous double-chevron. */
    const nav=$id('pageNavLabel')?.parentElement;
    let first=$id('firstPageBtn');
    if(nav&&!first){first=document.createElement('button');first.id='firstPageBtn';first.type='button';nav.insertBefore(first,nav.firstChild);}
    if(first){first.className='page-nav-btn v120-first-page';first.title='첫 페이지로 이동';first.setAttribute('aria-label','첫 페이지로 이동');first.innerHTML='<span aria-hidden="true">↤</span><span>처음</span>';first.onclick=()=>{saveLive();const slot=current();slot.currentPageIndex=0;try{persist?.();renderAll?.()}catch{}};}

    /* Make page deletion explicit and visually separate from navigation. */
    const del=$id('deletePageBtn');
    if(del){del.className='v120-delete-page';del.title='현재 페이지 삭제';del.setAttribute('aria-label','현재 페이지 삭제');del.innerHTML='<span aria-hidden="true">♲</span><span>페이지 삭제</span>';}

    $id('addPageBtn')?.addEventListener('click',()=>setTimeout(()=>{
      const slot=current(),p=slot?.pages?.[slot?.currentPageIndex||0];if(p&&!p.autoGenerated){p.manualBreakBefore=true;p.userManualPage=true;try{persist?.()}catch{}}
    },0),true);

    document.addEventListener('change',e=>{if(e.target?.closest?.('.panel-body,.right-panel'))setTimeout(()=>reflowAllAutoPagesFromCurrentSlot({force:true}),120)});
    setTimeout(()=>{try{const slot=current();slot?.pages?.forEach((p,i)=>{if(i>0&&p?.userManualPage!==true){p.manualBreakBefore=false;p.autoGenerated=true;}});persist?.();reflowAllAutoPagesFromCurrentSlot({force:true});}catch(e){console.error(e)}},650);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installContinuousPagination,0),{once:true});else setTimeout(installContinuousPagination,0);
})();
