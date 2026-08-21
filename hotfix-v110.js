/* MY EDITOR V110 — page flow/header sync/exact capture/background controls */
(() => {
  function installV110(){
    const $id=id=>document.getElementById(id);
    const editor=$id('editor'), paper=$id('paper'), workspace=document.querySelector('.workspace');
    if(!editor||!paper||typeof current!=='function') return;

    let flowTimer=null, syncingHeader=false, exactCapturing=false;

    const masterHeader=()=>{
      const s=current();
      if(!s.pages?.length) return {title:'',subtitle:''};
      return {title:s.pages[0].title||'',subtitle:s.pages[0].subtitle||''};
    };

    function propagateMasterHeader(save=true){
      const s=current();
      if(!s.pages?.length) return;
      const h=masterHeader();
      s.pages.forEach(p=>{p.title=h.title;p.subtitle=h.subtitle});
      if(save){try{persist()}catch{}}
    }

    function updateMasterFromInputs(){
      if(syncingHeader) return;
      const s=current(); if(!s.pages?.length) return;
      const title=$id('titleInput')?.value||'';
      const subtitle=$id('subtitleInput')?.value||'';
      s.pages[0].title=title; s.pages[0].subtitle=subtitle;
      propagateMasterHeader(false);
      try{persist()}catch{}
    }

    function syncLiveHeader(){
      const h=masterHeader();
      syncingHeader=true;
      if($id('titleInput') && $id('titleInput').value!==h.title) $id('titleInput').value=h.title;
      if($id('subtitleInput') && $id('subtitleInput').value!==h.subtitle) $id('subtitleInput').value=h.subtitle;
      syncingHeader=false;
    }

    ['titleInput','subtitleInput'].forEach(id=>{
      const el=$id(id); if(!el) return;
      el.addEventListener('input',()=>{updateMasterFromInputs();},true);
      el.addEventListener('change',()=>{updateMasterFromInputs();},true);
    });

    function forcePullForward(){
      if(exactCapturing) return;
      const s=current();
      const start=s.currentPageIndex||0;
      if(!s.pages || start>=s.pages.length-1) return;
      try{ if(typeof saveCurrent==='function') saveCurrent(false); }catch{}

      const first=s.pages[start];
      const tail=s.pages.slice(start);
      const combined=tail.map(p=>p.content||'').filter(Boolean).join('');
      if(!combined) return;
      first.content=combined;
      s.pages.splice(start+1);
      s.currentPageIndex=start;
      propagateMasterHeader(false);
      try{persist()}catch{}
      try{
        if(typeof renderAll==='function') renderAll();
        if(typeof reflowAllAutoPagesFromCurrentSlot==='function') reflowAllAutoPagesFromCurrentSlot();
        propagateMasterHeader(false);
        try{persist()}catch{}
        syncLiveHeader();
      }catch(err){console.error('v110 pull-forward failed',err)}
    }

    editor.addEventListener('input',()=>{
      clearTimeout(flowTimer);
      flowTimer=setTimeout(forcePullForward,120);
    },true);
    editor.addEventListener('keyup',e=>{
      if(['Backspace','Delete'].includes(e.key)){
        clearTimeout(flowTimer);
        flowTimer=setTimeout(forcePullForward,80);
      }
    },true);

    if(typeof window.renderAll==='function' && !window.renderAll.__v110HeaderWrapped){
      const base=window.renderAll;
      const wrapped=function(...args){
        propagateMasterHeader(false);
        const out=base.apply(this,args);
        requestAnimationFrame(()=>{propagateMasterHeader(false);syncLiveHeader();applyWorkspaceBackground();});
        return out;
      };
      wrapped.__v110HeaderWrapped=true;
      window.renderAll=renderAll=wrapped;
    }

    function colorMix(hex,amount){
      const h=String(hex||'#ffffff').replace('#','');
      const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);
      if(!Number.isFinite(n)) return '#ffffff';
      const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
      const t=amount<0?0:255,p=Math.abs(amount);
      const c=v=>Math.round((t-v)*p+v).toString(16).padStart(2,'0');
      return `#${c(r)}${c(g)}${c(b)}`;
    }

    function applyWorkspaceBackground(){
      const s=current(); const b=s.background||{};
      const mode=b.mode||'solid';
      const solid=b.solid||'#ffffff', g1=b.grad1||solid, g2=b.grad2||colorMix(solid,-0.08), angle=Number(b.angle??135);
      const paperBg=mode==='gradient'?`linear-gradient(${angle}deg, ${g1}, ${g2})`:solid;
      if(mode!=='image'){
        paper.style.setProperty('background',paperBg,'important');
        paper.style.setProperty('background-color',solid,'important');
      }
      if(workspace){
        const ambient=mode==='gradient'
          ? `linear-gradient(${angle}deg, ${colorMix(g1,0.72)}, ${colorMix(g2,0.72)})`
          : colorMix(solid,0.78);
        workspace.style.setProperty('background',ambient,'important');
      }
      document.documentElement.style.setProperty('--work-v110',mode==='gradient'?colorMix(g1,0.72):colorMix(solid,0.78));
    }

    function installPalette(){
      const panel=document.querySelector('[data-panel="background"]');
      if(!panel || $id('v110Palette')) return;
      const solidSection=$id('solidColor')?.closest('.panel-section');
      if(!solidSection) return;
      const box=document.createElement('div');
      box.id='v110Palette'; box.className='v110-palette-box';
      box.innerHTML=`<div class="v110-palette-title"><span>추천 색</span><small>현재 메인색 기준</small></div><div class="v110-palette" id="v110PaletteSwatches"></div>`;
      solidSection.appendChild(box);

      const render=()=>{
        const base=$id('solidColor')?.value||current().background?.solid||'#ffffff';
        const colors=[colorMix(base,0.82),colorMix(base,0.58),colorMix(base,0.32),base,colorMix(base,-0.08),colorMix(base,-0.18)];
        const host=$id('v110PaletteSwatches'); if(!host) return;
        host.innerHTML='';
        colors.forEach(c=>{
          const btn=document.createElement('button'); btn.type='button'; btn.className='v110-swatch';
          btn.style.background=c; btn.title=c; btn.setAttribute('aria-label',`추천색 ${c}`);
          btn.onclick=()=>{
            const b=current().background;
            if((b.mode||'solid')==='gradient'){
              b.grad1=c; b.grad2=colorMix(c,-0.14);
              if($id('grad1'))$id('grad1').value=b.grad1;
              if($id('grad2'))$id('grad2').value=b.grad2;
            }else{
              b.mode='solid'; b.solid=c;
              if($id('solidColor'))$id('solidColor').value=c;
            }
            try{persist()}catch{}
            try{if(typeof syncControls==='function')syncControls()}catch{}
            try{if(typeof applyBackground==='function')applyBackground()}catch{}
            applyWorkspaceBackground(); render();
          };
          host.appendChild(btn);
        });
      };
      box._renderPalette=render; render();
    }

    function bindBackgroundStrong(){
      document.querySelectorAll('.bg-mode').forEach(btn=>btn.addEventListener('click',()=>{
        const b=current().background;
        b.mode=btn.dataset.mode;
        try{persist()}catch{}
        requestAnimationFrame(()=>{try{if(typeof applyBackground==='function')applyBackground()}catch{};applyWorkspaceBackground();});
      },true));
      ['solidColor','grad1','grad2','gradAngle'].forEach(id=>{
        const el=$id(id); if(!el)return;
        el.addEventListener('input',()=>{
          const b=current().background;
          if(id==='solidColor'){b.mode='solid';b.solid=el.value;}
          if(id==='grad1'){b.mode='gradient';b.grad1=el.value;}
          if(id==='grad2'){b.mode='gradient';b.grad2=el.value;}
          if(id==='gradAngle'){b.mode='gradient';b.angle=Number(el.value);}
          try{persist()}catch{}
          try{if(typeof syncControls==='function')syncControls()}catch{}
          try{if(typeof applyBackground==='function')applyBackground()}catch{}
          applyWorkspaceBackground();
          $id('v110Palette')?._renderPalette?.();
        },true);
      });
    }

    if(typeof window.capture==='function' && !window.capture.__v110Exact){
      const exact=async function(pageIndex=current().currentPageIndex||0){
        if(exactCapturing) throw new Error('capture already running');
        exactCapturing=true;
        const s=current(); const original=s.currentPageIndex||0;
        try{
          try{if(typeof saveCurrent==='function')saveCurrent(false)}catch{}
          propagateMasterHeader(false);
          s.currentPageIndex=Math.max(0,Math.min(Number(pageIndex)||0,s.pages.length-1));
          try{persist()}catch{}
          if(typeof renderAll==='function')renderAll();
          propagateMasterHeader(false); syncLiveHeader();
          try{if(typeof applyBackground==='function')applyBackground()}catch{}
          applyWorkspaceBackground();
          try{await document.fonts?.ready}catch{}
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

          paper.classList.add('v110-capturing');
          const rect=paper.getBoundingClientRect();
          const canvas=await html2canvas(paper,{
            scale:3,useCORS:true,backgroundColor:null,
            width:Math.round(rect.width),height:Math.round(rect.height),
            scrollX:0,scrollY:-window.scrollY,
            windowWidth:document.documentElement.clientWidth,
            windowHeight:document.documentElement.clientHeight
          });
          return canvas;
        } finally {
          paper.classList.remove('v110-capturing');
          s.currentPageIndex=Math.max(0,Math.min(original,s.pages.length-1));
          try{persist()}catch{}
          if(typeof renderAll==='function')renderAll();
          propagateMasterHeader(false); syncLiveHeader(); applyWorkspaceBackground();
          exactCapturing=false;
        }
      };
      exact.__v110Exact=true;
      window.capture=capture=exact;
    }

    const del=$id('deletePageBtn');
    if(del){del.textContent='삭제';del.title='현재 페이지 삭제';del.setAttribute('aria-label','현재 페이지 삭제');del.classList.add('v110-delete-page');}
    $id('addPageBtn')?.classList.add('v110-add-page');
    document.querySelector('.page-nav')?.classList.add('v110-page-nav');

    propagateMasterHeader(false); syncLiveHeader();
    installPalette(); bindBackgroundStrong(); applyWorkspaceBackground();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installV110,0),{once:true});
  else setTimeout(installV110,0);
})();
