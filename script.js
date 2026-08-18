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
    paperOpacity: 100
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
    typography: {
      letterSpacing: "0em",
      lineHeight: "1.78",
      paragraphSpacing: "0px"
    },
    updatedAt: null
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.appearance = { ...defaultAppearance(), ...(parsed.appearance || {}) };
      parsed.slots = (parsed.slots || []).map((s, i) => {
        const d = defaultSlot(i + 1);
        return {
          ...d,
          ...s,
          typography: { ...d.typography, ...(s.typography || {}) }
        };
      });
      if (parsed.slots.length) return parsed;
    }

    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const parsedOld = JSON.parse(old);
      const slots = (parsedOld.slots || []).map((s, i) => {
        const d = defaultSlot(i + 1);
        return {
          ...d,
          ...s,
          subtitle: "",
          pagePrefix: "—",
          pageNumber: String(i + 1).padStart(2, "0"),
          pageSuffix: "—",
          typography: { ...d.typography, ...(s.typography || {}) }
        };
      });
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
  if ($("slotIndexInfo")) $("slotIndexInfo").textContent = String(index).padStart(2, "0");
  titleInput.value = slot.title || "";
  subtitleInput.value = slot.subtitle || "";
  editor.innerHTML = slot.content || "";
  slotNameInput.value = slot.name || "";
  pagePrefixInput.value = slot.pagePrefix ?? "—";
  pageNumberInput.value = slot.pageNumber ?? String(index).padStart(2, "0");
  pageSuffixInput.value = slot.pageSuffix ?? "—";
  updatePageNumberPreview();
  applySlotTypography();
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


function applySlotTypography() {
  const slot = currentSlot();
  if (!slot) return;
  const t = slot.typography || { letterSpacing:"0em", lineHeight:"1.78", paragraphSpacing:"0px" };
  editor.style.setProperty("--editor-letter-spacing", t.letterSpacing || "0em");
  editor.style.setProperty("--editor-line-height", t.lineHeight || "1.78");
  editor.style.setProperty("--editor-paragraph-spacing", t.paragraphSpacing || "0px");

  if ($("globalLetterSpacing")) {
    const n = parseFloat(t.letterSpacing || "0");
    $("globalLetterSpacing").value = Math.round(n * 100);
    $("globalLetterSpacingValue").textContent = `${t.letterSpacing || "0em"}`;
  }
  if ($("globalLineHeight")) {
    $("globalLineHeight").value = Math.round(parseFloat(t.lineHeight || "1.78") * 100);
    $("globalLineHeightValue").textContent = t.lineHeight || "1.78";
  }
  if ($("globalParagraphSpacing")) {
    $("globalParagraphSpacing").value = parseInt(t.paragraphSpacing || "0", 10) || 0;
    $("globalParagraphSpacingValue").textContent = t.paragraphSpacing || "0px";
  }
}

function setGlobalTypography(key, value) {
  const slot = currentSlot();
  if (!slot.typography) slot.typography = { letterSpacing:"0em", lineHeight:"1.78", paragraphSpacing:"0px" };
  slot.typography[key] = value;
  applySlotTypography();
  persist();
  saveCurrent(false);
}

function applyStyleToSelection(styleProperty, value) {
  restoreEditorSelection();
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const span = document.createElement("span");
  span.style[styleProperty] = value;
  try {
    range.surroundContents(span);
  } catch (e) {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.addRange(newRange);
  scheduleSave();
  return true;
}

function applyParagraphSpacingToSelection(value) {
  restoreEditorSelection();
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const blocks = new Set();
  let node = range.startContainer;
  while (node && node !== editor) {
    if (node.nodeType === 1 && /^(P|DIV|BLOCKQUOTE|LI|H1|H2|H3)$/.test(node.tagName)) {
      blocks.add(node);
      break;
    }
    node = node.parentNode;
  }

  node = range.endContainer;
  while (node && node !== editor) {
    if (node.nodeType === 1 && /^(P|DIV|BLOCKQUOTE|LI|H1|H2|H3)$/.test(node.tagName)) {
      blocks.add(node);
      break;
    }
    node = node.parentNode;
  }

  blocks.forEach(el => el.style.marginBottom = value);
  if (blocks.size) {
    scheduleSave();
    return true;
  }
  return false;
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


function duplicateCurrentSlot() {
  saveCurrent(false);
  const slot = currentSlot();
  if (!slot) return;

  const clone = JSON.parse(JSON.stringify(slot));
  clone.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  clone.name = `${slot.name || "새 문서"} 복사본`;
  clone.updatedAt = new Date().toISOString();

  const index = state.slots.findIndex(s => s.id === currentSlotId);
  state.slots.splice(index + 1, 0, clone);
  currentSlotId = clone.id;
  state.currentSlotId = clone.id;
  persist();
  renderEditor();
}

function moveCurrentSlot(direction) {
  saveCurrent(false);
  const index = state.slots.findIndex(s => s.id === currentSlotId);
  if (index < 0) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= state.slots.length) return;

  const [slot] = state.slots.splice(index, 1);
  state.slots.splice(target, 0, slot);
  persist();
  renderEditor();
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
  restoreEditorSelection();
  editor.focus();
  document.execCommand(command, false, value);
  rememberEditorSelection();
  scheduleSave();
}

document.querySelectorAll("button[data-command]").forEach(btn => {
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

$("letterSpacingSelect").addEventListener("change", e => {
  const value = e.target.value;
  if (!value) return;
  if (!applyStyleToSelection("letterSpacing", value)) {
    setGlobalTypography("letterSpacing", value);
  }
  e.target.value = "";
});

$("lineHeightSelect").addEventListener("change", e => {
  const value = e.target.value;
  if (!value) return;
  if (!applyStyleToSelection("lineHeight", value)) {
    setGlobalTypography("lineHeight", value);
  }
  e.target.value = "";
});

$("paragraphSpacingSelect").addEventListener("change", e => {
  const value = e.target.value;
  if (!value) return;
  if (!applyParagraphSpacingToSelection(value)) {
    setGlobalTypography("paragraphSpacing", value);
  }
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
$("duplicateSlotBtn")?.addEventListener("click", duplicateCurrentSlot);
$("moveSlotUpBtn")?.addEventListener("click", () => moveCurrentSlot("up"));
$("moveSlotDownBtn")?.addEventListener("click", () => moveCurrentSlot("down"));
$("copyBtn").addEventListener("click", copyCurrent);

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


/* ---------- selection memory ---------- */
let savedEditorRange = null;

function rememberEditorSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (editor.contains(range.commonAncestorContainer)) {
    savedEditorRange = range.cloneRange();
  }
}
function restoreEditorSelection() {
  if (!savedEditorRange) return false;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedEditorRange);
  return true;
}
editor.addEventListener("mouseup", rememberEditorSelection);
editor.addEventListener("keyup", rememberEditorSelection);
editor.addEventListener("input", rememberEditorSelection);

document.querySelectorAll('[data-panel="text"] button, [data-panel="text"] select, [data-panel="text"] input')
  .forEach(el => {
    el.addEventListener("mousedown", () => rememberEditorSelection(), true);
  });


/* ---------- preview ---------- */
function buildPreview() {
  saveCurrent(false);

  const previewPage = $("previewPage");
  if (!previewPage) return;

  const source = $("documentPage");
  const clone = source.cloneNode(true);
  clone.removeAttribute("id");

  const toolbar = clone.querySelector(".toolbar");
  if (toolbar) toolbar.remove();

  const cloneEditor = clone.querySelector(".editor");
  if (cloneEditor) {
    cloneEditor.removeAttribute("contenteditable");
    cloneEditor.style.overflow = "visible";
    cloneEditor.style.height = "auto";
  }

  clone.querySelectorAll("input").forEach((input, i) => {
    const original = source.querySelectorAll("input")[i];
    if (original) {
      input.value = original.value;
      input.setAttribute("value", original.value);
      input.readOnly = true;
    }
  });

  previewPage.innerHTML = "";
  previewPage.appendChild(clone);
}

$("refreshPreviewBtn")?.addEventListener("click", buildPreview);

/* ---------- settings tabs ---------- */
document.querySelectorAll(".settings-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab);
    });
    if (tab.dataset.tab === "preview") buildPreview();
  });
});

/* ---------- Appearance ---------- */
const settingsDrawer = $("settingsDrawer");
const drawerBackdrop = $("drawerBackdrop");

function openSettings() {
  settingsDrawer.classList.add("open");
  drawerBackdrop.classList.add("open");
  document.body.classList.add("settings-open");
}
function closeSettings() {
  settingsDrawer.classList.remove("open");
  drawerBackdrop.classList.remove("open");
  document.body.classList.remove("settings-open");
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
  const page = $("documentPage");
  const layer = $("backgroundLayer");

  // 바깥 작업 공간은 중립색으로 고정
  layer.style.background = "#dedbd4";
  layer.style.backgroundImage = "none";
  layer.style.filter = "none";

  if (activeBgObjectUrl) {
    URL.revokeObjectURL(activeBgObjectUrl);
    activeBgObjectUrl = null;
  }

  // 문서 자체에 배경 적용
  page.style.backgroundImage = "none";
  page.style.backgroundColor = a.solid;
  page.style.backgroundSize = a.backgroundSize;
  page.style.backgroundRepeat = a.backgroundRepeat;
  page.style.backgroundPosition = "center";
  page.style.filter = `brightness(${a.backgroundBrightness}%)`;

  if (a.mode === "gradient") {
    page.style.backgroundImage = `linear-gradient(${a.gradientAngle}deg, ${a.gradient1}, ${a.gradient2})`;
  } else if (a.mode === "image" && a.backgroundAssetId) {
    const asset = await getAsset(BG_STORE, a.backgroundAssetId);
    if (asset?.file) {
      activeBgObjectUrl = URL.createObjectURL(asset.file);
      page.style.backgroundImage = `url("${activeBgObjectUrl}")`;
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


/* ---------- PNG / JPG / PDF export ---------- */
const exportMenuBtn = $("exportMenuBtn");
const exportMenu = $("exportMenu");

exportMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle("open");
});

document.addEventListener("click", () => exportMenu?.classList.remove("open"));
exportMenu?.addEventListener("click", e => e.stopPropagation());

document.querySelectorAll("[data-export]").forEach(btn => {
  btn.addEventListener("click", async () => {
    exportMenu.classList.remove("open");
    const type = btn.dataset.export;
    if (type === "txt") {
      exportCurrent();
      return;
    }
    await exportDocumentAs(type);
  });
});

async function captureDocumentCanvas() {
  saveCurrent(false);

  if (typeof html2canvas !== "function") {
    alert("이미지 저장 모듈을 불러오지 못했습니다. 인터넷 연결 후 새로고침해주세요.");
    throw new Error("html2canvas unavailable");
  }

  saveStatus.textContent = "파일 만드는 중…";
  await document.fonts.ready;

  const sourcePage = $("documentPage");
  const host = document.createElement("div");
  host.className = "export-capture-host";

  const clone = sourcePage.cloneNode(true);
  clone.removeAttribute("id");

  // input의 현재 값을 속성으로도 반영
  const originalInputs = sourcePage.querySelectorAll("input");
  const clonedInputs = clone.querySelectorAll("input");
  originalInputs.forEach((input, i) => {
    if (clonedInputs[i]) {
      clonedInputs[i].value = input.value;
      clonedInputs[i].setAttribute("value", input.value);
    }
  });

  const clonedToolbar = clone.querySelector(".toolbar");
  if (clonedToolbar) clonedToolbar.remove();

  const clonedEditor = clone.querySelector(".editor");
  if (clonedEditor) {
    clonedEditor.removeAttribute("contenteditable");
    clonedEditor.style.overflow = "visible";
    clonedEditor.style.height = "auto";
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await document.fonts.ready;

    if (clonedEditor) {
      const needed = Math.max(820, clonedEditor.scrollHeight + 36);
      clonedEditor.style.minHeight = `${needed}px`;
      clonedEditor.style.height = `${needed}px`;
    }

    clone.style.height = "auto";
    clone.style.minHeight = `${Math.max(1123, clone.scrollHeight + 4)}px`;

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const width = Math.ceil(clone.getBoundingClientRect().width);
    const height = Math.ceil(clone.scrollHeight + 6);

    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 15000,
      width,
      height,
      windowWidth: 1200,
      windowHeight: Math.max(1400, height + 100),
      scrollX: 0,
      scrollY: 0
    });
  } finally {
    host.remove();
    saveStatus.textContent = "자동 저장됨";
  }
}

async function exportDocumentAs(type) {
  try {
    const slot = currentSlot();
    const filename = safeFilename(slot.title || slot.name || "document");
    const canvas = await captureDocumentCanvas();

    if (type === "png") {
      canvas.toBlob(blob => {
        if (blob) downloadBlobFile(blob, `${filename}.png`);
      }, "image/png");
      return;
    }

    if (type === "jpg") {
      // JPG는 투명 배경을 지원하지 않으므로 흰색 캔버스에 합성
      const jpgCanvas = document.createElement("canvas");
      jpgCanvas.width = canvas.width;
      jpgCanvas.height = canvas.height;
      const ctx = jpgCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      jpgCanvas.toBlob(blob => {
        if (blob) downloadBlobFile(blob, `${filename}.jpg`);
      }, "image/jpeg", 0.94);
      return;
    }

    if (type === "pdf") {
      if (!window.jspdf?.jsPDF) {
        alert("PDF 저장 모듈을 불러오지 못했습니다. 인터넷 연결 후 새로고침해주세요.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageW = 210;
      const pageH = 297;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // 문서가 길어졌을 경우 여러 A4 페이지로 분할
      const imgW = pageW;
      const imgH = canvas.height * pageW / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH, undefined, "FAST");
      } else {
        const pageCanvasPx = Math.floor(canvas.width * pageH / pageW);
        let y = 0;
        let pageIndex = 0;

        while (y < canvas.height) {
          const sliceH = Math.min(pageCanvasPx, canvas.height - y);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceH;
          const ctx = slice.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

          const sliceData = slice.toDataURL("image/jpeg", 0.95);
          const sliceHmm = sliceH * pageW / canvas.width;

          if (pageIndex > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(sliceData, "JPEG", 0, 0, pageW, sliceHmm, undefined, "FAST");

          y += sliceH;
          pageIndex++;
        }
      }

      pdf.save(`${filename}.pdf`);
    }
  } catch (err) {
    console.error(err);
    alert("파일 저장 중 문제가 생겼습니다. 새로고침 후 다시 시도해주세요.");
  }
}

function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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


/* ---------- global typography controls ---------- */
$("globalLetterSpacing")?.addEventListener("input", e => {
  const value = `${Number(e.target.value) / 100}em`;
  $("globalLetterSpacingValue").textContent = value;
  setGlobalTypography("letterSpacing", value);
});

$("globalLineHeight")?.addEventListener("input", e => {
  const value = (Number(e.target.value) / 100).toFixed(2).replace(/0+$/,"").replace(/\.$/,"");
  $("globalLineHeightValue").textContent = value;
  setGlobalTypography("lineHeight", value);
});

$("globalParagraphSpacing")?.addEventListener("input", e => {
  const value = `${Number(e.target.value)}px`;
  $("globalParagraphSpacingValue").textContent = value;
  setGlobalTypography("paragraphSpacing", value);
});


/* ---------- init ---------- */
syncAppearanceControls();
applyAppearance();
loadCustomFonts();
renderEditor();
if ($("fontSelect")) $("fontSelect").value = "Pretendard";
openSettings();
