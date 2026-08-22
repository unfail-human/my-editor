/* MY EDITOR V121 — single-owner canonical document flow */
(() => {
  function installV121(){
    const ed=document.getElementById('editor');
    if(!ed || typeof current!=='function') return;
    document.documentElement.dataset.paginationEngine='121';

    let lastInputType='', timer=null, running=false, restoreSeq=0;
    const textLen=html=>{const d=document.createElement('div');d.innerHTML=html||'';return (d.textContent||'').length};
    const boundary=p=>p?.userManualPage===true;
    const rootIndex=(slot,index)=>{let i=Math.max(0,Math.min(index,slot.pages.length-1));while(i>0&&!boundary(slot.pages[i]))i--;return i};
    const chainEnd=(slot,root)=>{let i=root+1;while(i<slot.pages.length&&!boundary(slot.pages[i]))i++;return i};

    function localCaret(){
      const s=getSelection();if(!s?.rangeCount)return null;const r=s.getRangeAt(0);if(!ed.contains(r.startContainer))return null;
      const pre=r.cloneRange();pre.selectNodeContents(ed);pre.setEnd(r.startContainer,r.startOffset);return pre.toString().length;
    }
    function globalCaret(slot,index,root){
      const local=localCaret();if(local==null)return null;let n=local;
      for(let i=root;i<index;i++)n+=textLen(slot.pages[i]?.content||'');
      return n;
    }
    function setCaret(offset){
      let left=Math.max(0,Number(offset)||0),node;const w=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);
      while((node=w.nextNode())){const l=node.nodeValue.length;if(left<=l){const r=document.createRange();r.setStart(node,left);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);try{savedRange=r.cloneRange()}catch{};ed.focus({preventScroll:true});return}left-=l}
      const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);try{savedRange=r.cloneRange()}catch{};ed.focus({preventScroll:true});
    }
    function overflows(){
      const layout=typeof currentLayout==='function'?currentLayout():null;
      if(layout?.writingMode==='vertical')return ed.scrollWidth>ed.clientWidth+1;
      return ed.scrollHeight>ed.clientHeight+1 || ed.scrollWidth>ed.clientWidth+1;
    }
    function htmlOf(node){if(node.nodeType===Node.TEXT_NODE){const d=document.createElement('div');d.textContent=node.nodeValue;return d.innerHTML}return node.outerHTML||''}
    function parseOne(html){const t=document.createElement('template');t.innerHTML=html;return t.content.firstChild}
    function point(root,target){
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let total=0,n,last=null;
      while((n=w.nextNode())){last=n;const l=n.nodeValue.length;if(target<=total+l)return{node:n,offset:Math.max(0,target-total)};total+=l}
      return last?{node:last,offset:last.nodeValue.length}:{node:root,offset:0};
    }
    function segmentHTML(node,start,end){
      const len=(node.textContent||'').length;start=Math.max(0,Math.min(len,start));end=Math.max(start,Math.min(len,end));
      if(node.nodeType===Node.TEXT_NODE){const d=document.createElement('div');d.textContent=node.nodeValue.slice(start,end);return d.innerHTML}
      const a=point(node,start),b=point(node,end),r=document.createRange();r.setStart(a.node,a.offset);r.setEnd(b.node,b.offset);
      const copy=node.cloneNode(false);copy.appendChild(r.cloneContents());return copy.outerHTML;
    }
    function maxPrefixThatFits(blockHTML){
      const probe=parseOne(blockHTML);if(!probe)return{prefix:'',suffix:''};
      const total=(probe.textContent||'').length;
      if(total===0){ed.appendChild(probe);const ok=!overflows();if(!ok)probe.remove();return ok?{prefix:blockHTML,suffix:''}:{prefix:'',suffix:blockHTML}}
      let lo=1,hi=total,best=0;
      while(lo<=hi){const mid=(lo+hi)>>1;const html=segmentHTML(probe,0,mid),n=parseOne(html);if(!n){hi=mid-1;continue}ed.appendChild(n);const ok=!overflows();n.remove();if(ok){best=mid;lo=mid+1}else hi=mid-1}
      if(best<=0)return{prefix:'',suffix:blockHTML};
      if(best>=total)return{prefix:blockHTML,suffix:''};
      return{prefix:segmentHTML(probe,0,best),suffix:segmentHTML(probe,best,total)};
    }
    function paginateHTML(html,slot,rootPage){
      const source=document.createElement('div');source.innerHTML=html||'';
      const queue=[...source.childNodes].map(htmlOf).filter(Boolean),pages=[];
      let safety=0;
      while((queue.length||!pages.length)&&safety++<500){
        ed.innerHTML='';
        try{applyTypography?.();applyDocumentLayout?.()}catch{}
        let pageHTML='',guard=0;
        while(queue.length&&guard++<1000){
          const item=queue[0],node=parseOne(item);if(!node){queue.shift();continue}
          ed.appendChild(node);
          if(!overflows()){pageHTML=ed.innerHTML;queue.shift();continue}
          node.remove();
          const split=maxPrefixThatFits(item);
          if(split.prefix){const p=parseOne(split.prefix);if(p)ed.appendChild(p);pageHTML=ed.innerHTML;queue.shift();if(split.suffix)queue.unshift(split.suffix)}
          else if(!pageHTML){
            /* Unbreakable zero-text/oversized object: keep it so pagination can progress. */
            ed.appendChild(parseOne(item));pageHTML=ed.innerHTML;queue.shift();
          }
          break;
        }
        pages.push(pageHTML);
      }
      return pages;
    }
    function saveLive(){const s=current(),p=s.pages?.[s.currentPageIndex||0];if(!p)return;p.content=ed.innerHTML;if(document.getElementById('titleInput'))p.title=document.getElementById('titleInput').value;if(document.getElementById('subtitleInput'))p.subtitle=document.getElementById('subtitleInput').value;s.updatedAt=new Date().toISOString()}
    function restoreTarget(slot,root,absolute){
      let left=Math.max(0,absolute||0),end=chainEnd(slot,root);
      for(let i=root;i<end;i++){const l=textLen(slot.pages[i]?.content||'');if(left<=l||i===end-1)return{index:i,offset:Math.min(left,l)};left-=l}
      return{index:root,offset:0};
    }
    function reflow({goFirst=false,keepCaret=true}={}){
      if(running||isPaginating)return;const slot=current();if(!slot?.pages?.length)return;
      saveLive();const original=slot.currentPageIndex||0,root=rootIndex(slot,original),end=chainEnd(slot,root);
      const absolute=keepCaret?globalCaret(slot,original,root):null;
      let combined='';for(let i=root;i<end;i++)combined+=slot.pages[i]?.content||'';
      const master=slot.pages[root],title=master.title||'',subtitle=master.subtitle||'';
      running=true;isPaginating=true;
      try{
        /* Measure using the first page's real layout. */
        slot.currentPageIndex=root;ed.innerHTML='';if(document.getElementById('titleInput'))document.getElementById('titleInput').value=title;if(document.getElementById('subtitleInput'))document.getElementById('subtitleInput').value=subtitle;
        try{applyTypography?.();applyDocumentLayout?.()}catch{}
        const chunks=paginateHTML(combined,slot,master);
        const replacement=chunks.map((content,i)=>{
          const p=i===0?master:newPage(root+i+1,true);p.content=content;p.title=title;p.subtitle=subtitle;p.autoGenerated=i>0;p.userManualPage=false;p.manualBreakBefore=false;if(i>0){p.pageTypography={};p.pageDecorations=[]}return p;
        });
        slot.pages.splice(root,end-root,...replacement);try{renumberPages?.()}catch{}
        const target=goFirst?{index:root,offset:0}:(absolute==null?{index:Math.min(original,slot.pages.length-1),offset:0}:restoreTarget(slot,root,absolute));
        slot.currentPageIndex=target.index;try{persist?.();renderAll?.()}catch{}
        if(keepCaret&&!goFirst&&absolute!=null){const seq=++restoreSeq;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(seq===restoreSeq)setCaret(target.offset)}))}
      }catch(e){console.error('V121 pagination failed',e)}finally{isPaginating=false;running=false}
    }
    window.reflowDocumentV121=reflow;
    window.reflowAllAutoPagesFromCurrentSlot=()=>reflow({keepCaret:false});

    /* Capture the editor input before legacy target listeners. V121 is the only pagination owner. */
    document.addEventListener('beforeinput',e=>{if(e.target===ed)lastInputType=String(e.inputType||'')},true);
    document.addEventListener('input',e=>{
      if(e.target!==ed)return;
      e.stopImmediatePropagation();saveLive();try{persist?.();updateCount?.();renderSlots?.()}catch{}
      const paste=lastInputType==='insertFromPaste';clearTimeout(timer);timer=setTimeout(()=>reflow({goFirst:paste,keepCaret:!paste}),paste?20:45);lastInputType='';
    },true);

    /* Strict text-only paste, normalized into paragraph blocks. */
    document.addEventListener('paste',e=>{
      if(e.target!==ed&&!ed.contains(e.target))return;
      e.preventDefault();e.stopImmediatePropagation();
      const text=String(e.clipboardData?.getData('text/plain')||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ');
      const sel=getSelection();if(!sel?.rangeCount){ed.focus();return}
      const r=sel.getRangeAt(0);r.deleteContents();
      const frag=document.createDocumentFragment(),lines=text.split('\n');
      lines.forEach(line=>{const p=document.createElement('p');p.textContent=line||'\u00a0';frag.appendChild(p)});
      r.insertNode(frag);r.selectNodeContents(ed);r.collapse(false);sel.removeAllRanges();sel.addRange(r);
      saveLive();try{persist?.()}catch{};clearTimeout(timer);timer=setTimeout(()=>reflow({goFirst:true,keepCaret:false}),20);
    },true);

    /* First-page navigation and cleaner page-delete UI. */
    const nav=document.getElementById('pageNavLabel')?.parentElement;
    let first=document.getElementById('firstPageBtn');
    if(nav&&!first){first=document.createElement('button');first.id='firstPageBtn';first.type='button';first.className='page-nav-btn v121-first';first.textContent='↤ 처음';first.title='첫 페이지로';nav.insertBefore(first,nav.firstChild)}
    if(first)first.onclick=()=>{saveLive();const s=current();s.currentPageIndex=0;try{persist?.();renderAll?.()}catch{}};
    const del=document.getElementById('deletePageBtn');if(del){del.textContent='페이지 삭제';del.classList.add('v121-delete');del.title='현재 페이지 삭제'}

    /* Reflow once after fonts/layout settle; old pages become one flowing document segment. */
    setTimeout(()=>{try{current()?.pages?.forEach((p,i)=>{if(i>0&&!p.userManualPage){p.userManualPage=false;p.manualBreakBefore=false}});reflow({keepCaret:false})}catch(e){console.error(e)}},900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV121,0),{once:true});else setTimeout(installV121,0);
})();
