/* MY EDITOR V128 — true backward flow: pull partial next-page text into visible room */
(() => {
  function installV128(){
    const ed=document.getElementById('editor');
    if(!ed || typeof current!=='function') return;
    document.documentElement.dataset.backwardFlowEngine='128';

    const oldReflow=window.reflowDocumentV121;
    let busy=false;

    function textLength(node){return (node?.textContent||'').length;}
    function textPoint(root,target){
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let total=0,n,last=null;
      while((n=w.nextNode())){
        last=n;
        const len=n.nodeValue.length;
        if(target<=total+len)return {node:n,offset:Math.max(0,target-total)};
        total+=len;
      }
      return last?{node:last,offset:last.nodeValue.length}:{node:root,offset:0};
    }
    function fragmentOf(node,start,end){
      const len=textLength(node);
      start=Math.max(0,Math.min(len,start)); end=Math.max(start,Math.min(len,end));
      const a=textPoint(node,start), b=textPoint(node,end);
      const r=document.createRange();
      r.setStart(a.node,a.offset); r.setEnd(b.node,b.offset);
      const shell=node.cloneNode(false);
      shell.appendChild(r.cloneContents());
      return shell;
    }
    function editorFits(){
      /* In one-column horizontal writing, overflow MUST be vertical. */
      return ed.scrollHeight <= ed.clientHeight + 1;
    }
    function maxPrefixNode(block){
      const total=textLength(block);
      if(total<=0)return null;
      let lo=1,hi=total,best=0,bestNode=null;
      while(lo<=hi){
        const mid=(lo+hi)>>1;
        const test=fragmentOf(block,0,mid);
        ed.appendChild(test);
        const ok=editorFits();
        test.remove();
        if(ok){best=mid;lo=mid+1}else hi=mid-1;
      }
      if(best<=0)return null;
      bestNode=fragmentOf(block,0,best);
      return {count:best,node:bestNode,suffix:best<total?fragmentOf(block,best,total):null};
    }
    function firstMeaningfulNode(box){
      for(const n of [...box.childNodes]){
        if(n.nodeType===Node.TEXT_NODE && !n.nodeValue.trim())continue;
        return n;
      }
      return null;
    }
    function nodeAsElement(node){
      if(node.nodeType===Node.ELEMENT_NODE)return node;
      const p=document.createElement('p');p.textContent=node.nodeValue||'';return p;
    }
    function pagePlainEmpty(html){
      const d=document.createElement('div');d.innerHTML=html||'';
      return !(d.textContent||'').replace(/\u00a0/g,' ').trim();
    }

    function pullForward(){
      if(busy)return false;
      const s=current();
      const idx=s?.currentPageIndex||0;
      if(!s?.pages?.length || idx>=s.pages.length-1)return false;
      /* If current page itself overflows, forward pagination belongs to the old engine. */
      if(!editorFits())return false;

      busy=true;
      let changed=false, guard=0;
      try{
        /* The live editor is authoritative for the current page. */
        s.pages[idx].content=ed.innerHTML;

        while(idx<s.pages.length-1 && guard++<200){
          const next=s.pages[idx+1];
          if(next?.userManualPage===true)break;
          const box=document.createElement('div');box.innerHTML=next?.content||'';
          const raw=firstMeaningfulNode(box);
          if(!raw){
            s.pages.splice(idx+1,1);changed=true;continue;
          }
          const block=nodeAsElement(raw);

          /* First try the whole leading block. */
          const whole=block.cloneNode(true);
          ed.appendChild(whole);
          if(editorFits()){
            whole.remove();
            ed.appendChild(block.cloneNode(true));
            raw.remove();
            next.content=box.innerHTML;
            s.pages[idx].content=ed.innerHTML;
            changed=true;
            if(pagePlainEmpty(next.content)){s.pages.splice(idx+1,1);}
            continue;
          }
          whole.remove();

          /* The whole paragraph does not fit: pull the largest prefix that DOES fit. */
          const split=maxPrefixNode(block);
          if(!split || split.count<=0)break;
          ed.appendChild(split.node);
          if(!editorFits()){split.node.remove();break;}

          if(raw.nodeType===Node.ELEMENT_NODE){
            if(split.suffix) raw.replaceWith(split.suffix);
            else raw.remove();
          }else{
            const full=raw.nodeValue||'';
            raw.nodeValue=full.slice(split.count);
          }
          next.content=box.innerHTML;
          s.pages[idx].content=ed.innerHTML;
          changed=true;
          break; // page is now filled as far as it can be
        }

        if(changed){
          try{renumberPages?.()}catch{}
          try{persist?.()}catch{}
          /* Do NOT renderAll here — rebuilding contenteditable breaks IME/caret.
             Only refresh lightweight page UI if those helpers exist. */
          try{renderPageControls?.()}catch{}
          try{updateCount?.()}catch{}
          try{renderSlots?.()}catch{}
        }
        return changed;
      } finally {busy=false;}
    }

    /* V127 calls this after Delete/Backspace. Handle backward flow directly.
       Fall back to the canonical engine only when the current page overflows. */
    window.reflowDocumentV121=function(opts={}){
      if(ed.scrollHeight<=ed.clientHeight+1){
        const pulled=pullForward();
        if(pulled || (current().currentPageIndex||0)<current().pages.length-1)return;
      }
      if(typeof oldReflow==='function')return oldReflow(opts);
    };
    window.pullForwardV128=pullForward;

    /* Also run once after a deletion settles; never during IME composition. */
    let composing=false,timer=null;
    ed.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer)},true);
    ed.addEventListener('compositionend',()=>{composing=false},true);
    ed.addEventListener('input',e=>{
      if(composing||e.isComposing)return;
      const t=String(e.inputType||'');
      if(!t.startsWith('delete'))return;
      clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(pullForward),150);
    },false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV128,0),{once:true});
  else setTimeout(installV128,0);
})();