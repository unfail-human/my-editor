/* MY EDITOR V104 — state / pagination / typography / export stabilization */
(() => {
  function applyRuntimePatch(){
    const $id=id=>document.getElementById(id);
    const RECOVERY_KEY="my-writing-editor-v2-recovery-v104";
    const MIN_SLOTS=4;
    const CARD_ROW_TEMPLATES=new Set(["card","widecard","minicard"]);
    const FIXED_WORKSPACE_COLOR="#dedbd4";

    /* ---------- state normalization / durable autosave ---------- */
    function normalizeSlot(slot,index){
      if(!slot)return newSlot(index+1);
      slot.pages=Array.isArray(slot.pages)&&slot.pages.length?slot.pages:[newPage(1,false)];
      slot.currentPageIndex=Math.max(0,Math.min(Number(slot.currentPageIndex)||0,slot.pages.length-1));
      slot.typography={...defaultTypography(),...(slot.typography||{})};
      slot.background={...defaultBackground(),...(slot.background||{})};
      slot.layout={...defaultLayout(),...(slot.layout||{})};
      if(slot.layout.template==="ticket")slot.layout.template="card";
      return slot;
    }

    function ensureMinimumSlots(){
      if(!state||typeof state!=="object")state={slots:[],currentSlotId:null};
      if(!Array.isArray(state.slots))state.slots=[];
      state.slots=state.slots.filter(Boolean).map(normalizeSlot);
      while(state.slots.length<MIN_SLOTS){
        state.slots.push(newSlot(state.slots.length+1));
      }
      if(!state.currentSlotId||!state.slots.some(s=>s.id===state.currentSlotId)){
        state.currentSlotId=state.slots[0].id;
      }
      if(!currentSlotId||!state.slots.some(s=>s.id===currentSlotId)){
        currentSlotId=state.currentSlotId;
      }
      return state;
    }

    function restoreRecoveryIfNeeded(){
      let primaryValid=true;
      try{
        const raw=localStorage.getItem(KEY);
        if(raw)JSON.parse(raw);
      }catch{primaryValid=false}
      if(primaryValid)return false;
      try{
        const recovered=JSON.parse(localStorage.getItem(RECOVERY_KEY)||"");
        if(!recovered?.slots?.length)return false;
        state=recovered;
        currentSlotId=recovered.currentSlotId||recovered.slots[0].id;
        ensureMinimumSlots();
        return true;
      }catch{return false}
    }

    const basePersist=window.persist;
    window.persist = persist = function(){
      ensureMinimumSlots();
      const json=JSON.stringify(state);
      try{localStorage.setItem(KEY,json)}catch(e){console.warn("primary save failed",e)}
      try{localStorage.setItem(RECOVERY_KEY,json)}catch(e){console.warn("recovery save failed",e)}
      return true;
    };

    const baseRenderSlots=window.renderSlots;
    if(typeof baseRenderSlots==="function"){
      window.renderSlots = renderSlots = function(){
        ensureMinimumSlots();
        return baseRenderSlots();
      };
    }

    function flushLivePage(){
      try{
        const s=current();
        const p=currentPage();
        if(!s||!p)return;
        const title=$id("titleInput"),subtitle=$id("subtitleInput"),editor=$id("editor");
        if(title)p.title=title.value;
        if(subtitle)p.subtitle=subtitle.value;
        if(editor)p.content=editor.innerHTML;
        s.updatedAt=new Date().toISOString();
        persist();
      }catch(e){console.warn("autosave flush failed",e)}
    }

    let durableSaveTimer=null;
    function queueDurableSave(){
      clearTimeout(durableSaveTimer);
      durableSaveTimer=setTimeout(flushLivePage,240);
    }

    [$id("titleInput"),$id("subtitleInput"),$id("editor")].filter(Boolean).forEach(el=>{
      el.addEventListener("input",queueDurableSave,{passive:true});
    });
    window.addEventListener("pagehide",flushLivePage);
    window.addEventListener("beforeunload",flushLivePage);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushLivePage()});

    /* ---------- typography: direct, measurable styles ---------- */
    const baseApplyTypography=window.applyTypography;
    window.applyTypography = applyTypography = function(){
      if(typeof baseApplyTypography==="function")baseApplyTypography();
      const t=effectiveTypography();
      const ed=$id("editor");
      if(!ed)return;
      ed.style.setProperty("font-family",t.fontFamily||"Pretendard","important");
      ed.style.setProperty("font-size",(t.fontSizePt??12)+"pt","important");
      ed.style.setProperty("letter-spacing",((Number(t.letterSpacing)||0)/100)+"em","important");
      ed.style.setProperty("line-height",String(t.lineHeight??1.25),"important");
      ed.style.setProperty("color",t.textColor||"#3f3d3b","important");
      ed.style.setProperty("--editor-para",(Number(t.paragraphSpacing)||0)+"px");
      const scale=Math.max(.7,Math.min(1.4,(Number(t.widthScale)||100)/100));
      ed.style.setProperty("transform",`scaleX(${scale})`,"important");
      ed.style.setProperty("transform-origin","left top","important");
      ed.style.setProperty("width",`${100/scale}%`,"important");
    };

    const baseApplyTypographyToClone=window.applyTypographyToClone;
    if(typeof baseApplyTypographyToClone==="function"){
      window.applyTypographyToClone = applyTypographyToClone = function(clone,page){
        baseApplyTypographyToClone(clone,page);
        const t={...defaultTypography(),...current().typography,...(page.pageTypography||{})};
        const ed=clone.querySelector(".editor");
        if(!ed)return;
        ed.style.setProperty("letter-spacing",((Number(t.letterSpacing)||0)/100)+"em","important");
        ed.style.setProperty("line-height",String(t.lineHeight??1.25),"important");
        ed.style.setProperty("--editor-para",(Number(t.paragraphSpacing)||0)+"px");
        const scale=Math.max(.7,Math.min(1.4,(Number(t.widthScale)||100)/100));
        ed.style.setProperty("transform",`scaleX(${scale})`,"important");
        ed.style.setProperty("transform-origin","left top","important");
        ed.style.setProperty("width",`${100/scale}%`,"important");
      };
    }

    /* ---------- title / subtitle spacing control ---------- */
    const DEFAULT_SUBTITLE_GAP={a4:8,letter:8,postcard:10,card:10,widecard:10,minicard:9,square:9};
    function subtitleGapFor(layout=currentLayout()){
      const ts=ensureTemplateSettings(layout);
      if(ts.subtitleGap==null)ts.subtitleGap=DEFAULT_SUBTITLE_GAP[layout.template]??8;
      return Math.max(0,Math.min(48,Number(ts.subtitleGap)||0));
    }

    function installSubtitleGapControl(){
      if($id("templateSubtitleGap"))return;
      const titleSize=$id("templateTitleSize")?.closest("label");
      if(!titleSize)return;
      const label=document.createElement("label");
      label.className="range-field v104-subtitle-gap-field";
      label.innerHTML='<span>제목 · 소제목 간격</span><input id="templateSubtitleGap" type="range" min="0" max="48" step="1" value="8"><output id="templateSubtitleGapOut">8px</output>';
      titleSize.insertAdjacentElement("afterend",label);
      const input=$id("templateSubtitleGap");
      input.addEventListener("input",()=>{
        const layout=currentLayout();
        const ts=ensureTemplateSettings(layout);
        ts.subtitleGap=Number(input.value)||0;
        $id("templateSubtitleGapOut").textContent=ts.subtitleGap+"px";
        persist();
        applyDocumentLayout();
        scheduleRobustReflow(140);
      });
    }

    function applySubtitleGapToPaper(paper,title,subtitle,layout){
      if(!paper||!subtitle||!title)return;
      const gap=subtitleGapFor(layout);
      if(CARD_ROW_TEMPLATES.has(layout.template)){
        const delta=gap-8;
        subtitle.style.setProperty("transform",`translateX(${delta}px)`,`important`);
        paper.style.setProperty("--v104-subtitle-gap-shift","0px");
        return;
      }
      const base=layout.template==="postcard"?7:Math.max(5,Math.round((Number(ensureTemplateSettings(layout).titleSize)||34)*.18));
      const delta=gap-base;
      subtitle.style.setProperty("transform",`translateY(${delta}px)`,`important`);
      paper.style.setProperty("--v104-subtitle-gap-shift",delta+"px");
      ["--heading-safe-top","--heading-safe-center","--heading-safe-bottom"].forEach(prop=>{
        const raw=paper.style.getPropertyValue(prop);
        const n=parseFloat(raw);
        if(Number.isFinite(n))paper.style.setProperty(prop,Math.max(40,n+delta)+"px");
      });
    }

    const baseApplyDocumentLayoutToElement=window.applyDocumentLayoutToElement;
    if(typeof baseApplyDocumentLayoutToElement==="function"){
      window.applyDocumentLayoutToElement = applyDocumentLayoutToElement = function(paper,editor,title,subtitle,pageIndex,layout=currentLayout()){
        baseApplyDocumentLayoutToElement(paper,editor,title,subtitle,pageIndex,layout);
        applySubtitleGapToPaper(paper,title,subtitle,layout);
      };
    }

    const baseSyncControls=window.syncControls;
    if(typeof baseSyncControls==="function"){
      window.syncControls = syncControls = function(){
        baseSyncControls();
        installSubtitleGapControl();
        const input=$id("templateSubtitleGap"),out=$id("templateSubtitleGapOut");
        if(input&&out){
          const gap=subtitleGapFor(currentLayout());
          input.value=String(gap);
          out.textContent=gap+"px";
        }
      };
    }

    /* ---------- card color is paper color, never workspace color ---------- */
    function restoreWorkspaceColor(){
      document.documentElement.style.setProperty("--work",FIXED_WORKSPACE_COLOR);
      document.body.style.backgroundColor=FIXED_WORKSPACE_COLOR;
      const workspace=document.querySelector(".workspace");
      if(workspace)workspace.style.backgroundColor=FIXED_WORKSPACE_COLOR;
      const stage=document.querySelector("#previewModal .modal-stage");
      if(stage)stage.style.backgroundColor="#d8d4cd";
    }

    if(typeof window.applyAmbientColor==="function"){
      window.applyAmbientColor = applyAmbientColor = function(){restoreWorkspaceColor()};
    }
    const baseApplyBackground=window.applyBackground;
    if(typeof baseApplyBackground==="function"){
      window.applyBackground = applyBackground = function(){
        const result=baseApplyBackground();
        restoreWorkspaceColor();
        return result;
      };
    }

    /* ---------- robust bidirectional pagination ---------- */
    function loadPageIntoLiveEditor(page,index){
      const s=current();
      s.currentPageIndex=index;
      $id("titleInput").value=page.title||"";
      $id("subtitleInput").value=page.subtitle||"";
      $id("editor").innerHTML=page.content||"";
      applyTypography();
      applyDocumentLayout();
      normalizeEditorTopLevel();
    }

    function collapseAutoPageChains(slot){
      for(let i=0;i<slot.pages.length;i++){
        const root=slot.pages[i];
        if(root.autoGenerated&&!root.title&&!root.subtitle)continue;
        let merged=root.content||"";
        let j=i+1;
        while(j<slot.pages.length){
          const next=slot.pages[j];
          if(!next?.autoGenerated||next.title||next.subtitle)break;
          merged+=next.content||"";
          slot.pages.splice(j,1);
        }
        root.content=merged;
      }
      // An orphaned first auto page is promoted to a normal page.
      if(slot.pages[0]?.autoGenerated){slot.pages[0].autoGenerated=false}
    }

    window.reflowAllAutoPagesFromCurrentSlot = reflowAllAutoPagesFromCurrentSlot = function(){
      if(isPaginating)return;
      isPaginating=true;
      const s=current();
      const originalIndex=s.currentPageIndex||0;
      const beforeCount=s.pages.length;
      const activePageId=s.pages[originalIndex]?.id;
      try{
        flushLivePage();
        collapseAutoPageChains(s);

        for(let i=0;i<s.pages.length;i++){
          const page=s.pages[i];
          loadPageIntoLiveEditor(page,i);
          const moved=extractOverflowChunks();
          page.content=$id("editor").innerHTML;

          if(moved.length){
            const next=newPage(i+2,true);
            next.content=moved.join("");
            next.pageTypography={};
            s.pages.splice(i+1,0,next);
          }
        }

        // Remove truly empty generated tail pages.
        for(let i=s.pages.length-1;i>0;i--){
          const p=s.pages[i];
          if(p.autoGenerated&&!p.title&&!p.subtitle&&!strip(p.content).trim())s.pages.splice(i,1);
          else break;
        }

        renumberPages();
        let restoreIndex=s.pages.findIndex(p=>p.id===activePageId);
        if(restoreIndex<0)restoreIndex=Math.min(originalIndex,s.pages.length-1);
        s.currentPageIndex=Math.max(0,restoreIndex);
        persist();
        if(s.pages.length>beforeCount&&typeof showPageAddedNotice==="function")showPageAddedNotice();
      }catch(e){
        console.error("v104 reflow failed",e);
      }finally{
        isPaginating=false;
        renderAll();
      }
    };

    let robustReflowTimer=null;
    function scheduleRobustReflow(delay=360){
      clearTimeout(robustReflowTimer);
      robustReflowTimer=setTimeout(()=>requestAnimationFrame(()=>reflowAllAutoPagesFromCurrentSlot()),delay);
    }

    $id("editor")?.addEventListener("input",()=>scheduleRobustReflow(420));
    $id("titleInput")?.addEventListener("input",()=>scheduleRobustReflow(320));
    $id("subtitleInput")?.addEventListener("input",()=>scheduleRobustReflow(320));

    /* ---------- export: preview geometry is source of truth ---------- */
    window.capture = capture = async function(pageIndex=current().currentPageIndex||0){
      flushLivePage();
      await document.fonts.ready;
      document.querySelectorAll('body > .export-host').forEach(el=>el.remove());

      const host=document.createElement("div");
      host.className="export-host";
      host.dataset.exportHost="1";
      const clone=clonePageForIndex(pageIndex,{forExport:false});
      clone.dataset.exportPaper="1";
      host.appendChild(clone);
      document.body.appendChild(host);

      try{
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const rect=clone.getBoundingClientRect();
        const page=current().pages[pageIndex];
        return await html2canvas(clone,{
          scale:3,useCORS:true,backgroundColor:null,
          width:Math.round(rect.width),height:Math.round(rect.height),
          windowWidth:Math.max(1200,Math.ceil(rect.width)+200),
          windowHeight:Math.max(1000,Math.ceil(rect.height)+200),
          scrollX:0,scrollY:0,logging:false,
          onclone:(doc)=>{
            const paper=doc.querySelector('[data-export-paper="1"]');
            if(!paper)return;
            const paperRect=paper.getBoundingClientRect();
            const convert=(selector,text,kind)=>{
              const input=paper.querySelector(selector);
              if(!input)return;
              const r=input.getBoundingClientRect();
              const cs=doc.defaultView.getComputedStyle(input);
              const layer=doc.createElement("div");
              layer.className=`canvas-safe-heading canvas-safe-${kind}`;
              layer.textContent=text||"";
              const fs=parseFloat(cs.fontSize)||16;
              const safeHeight=Math.max(r.height,fs*1.65);
              layer.style.cssText=[
                "position:absolute",`left:${r.left-paperRect.left}px`,`top:${Math.max(0,r.top-paperRect.top-2)}px`,
                `width:${r.width}px`,`height:${safeHeight}px`,"box-sizing:border-box","overflow:visible","margin:0","padding:2px 0 0","border:0","background:transparent",
                `font-family:${cs.fontFamily}`,`font-size:${cs.fontSize}`,`font-weight:${cs.fontWeight}`,`font-style:${cs.fontStyle}`,
                `letter-spacing:${cs.letterSpacing}`,`line-height:${cs.lineHeight==="normal"?"1.3":cs.lineHeight}`,`color:${cs.color}`,`text-align:${cs.textAlign}`,
                "white-space:pre-wrap","word-break:keep-all","overflow-wrap:normal","text-overflow:clip","z-index:6","pointer-events:none"
              ].join(";");
              input.replaceWith(layer);
            };
            convert(".title-input",page.title||"","title");
            convert(".subtitle-input",page.subtitle||"","subtitle");
            const footer=paper.querySelector(".paper-footer");
            const pageNo=footer&&[...footer.querySelectorAll("span")].find(el=>!el.classList.contains("paper-source-credit"));
            if(pageNo){
              pageNo.style.setProperty("position","absolute","important");
              pageNo.style.setProperty("left","50%","important");
              pageNo.style.setProperty("right","auto","important");
              pageNo.style.setProperty("transform","translateX(-50%)","important");
              pageNo.style.setProperty("text-align","center","important");
            }
          }
        });
      }finally{host.remove()}
    };

    /* ---------- notices / startup ---------- */
    window.showSiteNotice = showSiteNotice = function(notice){
      const modal=$id("patchNoticeModal"),title=$id("patchNoticeTitle"),text=$id("patchNoticeText");
      if(!modal||!title||!text||!notice)return;
      const key=`my-editor-notice-seen:${notice.id}`;
      if(localStorage.getItem(key)==="1")return;
      title.textContent=notice.title||"MY EDITOR 공지";
      text.textContent=notice.message||"";
      const close=()=>{localStorage.setItem(key,"1");modal.hidden=true;modal.onclick=null};
      modal.hidden=false;modal.onclick=close;modal.querySelector(".patch-notice-card")?.addEventListener("click",e=>{e.stopPropagation();close()},{once:true});
    };

    window.bootAutomaticUpdateNotice = bootAutomaticUpdateNotice = function(){
      const cfg=window.MY_EDITOR_AUTO_UPDATE_NOTICE;
      if(!cfg?.enabled||!cfg.version)return false;
      const key=`my-editor-auto-update-seen:${cfg.version}`;
      if(localStorage.getItem(key)==="1")return false;
      const modal=$id("patchNoticeModal"),title=$id("patchNoticeTitle"),text=$id("patchNoticeText");
      if(!modal||!title||!text)return false;
      title.textContent=cfg.title||"업데이트 안내";
      text.textContent=cfg.message||"업데이트가 완료되었습니다.\n새로고침 후 다시 사용해주시길 바랍니다.";
      const close=()=>{localStorage.setItem(key,"1");modal.hidden=true;modal.onclick=null;setTimeout(()=>window.bootSiteNotice?.(),0)};
      modal.hidden=false;modal.onclick=close;modal.querySelector(".patch-notice-card")?.addEventListener("click",e=>{e.stopPropagation();close()},{once:true});
      return true;
    };

    restoreRecoveryIfNeeded();
    ensureMinimumSlots();
    installSubtitleGapControl();
    restoreWorkspaceColor();
    document.querySelectorAll('body > .export-host').forEach(el=>el.remove());
    persist();
    renderAll();
    requestAnimationFrame(()=>scheduleRobustReflow(220));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyRuntimePatch,{once:true});
  else applyRuntimePatch();
})();
