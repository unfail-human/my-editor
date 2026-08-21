/* MY EDITOR V108/V109 — editor paste is TEXT ONLY */
(() => {
  function installPlainTextPaste(){
    const editor=document.getElementById("editor");
    if(!editor || editor.dataset.plainTextPasteInstalled==="1")return;
    editor.dataset.plainTextPasteInstalled="1";

    function toast(message){
      if(typeof showToast==="function"){showToast(message);return;}
      let el=document.getElementById("plainPasteToast");
      if(!el){
        el=document.createElement("div");
        el.id="plainPasteToast";
        el.style.cssText="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;padding:9px 13px;border-radius:9px;background:#282624;color:#fff;font-size:12px;box-shadow:0 8px 24px #0002;pointer-events:none";
        document.body.appendChild(el);
      }
      el.textContent=message;
      el.hidden=false;
      clearTimeout(el._t);
      el._t=setTimeout(()=>el.hidden=true,1600);
    }

    function selectionInsideEditor(){
      const sel=window.getSelection();
      return !!sel?.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer);
    }

    function ensureCaret(){
      if(selectionInsideEditor())return;
      editor.focus();
      const range=document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel=window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function normalizeText(text){
      return String(text||"")
        .replace(/\r\n?/g,"\n")
        .replace(/\u00a0/g," ")
        .replace(/[\u200b\u200c\u200d\ufeff]/g,"");
    }

    function insertPlainText(text){
      ensureCaret();
      editor.focus();

      // insertText deliberately strips every external HTML/style/image attribute while
      // keeping the browser's native undo stack and current caret position.
      let inserted=false;
      try{inserted=document.execCommand("insertText",false,text)}catch{}
      if(inserted)return;

      const sel=window.getSelection();
      if(!sel?.rangeCount)return;
      const range=sel.getRangeAt(0);
      range.deleteContents();
      const frag=document.createDocumentFragment();
      const lines=text.split("\n");
      let last=null;
      lines.forEach((line,i)=>{
        if(i){last=document.createElement("br");frag.appendChild(last)}
        if(line){last=document.createTextNode(line);frag.appendChild(last)}
      });
      range.insertNode(frag);
      if(last){
        range.setStartAfter(last);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      editor.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertFromPaste",data:text}));
    }

    editor.addEventListener("paste",event=>{
      const data=event.clipboardData;
      if(!data)return;

      // The body editor accepts text/plain ONLY. Do not even inspect text/html.
      const text=normalizeText(data.getData("text/plain"));
      const hasImage=[...data.items].some(item=>item.kind==="file" && item.type.startsWith("image/"));

      event.preventDefault();
      event.stopImmediatePropagation();

      if(!text){
        if(hasImage)toast("본문에는 텍스트만 붙여넣을 수 있습니다. 이미지는 배경 탭의 스티커를 사용해주세요.");
        return;
      }

      insertPlainText(text);

      // Do NOT force a second pagination pass here. The normal input event is handled by
      // the authoritative page-flow engine, which also preserves the logical caret.
      requestAnimationFrame(()=>{
        try{
          const page=typeof currentPage==="function"?currentPage():null;
          if(page)page.content=editor.innerHTML;
          if(typeof persist==="function")persist();
          if(typeof updateCount==="function")updateCount();
          if(typeof renderSlots==="function")renderSlots();
        }catch(err){console.error("plain text paste post-process failed",err)}
      });
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(installPlainTextPaste,0),{once:true});
  else setTimeout(installPlainTextPaste,0);
})();
