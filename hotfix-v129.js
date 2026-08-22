/* MY EDITOR V129 — character-exact backflow + live-paper preview parity */
(()=>{
  function install(){
    const ed=document.getElementById('editor'), paper=document.getElementById('paper');
    if(!ed||!paper||typeof current!=='function')return;
    document.documentElement.dataset.flowEngine='129';
    let busy=false, composing=false, timer=0;

    const textLen=n=>(n?.textContent||'').length;
    function point(root,pos){
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n,total=0,last=null;
      while((n=w.nextNode())){last=n;const l=n.nodeValue.length;if(pos<=total+l)return[n,Math.max(0,pos-total)];total+=l}
      return last?[last,last.nodeValue.length]:[root,0];
    }
    function sliceNode(node,a,b){
      const len=textLen(node); a=Math.max(0,Math.min(len,a));b=Math.max(a,Math.min(len,b));
      const A=point(node,a),B=point(node,b),r=document.createRange();r.setStart(A[0],A[1]);r.setEnd(B[0],B[1]);
      if(node.nodeType===Node.TEXT_NODE){const t=document.createTextNode(r.toString());return t}
      const shell=node.cloneNode(false);shell.appendChild(r.cloneContents());return shell;
    }
    function meaningful(box){return [...box.childNodes].find(n=>n.nodeType!==3||n.nodeValue.trim())||null}
    function fits(){return ed.scrollHeight<=ed.clientHeight+0.5}
    function cleanEmptyPages(s,idx){
      while(idx+1<s.pages.length){const d=document.createElement('div');d.innerHTML=s.pages[idx+1].content||'';if((d.textContent||'').replace(/\u00a0/g,' ').trim())break;if(s.pages[idx+1].userManualPage)break;s.pages.splice(idx+1,1)}
    }

    /* Pull exactly ONE Unicode code point at a time. No word/paragraph sized guess. */
    function pullCharacters(){
      if(busy||composing)return false;const s=current(),idx=s.currentPageIndex||0;if(idx>=s.pages.length-1||!fits())return false;
      busy=true;let changed=false;
      try{
        s.pages[idx].content=ed.innerHTML;
        outer:while(idx+1<s.pages.length){
          const next=s.pages[idx+1];if(next.userManualPage===true)break;
          const box=document.createElement('div');box.innerHTML=next.content||'';
          let raw=meaningful(box);if(!raw){s.pages.splice(idx+1,1);changed=true;continue}
          const total=textLen(raw);if(!total){raw.remove();next.content=box.innerHTML;continue}
          let consumed=0;
          while(consumed<total){
            /* Advance by one Unicode code point, not by word. */
            const remaining=(raw.textContent||'').slice(consumed);const cp=remaining.codePointAt(0);const step=cp>0xFFFF?2:1;
            const candidate=sliceNode(raw,0,consumed+step);
            /* Replace the previously accepted prefix, so measurement is exact. */
            let probe=ed.querySelector(':scope > [data-v129-probe="1"]');if(probe)probe.remove();
            if(candidate.nodeType===1)candidate.dataset.v129Probe='1';else{const span=document.createElement('span');span.dataset.v129Probe='1';span.appendChild(candidate);candidate.replaceWith?.(span)}
            const insert=candidate.nodeType===1?candidate:(()=>{const sp=document.createElement('span');sp.dataset.v129Probe='1';sp.appendChild(candidate);return sp})();
            ed.appendChild(insert);
            if(!fits()){insert.remove();break}
            consumed+=step;insert.remove();
          }
          if(consumed<=0)break;
          const accepted=sliceNode(raw,0,consumed);if(accepted.nodeType===1)accepted.removeAttribute('data-v129-probe');ed.appendChild(accepted);
          const suffix=consumed<total?sliceNode(raw,consumed,total):null;
          if(suffix)raw.replaceWith(suffix);else raw.remove();
          next.content=box.innerHTML;s.pages[idx].content=ed.innerHTML;changed=true;
          if(!fits())break;
          cleanEmptyPages(s,idx);
          /* Continue: if room remains, take the next character/block/page too. */
          if(idx>=s.pages.length-1)break outer;
        }
        if(changed){try{renumberPages?.()}catch{};try{persist?.()}catch{};try{renderPageControls?.()}catch{};try{updateCount?.()}catch{};try{renderSlots?.()}catch{}}
        return changed;
      }finally{busy=false}
    }
    window.pullForwardV129=pullCharacters;

    ed.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer)},true);
    ed.addEventListener('compositionend',()=>{composing=false;clearTimeout(timer);timer=setTimeout(pullCharacters,180)},true);
    ed.addEventListener('input',e=>{if(composing||e.isComposing)return;clearTimeout(timer);timer=setTimeout(pullCharacters,90)},false);
    ed.addEventListener('keyup',e=>{if(!composing&&(e.key==='Backspace'||e.key==='Delete')){clearTimeout(timer);timer=setTimeout(pullCharacters,50)}},false);

    /* Preview must be a visual clone of the currently rendered paper, not a second layout calculation. */
    function exactClone(){
      try{saveCurrent?.(false)}catch{}
      const r=paper.getBoundingClientRect(),c=paper.cloneNode(true);c.removeAttribute('id');c.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
      c.classList.add('v129-exact-clone');c.style.cssText+=`;width:${r.width}px!important;height:${r.height}px!important;min-width:${r.width}px!important;max-width:${r.width}px!important;min-height:${r.height}px!important;max-height:${r.height}px!important;transform:none!important;`;
      c.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));c.querySelectorAll('.selected,.v115-selected,.v117-selected').forEach(x=>x.classList.remove('selected','v115-selected','v117-selected'));c.querySelectorAll('[class*="sticker-tools"]').forEach(x=>x.remove());
      const si=paper.querySelectorAll('input'),di=c.querySelectorAll('input');si.forEach((x,i)=>{if(di[i]){di[i].value=x.value;di[i].setAttribute('value',x.value)}});return c;
    }
    window.cloneVisiblePaperV129=exactClone;
    const pb=document.getElementById('previewBtn');if(pb)pb.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const h=document.getElementById('previewHost');if(!h)return;h.replaceChildren(exactClone());try{fitPreviewPage?.()}catch{}})),true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
