const STORAGE_KEY = "my-writing-editor-v2";
const OLD_STORAGE_KEY = "my-writing-editor-v1";
const DB_NAME = "my-writing-editor-assets";
const DB_VERSION = 1;
const FONT_STORE = "fonts";
const BG_STORE = "backgrounds";

const $ = id => document.getElementById(id);

const slotList = $("slotList");
const editor = $("editor");
const titleInput = $("titleInput");
const subtitleInput = $("subtitleInput");
const slotNameInput = $("slotNameInput");
const currentSlotLabel = $("currentSlotLabel");
const updatedAt = $("updatedAt");
const wordCount = $("wordCount");
const docInfo = $("docInfo");
const saveStatus = $("saveStatus");
const lastSaved = $("lastSaved");
const pagePrefixInput = $("pagePrefixInput");
const pageNumberInput = $("pageNumberInput");
const pageSuffixInput = $("pageSuffixInput");
const pageNumberPreview = $("pageNumberPreview");

let state = loadState();
let currentSlotId = state.currentSlotId;
let activeBgObjectUrl = null;
let fontObjectUrls = new Map();

function defaultAppearance() {
  return {
    mode: "solid",
    solid: "#f5f4f1",
    gradient1: "#f5f4f1",
    gradient2: "#d9d8e8",
    gradientAngle: 135,
    backgroundAssetId: null,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundBlur: 0,
    backgroundBrightness: 100,
    paperColor: "#ffffff",
    paperOpacity: 96
  };
}

function defaultSlot(index) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: `새 문서 ${String(index).padStart(2, "0")}`,
    title: "",
    subtitle: "",
    content: "",
    pagePrefix: "—",
    pageNumber: String(index).padStart(2, "0"),
    pageSuffix: "—",
    updatedAt: null
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.appearance = { ...defaultAppearance(), ...(parsed.appearance || {}) };
      parsed.slots = (parsed.slots || []).map((s, i) => ({
        ...defaultSlot(i + 1),
        ...s
      }));
      if (parsed.slots.length) return parsed;
    }

    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const parsedOld = JSON.parse(old);
      const slots = (parsedOld.slots || []).map((s, i) => ({
        ...defaultSlot(i + 1),
        ...s,
        subtitle: "",
        pagePrefix: "—",
        pageNumber: String(i + 1).padStart(2, "0"),
        pageSuffix: "—"
      }));
      if (slots.length) {
        return {
          slots,
          currentSlotId: parsedOld.currentSlotId || slots[0].id,
          appearance: defaultAppearance()
        };
      }
    }
  } catch (e) {
    console.warn(e);
  }

  const slots = Array.from({length:4}, (_,i) => defaultSlot(i+1));
  return { slots, currentSlotId: slots[0].id, appearance: defaultAppearance() };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentSlot() {
  return state.slots.find(s => s.id === currentSlotId) || state.slots[0];
}

function renderSlots() {
  slotList.innerHTML = "";
  state.slots.forEach((slot, index) => {
    const item = document.createElement("button");
    item.className = "slot" + (slot.id === currentSlotId ? " active" : "");
    item.type = "button";
    item.innerHTML = `
      <div class="slot-number">SLOT ${String(index + 1).padStart(2, "0")}</div>
      <div class="slot-name">${escapeHtml(slot.name || "이름 없음")}</div>
      <div class="slot-preview">${escapeHtml(stripHtml(slot.content) || slot.subtitle || "비어 있음")}</div>
    `;
    item.addEventListener("click", () => switchSlot(slot.id));
    slotList.appendChild(item);
  });
}

function renderEditor() {
  const slot = currentSlot();
  if (!slot) return;
  const index = state.slots.findIndex(s => s.id === slot.id) + 1;
  currentSlotLabel.textContent = `SLOT ${String(index).padStart(2, "0")}`;
  titleInput.value = slot.title || "";
  subtitleInput.value = slot.subtitle || "";
  editor.innerHTML = slot.content || "";
  slotNameInput.value = slot.name || "";
  pagePrefixInput.value = slot.pagePrefix ?? "—";
  pageNumberInput.value = slot.pageNumber ?? String(index).padStart(2, "0");
  pageSuffixInput.value = slot.pageSuffix ?? "—";
  updatePageNumberPreview();
  updatedAt.textContent = slot.updatedAt ? formatDate(slot.updatedAt) : "-";
  updateCounts();
  renderSlots();
  saveStatus.textContent = "자동 저장됨";
}

function switchSlot(id) {
  saveCurrent(false);
  currentSlotId = id;
  state.currentSlotId = id;
  persist();
  renderEditor();
}

function saveCurrent(showStatus = true) {
  const slot = currentSlot();
  if (!slot) return;
  slot.title = titleInput.value;
  slot.subtitle = subtitleInput.value;
  slot.content = editor.innerHTML;
  slot.pagePrefix = pagePrefixInput.value;
  slot.pageNumber = pageNumberInput.value;
  slot.pageSuffix = pageSuffixInput.value;
  slot.updatedAt = new Date().toISOString();
  state.currentSlotId = currentSlotId;
  persist();
  renderSlots();
  updatedAt.textContent = formatDate(slot.updatedAt);
  updateCounts();
  updatePageNumberPreview();
  lastSaved.textContent = `저장 ${formatTime(slot.updatedAt)}`;
  if (showStatus) {
    saveStatus.textContent = "저장됨 ✓";
    setTimeout(() => saveStatus.textContent = "자동 저장됨", 900);
  }
}

let saveTimer;
function scheduleSave() {
  saveStatus.textContent = "저장 중…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrent(true), 300);
  updateCounts();
}

function updateCounts() {
  const text = stripHtml(editor.innerHTML).replace(/\s/g,"");
  const count = text.length;
  wordCount.textContent = `${count.toLocaleString()}자`;
  docInfo.textContent = `${count.toLocaleString()}자`;
}

function updatePageNumberPreview() {
  const parts = [pagePrefixInput.value, pageNumberInput.value, pageSuffixInput.value].filter(v => v !== "");
  pageNumberPreview.textContent = parts.join(" ");
}

function addSlot() {
  const slot = defaultSlot(state.slots.length + 1);
  state.slots.push(slot);
  currentSlotId = slot.id;
  state.currentSlotId = currentSlotId;
  persist();
  renderEditor();
  titleInput.focus();
}

function deleteCurrentSlot() {
  if (state.slots.length <= 1) {
    alert("슬롯은 최소 1개가 필요합니다.");
    return;
  }
  const slot = currentSlot();
  if (!confirm(`"${slot.name}" 슬롯을 삭제할까요?\n삭제한 내용은 복구할 수 없습니다.`)) return;
  const index = state.slots.findIndex(s => s.id === currentSlotId);
  state.slots.splice(index, 1);
  currentSlotId = state.slots[Math.max(0, index - 1)].id;
  state.currentSlotId = currentSlotId;
  persist();
  renderEditor();
}

function renameSlot() {
  const slot = currentSlot();
  const name = prompt("새 슬롯 이름을 입력하세요.", slot.name);
  if (name === null) return;
  slot.name = name.trim() || "이름 없음";
  persist();
  renderEditor();
}

function exportCurrent() {
  saveCurrent(false);
  const slot = currentSlot();
  const text = [
    slot.title || slot.name,
    slot.subtitle || "",
    "",
    stripHtml(slot.content),
    "",
    [slot.pagePrefix, slot.pageNumber, slot.pageSuffix].filter(Boolean).join(" ")
  ].join("\n");
  downloadBlob(text, `${safeFilename(slot.title || slot.name)}.txt`, "text/plain;charset=utf-8");
}

function exportAll() {
  saveCurrent(false);
  const backup = {
    app: "My Writing Editor",
    version: 2,
    exportedAt: new Date().toISOString(),
    slots: state.slots,
    currentSlotId: state.currentSlotId,
    appearance: state.appearance
  };
  downloadBlob(JSON.stringify(backup, null, 2), "my-editor-backup-v2.json", "application/json;charset=utf-8");
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.slots) || !data.slots.length) throw new Error("invalid");
      state = {
        slots: data.slots.map((s,i) => ({...defaultSlot(i+1), ...s})),
        currentSlotId: data.currentSlotId || data.slots[0].id,
        appearance: {...defaultAppearance(), ...(data.appearance || {})}
      };
      currentSlotId = state.currentSlotId;
      persist();
      syncAppearanceControls();
      applyAppearance();
      renderEditor();
      alert("백업을 불러왔습니다.");
    } catch {
      alert("올바른 백업 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
}

function copyCurrent() {
  saveCurrent(false);
  const slot = currentSlot();
  const text = `${slot.title || slot.name}\n${slot.subtitle || ""}\n\n${stripHtml(slot.content)}`;
  navigator.clipboard?.writeText(text).then(() => {
    saveStatus.textContent = "복사됨 ✓";
    setTimeout(() => saveStatus.textContent = "자동 저장됨", 900);
  }).catch(() => alert("복사에 실패했습니다."));
}

function exec(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
  scheduleSave();
}

document.querySelectorAll(".toolbar button[data-command]").forEach(btn => {
  btn.addEventListener("mousedown", e => e.preventDefault());
  btn.addEventListener("click", () => exec(btn.dataset.command, btn.dataset.value || null));
});

$("blockSelect").addEventListener("change", e => {
  exec("formatBlock", e.target.value);
  e.target.value = "p";
});

$("fontSelect").addEventListener("change", e => {
  if (e.target.value) exec("fontName", e.target.value);
});

$("fontSizeSelect").addEventListener("change", e => {
  if (e.target.value) exec("fontSize", e.target.value);
  e.target.value = "";
});

$("textColor").addEventListener("input", e => exec("foreColor", e.target.value));
$("highlightColor").addEventListener("input", e => exec("hiliteColor", e.target.value));

$("hrBtn").addEventListener("click", () => exec("insertHorizontalRule"));
$("clearFormatBtn").addEventListener("click", () => exec("removeFormat"));

$("linkBtn").addEventListener("click", () => {
  const url = prompt("링크 주소를 입력하세요.", "https://");
  if (url) exec("createLink", url);
});

$("imageBtn").addEventListener("click", () => {
  const url = prompt("본문에 넣을 이미지 URL을 입력하세요.");
  if (url) exec("insertImage", url);
});

$("newSlotBtn").addEventListener("click", addSlot);
$("deleteSlotBtn").addEventListener("click", deleteCurrentSlot);
$("renameBtn").addEventListener("click", renameSlot);
$("copyBtn").addEventListener("click", copyCurrent);
$("downloadBtn").addEventListener("click", exportCurrent);
$("exportAllBtn").addEventListener("click", exportAll);

$("importBackupInput").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (file) importBackup(file);
  e.target.value = "";
});

[titleInput, subtitleInput, editor].forEach(el => el.addEventListener("input", scheduleSave));

slotNameInput.addEventListener("input", () => {
  const slot = currentSlot();
  slot.name = slotNameInput.value.trim() || "이름 없음";
  persist();
  renderSlots();
});

[pagePrefixInput, pageNumberInput, pageSuffixInput].forEach(el => {
  el.addEventListener("input", () => {
    updatePageNumberPreview();
    scheduleSave();
  });
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("모든 슬롯과 작성 내용을 삭제하고 처음 상태로 되돌릴까요?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OLD_STORAGE_KEY);
  state = loadState();
  currentSlotId = state.currentSlotId;
  renderEditor();
});

/* ---------- IndexedDB ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) db.createObjectStore(FONT_STORE, {keyPath:"id"});
      if (!db.objectStoreNames.contains(BG_STORE)) db.createObjectStore(BG_STORE, {keyPath:"id"});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAsset(storeName, asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(asset);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAsset(storeName, id) {
  if (!id) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, "readonly").objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllAssets(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteAsset(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- Custom fonts ---------- */
$("fontFileInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["ttf","otf","woff","woff2"].includes(ext)) {
    alert("TTF, OTF, WOFF, WOFF2 파일만 사용할 수 있습니다.");
    return;
  }
  const cleanName = file.name.replace(/\.[^.]+$/, "");
  const id = `font-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await putAsset(FONT_STORE, { id, name: cleanName, file });
  await loadCustomFonts();
  $("fontSelect").value = `custom-${id}`;
  e.target.value = "";
});

async function loadCustomFonts() {
  const assets = await getAllAssets(FONT_STORE);
  [...$("fontSelect").querySelectorAll("option[data-custom='1']")].forEach(o => o.remove());
  $("customFontList").innerHTML = "";

  for (const asset of assets) {
    if (fontObjectUrls.has(asset.id)) URL.revokeObjectURL(fontObjectUrls.get(asset.id));
    const url = URL.createObjectURL(asset.file);
    fontObjectUrls.set(asset.id, url);
    const family = `custom-${asset.id}`;
    const face = new FontFace(family, `url(${url})`);
    try {
      await face.load();
      document.fonts.add(face);
    } catch (e) {
      console.warn("폰트 로드 실패:", asset.name, e);
    }

    const option = document.createElement("option");
    option.value = family;
    option.textContent = asset.name;
    option.dataset.custom = "1";
    $("fontSelect").appendChild(option);

    const row = document.createElement("div");
    row.className = "asset-item";
    row.innerHTML = `<span>${escapeHtml(asset.name)}</span><button type="button">삭제</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      await deleteAsset(FONT_STORE, asset.id);
      await loadCustomFonts();
    });
    $("customFontList").appendChild(row);
  }
}

/* ---------- Appearance ---------- */
const settingsDrawer = $("settingsDrawer");
const drawerBackdrop = $("drawerBackdrop");

function openSettings() {
  settingsDrawer.classList.add("open");
  drawerBackdrop.classList.add("open");
}
function closeSettings() {
  settingsDrawer.classList.remove("open");
  drawerBackdrop.classList.remove("open");
}
$("settingsBtn").addEventListener("click", openSettings);
$("closeSettingsBtn").addEventListener("click", closeSettings);
drawerBackdrop.addEventListener("click", closeSettings);

document.querySelectorAll(".bg-mode").forEach(btn => {
  btn.addEventListener("click", () => {
    state.appearance.mode = btn.dataset.mode;
    persist();
    syncAppearanceControls();
    applyAppearance();
  });
});

[
  ["solidColorInput","solid"],
  ["gradientColor1","gradient1"],
  ["gradientColor2","gradient2"],
  ["gradientAngle","gradientAngle"],
  ["backgroundSizeSelect","backgroundSize"],
  ["backgroundRepeatSelect","backgroundRepeat"],
  ["backgroundBlur","backgroundBlur"],
  ["backgroundBrightness","backgroundBrightness"],
  ["paperColorInput","paperColor"],
  ["paperOpacity","paperOpacity"]
].forEach(([id,key]) => {
  $(id).addEventListener("input", () => {
    let value = $(id).value;
    if (["gradientAngle","backgroundBlur","backgroundBrightness","paperOpacity"].includes(key)) value = Number(value);
    state.appearance[key] = value;
    persist();
    syncAppearanceLabels();
    applyAppearance();
  });
});

$("backgroundFileInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const id = `bg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await putAsset(BG_STORE, {id, name:file.name, file});
  state.appearance.backgroundAssetId = id;
  state.appearance.mode = "image";
  persist();
  syncAppearanceControls();
  await applyAppearance();
  e.target.value = "";
});

$("resetAppearanceBtn").addEventListener("click", async () => {
  state.appearance = defaultAppearance();
  persist();
  syncAppearanceControls();
  await applyAppearance();
});

function syncAppearanceLabels() {
  $("gradientAngleValue").textContent = `${state.appearance.gradientAngle}°`;
  $("backgroundBlurValue").textContent = `${state.appearance.backgroundBlur}px`;
  $("backgroundBrightnessValue").textContent = `${state.appearance.backgroundBrightness}%`;
  $("paperOpacityValue").textContent = `${state.appearance.paperOpacity}%`;
}

function syncAppearanceControls() {
  const a = state.appearance;
  $("solidColorInput").value = a.solid;
  $("gradientColor1").value = a.gradient1;
  $("gradientColor2").value = a.gradient2;
  $("gradientAngle").value = a.gradientAngle;
  $("backgroundSizeSelect").value = a.backgroundSize;
  $("backgroundRepeatSelect").value = a.backgroundRepeat;
  $("backgroundBlur").value = a.backgroundBlur;
  $("backgroundBrightness").value = a.backgroundBrightness;
  $("paperColorInput").value = a.paperColor;
  $("paperOpacity").value = a.paperOpacity;
  document.querySelectorAll(".bg-mode").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === a.mode));
  syncAppearanceLabels();
}

async function applyAppearance() {
  const a = state.appearance;
  const layer = $("backgroundLayer");

  if (activeBgObjectUrl) {
    URL.revokeObjectURL(activeBgObjectUrl);
    activeBgObjectUrl = null;
  }

  layer.style.backgroundImage = "none";
  layer.style.backgroundColor = a.solid;
  layer.style.backgroundSize = a.backgroundSize;
  layer.style.backgroundRepeat = a.backgroundRepeat;
  layer.style.backgroundPosition = "center";
  layer.style.filter = `blur(${a.backgroundBlur}px) brightness(${a.backgroundBrightness}%)`;

  if (a.mode === "gradient") {
    layer.style.backgroundImage = `linear-gradient(${a.gradientAngle}deg, ${a.gradient1}, ${a.gradient2})`;
  } else if (a.mode === "image" && a.backgroundAssetId) {
    const asset = await getAsset(BG_STORE, a.backgroundAssetId);
    if (asset?.file) {
      activeBgObjectUrl = URL.createObjectURL(asset.file);
      layer.style.backgroundImage = `url("${activeBgObjectUrl}")`;
    }
  }

  const rgb = hexToRgb(a.paperColor);
  document.documentElement.style.setProperty("--paper-rgb", `${rgb.r},${rgb.g},${rgb.b}`);
  document.documentElement.style.setProperty("--paper-opacity", String(a.paperOpacity / 100));
}

function hexToRgb(hex) {
  const h = hex.replace("#","");
  const n = parseInt(h.length === 3 ? h.split("").map(x=>x+x).join("") : h, 16);
  return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
}

/* ---------- helpers ---------- */
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function formatDate(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"
  });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
}
function safeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|]/g,"_").trim() || "document";
}
function downloadBlob(content, filename, type) {
  const blob = new Blob(["\ufeff",content],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- init ---------- */
syncAppearanceControls();
applyAppearance();
loadCustomFonts();
renderEditor();
