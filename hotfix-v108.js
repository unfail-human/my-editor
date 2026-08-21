/* MY EDITOR V108 — clean external rich-text paste */
(() => {
  function installCleanPaste(){
    const editor=document.getElementById("editor");
    if(!editor)return;

    const DROP_TAGS=new Set([
      "SCRIPT","STYLE","META","LINK","IFRAME","OBJECT","EMBED","FORM","INPUT","BUTTON","TEXTAREA","SELECT","OPTION",
      "VIDEO","AUDIO","SOURCE","PICTURE","CANVAS","SVG","NOSCRIPT"
    ]);
    const ALLOWED_TAGS=new Set([
      "P","DIV","BR","BLOCKQUOTE","UL","OL","LI","PRE","CODE",
      "STRONG","B","EM","I","U","S","DEL","SUB","SUP","A","SPAN"
    ]);

    function semanticizeInlineStyle(el){
      const raw=(el.getAttribute("style")||"").toLowerCase();
      if(!raw)return;

      const bold=/font-weight\s*:\s*(?:bold|[6-9]00)/.test(raw);
      const italic=/font-style\s*:\s*italic/.test(raw);
      const underline=/text-decoration(?:-line)?\s*:[^;]*underline/.test(raw);
      const strike=/text-decoration(?:-line)?\s*:[^;]*(?:line-through)/.test(raw);
      if(!bold&&!italic&&!underline&&!strike)return;

      let container=document.createDocumentFragment();
      while(el.firstChild)container.appendChild(el.firstChild);
      let wrapped=container;
      const wrap=tag=>{
        const node=document.createElement(tag);
        node.appendChild(wrapped);
        wrapped=node;
      };
      if(strike)wrap("s");
      if(underline)wrap("u");
      if(italic)wrap("em");
      if(bold)wrap("strong");
      el.appendChild(wrapped);
    }

    function sanitizeHtml(html){
      const doc=new DOMParser().parseFromString(html,"text/html");

      doc.body.querySelectorAll("*").forEach(el=>semanticizeInlineStyle(el));

      const nodes=[...doc.body.querySelectorAll("*")].reverse();
      for(const el of nodes){
        if(DROP_TAGS.has(el.tagName)){
          el.remove();
          continue;
        }

        if(/^H[1-6]$/.test(el.tagName)){
          const p=doc.createElement("p");
          while(el.firstChild)p.appendChild(el.firstChild);
          el.replaceWith(p);
          continue;
        }

        if(el.tagName==="IMG"){
          el.remove();
          continue;
        }

        if(!ALLOWED_TAGS.has(el.tagName)){
          el.replaceWith(...el.childNodes);
          continue;
        }

        // External site layout must never enter the document.
        [...el.attributes].forEach(attr=>el.removeAttribute(attr.name));

        // Keep only safe link targets; everything else is plain editor markup.
        if(el.tagName==="A"){
          const original=el.getAttribute("href");
          if(original && /^(https?:|mailto:)/i.test(original))el.setAttribute("href",original);
        }
      }

      // Remove Postype/browser spacer wrappers that contain no actual content.
      [...doc.body.querySelectorAll("p,div")].forEach(el=>{
        const meaningful=(el.textContent||"").replace(/\u00a0/g," ").trim();
        const hasBreak=!!el.querySelector("br");
        if(!meaningful && !hasBreak && !el.querySelector("img,ul,ol,blockquote"))el.remove();
      });

      return doc.body.innerHTML;
    }

    function escapeHtml(text){
      return String(text||"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;");
    }

    function plainTextToHtml(text){
      const normalized=String(text||"").replace(/\r\n?/g,"\n");
      if(!normalized)return "";
      return normalized.split(/\n{2,}/).map(block=>{
        const body=block.split("\n").map(escapeHtml).join("<br>");
        return `<p>${body||"<br>"}</p>`;
      }).join("");
    }

    function selectionInsideEditor(){
      const sel=window.getSelection();
      if(!sel?.rangeCount)return false;
      return editor.contains(sel.getRangeAt(0).commonAncestorContainer);
    }

    function moveCaretToEnd(){
      editor.focus();
      const range=document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel=window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function insertSanitizedHtml(html){
      if(!selectionInsideEditor())moveCaretToEnd();
      editor.focus();

      // execCommand keeps browser undo/redo behavior in contenteditable.
      let inserted=false;
      try{inserted=document.execCommand("insertHTML",false,html)}catch{}
      if(inserted)return;

      const sel=window.getSelection();
      if(!sel?.rangeCount)return;
      const range=sel.getRangeAt(0);
      range.deleteContents();
      const frag=range.createContextualFragment(html);
      const last=frag.lastChild;
      range.insertNode(frag);
      if(last){
        range.setStartAfter(last);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      editor.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertFromPaste"}));
    }

    editor.addEventListener("paste",event=>{
      const data=event.clipboardData;
      if(!data)return;

      const rich=data.getData("text/html");
      const text=data.getData("text/plain");
      if(!rich && !text)return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const clean=rich ? sanitizeHtml(rich) : plainTextToHtml(text);
      if(!clean)return;
      insertSanitizedHtml(clean);

      // Ensure autosave/pagination sees the cleaned pasted result even on browsers
      // where execCommand does not emit a normal input event.
      setTimeout(()=>{
        try{
          const page=typeof currentPage==="function"?currentPage():null;
          if(page)page.content=editor.innerHTML;
          if(typeof persist==="function")persist();
          if(typeof reflowAllAutoPagesFromCurrentSlot==="function")reflowAllAutoPagesFromCurrentSlot();
          if(typeof updateCount==="function")updateCount();
          if(typeof renderSlots==="function")renderSlots();
        }catch(err){console.error("v108 paste post-process failed",err)}
      },0);
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(installCleanPaste,0),{once:true});
  else setTimeout(installCleanPaste,0);
})();
