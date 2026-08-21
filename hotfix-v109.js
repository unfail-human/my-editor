/* MY EDITOR V109 — stickers / faster typography / reinforced page pull-forward */
(() => {
  function installV109(){
    const $id=id=>document.getElementById(id);
    const paper=$id("paper");
    const editor=$id("editor");
    const backgroundPanel=document.querySelector('[data-panel="background"]');
    if(!paper || !editor || !backgroundPanel || typeof current!=="function")return;

    let selectedStickerId=null;
    let capturing=false;
    let deleteReflowTimer=null;
    let fontReflowTimer=null;

    const uuid=()=>crypto.randomUUID?.()||`sticker-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    function toast(message){
      if(typeof showToast==="function"){showToast(message);return;}
      let el=$id("v109Toast");
      if(!el){
        el=document.createElement("div");
        el.id="v109Toast";
        el.className="v109-toast";
        document.body.appendChild(el);
      }
      el.textContent=message;
      el.classList.add("show");
      clearTimeout(el._t);
      el._t=setTimeout(()=>el.classList.remove("show"),1700);
    }

    function bg(){
      const slot=current();
      if(!slot.background)slot.background=typeof defaultBackground==="function"?defaultBackground():{};
      if(!Array.isArray(slot.background.stickers))slot.background.stickers=[];
      return slot.background;
    }

    function stickers(){return bg().stickers}

    function isBackgroundPanelActive(){
      const cs=getComputedStyle(backgroundPanel);
      return cs.display!=="none" && cs.visibility!=="hidden" && backgroundPanel.getClientRects().length>0;
    }

    function ensureLayer(targetPaper=paper){
      let layer=targetPaper.querySelector(":scope > .v109-sticker-layer");
      if(!layer){
        layer=document.createElement("div");
        layer.className="v109-sticker-layer";
        const editorNode=targetPaper.querySelector(".editor");
        if(editorNode)targetPaper.insertBefore(layer,editorNode);
        else targetPaper.appendChild(layer);
      }
      return layer;
    }

    function selectedSticker(){return stickers().find(s=>s.id===selectedStickerId)||null}

    function renderStickerControls(){
      const s=selectedSticker();
      const box=$id("v109StickerControls");
      const empty=$id("v109StickerEmpty");
      if(!box||!empty)return;
      box.hidden=!s;
      empty.hidden=!!s;
      if(!s)return;
      $id("v109StickerSize").value=String(s.width??24);
      $id("v109StickerSizeOut").textContent=`${Math.round(s.width??24)}%`;
      $id("v109StickerRotate").value=String(s.rotation??0);
      $id("v109StickerRotateOut").textContent=`${Math.round(s.rotation??0)}°`;
      $id("v109StickerOpacity").value=String(s.opacity??100);
      $id("v109StickerOpacityOut").textContent=`${Math.round(s.opacity??100)}%`;
    }

    function renderStickers(targetPaper=paper){
      const layer=ensureLayer(targetPaper);
      layer.innerHTML="";
      const live=targetPaper===paper;
      for(const data of stickers()){
        const node=document.createElement("img");
        node.className="v109-sticker-node"+(live&&data.id===selectedStickerId?" selected":"");
        node.dataset.stickerId=data.id;
        node.src=data.src;
        node.alt="";
        node.draggable=false;
        node.style.left=`${Number(data.x??50)}%`;
        node.style.top=`${Number(data.y??50)}%`;
        node.style.width=`${Number(data.width??24)}%`;
        node.style.opacity=String(Math.max(0,Math.min(100,Number(data.opacity??100)))/100);
        node.style.transform=`translate(-50%,-50%) rotate(${Number(data.rotation??0)}deg)`;
        if(live)bindStickerDrag(node,data);
        layer.appendChild(node);
      }
      syncStickerEditMode();
      if(live)renderStickerControls();
    }

    function syncStickerEditMode(){
      const active=!capturing && isBackgroundPanelActive();
      paper.classList.toggle("v109-sticker-edit-mode",active);
      ensureLayer().classList.toggle("editing",active);
    }

    function bindStickerDrag(node,data){
      node.addEventListener("pointerdown",event=>{
        if(!paper.classList.contains("v109-sticker-edit-mode"))return;
        event.preventDefault();
        event.stopPropagation();
        selectedStickerId=data.id;
        renderStickers();
        const active=ensureLayer().querySelector(`[data-sticker-id="${CSS.escape(data.id)}"]`);
        if(!active)return;
        active.setPointerCapture?.(event.pointerId);
        const rect=paper.getBoundingClientRect();
        const move=e=>{
          data.x=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
          data.y=Math.max(0,Math.min(100,((e.clientY-rect.top)/rect.height)*100));
          active.style.left=`${data.x}%`;
          active.style.top=`${data.y}%`;
        };
        const up=e=>{
          active.removeEventListener("pointermove",move);
          active.removeEventListener("pointerup",up);
          active.removeEventListener("pointercancel",up);
          try{persist()}catch{}
        };
        active.addEventListener("pointermove",move);
        active.addEventListener("pointerup",up);
        active.addEventListener("pointercancel",up);
      });
    }

    function imageBlobToStickerSrc(blob){
      return new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(blob);
        const img=new Image();
        img.onload=()=>{
          try{
            const max=700;
            const scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
            const w=Math.max(1,Math.round(img.naturalWidth*scale));
            const h=Math.max(1,Math.round(img.naturalHeight*scale));
            const canvas=document.createElement("canvas");
            canvas.width=w;canvas.height=h;
            const ctx=canvas.getContext("2d");
            ctx.clearRect(0,0,w,h);
            ctx.drawImage(img,0,0,w,h);
            let src;
            try{src=canvas.toDataURL("image/webp",0.86)}catch{src=canvas.toDataURL("image/png")}
            URL.revokeObjectURL(url);
            resolve(src);
          }catch(err){URL.revokeObjectURL(url);reject(err)}
        };
        img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("이미지를 읽을 수 없습니다."))};
        img.src=url;
      });
    }

    async function addStickerBlob(blob){
      if(!blob?.type?.startsWith("image/"))return;
      try{
        const src=await imageBlobToStickerSrc(blob);
        const data={id:uuid(),src,x:50,y:50,width:24,rotation:0,opacity:100};
        stickers().push(data);
        selectedStickerId=data.id;
        try{persist()}catch(err){
          stickers().pop();
          selectedStickerId=null;
          throw new Error("스티커가 너무 커 저장 공간을 초과했습니다. 더 작은 이미지를 사용해주세요.");
        }
        renderStickers();
        toast("스티커를 추가했습니다. 문서에서 드래그해 위치를 바꿀 수 있습니다.");
      }catch(err){console.error(err);toast(err.message||"스티커를 추가하지 못했습니다.")}
    }

    async function pasteStickerFromClipboard(){
      if(!navigator.clipboard?.read){toast("브라우저가 이미지 클립보드 읽기를 지원하지 않습니다. 파일 추가를 이용해주세요.");return}
      try{
        const items=await navigator.clipboard.read();
        for(const item of items){
          const type=item.types.find(t=>t.startsWith("image/"));
          if(type){await addStickerBlob(await item.getType(type));return}
        }
        toast("클립보드에 이미지가 없습니다.");
      }catch(err){console.warn(err);toast("클립보드 이미지를 읽지 못했습니다. 파일 추가를 이용해주세요.")}
    }

    function installStickerPanel(){
      if($id("v109StickerSection"))return;
      const section=document.createElement("section");
      section.id="v109StickerSection";
      section.className="v109-sticker-section";
      section.innerHTML=`
        <div class="v109-sticker-head"><strong>스티커</strong><span>배경 위에 이미지를 배치합니다.</span></div>
        <div class="v109-sticker-actions">
          <button type="button" id="v109PasteSticker">클립보드 스티커 붙여넣기</button>
          <label class="v109-file-button">이미지 추가<input id="v109StickerFile" type="file" accept="image/*" hidden></label>
        </div>
        <p class="v109-sticker-hint">추가한 스티커는 문서 위에서 드래그할 수 있습니다. 본문 붙여넣기는 텍스트만 허용됩니다.</p>
        <div id="v109StickerEmpty" class="v109-sticker-empty">선택된 스티커가 없습니다.</div>
        <div id="v109StickerControls" class="v109-sticker-controls" hidden>
          <label><span>크기</span><input id="v109StickerSize" type="range" min="4" max="90" step="1"><output id="v109StickerSizeOut"></output></label>
          <label><span>회전</span><input id="v109StickerRotate" type="range" min="-180" max="180" step="1"><output id="v109StickerRotateOut"></output></label>
          <label><span>투명도</span><input id="v109StickerOpacity" type="range" min="5" max="100" step="1"><output id="v109StickerOpacityOut"></output></label>
          <button type="button" id="v109DeleteSticker" class="danger">선택 스티커 삭제</button>
        </div>`;
      backgroundPanel.appendChild(section);

      $id("v109PasteSticker").onclick=pasteStickerFromClipboard;
      $id("v109StickerFile").onchange=async e=>{
        const file=e.target.files?.[0];
        e.target.value="";
        if(file)await addStickerBlob(file);
      };
      const update=(key,value)=>{
        const s=selectedSticker();if(!s)return;
        s[key]=Number(value);
        try{persist()}catch{}
        renderStickers();
      };
      $id("v109StickerSize").oninput=e=>update("width",e.target.value);
      $id("v109StickerRotate").oninput=e=>update("rotation",e.target.value);
      $id("v109StickerOpacity").oninput=e=>update("opacity",e.target.value);
      $id("v109DeleteSticker").onclick=()=>{
        const list=stickers();
        const i=list.findIndex(s=>s.id===selectedStickerId);
        if(i<0)return;
        list.splice(i,1);selectedStickerId=null;
        try{persist()}catch{}
        renderStickers();
      };
    }

    // Ctrl+V on the Background tab can add an image sticker. The body editor has its own
    // earlier capture listener and remains strictly text-only.
    document.addEventListener("paste",event=>{
      if(editor.contains(event.target) || document.activeElement===editor)return;
      if(!isBackgroundPanelActive())return;
      const imageItem=[...(event.clipboardData?.items||[])].find(item=>item.kind==="file"&&item.type.startsWith("image/"));
      if(!imageItem)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const blob=imageItem.getAsFile();
      if(blob)addStickerBlob(blob);
    },true);

    document.addEventListener("click",()=>requestAnimationFrame(syncStickerEditMode),true);

    // Reinforce pull-forward after deletion. v106 already performs the fast local pass;
    // this delayed whole-flow pass catches any remaining continuation-page slack.
    editor.addEventListener("beforeinput",event=>{
      if(!String(event.inputType||"").startsWith("delete"))return;
      clearTimeout(deleteReflowTimer);
      deleteReflowTimer=setTimeout(()=>{
        try{if(typeof reflowAllAutoPagesFromCurrentSlot==="function")reflowAllAutoPagesFromCurrentSlot()}catch(err){console.error(err)}
      },180);
    });

    // Avoid repeatedly writing identical typography styles while the pagination engine is
    // measuring several pages. This makes font changes and full reflows substantially lighter.
    if(typeof window.applyTypography==="function" && !window.applyTypography.__v109Memoized){
      const baseApply=window.applyTypography;
      let lastSignature="";
      const fast=function(){
        let signature="";
        try{
          const t=typeof effectiveTypography==="function"?effectiveTypography():null;
          const layout=typeof currentLayout==="function"?currentLayout():null;
          signature=JSON.stringify([t?.fontFamily,t?.fontSizePt,t?.letterSpacing,t?.lineHeight,t?.paragraphSpacing,t?.widthScale,t?.textColor,layout?.writingMode]);
        }catch{}
        if(signature && signature===lastSignature)return;
        lastSignature=signature;
        return baseApply();
      };
      fast.__v109Memoized=true;
      window.applyTypography=applyTypography=fast;
    }

    // Font controls need one reflow after the font is settled, not repeated synchronous passes.
    document.addEventListener("change",event=>{
      const el=event.target;
      const marker=`${el?.id||""} ${el?.name||""} ${el?.className||""}`.toLowerCase();
      if(!marker.includes("font"))return;
      clearTimeout(fontReflowTimer);
      requestAnimationFrame(()=>{try{if(typeof applyTypography==="function")applyTypography()}catch{}});
      fontReflowTimer=setTimeout(async()=>{
        try{await document.fonts?.ready}catch{}
        try{if(typeof reflowAllAutoPagesFromCurrentSlot==="function")reflowAllAutoPagesFromCurrentSlot()}catch(err){console.error(err)}
      },320);
    },true);

    const baseRenderAll=typeof window.renderAll==="function"?window.renderAll:null;
    if(baseRenderAll && !baseRenderAll.__v109StickerWrapped){
      const wrapped=function(...args){
        const result=baseRenderAll.apply(this,args);
        requestAnimationFrame(()=>renderStickers());
        return result;
      };
      wrapped.__v109StickerWrapped=true;
      window.renderAll=renderAll=wrapped;
    }

    const baseCapture=typeof window.capture==="function"?window.capture:null;
    if(baseCapture && !baseCapture.__v109StickerWrapped){
      const wrapped=async function(...args){
        capturing=true;
        paper.classList.remove("v109-sticker-edit-mode");
        try{return await baseCapture.apply(this,args)}
        finally{capturing=false;syncStickerEditMode();renderStickers()}
      };
      wrapped.__v109StickerWrapped=true;
      window.capture=capture=wrapped;
    }

    installStickerPanel();
    renderStickers();
    syncStickerEditMode();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(installV109,0),{once:true});
  else setTimeout(installV109,0);
})();
