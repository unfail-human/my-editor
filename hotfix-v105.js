/* MY EDITOR V105 — body must never start before heading */
(() => {
  function boot(){
    if(typeof window.applyDocumentLayoutToElement!=="function")return;

    const base=window.applyDocumentLayoutToElement;
    window.applyDocumentLayoutToElement = applyDocumentLayoutToElement = function(paper,editor,title,subtitle,pageIndex,layout=currentLayout()){
      base(paper,editor,title,subtitle,pageIndex,layout);
      if(!paper||!editor)return;

      const ruleLeft=parseFloat(paper.style.getPropertyValue("--rule-left"));
      const ruleRight=parseFloat(paper.style.getPropertyValue("--rule-right"));
      const bodyLeft=parseFloat(paper.style.getPropertyValue("--body-frame-left"));
      const bodyRight=parseFloat(paper.style.getPropertyValue("--body-frame-right"));
      const compact=["postcard","card","widecard","minicard","square"].includes(layout?.template);
      const inset=compact?.8:1.2;

      if(Number.isFinite(ruleLeft)){
        const fixedLeft=Math.max(Number.isFinite(bodyLeft)?bodyLeft:0,ruleLeft+inset);
        paper.style.setProperty("--body-frame-left",fixedLeft+"%");
        paper.style.setProperty("--v105-body-left",fixedLeft+"%");
        editor.style.setProperty("padding-left",fixedLeft+"%","important");
      }
      if(Number.isFinite(ruleRight)){
        const fixedRight=Math.max(Number.isFinite(bodyRight)?bodyRight:0,ruleRight+inset);
        paper.style.setProperty("--body-frame-right",fixedRight+"%");
        paper.style.setProperty("--v105-body-right",fixedRight+"%");
        editor.style.setProperty("padding-right",fixedRight+"%","important");
      }
    };

    try{ applyDocumentLayout(); }catch{}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
