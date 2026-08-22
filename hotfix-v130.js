/* MY EDITOR V130 — actual page-flow UI + wiring */
(()=>{
  function install(){
    if(document.documentElement.dataset.v130Installed==='1')return;
    document.documentElement.dataset.v130Installed='1';
    const $=id=>document.getElementById(id);

    /* ----- top page navigation: real first-page button ----- */
    const nav=document.querySelector('.page-nav');
    if(nav && !$('firstPageBtn')){
      const b=document.createElement('button');
      b.id='firstPageBtn'; b.className='page-nav-btn first-page-btn'; b.type='button';
      b.title='첫 페이지로'; b.setAttribute('aria-label','첫 페이지로'); b.textContent='⌂';
      nav.insertBefore(b,nav.firstChild);
      b.addEventListener('click',()=>{
        try{saveCurrent?.(false)}catch{}
        const s=current(); s.currentPageIndex=0; try{persist?.()}catch{}; try{renderAll?.()}catch{};
      });
    }

    /* Make delete explicit instead of a mysterious minus button. */
    const del=$('deletePageBtn');
    if(del){ del.textContent='페이지 삭제'; del.classList.add('page-delete-clear'); del.title='현재 페이지 삭제'; }

    /* ----- actual UI inside Document > template settings ----- */
    const box=document.querySelector('.template-layout-box');
    if(box && !$('pageFlowSettingsV130')){
      const panel=document.createElement('div');
      panel.id='pageFlowSettingsV130'; panel.className='page-flow-settings-v130';
      panel.innerHTML=`
        <div class="page-flow-title">페이지 흐름</div>
        <label class="range-field page-flow-gap-row">
          <span>제목-본문 간격</span>
          <input id="pageFlowHeadingGap" type="range" min="-120" max="240" step="1">
          <output id="pageFlowHeadingGapOut">0px</output>
        </label>
        <label class="page-flow-toggle-row">
          <span><strong>여백 자동 균형</strong><small>위·아래 사용 가능 여백을 맞추고 빈 공간을 다음 페이지 글로 채웁니다.</small></span>
          <input id="pageFlowAutoBalance" type="checkbox" checked>
        </label>
        <div class="page-flow-ending-row">
          <div><strong>행 끝 처리</strong><small>페이지 끝까지 글자를 가능한 만큼 정확히 채웁니다.</small></div>
          <div class="page-flow-radio"><label><input type="radio" name="pageFlowEnding" value="char" checked> 글자 단위</label></div>
        </div>`;
      const marginLauncher=box.querySelector('.template-margin-launcher');
      box.insertBefore(panel,marginLauncher||null);
    }

    const legacyGap=$('templateHeadingGap'), flowGap=$('pageFlowHeadingGap'), flowOut=$('pageFlowHeadingGapOut');
    if(legacyGap && flowGap){
      legacyGap.min='-120'; legacyGap.max='240'; legacyGap.step='1';
      const syncFromLegacy=()=>{flowGap.value=legacyGap.value; if(flowOut)flowOut.textContent=legacyGap.value+'px';};
      syncFromLegacy();
      legacyGap.addEventListener('input',syncFromLegacy);
      flowGap.addEventListener('input',()=>{
        legacyGap.value=flowGap.value;
        if(flowOut)flowOut.textContent=flowGap.value+'px';
        legacyGap.dispatchEvent(new Event('input',{bubbles:true}));
      });
      flowGap.addEventListener('change',()=>legacyGap.dispatchEvent(new Event('change',{bubbles:true})));
    }

    const balance=$('pageFlowAutoBalance');
    function balanceOn(){return !balance || balance.checked;}
    if(balance){
      const saved=localStorage.getItem('my-editor-auto-balance-v130');
      balance.checked=saved!=='0';
      balance.addEventListener('change',()=>{
        localStorage.setItem('my-editor-auto-balance-v130',balance.checked?'1':'0');
        document.documentElement.classList.toggle('page-auto-balance',balance.checked);
        if(balance.checked){try{window.pullForwardV129?.()}catch{}}
      });
      document.documentElement.classList.toggle('page-auto-balance',balance.checked);
    }

    /* Call the character-flow engine after every settled non-composition edit.
       This is deliberately AFTER browser editing, never during IME composition. */
    const ed=$('editor'); let composing=false,timer=0;
    if(ed){
      ed.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer)},true);
      ed.addEventListener('compositionend',()=>{composing=false;clearTimeout(timer);timer=setTimeout(()=>{if(balanceOn())try{window.pullForwardV129?.()}catch{}},220)},true);
      ed.addEventListener('input',e=>{
        if(composing||e.isComposing||!balanceOn())return;
        clearTimeout(timer); timer=setTimeout(()=>{try{window.pullForwardV129?.()}catch{}},120);
      },false);
    }

    /* Preview: replace whatever legacy renderer produced with the exact visible paper clone. */
    const preview=$('previewBtn');
    if(preview)preview.addEventListener('click',()=>{
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const host=$('previewHost');
        if(!host||typeof window.cloneVisiblePaperV129!=='function')return;
        host.replaceChildren(window.cloneVisiblePaperV129());
        try{fitPreviewPage?.()}catch{}
      }));
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
