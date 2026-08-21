/* MY EDITOR V107 — export the actual live paper, not a separately laid out clone */
(() => {
  function installV107Export(){
    if(typeof html2canvas!=="function" || typeof current!=="function")return;

    function replaceHeadingInCanvasClone(doc,paper,selector,text){
      const input=paper.querySelector(selector);
      if(!input)return;
      const paperRect=paper.getBoundingClientRect();
      const r=input.getBoundingClientRect();
      const cs=doc.defaultView.getComputedStyle(input);
      const layer=doc.createElement("div");
      layer.textContent=text||"";
      layer.className="v107-canvas-heading";
      layer.style.cssText=[
        "position:absolute",
        `left:${r.left-paperRect.left}px`,
        `top:${r.top-paperRect.top}px`,
        `width:${r.width}px`,
        `min-height:${Math.max(r.height,(parseFloat(cs.fontSize)||16)*1.45)}px`,
        "box-sizing:border-box",
        `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        "margin:0","border:0","background:transparent","overflow:visible",
        `font-family:${cs.fontFamily}`,`font-size:${cs.fontSize}`,`font-weight:${cs.fontWeight}`,
        `font-style:${cs.fontStyle}`,`letter-spacing:${cs.letterSpacing}`,
        `line-height:${cs.lineHeight==="normal"?"1.2":cs.lineHeight}`,`color:${cs.color}`,
        `text-align:${cs.textAlign}`,"white-space:nowrap","word-break:keep-all","text-overflow:clip",
        "z-index:8","pointer-events:none"
      ].join(";");
      input.replaceWith(layer);
    }

    window.capture = capture = async function(pageIndex=current().currentPageIndex||0){
      const slot=current();
      const originalIndex=slot.currentPageIndex||0;
      try{
        if(typeof saveCurrent==="function")saveCurrent(false);
        slot.currentPageIndex=Math.max(0,Math.min(pageIndex,slot.pages.length-1));
        if(typeof renderAll==="function")renderAll();
        await document.fonts.ready;
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

        const paper=document.getElementById("paper");
        if(!paper)throw new Error("paper not found");
        const rect=paper.getBoundingClientRect();
        const page=slot.pages[slot.currentPageIndex];

        return await html2canvas(paper,{
          scale:3,
          useCORS:true,
          backgroundColor:null,
          width:Math.round(rect.width),
          height:Math.round(rect.height),
          windowWidth:Math.max(1200,Math.ceil(rect.width)+200),
          windowHeight:Math.max(1000,Math.ceil(rect.height)+200),
          scrollX:0,scrollY:0,logging:false,
          onclone:(doc)=>{
            const clonedPaper=doc.getElementById("paper");
            if(!clonedPaper)return;
            replaceHeadingInCanvasClone(doc,clonedPaper,".title-input",page.title||"");
            replaceHeadingInCanvasClone(doc,clonedPaper,".subtitle-input",page.subtitle||"");
            const footer=clonedPaper.querySelector(".paper-footer");
            const pageNo=footer&&[...footer.querySelectorAll("span")].find(el=>!el.classList.contains("paper-source-credit"));
            if(pageNo){
              pageNo.style.setProperty("position","absolute","important");
              pageNo.style.setProperty("left","50%","important");
              pageNo.style.setProperty("right","auto","important");
              pageNo.style.setProperty("transform","translateX(-50%)","important");
              pageNo.style.setProperty("text-align","center","important");
              pageNo.style.setProperty("display","block","important");
            }
          }
        });
      }finally{
        slot.currentPageIndex=Math.max(0,Math.min(originalIndex,slot.pages.length-1));
        if(typeof renderAll==="function")renderAll();
      }
    };
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(installV107Export,5),{once:true});
  else setTimeout(installV107Export,5);
})();
