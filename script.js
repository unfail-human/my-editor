const $=id=>document.getElementById(id);
const KEY="my-writing-editor-v2";
const DB="my-writing-editor-assets-v10", DBV=1, FONT_STORE="fonts", BG_STORE="backgrounds";

let savedRange=null, slotMenuTarget=null, activeBgUrl=null;
let state=loadState();
let currentSlotId=state.currentSlotId;

function defaultTypography(){return{fontFamily:"Pretendard",fontSize:16,letterSpacing:0,lineHeight:1.78,paragraphSpacing:0}}
function defaultBackground(){return{mode:"solid",solid:"#ffffff",grad1:"#ffffff",grad2:"#e8e2da",angle:135,imageId:null,size:"cover",brightness:100,effect:"none",effectOpacity:18,decorations:[]}}
function newSlot(i){return{id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name:`새 문서 ${String(i).padStart(2,"0")}`,title:"",subtitle:"",content:"",pagePrefix:"—",pageNumber:String(i).padStart(2,"0"),pageSuffix:"—",typography:defaultTypography(),background:defaultBackground(),updatedAt:null}}

function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const old=JSON.parse(raw);
      if(old.slots?.length){
        const slots=old.slots.map((s,i)=>{
          const d=newSlot(i+1);
          return {...d,...s,typography:{...d.typography,...(s.typography||{})},background:{...d.background,...(s.background||{}),...(old.appearance?{
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

function strip(html){const d=document.createElement("div");d.innerHTML=html||"";return d.textContent||""}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function safe(v){return String(v||"document").replace(/[\\/:*?"<>|]/g,"_")}

function renderSlots(){
  $("slotList").innerHTML="";
  state.slots.forEach((s,i)=>{
    const card=document.createElement("div");
    card.className="slot-card"+(s.id===currentSlotId?" active":"");
    card.innerHTML=`<button class="slot-main"><div class="slot-no">SLOT ${String(i+1).padStart(2,"0")}</div><div class="slot-name">${esc(s.name)}</div><div class="slot-preview">${esc(strip(s.content)||s.subtitle||"비어 있음")}</div></button><button class="slot-more" aria-label="슬롯 편집">⋯</button>`;
    card.querySelector(".slot-main").onclick=()=>{saveCurrent();currentSlotId=s.id;state.currentSlotId=s.id;persist();renderAll()};
    card.querySelector(".slot-more").onclick=e=>openSlotMenu(e,s.id);
    $("slotList").appendChild(card);
  })
}
function renderAll(){
  const s=current(); if(!s)return;
  const idx=state.slots.findIndex(x=>x.id===s.id)+1;
  $("slotLabel").textContent=`SLOT ${String(idx).padStart(2,"0")}`;
  $("titleInput").value=s.title||"";
  $("subtitleInput").value=s.subtitle||"";
  $("editor").innerHTML=s.content||"";
  $("pageNumberPreview").textContent=[s.pagePrefix,s.pageNumber,s.pageSuffix].filter(Boolean).join(" ");
  applyTypography();
  syncControls();
  applyBackground();
  renderSlots();
  updateCount();
}
function saveCurrent(mark=true){
  const s=current();if(!s)return;
  s.title=$("titleInput").value;s.subtitle=$("subtitleInput").value;s.content=$("editor").innerHTML;s.updatedAt=new Date().toISOString();
  persist();updateCount();renderSlots();
  $("lastSaved").textContent="저장 "+new Date(s.updatedAt).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  if(mark){$("saveStatus").textContent="저장됨 ✓";setTimeout(()=>$("saveStatus").textContent="자동 저장됨",800)}
}
let saveTimer;
function scheduleSave(){clearTimeout(saveTimer);$("saveStatus").textContent="저장 중…";saveTimer=setTimeout(()=>saveCurrent(),300);updateCount()}
function updateCount(){const n=strip($("editor").innerHTML).replace(/\s/g,"").length;$("charCount").textContent=`${n.toLocaleString()}자`}

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

function rememberSelection(){const sel=getSelection();if(sel?.rangeCount){const r=sel.getRangeAt(0);if($("editor").contains(r.commonAncestorContainer))savedRange=r.cloneRange()}}
$("editor").addEventListener("mouseup",rememberSelection);$("editor").addEventListener("keyup",rememberSelection);$("editor").addEventListener("input",rememberSelection);
function restoreSelection(){if(!savedRange)return false;const s=getSelection();s.removeAllRanges();s.addRange(savedRange);return true}
function exec(cmd,val=null){restoreSelection();$("editor").focus();document.execCommand(cmd,false,val);rememberSelection();scheduleSave()}
document.querySelectorAll("[data-cmd]").forEach(b=>{b.addEventListener("mousedown",e=>e.preventDefault());b.onclick=()=>exec(b.dataset.cmd)});

$("fontFamily").onchange=e=>{if(hasSelection())exec("fontName",e.target.value);else{current().typography.fontFamily=e.target.value;applyTypography();persist()}};
$("fontSize").onchange=e=>{const px=Math.max(8,Math.min(72,Number(e.target.value)||16));if(hasSelection())applySelectionStyle("fontSize",px+"px");else{current().typography.fontSize=px;applyTypography();persist()}};
$("textColor").oninput=e=>exec("foreColor",e.target.value);
$("highlightColor").oninput=e=>exec("hiliteColor",e.target.value);
$("blockStyle").onchange=e=>exec("formatBlock",e.target.value);
$("linkBtn").onclick=()=>{const u=prompt("링크 주소","https://");if(u)exec("createLink",u)};
$("clearFormatBtn").onclick=()=>exec("removeFormat");

function hasSelection(){restoreSelection();const s=getSelection();return !!(s&&s.rangeCount&&!s.isCollapsed&&$("editor").contains(s.getRangeAt(0).commonAncestorContainer))}
function applySelectionStyle(prop,value){restoreSelection();const s=getSelection();if(!s?.rangeCount||s.isCollapsed)return false;const r=s.getRangeAt(0),span=document.createElement("span");span.style[prop]=value;try{r.surroundContents(span)}catch{const f=r.extractContents();span.appendChild(f);r.insertNode(span)}rememberSelection();scheduleSave();return true}
function applyTypography(){
  const t=current().typography;
  $("editor").style.setProperty("--editor-font",`"${t.fontFamily}"`);
  $("editor").style.setProperty("--editor-size",t.fontSize+"px");
  $("editor").style.setProperty("--editor-letter",(t.letterSpacing/100)+"em");
  $("editor").style.setProperty("--editor-line",String(t.lineHeight));
  $("editor").style.setProperty("--editor-para",t.paragraphSpacing+"px");
}
function bindRange(id,key,format){
  $(id).oninput=e=>{current().typography[key]=format(Number(e.target.value));applyTypography();persist();syncControls()}
}
bindRange("letterSpacing","letterSpacing",v=>v);
bindRange("lineHeight","lineHeight",v=>v/100);
bindRange("paragraphSpacing","paragraphSpacing",v=>v);

function syncControls(){
  const t=current().typography,b=current().background;
  $("fontFamily").value=t.fontFamily;$("fontSize").value=t.fontSize;
  $("letterSpacing").value=t.letterSpacing;$("letterSpacingOut").textContent=(t.letterSpacing/100)+"em";
  $("lineHeight").value=Math.round(t.lineHeight*100);$("lineHeightOut").textContent=String(t.lineHeight);
  $("paragraphSpacing").value=t.paragraphSpacing;$("paragraphSpacingOut").textContent=t.paragraphSpacing+"px";
  $("solidColor").value=b.solid;$("grad1").value=b.grad1;$("grad2").value=b.grad2;$("gradAngle").value=b.angle;$("gradAngleOut").textContent=b.angle+"°";
  $("bgSize").value=b.size;$("bgBrightness").value=b.brightness;$("bgBrightnessOut").textContent=b.brightness+"%";
  $("effectOpacity").value=b.effectOpacity;$("effectOpacityOut").textContent=b.effectOpacity+"%";
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
  for(const d of current().background.decorations||[]){const el=document.createElement("div");el.className="paper-deco deco-"+d;layer.appendChild(el)}
}
document.querySelectorAll("[data-symbol]").forEach(b=>b.onclick=()=>{restoreSelection();$("editor").focus();document.execCommand("insertText",false,b.dataset.symbol);scheduleSave()});
document.querySelectorAll("[data-deco]").forEach(b=>b.onclick=()=>{const d=b.dataset.deco,arr=current().background.decorations||(current().background.decorations=[]);if(!arr.includes(d))arr.push(d);persist();renderDecorations()});
$("clearDecoBtn").onclick=()=>{current().background.decorations=[];persist();renderDecorations()};

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
