/* MY EDITOR v103 runtime stability hotfix.
   This file may load before script.js. All base-function overrides are deferred until DOMContentLoaded,
   after script.js has finished defining the editor runtime. */
(() => {
  function applyRuntimePatch(){

      const $id = id => document.getElementById(id);

      /* ---------- Notices: simple tap-to-close, no confirmation button ---------- */
      window.showSiteNotice = showSiteNotice = function(notice){
        const modal=$id("patchNoticeModal");
        const title=$id("patchNoticeTitle");
        const text=$id("patchNoticeText");
        if(!modal||!title||!text||!notice)return;
        const key=`my-editor-notice-seen:${notice.id}`;
        if(localStorage.getItem(key)==="1")return;

        title.textContent=notice.title||"MY EDITOR 공지";
        text.textContent=notice.message||"";

        const close=()=>{
          localStorage.setItem(key,"1");
          modal.hidden=true;
          modal.onclick=null;
          modal.querySelector(".patch-notice-card")?.removeEventListener("click",cardClose);
        };
        const cardClose=e=>{e.stopPropagation();close();};
        modal.hidden=false;
        modal.onclick=close;
        modal.querySelector(".patch-notice-card")?.addEventListener("click",cardClose,{once:true});
      };

      window.bootAutomaticUpdateNotice = bootAutomaticUpdateNotice = function(){
        const cfg=window.MY_EDITOR_AUTO_UPDATE_NOTICE;
        if(!cfg?.enabled||!cfg.version)return false;
        const key=`my-editor-auto-update-seen:${cfg.version}`;
        if(localStorage.getItem(key)==="1")return false;

        const modal=$id("patchNoticeModal");
        const title=$id("patchNoticeTitle");
        const text=$id("patchNoticeText");
        if(!modal||!title||!text)return false;

        title.textContent=cfg.title||"업데이트 안내";
        text.textContent=cfg.message||"업데이트가 완료되었습니다.\n새로고침 후 다시 사용해주시길 바랍니다.";

        const close=()=>{
          localStorage.setItem(key,"1");
          modal.hidden=true;
          modal.onclick=null;
          modal.querySelector(".patch-notice-card")?.removeEventListener("click",cardClose);
          setTimeout(()=>window.bootSiteNotice?.(),0);
        };
        const cardClose=e=>{e.stopPropagation();close();};
        modal.hidden=false;
        modal.onclick=close;
        modal.querySelector(".patch-notice-card")?.addEventListener("click",cardClose,{once:true});
        return true;
      };

      /* ---------- Divider alignment ---------- */
      function dividerAlignment(){
        try{return current()?.background?.dividerAlign||"center"}catch{return "center"}
      }
      function applyDividerAlignment(root=$id("editor")){
        if(!root)return;
        const align=dividerAlignment();
        root.querySelectorAll(".paragraph-divider").forEach(divider=>{
          divider.dataset.align=align;
          divider.style.justifyContent=align==="left"?"flex-start":align==="right"?"flex-end":"center";
          divider.style.textAlign=align;
        });
      }

      const originalRefreshDividerStyles=window.refreshDividerStyles;
      if(typeof originalRefreshDividerStyles==="function"){
        window.refreshDividerStyles = refreshDividerStyles = function(root=$id("editor")){
          originalRefreshDividerStyles(root);
          applyDividerAlignment(root);
        };
      }

      const originalSyncControls=window.syncControls;
      if(typeof originalSyncControls==="function"){
        window.syncControls = syncControls = function(){
          originalSyncControls();
          const select=$id("dividerAlign");
          if(select)select.value=dividerAlignment();
        };
      }

      function installDividerAlignControl(){
        let select=$id("dividerAlign");
        if(!select){
          const margin=$id("dividerMargin")?.closest("label");
          if(!margin)return;
          const label=document.createElement("label");
          label.className="field";
          label.innerHTML='<span>기호 정렬</span><select id="dividerAlign"><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select>';
          margin.insertAdjacentElement("afterend",label);
          select=$id("dividerAlign");
        }
        if(!select)return;
        select.value=dividerAlignment();
        if(select.dataset.v103Bound!=="1"){
          select.dataset.v103Bound="1";
          select.addEventListener("change",()=>{
            const s=current();
            s.background.dividerAlign=select.value||"center";
            persist();
            applyDividerAlignment();
          });
        }
      }

      /* ---------- Export: never mutate live DOM ---------- */
      window.capture = capture = async function(pageIndex=current().currentPageIndex||0){
        saveCurrent(false);
        await document.fonts.ready;

        const host=document.createElement("div");
        host.className="export-host";
        host.dataset.exportHost="1";

        // The preview clone is the source of truth for geometry.
        const clone=clonePageForIndex(pageIndex,{forExport:false});
        clone.dataset.exportPaper="1";
        host.appendChild(clone);
        document.body.appendChild(host);

        try{
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const rect=clone.getBoundingClientRect();
          const page=current().pages[pageIndex];

          return await html2canvas(clone,{
            scale:3,
            useCORS:true,
            backgroundColor:null,
            width:Math.round(rect.width),
            height:Math.round(rect.height),
            windowWidth:Math.max(1200,Math.ceil(rect.width)+200),
            windowHeight:Math.max(1000,Math.ceil(rect.height)+200),
            scrollX:0,
            scrollY:0,
            logging:false,
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
                const safeHeight=Math.max(r.height,fs*1.55);
                layer.style.cssText=[
                  "position:absolute",
                  `left:${r.left-paperRect.left}px`,
                  `top:${Math.max(0,r.top-paperRect.top-2)}px`,
                  `width:${r.width}px`,
                  `height:${safeHeight}px`,
                  "box-sizing:border-box","overflow:visible","margin:0","padding:2px 0 0","border:0","background:transparent",
                  `font-family:${cs.fontFamily}`,`font-size:${cs.fontSize}`,`font-weight:${cs.fontWeight}`,`font-style:${cs.fontStyle}`,
                  `letter-spacing:${cs.letterSpacing}`,`line-height:${cs.lineHeight==="normal"?"1.25":cs.lineHeight}`,
                  `color:${cs.color}`,`text-align:${cs.textAlign}`,
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
        }finally{
          host.remove();
        }
      };

      /* ---------- Startup cleanup ---------- */
      function bootHotfix(){
        installDividerAlignControl();
        applyDividerAlignment();

        // Any stale export host from a failed save must never block the app.
        document.querySelectorAll('body > .export-host').forEach(el=>el.remove());

        // Ticket is intentionally retired; old saved ticket layouts become card 3:2.
        try{
          const l=currentLayout();
          if(l.template==="ticket"){
            l.template="card";
            l.orientation="landscape";
            persist();
            renderAll();
          }
        }catch{}
      }

      bootHotfix();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",applyRuntimePatch,{once:true});
  else applyRuntimePatch();
})();
