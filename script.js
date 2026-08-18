const $=id=>document.getElementById(id);
const KEY="my-writing-editor-v2";
const DB="my-writing-editor-assets-v10", DBV=1, FONT_STORE="fonts", BG_STORE="backgrounds";

let savedRange=null, slotMenuTarget=null, activeBgUrl=null, editScope="all";
let state=loadState();
let currentSlotId=state.currentSlotId;

function defaultTypography(){return{fontFamily:"Pretendard",fontSize:16,letterSpacing:0,lineHeight:1.78,paragraphSpacing:0,widthScale:100}}
function defaultBackground(){return{mode:"solid",solid:"#ffffff",grad1:"#ffffff",grad2:"#e8e2da",angle:135,imageId:null,size:"cover",brightness:100,effect:"none",effectOpacity:18,decorations:[],dividerSize:16,dividerMargin:18}}
function newPage(n){return{id:crypto.randomUUID?.()||String(Date.now()+Math.random()),title:"",subtitle:"",content:"",pagePrefix:"—",pageNumber:String(n).padStart(2,"0"),pageSuffix:"—",pageTypography:{},pageDecorations:[]}}
function newSlot(i){return{id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name:`새 문서 ${String(i).padStart(2,"0")}`,pages:[newPage(1)],currentPageIndex:0,typography:defaultTypography(),background:defaultBackground(),updatedAt:null}}

function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const old=JSON.parse(raw);
      if(old.slots?.length){
        const slots=old.slots.map((s,i)=>{
          const d=newSlot(i+1);
          const migratedPages = Array.isArray(s.pages) && s.pages.length
            ? s.pages.map((p,pi)=>({...newPage(pi+1),...p,pageTypography:{...(p.pageTypography||{})},pageDecorations:[...(p.pageDecorations||[])]}))
            : [{...newPage(1),title:s.title||"",subtitle:s.subtitle||"",content:s.content||"",pagePrefix:s.pagePrefix??"—",pageNumber:s.pageNumber??"01",pageSuffix:s.pageSuffix??"—"}];
          return {...d,...s,pages:migratedPages,currentPageIndex:Math.min(s.currentPageIndex||0,migratedPages.length-1),typography:{...d.typography,...(s.typography||{})},background:{...d.background,...(s.background||{}),...(old.appearance?{
            mode:old.appearance.mode||"solid",solid:old.appearance.solid||"#fff",grad1:old.appearance.gradient1||"#fff",grad2:old.appearance.gradient2||"#eee",
            angle:old.appearance.gradientAngle||135,imageId:old.appearance.backgroundAssetId||null,size:old.appearance.backgroundSize||"cover",brightness:old.appearance.backgroundBrightness||100
          }:{})}}
        });
        return{slots,currentSlotId:old.currentSlotId||slots[0].id};
      }
    }
  }catch(e){console.warn(e)}
  const slots=Array.from({length:4},(_,i)=>newSlot(i+1));
  return{slots,currentSlotId:slots[0].id}
}
function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function current(){return state.slots.find(s=>s.id===currentSlotId)||state.slots[0]}
function currentPage(){const s=current();return s.pages[s.currentPageIndex]||s.pages[0]}

function strip(html){const d=document.createElement("div");d.innerHTML=html||"";return d.textContent||""}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function safe(v){return String(v||"document").replace(/[\\/:*?"<>|]/g,"_")}

function renderSlots(){
  $("slotList").innerHTML="";
  state.slots.forEach((s,i)=>{
    const card=document.createElement("div");
    card.className="slot-card"+(s.id===currentSlotId?" active":"");
    const p=s.pages?.[s.currentPageIndex||0]||s.pages?.[0]||{};
    card.innerHTML=`<button class="slot-main"><div class="slot-badge">${String(i+1).padStart(2,"0")}</div><div class="slot-no">SLOT ${String(i+1).padStart(2,"0")} · ${s.pages?.length||1}P</div><div class="slot-name">${esc(s.name)}</div><div class="slot-preview">${esc(strip(p.content)||p.subtitle||"비어 있음")}</div></button><button class="slot-more" aria-label="슬롯 편집">⋯</button>`;
    card.querySelector(".slot-main").onclick=()=>{saveCurrent();currentSlotId=s.id;state.currentSlotId=s.id;persist();renderAll()};
    card.querySelector(".slot-more").onclick=e=>openSlotMenu(e,s.id);
    $("slotList").appendChild(card);
  })
}
function renderAll(){
  const s=current(); if(!s)return;
  const p=currentPage();
  const idx=state.slots.findIndex(x=>x.id===s.id)+1;
  $("slotLabel").textContent=`SLOT ${String(idx).padStart(2,"0")}`;
  $("pageNavLabel").textContent=`PAGE ${String(s.currentPageIndex+1).padStart(2,"0")} / ${String(s.pages.length).padStart(2,"0")}`;
  $("titleInput").value=p.title||"";
  $("subtitleInput").value=p.subtitle||"";
  $("editor").innerHTML=p.content||"";
  $("pageNumberPreview").textContent=[p.pagePrefix,p.pageNumber,p.pageSuffix].filter(Boolean).join(" ");
  applyTypography();
  syncControls();
  applyBackground();
  renderSlots();
  updateCount();
}
function saveCurrent(mark=true){
  const s=current();if(!s)return;
  const p=currentPage();
  p.title=$("titleInput").value;p.subtitle=$("subtitleInput").value;p.content=$("editor").innerHTML;s.updatedAt=new Date().toISOString();
  persist();updateCount();renderSlots();
  $("lastSaved").textContent="저장 "+new Date(s.updatedAt).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  if(mark){$("saveStatus").textContent="저장됨 ✓";setTimeout(()=>$("saveStatus").textContent="자동 저장됨",800)}
}
let saveTimer;
function scheduleSave(){clearTimeout(saveTimer);$("saveStatus").textContent="저장 중…";saveTimer=setTimeout(()=>saveCurrent(),300);updateCount()}
function updateCount(){const n=strip($("editor").innerHTML).replace(/\s/g,"").length;$("charCount").textContent=`${n.toLocaleString()}자`}


function addPage(){
  saveCurrent(false);
  const s=current();
  s.pages.push(newPage(s.pages.length+1));
  s.currentPageIndex=s.pages.length-1;
  persist();
  renderAll();
}
function goPage(delta){
  saveCurrent(false);
  const s=current();
  const next=Math.max(0,Math.min(s.pages.length-1,s.currentPageIndex+delta));
  if(next===s.currentPageIndex)return;
  s.currentPageIndex=next;
  persist();
  renderAll();
}
function deletePage(){
  const s=current();
  if(s.pages.length<=1){alert("페이지는 최소 1개가 필요합니다.");return}
  if(!confirm("현재 페이지를 삭제할까요?"))return;
  s.pages.splice(s.currentPageIndex,1);
  s.currentPageIndex=Math.max(0,Math.min(s.currentPageIndex,s.pages.length-1));
  s.pages.forEach((p,i)=>{ if(!p.pageNumber || /^\d+$/.test(String(p.pageNumber))) p.pageNumber=String(i+1).padStart(2,"0") });
  persist();
  renderAll();
}
$("addPageBtn").onclick=addPage;
$("prevPageBtn").onclick=()=>goPage(-1);
$("nextPageBtn").onclick=()=>goPage(1);
$("deletePageBtn").onclick=deletePage;

function openSlotMenu(e,id){
  e.stopPropagation();slotMenuTarget=id;
  const m=$("slotMenu");m.hidden=false;
  const r=e.currentTarget.getBoundingClientRect();m.style.left=`${Math.min(r.right+4,innerWidth-150)}px`;m.style.top=`${Math.min(r.top,innerHeight-190)}px`;
}
document.addEventListener("click",()=>{$("slotMenu").hidden=true});
$("slotMenu").onclick=e=>e.stopPropagation();
$("slotMenu").querySelectorAll("[data-slot-action]").forEach(b=>b.onclick=()=>{
  const action=b.dataset.slotAction, id=slotMenuTarget; $("slotMenu").hidden=true;
  const idx=state.slots.findIndex(s=>s.id===id); if(idx<0)return;
  if(id!==currentSlotId){saveCurrent(false);currentSlotId=id;state.currentSlotId=id;renderAll()}
  if(action==="save"){saveCurrent();return}
  if(action==="rename"){const n=prompt("슬롯 이름",current().name);if(n!==null){current().name=n.trim()||"이름 없음";persist();renderSlots()}return}
  if(action==="duplicate"){saveCurrent(false);const c=structuredClone(current());c.id=crypto.randomUUID?.()||String(Date.now()+Math.random());c.name+=" 복사본";state.slots.splice(idx+1,0,c);currentSlotId=c.id;state.currentSlotId=c.id;persist();renderAll();return}
  if(action==="up"&&idx>0){[state.slots[idx-1],state.slots[idx]]=[state.slots[idx],state.slots[idx-1]];persist();renderSlots();return}
  if(action==="down"&&idx<state.slots.length-1){[state.slots[idx+1],state.slots[idx]]=[state.slots[idx],state.slots[idx+1]];persist();renderSlots();return}
  if(action==="delete"){if(state.slots.length===1)return alert("슬롯은 하나 이상 필요합니다.");if(confirm("현재 슬롯을 삭제할까요?")){state.slots.splice(idx,1);currentSlotId=state.slots[Math.max(0,idx-1)].id;state.currentSlotId=currentSlotId;persist();renderAll()}}
});

$("addSlotBtn").onclick=()=>{saveCurrent(false);const s=newSlot(state.slots.length+1);state.slots.push(s);currentSlotId=s.id;state.currentSlotId=s.id;persist();renderAll()};

["titleInput","subtitleInput","editor"].forEach(id=>$(id).addEventListener("input",scheduleSave));


document.querySelectorAll(".scope-btn").forEach(btn=>{
  btn.onclick=()=>{
    editScope=btn.dataset.scope;
    document.querySelectorAll(".scope-btn").forEach(b=>b.classList.toggle("active",b===btn));
    $("scopeHint").textContent = editScope==="all"
      ? "현재 페이지 본문 전체에 적용됩니다."
      : "드래그해서 선택한 글자에만 적용됩니다.";
  };
});

function rememberSelection(){const sel=getSelection();if(sel?.rangeCount){const r=sel.getRangeAt(0);if($("editor").contains(r.commonAncestorContainer))savedRange=r.cloneRange()}}
$("editor").addEventListener("mouseup",rememberSelection);$("editor").addEventListener("keyup",rememberSelection);$("editor").addEventListener("input",rememberSelection);
function restoreSelection(){if(!savedRange)return false;const s=getSelection();s.removeAllRanges();s.addRange(savedRange);return true}
function exec(cmd,val=null){restoreSelection();$("editor").focus();document.execCommand(cmd,false,val);rememberSelection();scheduleSave()}
document.querySelectorAll("[data-cmd]").forEach(b=>{
  b.addEventListener("mousedown",e=>e.preventDefault());
  b.onclick=()=>{
    const cmd=b.dataset.cmd;
    if(editScope==="selection"){
      if(!hasSelection()) return alert("일부 수정 모드에서는 먼저 글자를 선택해주세요.");
      exec(cmd);
    }else{
      const ed=$("editor");
      if(cmd==="bold") toggleWholeStyle("fontWeight","700","400");
      else if(cmd==="italic") toggleWholeStyle("fontStyle","italic","normal");
      else if(cmd==="underline") toggleWholeTextDecoration("underline");
      else if(cmd==="strikeThrough") toggleWholeTextDecoration("line-through");
      else if(["justifyLeft","justifyCenter","justifyRight","justifyFull"].includes(cmd)){
        const map={justifyLeft:"left",justifyCenter:"center",justifyRight:"right",justifyFull:"justify"};
        ed.style.textAlign=map[cmd]; currentPage().pageTypography.textAlign=map[cmd]; persist();
      } else if(cmd==="insertUnorderedList"||cmd==="insertOrderedList"||cmd==="indent"||cmd==="outdent"||cmd==="undo"||cmd==="redo"){
        exec(cmd);
      }
    }
  }
});

$("fontFamily").onchange=e=>{
  if(editScope==="selection"){
    if(!hasSelection()) return alert("일부 수정 모드에서는 먼저 글자를 선택해주세요.");
    exec("fontName",e.target.value);
  }else{
    currentPage().pageTypography.fontFamily=e.target.value;
    applyTypography();persist();
  }
};
$("fontSize").onchange=e=>{
  const px=Math.max(8,Math.min(72,Number(e.target.value)||16));
  if(editScope==="selection"){
    if(!hasSelection()) return alert("일부 수정 모드에서는 먼저 글자를 선택해주세요.");
    applySelectionStyle("fontSize",px+"px");
  }else{
    currentPage().pageTypography.fontSize=px;applyTypography();persist();
  }
};
$("textColor").oninput=e=>{
  if(editScope==="selection"){
    if(!hasSelection()) return;
    exec("foreColor",e.target.value);
  }else{
    $("editor").style.color=e.target.value;
    currentPage().pageTypography.textColor=e.target.value;
    persist();
  }
};
$("highlightColor").oninput=e=>{
  if(editScope==="selection"){
    if(!hasSelection()) return;
    exec("hiliteColor",e.target.value);
  }else{
    current().typography.highlightColor=e.target.value;
    $("editor").style.backgroundColor=e.target.value==="transparent"?"transparent":"";
    persist();
  }
};
$("blockStyle").onchange=e=>exec("formatBlock",e.target.value);
$("linkBtn").onclick=()=>{const u=prompt("링크 주소","https://");if(u)exec("createLink",u)};
$("clearFormatBtn").onclick=()=>exec("removeFormat");


function toggleWholeStyle(prop,onValue,offValue){
  const ed=$("editor");
  const currentValue=ed.style[prop];
  const next=currentValue===onValue?offValue:onValue;
  ed.style[prop]=next;
  currentPage().pageTypography[prop]=next;
  persist();
}
function toggleWholeTextDecoration(kind){
  const ed=$("editor");
  let currentDeco=ed.style.textDecoration||"";
  const has=currentDeco.includes(kind);
  let parts=currentDeco.split(/\s+/).filter(Boolean).filter(x=>x!==kind);
  if(!has) parts.push(kind);
  const next=parts.join(" ");
  ed.style.textDecoration=next;
  currentPage().pageTypography.textDecoration=next;
  persist();
}

function hasSelection(){restoreSelection();const s=getSelection();return !!(s&&s.rangeCount&&!s.isCollapsed&&$("editor").contains(s.getRangeAt(0).commonAncestorContainer))}
function applySelectionStyle(prop,value){restoreSelection();const s=getSelection();if(!s?.rangeCount||s.isCollapsed)return false;const r=s.getRangeAt(0),span=document.createElement("span");span.style[prop]=value;try{r.surroundContents(span)}catch{const f=r.extractContents();span.appendChild(f);r.insertNode(span)}rememberSelection();scheduleSave();return true}
function applySelectionWidthScale(percent){
  restoreSelection();
  const s=getSelection(); if(!s?.rangeCount||s.isCollapsed)return false;
  const r=s.getRangeAt(0),span=document.createElement("span");
  span.style.display="inline-block";
  span.style.transform=`scaleX(${percent/100})`;
  span.style.transformOrigin="left center";
  try{r.surroundContents(span)}catch{const f=r.extractContents();span.appendChild(f);r.insertNode(span)}
  rememberSelection();scheduleSave();return true;
}
function effectiveTypography(){
  return {...current().typography,...(currentPage().pageTypography||{})};
}
function applyTypography(){
  const t=effectiveTypography();
  $("editor").style.setProperty("--editor-font",`"${t.fontFamily}"`);
  $("editor").style.setProperty("--editor-size",t.fontSize+"px");
  $("editor").style.setProperty("--editor-letter",(t.letterSpacing/100)+"em");
  $("editor").style.setProperty("--editor-line",String(t.lineHeight));
  $("editor").style.setProperty("--editor-para",t.paragraphSpacing+"px");
  $("editor").style.color=t.textColor||"";
  $("editor").style.fontWeight=t.fontWeight||"";
  $("editor").style.fontStyle=t.fontStyle||"";
  $("editor").style.textDecoration=t.textDecoration||"";
  $("editor").style.textAlign=t.textAlign||"";
  const scale=(t.widthScale??100)/100;
  $("editor").style.transform=`scaleX(${scale})`;
  $("editor").style.transformOrigin="left top";
  $("editor").style.width=`${100/scale}%`;
}
function bindRange(id,key,format){
  $(id).oninput=e=>{
    const value=format(Number(e.target.value));
    if(editScope==="selection"){
      if(!hasSelection()) return;
      const map={letterSpacing:"letterSpacing",lineHeight:"lineHeight",paragraphSpacing:"marginBottom",widthScale:"transform"};
      if(key==="letterSpacing") applySelectionStyle("letterSpacing",(value/100)+"em");
      else if(key==="lineHeight") applySelectionStyle("lineHeight",String(value));
      else if(key==="paragraphSpacing") applySelectionStyle("marginBottom",value+"px");
      else if(key==="widthScale") applySelectionWidthScale(value);
    }else{
      currentPage().pageTypography[key]=value;applyTypography();persist();syncControls();
    }
  }
}
bindRange("letterSpacing","letterSpacing",v=>v);
bindRange("lineHeight","lineHeight",v=>v/100);
bindRange("paragraphSpacing","paragraphSpacing",v=>v);
bindRange("widthScale","widthScale",v=>v);

function syncControls(){
  const t=effectiveTypography(),b=current().background;
  $("fontFamily").value=t.fontFamily;$("fontSize").value=t.fontSize;
  $("letterSpacing").value=t.letterSpacing;$("letterSpacingOut").textContent=(t.letterSpacing/100)+"em";
  $("lineHeight").value=Math.round(t.lineHeight*100);$("lineHeightOut").textContent=String(t.lineHeight);
  $("paragraphSpacing").value=t.paragraphSpacing;$("paragraphSpacingOut").textContent=t.paragraphSpacing+"px";
  $("widthScale").value=t.widthScale??100;$("widthScaleOut").textContent=(t.widthScale??100)+"%";
  $("solidColor").value=b.solid;$("grad1").value=b.grad1;$("grad2").value=b.grad2;$("gradAngle").value=b.angle;$("gradAngleOut").textContent=b.angle+"°";
  $("bgSize").value=b.size;$("bgBrightness").value=b.brightness;$("bgBrightnessOut").textContent=b.brightness+"%";
  $("effectOpacity").value=b.effectOpacity;$("effectOpacityOut").textContent=b.effectOpacity+"%";
  $("dividerSize").value=b.dividerSize??16;$("dividerSizeOut").textContent=(b.dividerSize??16)+"px";
  $("dividerMargin").value=b.dividerMargin??18;$("dividerMarginOut").textContent=(b.dividerMargin??18)+"px";
  document.querySelectorAll(".bg-mode").forEach(x=>x.classList.toggle("active",x.dataset.mode===b.mode));
  document.querySelectorAll(".effect-btn").forEach(x=>x.classList.toggle("active",x.dataset.effect===b.effect));
}

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===t));document.querySelectorAll(".panel-body").forEach(p=>p.classList.toggle("active",p.dataset.panel===t.dataset.tab))});

document.querySelectorAll(".bg-mode").forEach(b=>b.onclick=()=>{current().background.mode=b.dataset.mode;persist();syncControls();applyBackground()});
["solidColor","grad1","grad2"].forEach(id=>$(id).oninput=e=>{const map={solidColor:"solid",grad1:"grad1",grad2:"grad2"};current().background[map[id]]=e.target.value;persist();applyBackground()});
$("gradAngle").oninput=e=>{current().background.angle=Number(e.target.value);persist();syncControls();applyBackground()};
$("bgSize").onchange=e=>{current().background.size=e.target.value;persist();applyBackground()};
$("bgBrightness").oninput=e=>{current().background.brightness=Number(e.target.value);persist();syncControls();applyBackground()};

document.querySelectorAll(".effect-btn").forEach(b=>b.onclick=()=>{current().background.effect=b.dataset.effect;persist();syncControls();applyBackground()});
$("effectOpacity").oninput=e=>{current().background.effectOpacity=Number(e.target.value);persist();syncControls();applyBackground()};
$("dividerSize").oninput=e=>{current().background.dividerSize=Number(e.target.value);persist();syncControls()};
$("dividerMargin").oninput=e=>{current().background.dividerMargin=Number(e.target.value);persist();syncControls()};

function applyBackground(){
  const b=current().background,p=$("paper"),fx=$("paperEffect");
  if(activeBgUrl){URL.revokeObjectURL(activeBgUrl);activeBgUrl=null}
  p.style.backgroundColor=b.solid;p.style.backgroundImage="none";p.style.backgroundSize=b.size;p.style.backgroundPosition="center";p.style.backgroundRepeat="no-repeat";p.style.filter=`brightness(${b.brightness}%)`;
  if(b.mode==="gradient")p.style.backgroundImage=`linear-gradient(${b.angle}deg,${b.grad1},${b.grad2})`;
  if(b.mode==="image"&&b.imageId)getAsset(BG_STORE,b.imageId).then(a=>{if(a?.file){activeBgUrl=URL.createObjectURL(a.file);p.style.backgroundImage=`url("${activeBgUrl}")`}});
  fx.className="paper-effect"+(b.effect!=="none"?" effect-"+b.effect:"");fx.style.opacity=String(b.effectOpacity/100);
  renderDecorations();
}
function renderDecorations(){
  const layer=$("symbolLayer");layer.innerHTML="";
  for(const d of current().background.decorations||[]){
    const el=document.createElement("div");el.className="paper-deco deco-"+d;layer.appendChild(el)
  }
  for(const d of currentPage().pageDecorations||[]){
    if(d.type==="text"){
      const el=document.createElement("div");
      el.className=`custom-page-deco text ${d.position}`;
      el.textContent=d.text;
      el.style.fontSize=(d.size||24)+"px";
      layer.appendChild(el);
    }else if(d.type==="image" && d.dataUrl){
      const el=document.createElement("div");
      el.className=`custom-page-deco image ${d.position}`;
      el.style.width=(d.size||80)+"px";
      const img=document.createElement("img");
      img.src=d.dataUrl;
      el.appendChild(img);
      layer.appendChild(el);
    }
  }
}
function findCurrentBlockFromSelection(){
  restoreSelection();
  const sel=getSelection();
  if(!sel?.rangeCount)return null;
  let node=sel.getRangeAt(0).startContainer;
  if(node.nodeType===3)node=node.parentNode;
  while(node && node!==$("editor")){
    if(/^(P|DIV|BLOCKQUOTE|LI|H1|H2|H3)$/.test(node.tagName)) return node;
    node=node.parentNode;
  }
  return null;
}

function insertParagraphDivider(symbol){
  const editorEl=$("editor");
  restoreSelection();
  const sel=getSelection();
  const divider=document.createElement("div");
  divider.className="paragraph-divider";
  divider.dataset.ornament=symbol;
  divider.textContent=symbol;
  divider.contentEditable="false";

  const b=current().background;
  divider.style.fontSize=(b.dividerSize??16)+"px";
  divider.style.margin=(b.dividerMargin??18)+"px 0";

  const block=findCurrentBlockFromSelection();

  if(block && block.parentNode){
    block.insertAdjacentElement("afterend",divider);

    // 장식 뒤에 다음 문단이 없으면 새 문단 자동 생성
    let next=divider.nextElementSibling;
    if(!next || next.classList.contains("paragraph-divider")){
      const p=document.createElement("p");
      p.innerHTML="<br>";
      divider.insertAdjacentElement("afterend",p);
      next=p;
    }

    const range=document.createRange();
    range.selectNodeContents(next);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }else{
    // 빈 본문 또는 블록을 찾지 못한 경우 현재 위치에 삽입
    editorEl.appendChild(divider);
    const p=document.createElement("p");
    p.innerHTML="<br>";
    editorEl.appendChild(p);
    const range=document.createRange();
    range.selectNodeContents(p);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  rememberSelection();
  scheduleSave();
}

document.querySelectorAll("[data-symbol]").forEach(b=>{
  b.onclick=()=>insertParagraphDivider(b.dataset.symbol);
});
$("insertCustomDividerBtn").onclick=()=>{
  const text=$("customDividerText").value.trim();
  if(!text)return;
  insertParagraphDivider(text);
};
document.querySelectorAll("[data-deco]").forEach(b=>b.onclick=()=>{const d=b.dataset.deco,arr=current().background.decorations||(current().background.decorations=[]);if(!arr.includes(d))arr.push(d);persist();renderDecorations()});

let pendingDecoImageDataUrl=null;
$("customDecoSize").oninput=e=>{
  $("customDecoSizeOut").textContent=Number(e.target.value)+"px";
};

function addCustomTextDecoration(position){
  const text=$("customDecoText").value.trim();
  if(!text)return;
  const arr=currentPage().pageDecorations||(currentPage().pageDecorations=[]);
  arr.push({type:"text",position,text,size:Number($("customDecoSize").value)||80});
  persist();renderDecorations();
}

$("addCustomTopTextBtn").onclick=()=>addCustomTextDecoration("top");
$("addCustomBottomTextBtn").onclick=()=>addCustomTextDecoration("bottom");

$("customDecoImageInput").onchange=e=>{
  const f=e.target.files?.[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{pendingDecoImageDataUrl=reader.result;};
  reader.readAsDataURL(f);
};

function addCustomImageDecoration(position){
  if(!pendingDecoImageDataUrl)return alert("먼저 장식 이미지 파일을 추가해주세요.");
  const arr=currentPage().pageDecorations||(currentPage().pageDecorations=[]);
  arr.push({type:"image",position,dataUrl:pendingDecoImageDataUrl,size:Number($("customDecoSize").value)||80});
  persist();renderDecorations();
}
$("placeImageTopBtn").onclick=()=>addCustomImageDecoration("top");
$("placeImageBottomBtn").onclick=()=>addCustomImageDecoration("bottom");

$("clearDecoBtn").onclick=()=>{
  current().background.decorations=[];
  currentPage().pageDecorations=[];
  persist();renderDecorations()
};

function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,DBV);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(FONT_STORE))db.createObjectStore(FONT_STORE,{keyPath:"id"});if(!db.objectStoreNames.contains(BG_STORE))db.createObjectStore(BG_STORE,{keyPath:"id"})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function putAsset(store,a){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(a);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getAsset(store,id){if(!id)return null;const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(store).objectStore(store).get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}
async function delAsset(store,id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}

$("bgUpload").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const id="bg-"+Date.now();await putAsset(BG_STORE,{id,file:f,name:f.name});current().background.imageId=id;current().background.mode="image";persist();syncControls();applyBackground();e.target.value=""};
$("fontUpload").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const id="font-"+Date.now(),name=f.name.replace(/\.[^.]+$/,"");await putAsset(FONT_STORE,{id,file:f,name});await loadFonts();e.target.value=""};
async function loadFonts(){
  const list=await getAll(FONT_STORE),sel=$("fontFamily");sel.querySelectorAll("[data-custom]").forEach(o=>o.remove());$("customFontList").innerHTML="";
  for(const a of list){const family="user-"+a.id,url=URL.createObjectURL(a.file);try{const face=new FontFace(family,`url(${url})`);await face.load();document.fonts.add(face)}catch{}
    const o=document.createElement("option");o.value=family;o.textContent=a.name;o.dataset.custom="1";sel.appendChild(o);
    const row=document.createElement("div");row.className="asset-row";row.innerHTML=`<span>${esc(a.name)}</span><button>삭제</button>`;row.querySelector("button").onclick=async()=>{await delAsset(FONT_STORE,a.id);await loadFonts()};$("customFontList").appendChild(row)
  }
}

function clonePaper(){
  saveCurrent(false);const clone=$("paper").cloneNode(true);clone.removeAttribute("id");clone.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));
  const inputs=$("paper").querySelectorAll("input"),ci=clone.querySelectorAll("input");inputs.forEach((x,i)=>{if(ci[i]){ci[i].value=x.value;ci[i].setAttribute("value",x.value);ci[i].readOnly=true}});
  const ed=clone.querySelector(".editor");ed.removeAttribute("contenteditable");ed.style.overflow="visible";ed.style.height="auto";
  return clone
}
$("previewBtn").onclick=()=>{const h=$("previewHost");h.innerHTML="";h.appendChild(clonePaper());$("previewModal").hidden=false};
document.querySelectorAll("[data-close-preview]").forEach(x=>x.onclick=()=>{$("previewModal").hidden=true});
$("previewCopyBtn").onclick=()=>copyCurrent();
$("previewSaveBtn").onclick=()=>{$("previewModal").hidden=true;$("saveMenu").classList.add("open")};

async function copyCurrent(){saveCurrent(false);const s=current(),txt=[s.title,s.subtitle,strip(s.content)].filter(Boolean).join("\n\n");await navigator.clipboard.writeText(txt);$("saveStatus").textContent="복사됨 ✓";setTimeout(()=>$("saveStatus").textContent="자동 저장됨",800)}
$("copyBtn").onclick=copyCurrent;
$("saveMenuBtn").onclick=e=>{e.stopPropagation();$("saveMenu").classList.toggle("open")};
document.addEventListener("click",()=>{$("saveMenu").classList.remove("open")});$("saveMenu").onclick=e=>e.stopPropagation();
document.querySelectorAll("[data-export]").forEach(b=>b.onclick=()=>exportFile(b.dataset.export));

async function capture(){
  saveCurrent(false);await document.fonts.ready;const host=document.createElement("div");host.className="export-host";const clone=clonePaper();host.appendChild(clone);document.body.appendChild(host);
  try{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const ed=clone.querySelector(".editor");ed.style.minHeight=Math.max(820,ed.scrollHeight+40)+"px";clone.style.minHeight=Math.max(1123,clone.scrollHeight+10)+"px";await new Promise(r=>requestAnimationFrame(r));return await html2canvas(clone,{scale:2,useCORS:true,backgroundColor:null,width:clone.scrollWidth,height:clone.scrollHeight,windowWidth:1200,windowHeight:Math.max(1400,clone.scrollHeight+100)})}finally{host.remove()}
}
async function exportFile(type){
  $("saveMenu").classList.remove("open");if(type==="txt"){const s=current();download(new Blob(["\ufeff"+[s.title,s.subtitle,strip(s.content)].filter(Boolean).join("\n\n")],{type:"text/plain"}),safe(s.title||s.name)+".txt");return}
  const c=await capture(),name=safe(current().title||current().name);
  if(type==="png")return c.toBlob(b=>download(b,name+".png"),"image/png");
  if(type==="jpg")return c.toBlob(b=>download(b,name+".jpg"),"image/jpeg",.94);
  if(type==="pdf"){const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:"mm",format:"a4"}),img=c.toDataURL("image/jpeg",.95),h=c.height*210/c.width;pdf.addImage(img,"JPEG",0,0,210,h);pdf.save(name+".pdf")}
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

$("exportBackupBtn").onclick=()=>download(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),"my-editor-backup.json");
$("importBackupInput").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.slots?.length)throw 0;state=d;currentSlotId=d.currentSlotId||d.slots[0].id;persist();renderAll()}catch{alert("올바른 백업 파일이 아닙니다.")}};r.readAsText(f)};

loadFonts();renderAll();
