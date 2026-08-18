const STORAGE_KEY = "my-writing-editor-v1";

const $ = (id) => document.getElementById(id);

const slotList = $("slotList");
const editor = $("editor");
const titleInput = $("titleInput");
const slotNameInput = $("slotNameInput");
const currentSlotLabel = $("currentSlotLabel");
const updatedAt = $("updatedAt");
const wordCount = $("wordCount");
const docInfo = $("docInfo");
const saveStatus = $("saveStatus");
const lastSaved = $("lastSaved");

let state = loadState();
let currentSlotId = state.currentSlotId;

function defaultSlot(index) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: `새 문서 ${String(index).padStart(2, "0")}`,
    title: "",
    content: "",
    updatedAt: null
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.slots?.length) return parsed;
    }
  } catch (e) {}
  const slots = Array.from({ length: 4 }, (_, i) => defaultSlot(i + 1));
  return { slots, currentSlotId: slots[0].id };
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
      <div class="slot-preview">${escapeHtml(stripHtml(slot.content) || "비어 있음")}</div>
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
  editor.innerHTML = slot.content || "";
  slotNameInput.value = slot.name || "";
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
  slot.content = editor.innerHTML;
  slot.updatedAt = new Date().toISOString();
  state.currentSlotId = currentSlotId;
  persist();
  renderSlots();
  updatedAt.textContent = formatDate(slot.updatedAt);
  updateCounts();
  lastSaved.textContent = `저장 ${formatTime(slot.updatedAt)}`;
  if (showStatus) {
    saveStatus.textContent = "저장됨 ✓";
    setTimeout(() => saveStatus.textContent = "자동 저장됨", 1000);
  }
}

let saveTimer;
function scheduleSave() {
  saveStatus.textContent = "저장 중…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrent(true), 350);
  updateCounts();
}

function updateCounts() {
  const text = stripHtml(editor.innerHTML).replace(/\s/g, "");
  const count = text.length;
  wordCount.textContent = `${count.toLocaleString()}자`;
  docInfo.textContent = `${count.toLocaleString()}자`;
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
  const plain = stripHtml(slot.content);
  const text = `${slot.title || slot.name}\n\n${plain}`;
  downloadBlob(text, `${safeFilename(slot.title || slot.name)}.txt`, "text/plain;charset=utf-8");
}

function exportAll() {
  saveCurrent(false);
  const backup = {
    app: "My Writing Editor",
    version: 1,
    exportedAt: new Date().toISOString(),
    slots: state.slots
  };
  downloadBlob(JSON.stringify(backup, null, 2), "my-editor-backup.json", "application/json;charset=utf-8");
}

function copyCurrent() {
  saveCurrent(false);
  const slot = currentSlot();
  const text = `${slot.title || slot.name}\n\n${stripHtml(slot.content)}`;
  navigator.clipboard?.writeText(text).then(() => {
    saveStatus.textContent = "복사됨 ✓";
    setTimeout(() => saveStatus.textContent = "자동 저장됨", 1000);
  }).catch(() => alert("복사에 실패했습니다. 브라우저 권한을 확인해주세요."));
}

function insertLink() {
  const url = prompt("링크 주소를 입력하세요.", "https://");
  if (!url) return;
  document.execCommand("createLink", false, url);
  scheduleSave();
}

function insertImageUrl() {
  const url = prompt("이미지 URL을 입력하세요.");
  if (!url) return;
  document.execCommand("insertImage", false, url);
  scheduleSave();
}

function clearFormat() {
  document.execCommand("removeFormat");
  scheduleSave();
}

document.querySelectorAll(".toolbar button[data-command]").forEach(btn => {
  btn.addEventListener("mousedown", e => e.preventDefault());
  btn.addEventListener("click", () => {
    const command = btn.dataset.command;
    const value = btn.dataset.value || null;
    document.execCommand(command, false, value);
    editor.focus();
    scheduleSave();
  });
});

$("newSlotBtn").addEventListener("click", addSlot);
$("deleteSlotBtn").addEventListener("click", deleteCurrentSlot);
$("renameBtn").addEventListener("click", renameSlot);
$("copyBtn").addEventListener("click", copyCurrent);
$("downloadBtn").addEventListener("click", exportCurrent);
$("exportAllBtn").addEventListener("click", exportAll);
$("linkBtn").addEventListener("click", insertLink);
$("imageBtn").addEventListener("click", insertImageUrl);
$("clearFormatBtn").addEventListener("click", clearFormat);

titleInput.addEventListener("input", scheduleSave);
editor.addEventListener("input", scheduleSave);

slotNameInput.addEventListener("change", () => {
  const slot = currentSlot();
  slot.name = slotNameInput.value.trim() || "이름 없음";
  persist();
  renderSlots();
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("모든 슬롯과 작성 내용을 삭제하고 처음 상태로 되돌릴까요?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  currentSlotId = state.currentSlotId;
  renderEditor();
});

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function safeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, "_").trim() || "document";
}

function downloadBlob(content, filename, type) {
  const blob = new Blob(["\ufeff", content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

renderEditor();
