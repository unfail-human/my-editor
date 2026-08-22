/* MY EDITOR V108/V114 — body paste is strict plain text */
(() => {
  function installPlainTextPaste(){
    const editor=document.getElementById('editor');
    if(!editor || editor.dataset.plainTextPasteInstalled==='2')return;
    editor.dataset.plainTextPasteInstalled='2';

    function normalizeText(text){
      return String(text||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').replace(/[\u200b\u200c\u200d\ufeff]/g,'');
    }

    function selectionInsideEditor(){
      const sel=window.getSelection();
      return !!sel?.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer);
    }

    function ensureCaret(){
      if(selectionInsideEditor())return;
      editor.focus();
      const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
    }

    function clearVisualEffectsAround(range){
      let node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
      while(node&&node!==editor){
        if(node.style){
          node.style.removeProperty('background');node.style.removeProperty('background-color');
          node.style.removeProperty('box-shadow');node.style.removeProperty('text-shadow');
        }
        node.removeAttribute?.('bgcolor');
        node=node.parentElement;
      }
    }

    function insertStrictPlainText(text){
      ensureCaret();
      const sel=window.getSelection();if(!sel?.rangeCount)return;
      const range=sel.getRangeAt(0);
      clearVisualEffectsAround(range);
      range.deleteContents();

      const holder=document.createElement('span');
      holder.className='v114-pasted-plain';
      holder.style.cssText='background:none!important;background-color:transparent!important;box-shadow:none!important;text-shadow:none!important;color:inherit;font:inherit;letter-spacing:inherit;line-height:inherit;text-decoration:none!important;';
      const lines=text.split('\n');
      lines.forEach((line,i)=>{if(i)holder.appendChild(document.createElement('br'));holder.appendChild(document.createTextNode(line));});
      range.insertNode(holder);

      const after=document.createRange();after.selectNodeContents(holder);after.collapse(false);
      sel.removeAllRanges();sel.addRange(after);
      editor.focus({preventScroll:true});
      editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:text}));
    }

    editor.addEventListener('paste',event=>{
      const data=event.clipboardData;if(!data)return;
      event.preventDefault();event.stopImmediatePropagation();
      const text=normalizeText(data.getData('text/plain'));
      if(!text)return;
      insertStrictPlainText(text);
      requestAnimationFrame(()=>{
        try{
          const page=typeof currentPage==='function'?currentPage():null;
          if(page)page.content=editor.innerHTML;
          persist?.();updateCount?.();renderSlots?.();
        }catch(err){console.error('plain text paste post-process failed',err)}
      });
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installPlainTextPaste,0),{once:true});else setTimeout(installPlainTextPaste,0);
})();
