import IbsCharts from "./ibs/IbsCharts.js";
import IbsUtils from "./ibs/IbsUtils.js";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";

let ibsInstance = null;
let currentData = { domains: [], sites: [], texts: [], markers: [] };
let selectedElement = null;

const $ = (id) => document.getElementById(id);
const container = $("container");
const emptyState = $("emptyState");
const fileInput = $("fileInput");
const browseBtn = $("browseBtn");
const emptyOpenBtn = $("emptyOpenBtn");
const clearBtn = $("clearBtn");
const fileInfoGroup = $("fileInfoGroup");
const fileBadge = $("fileBadge");
const fileNameEl = $("fileName");
const rowCount = $("rowCount");
const downloadBtn = $("downloadBtn");
const formatSelect = $("formatSelect");
const deleteSelectedBtn = $("deleteSelectedBtn");
const undoBtn = $("undoBtn");
const redoBtn = $("redoBtn");
const statusBar = $("statusBar");
const selectionInfo = $("selectionInfo");
const statusElements = $("statusElements");
const statusZoom = $("statusZoom");
const toast = $("toast");
const zoomLevel = $("zoomLevel");
const zoomInBtn = $("zoomInBtn");
const zoomOutBtn = $("zoomOutBtn");
const zoomFitBtn = $("zoomFitBtn");
const bringFrontBtn = $("bringFrontBtn");
const sendBackBtn = $("sendBackBtn");
const copyBtn = $("copyBtn");
const propertyPanel = $("propertyPanel");

let insertTextBtn, insertRectBtn, insertCircleBtn, insertLineBtn, insertMarkerBtn, insertBracketBtn;

function initInsertButtons() {
  insertTextBtn = $("insertTextBtn");
  insertRectBtn = $("insertRectBtn");
  insertCircleBtn = $("insertCircleBtn");
  insertLineBtn = $("insertLineBtn");
  insertMarkerBtn = $("insertMarkerBtn");
  insertBracketBtn = $("insertBracketBtn");
  
  insertTextBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createText({
      content: "New Text",
      position: { x: center.x, y: center.y },
      style: {
        fontSize: 16,
        fontFamily: "Arial",
        color: "#333333",
        horizontalAlign: "middle",
        verticalAlign: "center"
      },
      borderStyle: {
        color: "#b2bec3",
        size: 1,
        isDash: false
      },
      editable: true
    });
    updateZoomDisplay();
    updateStatusBar();
    showToast("Text inserted", "success");
  });

  insertRectBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createMarker({
      shape: "rect",
      coordinate: { cx: center.x, cy: center.y },
      width: 80,
      height: 50,
      displayName: "Rectangle",
      text: {
        content: "",
        position: "center",
        style: { fontSize: 12, fontFamily: "Arial", color: "#333" }
      },
      style: {
        color: "#74b9ff",
        borderColor: "#0984e3",
        borderSize: 2,
        gradient: "centerToTopAndBottom",
        texture: { type: "none", color: "#333" }
      }
    });
    adjustCanvas();
    showToast("Rectangle inserted", "success");
  });

  insertCircleBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createMarker({
      shape: "circle",
      coordinate: { cx: center.x, cy: center.y },
      width: 60,
      height: 60,
      displayName: "Circle",
      text: {
        content: "",
        position: "center",
        style: { fontSize: 12, fontFamily: "Arial", color: "#fff" }
      },
      style: {
        color: "#fdcb6e",
        borderColor: "#e17055",
        borderSize: 2,
        gradient: "centerToAllAround",
        texture: { type: "none", color: "#333" }
      }
    });
    adjustCanvas();
    showToast("Circle inserted", "success");
  });

  insertLineBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createLine({
      type: "straight",
      position: `${center.x - 50},${center.y} ${center.x + 50},${center.y}`,
      style: {
        isDash: false,
        left: "none",
        right: "arrow",
        color: "#636e72",
        size: 2
      }
    });
    adjustCanvas();
    showToast("Line inserted", "success");
  });

  insertMarkerBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createMarker({
      shape: "triangle",
      coordinate: { cx: center.x, cy: center.y },
      width: 40,
      height: 40,
      displayName: "Marker",
      text: {
        content: "",
        position: "center",
        style: { fontSize: 12, fontFamily: "Arial", color: "#fff" }
      },
      style: {
        color: "#00b894",
        borderColor: "#00cec9",
        borderSize: 2,
        gradient: "centerToAllAround",
        texture: { type: "none", color: "#333" }
      }
    });
    adjustCanvas();
    showToast("Marker inserted", "success");
  });

  insertBracketBtn.addEventListener("click", () => {
    const inst = ensureIbsInstance();
    const center = getCanvasCenter();
    inst.createBracket({
      shape: "brace",
      coordinate: { cx: center.x, cy: center.y },
      style: {
        color: "#2d3436",
        size: 2,
        rotate: 0,
        width: 100
      }
    });
    adjustCanvas();
    showToast("Bracket inserted", "success");
  });
}

document.querySelectorAll(".ribbon-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ribbon-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".ribbon-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $("panel-" + tab.dataset.tab).classList.add("active");
  });
});

function showToast(msg, type = "info") {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function initIbs() {
  if (ibsInstance) {
    ibsInstance.parent.innerHTML = "";
    ibsInstance = null;
  }
  const rect = container.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    container.style.width = rect.width + "px";
    container.style.height = rect.height + "px";
  } else {
    container.style.width = "100%";
    container.style.height = "100%";
  }
  ibsInstance = IbsCharts.init(container, true);
  ibsInstance.showCanvasNote(false);
  patchInstance(ibsInstance);
  emptyState.style.display = "none";
  selectedElement = null;
  updateStatusBar();
  renderPropertyPanel(null);
  return ibsInstance;
}

function clearAll() {
  if (ibsInstance) {
    ibsInstance.parent.innerHTML = "";
    ibsInstance = null;
  }
  container.innerHTML = "";
  emptyState.style.display = "block";
  downloadBtn.disabled = true;
  selectedElement = null;
  renderPropertyPanel(null);
  updateSelectionInfo(null);
  showStatus("Ready");
  updateStatusBar();
}

function showStatus(msg) {
  statusBar.textContent = msg;
}

function openFile() {
  browseBtn.click();
}

browseBtn.addEventListener("click", async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Data Files", extensions: ["csv", "tsv", "xlsx", "xls"] }],
    });
    if (selected) await handleTauriFile(selected);
  } catch {
    fileInput.click();
  }
});
emptyOpenBtn.addEventListener("click", openFile);
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
});

container.addEventListener("dragover", (e) => {
  e.preventDefault();
});
container.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

async function handleTauriFile(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  if (!["csv", "tsv", "xlsx", "xls"].includes(ext)) {
    showToast("Please upload CSV, TSV, or Excel file", "error");
    return;
  }
  showStatus(`Reading ${filePath.split(/[\\/]/).pop()}...`);
  try {
    const data = await readFile(filePath);
    let parsed;
    if (ext === "csv" || ext === "tsv") {
      const text = new TextDecoder().decode(data);
      const delimiter = ext === "tsv" ? "\t" : null;
      parsed = parseDelimited(text, delimiter);
    } else {
      const wb = XLSX.read(new Uint8Array(data), { type: "array" });
      parsed = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    }
    if (parsed.length < 2) {
      showToast("File empty", "error");
      return;
    }
    const name = filePath.split(/[\\/]/).pop();
    fileBadge.textContent = ext.toUpperCase();
    fileNameEl.textContent = name;
    loadAndDraw(parsed, name);
  } catch (err) {
    showToast("Read error: " + err.message, "error");
  }
}

function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["csv", "tsv", "xlsx", "xls"].includes(ext)) {
    showToast("Please upload CSV, TSV, or Excel file", "error");
    return;
  }
  showStatus(`Reading ${file.name}...`);
  if (ext === "csv" || ext === "tsv") {
    const r = new FileReader();
    r.onload = (e) => {
      const delimiter = ext === "tsv" ? "\t" : null;
      const parsed = parseDelimited(e.target.result, delimiter);
      if (parsed.length < 2) { showToast("File empty", "error"); return; }
      fileBadge.textContent = ext.toUpperCase();
      fileNameEl.textContent = file.name;
      loadAndDraw(parsed, file.name);
    };
    r.readAsText(file);
  } else {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const parsed = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (parsed.length < 2) { showToast("File empty", "error"); return; }
        fileBadge.textContent = ext.toUpperCase();
        fileNameEl.textContent = file.name;
        loadAndDraw(parsed, file.name);
      } catch (err) {
        showToast("Parse error: " + err.message, "error");
      }
    };
    r.readAsArrayBuffer(file);
  }
}

function parseDelimited(text, delimiter) {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    if (delimiter) return line.split(delimiter).map((c) => c.trim());
    const res = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { res.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    res.push(cur.trim());
    return res;
  });
}

function loadAndDraw(rows, fileName) {
  if (rows.length < 2) { showToast("Need header + data", "error"); return; }
  const h = rows[0].map((x) => x.trim().toLowerCase());
  const hasType = h.indexOf("type") !== -1;
  let colMap = {};
  const domains = [], sites = [], texts = [], markers = [];

  if (hasType) {
    const exp = ["type", "protein name", "length", "domain name", "start", "end", "color"];
    for (const c of exp) {
      const idx = h.indexOf(c);
      if (idx === -1 && c !== "type") { showToast(`Column "${c}" not found`, "error"); return; }
      colMap[c] = idx;
    }
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < Math.max(...Object.values(colMap).filter((v) => v >= 0)) + 1) continue;
      const type = ((row[colMap["type"]] || "domain") + "").trim().toLowerCase();
      if (type === "text") {
        const content = (row[colMap["domain name"]] || "").trim();
        const x = parseInt(row[colMap["start"]]);
        const y = parseInt(row[colMap["end"]]);
        const color = (row[colMap["color"]] || "#333333").trim();
        const fontSize = parseInt(row[colMap["length"]]) || 14;
        if (!content || isNaN(x) || isNaN(y)) continue;
        texts.push({ content, x, y, color, fontSize });
      } else if (type === "marker") {
        const name = (row[colMap["domain name"]] || "").trim();
        const x = parseInt(row[colMap["start"]]);
        const y = parseInt(row[colMap["end"]]);
        const color = (row[colMap["color"]] || "#e17055").trim();
        const size = parseInt(row[colMap["length"]]) || 36;
        if (isNaN(x) || isNaN(y)) continue;
        markers.push({ name: name || `Marker${markers.length + 1}`, x, y, color, size });
      } else if (type === "site") {
        const proteinName = (row[colMap["protein name"]] || "").trim();
        const length = parseInt(row[colMap["length"]]);
        const siteName = (row[colMap["domain name"]] || "").trim();
        const start = parseInt(row[colMap["start"]]);
        const end = parseInt(row[colMap["end"]]);
        const color = (row[colMap["color"]] || "#e17055").trim();
        if (!proteinName || isNaN(length) || isNaN(start) || isNaN(end)) continue;
        sites.push({ proteinName, length, siteName, start, end, color });
      } else {
        const name = (row[colMap["protein name"]] || "").trim();
        const length = parseInt(row[colMap["length"]]);
        const domain = (row[colMap["domain name"]] || "").trim();
        const start = parseInt(row[colMap["start"]]);
        const end = parseInt(row[colMap["end"]]);
        const color = (row[colMap["color"]] || "").trim();
        if (!name || isNaN(length) || !domain || isNaN(start) || isNaN(end)) continue;
        domains.push({ name, length, domain, start, end, color });
      }
    }
  } else {
    const exp = ["protein name", "length", "domain name", "start", "end", "color"];
    for (const c of exp) {
      const idx = h.indexOf(c);
      if (idx === -1) { showToast(`Column "${c}" not found`, "error"); return; }
      colMap[c] = idx;
    }
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 6) continue;
      const name = (row[colMap["protein name"]] || "").trim();
      const length = parseInt(row[colMap["length"]]);
      const domain = (row[colMap["domain name"]] || "").trim();
      const start = parseInt(row[colMap["start"]]);
      const end = parseInt(row[colMap["end"]]);
      const color = (row[colMap["color"]] || "").trim();
      if (!name || isNaN(length) || !domain || isNaN(start) || isNaN(end)) continue;
      domains.push({ name, length, domain, start, end, color });
    }
  }

  if (domains.length === 0 && sites.length === 0 && texts.length === 0 && markers.length === 0) {
    showToast("No valid data rows", "error");
    return;
  }
  currentData = { domains, sites, texts, markers };

  fileInfoGroup.style.display = "flex";
  const parts = [];
  if (domains.length) parts.push(`${domains.length} domains`);
  if (sites.length) parts.push(`${sites.length} sites`);
  if (texts.length) parts.push(`${texts.length} texts`);
  if (markers.length) parts.push(`${markers.length} markers`);
  rowCount.textContent = `(${parts.join(", ")})`;

  showTypeModal();
}

function showTypeModal() {
  const modal = $("typeModal");
  if (modal) modal.classList.add("active");
}

function getSelectedBoneType() {
  return currentBoneType || "protein";
}

let currentBoneType = null;
const chooseProteinBtn = $("chooseProteinBtn");
const chooseNucleotideBtn = $("chooseNucleotideBtn");
if (chooseProteinBtn) {
  chooseProteinBtn.addEventListener("click", () => {
    currentBoneType = "protein";
    $("typeModal").classList.remove("active");
    drawFromData("protein");
  });
}
if (chooseNucleotideBtn) {
  chooseNucleotideBtn.addEventListener("click", () => {
    currentBoneType = "nucleotide";
    $("typeModal").classList.remove("active");
    drawFromData("nucleotide");
  });
}

function drawFromData(boneType) {
  const { domains, sites, texts, markers } = currentData;
  if (domains.length === 0 && sites.length === 0 && texts.length === 0 && markers.length === 0) {
    showToast("No data", "error");
    return;
  }
  initIbs();
  if (!ibsInstance) return;

  const proteinInstances = {};

  if (domains.length > 0) {
    const groups = {};
    domains.forEach((row) => {
      if (!groups[row.name]) groups[row.name] = { name: row.name, length: row.length, domains: [] };
      groups[row.name].domains.push(row);
    });
    Object.entries(groups).forEach(([name, group]) => {
      const createFn = boneType === "nucleotide" ? ibsInstance.createNucleotide : ibsInstance.createProtein;
      const backboneHeight = boneType === "nucleotide" ? 4 : 26;
      const backbone = createFn.call(ibsInstance, {
        displayName: name,
        position: {
          start: { site: 1, display: "hide" },
          end: { site: group.length, display: "hide" },
        },
        style: {
          align: "selfLocation", height: backboneHeight, color: "#ffffff",
          gradient: "none", texture: { type: "", color: "#333" },
        },
      });
      proteinInstances[name] = backbone;
      group.domains.forEach((d) => {
        backbone.createDomain({
          displayName: d.domain,
          position: {
            start: { site: d.start, display: "hide" },
            end: { site: d.end, display: "hide" },
          },
          name: d.domain,
          nameTextStyle: {
            fontFamily: "Arial", fontSize: 11, color: "#2d3436",
            location: "center", fontWeight: "normal", rotate: 0,
          },
          style: {
            color: d.color || "#81ecec", gradient: "centerToTopAndBottom",
            texture: { type: "none", color: "#333" },
          },
          borderStyle: { color: "#636e72", size: 1, isDash: false },
        });
      });
    });
  }

  if (sites.length > 0) {
    sites.forEach((s) => {
      let backbone = proteinInstances[s.proteinName];
      if (!backbone) {
        const createFn = boneType === "nucleotide" ? ibsInstance.createNucleotide : ibsInstance.createProtein;
        const backboneHeight = boneType === "nucleotide" ? 4 : 26;
        backbone = createFn.call(ibsInstance, {
          displayName: s.proteinName,
          position: {
            start: { site: 1, display: "hide" },
            end: { site: s.length, display: "hide" },
          },
          style: {
            align: "selfLocation", height: backboneHeight, color: "#ffffff",
            gradient: "none", texture: { type: "", color: "#333" },
          },
        });
        proteinInstances[s.proteinName] = backbone;
      }
      backbone.createSite({
        shape: "circle",
        location: s.start,
        width: 22, height: 22,
        displayName: s.siteName || `Site${backbone.childrenCounts.site + 1}`,
        text: {
          content: s.siteName || `Site${backbone.childrenCounts.site + 1}`,
          position: "top",
          style: { fontSize: 11, fontFamily: "Arial", color: "#2d3436" },
        },
        style: {
          color: s.color || "#fdcb6e", borderColor: "#e17055", borderSize: 1,
          gradient: "centerToAllAround", texture: { type: "none", color: "#333" },
        },
      });
    });
  }

  texts.forEach((t) => {
    ibsInstance.createText({
      content: t.content,
      position: { x: t.x, y: t.y },
      style: {
        fontSize: t.fontSize, fontFamily: "Arial", color: t.color,
        horizontalAlign: "middle", verticalAlign: "center",
      },
      borderStyle: { color: "#b2bec3", size: 1, isDash: false },
    });
  });

  markers.forEach((m) => {
    ibsInstance.createMarker({
      shape: "circle",
      coordinate: { cx: m.x, cy: m.y },
      width: m.size, height: m.size,
      displayName: m.name,
      text: {
        content: `${m.name}`, position: "center",
        style: { fontSize: 10, fontFamily: "Arial", color: "#fff" },
      },
      style: {
        color: m.color, borderColor: "#d63031", borderSize: 2,
        gradient: "centerToAllAround", texture: { type: "none", color: "#333" },
      },
    });
  });

  adjustCanvas();
  downloadBtn.disabled = false;
  const parts = [];
  if (domains.length) parts.push(`${Object.keys(new Set(domains.map((d) => d.name))).length} proteins, ${domains.length} domains`);
  if (sites.length) parts.push(`${sites.length} sites`);
  if (texts.length) parts.push(`${texts.length} texts`);
  if (markers.length) parts.push(`${markers.length} markers`);
  showToast(`Drew ${parts.join(", ")}`, "success");
  showStatus(parts.join(", "));
}

function adjustCanvas() {
  if (!ibsInstance) return;
  try { ibsInstance.adjustCanvasSize(); } catch {}
  try { ibsInstance.centerCanvas(); } catch {}
  updateZoomDisplay();
}

clearBtn.addEventListener("click", clearAll);

deleteSelectedBtn.addEventListener("click", () => {
  if (!ibsInstance || !ibsInstance.config.selected) return;
  const sel = ibsInstance.config.selected;
  if (sel && typeof sel.delete === "function") {
    sel.delete();
    ibsInstance.config.selected = null;
    selectedElement = null;
    renderPropertyPanel(null);
    updateSelectionInfo(null);
    showToast("Deleted", "info");
  }
});

undoBtn.addEventListener("click", () => {
  if (ibsInstance) { ibsInstance.undo(); refreshUI(); }
});
redoBtn.addEventListener("click", () => {
  if (ibsInstance) { ibsInstance.redo(); refreshUI(); }
});

function refreshUI() {
  const sel = ibsInstance ? ibsInstance.config.selected : null;
  renderPropertyPanel(sel);
  updateStatusBar();
}

function updateZoomDisplay() {
  if (!ibsInstance) {
    zoomLevel.textContent = "100%";
    statusZoom.textContent = "100%";
    return;
  }
  const pct = Math.round(ibsInstance.config.zoomRatio * 100);
  zoomLevel.textContent = pct + "%";
  statusZoom.textContent = pct + "%";
}

zoomInBtn.addEventListener("click", () => {
  if (!ibsInstance) return;
  ibsInstance.zoom(Math.min(ibsInstance.config.zoomRatio + 0.2, ibsInstance.config.zoomRange[1]));
  updateZoomDisplay();
});
zoomOutBtn.addEventListener("click", () => {
  if (!ibsInstance) return;
  ibsInstance.zoom(Math.max(ibsInstance.config.zoomRatio - 0.2, ibsInstance.config.zoomRange[0]));
  updateZoomDisplay();
});
zoomFitBtn.addEventListener("click", adjustCanvas);

bringFrontBtn.addEventListener("click", () => {
  if (!ibsInstance || !ibsInstance.config.selected) return;
  const sel = ibsInstance.config.selected;
  if (sel.nodes && sel.parent && sel.parent.nodes) {
    sel.parent.nodes.appendChild(sel.nodes);
    showToast("Front", "info");
  }
});
sendBackBtn.addEventListener("click", () => {
  if (!ibsInstance || !ibsInstance.config.selected) return;
  const sel = ibsInstance.config.selected;
  if (sel.nodes && sel.parent && sel.parent.nodes && sel.parent.nodes.firstChild) {
    sel.parent.nodes.insertBefore(sel.nodes, sel.parent.nodes.firstChild);
    showToast("Back", "info");
  }
});

let clipboard = null;
copyBtn.addEventListener("click", () => {
  if (!ibsInstance || !ibsInstance.config.selected) return;
  try {
    clipboard = JSON.parse(JSON.stringify(ibsInstance.config.selected.option));
    if (clipboard.coordinate && clipboard.coordinate.cx !== undefined) {
      clipboard.coordinate.cx += 30;
      clipboard.coordinate.cy += 30;
    }
    if (clipboard.position && clipboard.position.x !== undefined) {
      clipboard.position.x += 30;
      clipboard.position.y += 30;
    }
    showToast("Copied", "info");
  } catch { showToast("Copy failed", "error"); }
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") &&
      !(document.activeElement && document.activeElement.tagName === "INPUT")) {
    if (!deleteSelectedBtn.disabled) deleteSelectedBtn.click();
  }
  if (e.ctrlKey && e.key === "z") { e.preventDefault(); undoBtn.click(); }
  if (e.ctrlKey && e.key === "y") { e.preventDefault(); redoBtn.click(); }
  if (e.ctrlKey && e.key === "c") { e.preventDefault(); copyBtn.click(); }
  if (e.ctrlKey && e.key === "v" && clipboard) {
    if (!ibsInstance) return;
    const sel = ibsInstance.config.selected;
    if (sel && typeof sel.update === "function") {
      sel.update(JSON.parse(JSON.stringify(clipboard)));
      refreshUI();
      showToast("Pasted", "success");
    }
  }
  if (e.ctrlKey && e.key === "o") { e.preventDefault(); openFile(); }
});

downloadBtn.addEventListener("click", async () => {
  if (!ibsInstance) { showToast("No chart", "error"); return; }
  const fmt = formatSelect.value;
  const dpi = parseInt(document.querySelector('input[name="resolution"]:checked').value);
  const scale = Math.round((dpi / 96) * 100) / 100;
  const defaultName = `ProteinStructure_${Date.now()}`;

  const ext = fmt === "svg" ? "svg" : fmt === "jpg" ? "jpg" : "png";
  const filterName = ext.toUpperCase();

  try {
    const filePath = await save({
      defaultPath: `${defaultName}.${ext}`,
      filters: [{
        name: filterName,
        extensions: [ext]
      }]
    });
    if (!filePath) return;

    IbsUtils.hideAllBorder();

    var exportSvg = ibsInstance.nodes.cloneNode(true);
    var vb = ibsInstance.config.viewBox.split(" ").map(Number);
    var exportW = Math.round(vb[2] * scale);
    var exportH = Math.round(vb[3] * scale);
    exportSvg.setAttribute("width", exportW);
    exportSvg.setAttribute("height", exportH);
    exportSvg.setAttribute("viewBox", ibsInstance.config.viewBox);
    if (!exportSvg.getAttribute("xmlns")) {
      exportSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    if (fmt === "svg") {
      var svgBytes = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>\n' + exportSvg.outerHTML);
      await writeFile(filePath, svgBytes);
      showToast("SVG exported", "success");
      return;
    }

    if (fmt === "jpg") {
      var bgRect = IbsUtils.createSvgElement("rect", {
        x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: "#FFFFFF",
      });
      exportSvg.insertBefore(bgRect, exportSvg.firstChild);
    }

    var serializer = new XMLSerializer();
    var svgStr = serializer.serializeToString(exportSvg);
    var svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    var svgUrl = URL.createObjectURL(svgBlob);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = exportW;
      canvas.height = exportH;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, exportW, exportH);
      canvas.toBlob(async function (blob) {
        if (blob) {
          var buf = await blob.arrayBuffer();
          await writeFile(filePath, new Uint8Array(buf));
        }
        URL.revokeObjectURL(svgUrl);
        showToast(fmt.toUpperCase() + " exported", "success");
      }, fmt === "jpg" ? 'image/jpeg' : 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      showToast("Export failed", "error");
    };
    img.src = svgUrl;
  } catch (e) {
    console.warn("Export cancelled or failed:", e);
  }
});

window.addEventListener("resize", () => {
  if (ibsInstance) try { ibsInstance.resize(); } catch {}
});
new ResizeObserver(() => {
  if (ibsInstance) try { ibsInstance.resize(); } catch {}
}).observe(container);

function updateStatusBar() {
  if (!ibsInstance) { statusElements.textContent = "0 elements"; return; }
  const c = ibsInstance.config.elementsCount;
  const total = c.proteinOrNucleotide + c.line + c.marker + c.bracket + c.text;
  statusElements.textContent = `${total} elements`;
  updateZoomDisplay();
}

function updateSelectionInfo(sel) {
  if (!sel) { selectionInfo.textContent = ""; return; }
  const name = (sel.option && sel.option.displayName) || (sel.option && sel.option.id) || "Element";
  const type = sel.config ? sel.config.type : "?";
  selectionInfo.textContent = `${type}: ${name}`;
}

function renderPropertyPanel(selected) {
  if (!selected || !selected.option) {
    propertyPanel.innerHTML = '<div class="no-selection"><p>Click an element to edit</p></div>';
    updateSelectionInfo(null);
    return;
  }
  const type = selected.config ? selected.config.type : "element";
  const opt = selected.option;
  let html = '<div class="prop-section">';

  html += `<div class="prop-row"><label>Name</label><input type="text" id="p-name" value="${esc(opt.displayName || "")}"></div>`;
  html += `<div class="prop-row"><label>Type</label><input type="text" value="${type}" disabled style="background:#f1f2f6;"></div>`;

  if (opt.position) {
    if (opt.position.start && opt.position.start.site !== undefined) {
      html += `<div class="prop-row"><label>Start</label><input type="number" id="p-start" value="${opt.position.start.site}" min="1"></div>`;
      html += `<div class="prop-row"><label>End</label><input type="number" id="p-end" value="${opt.position.end.site}" min="1"></div>`;
    }
  }
  if (opt.coordinate) {
    if (opt.coordinate.cx !== undefined) {
      html += `<div class="prop-row"><label>X</label><input type="number" id="p-cx" value="${Math.round(opt.coordinate.cx)}"></div>`;
      html += `<div class="prop-row"><label>Y</label><input type="number" id="p-cy" value="${Math.round(opt.coordinate.cy)}"></div>`;
    }
    if (opt.coordinate.horizontal && opt.coordinate.horizontal.start !== undefined) {
      html += `<div class="prop-row"><label>X</label><input type="number" id="p-hx" value="${Math.round(opt.coordinate.horizontal.start)}"></div>`;
      html += `<div class="prop-row"><label>Y</label><input type="number" id="p-hy" value="${Math.round(opt.coordinate.vertical.start)}"></div>`;
    }
  }
  if (opt.position && opt.position.x !== undefined) {
    html += `<div class="prop-row"><label>X</label><input type="number" id="p-px" value="${Math.round(opt.position.x)}"></div>`;
    html += `<div class="prop-row"><label>Y</label><input type="number" id="p-py" value="${Math.round(opt.position.y)}"></div>`;
  }

  if (opt.style) {
    if (opt.style.color) html += `<div class="prop-row"><label>Color</label><input type="color" id="p-color" value="${opt.style.color}"></div>`;
    if (opt.style.height) html += `<div class="prop-row"><label>Height</label><input type="number" id="p-height" value="${opt.style.height}" min="1"></div>`;
    if (opt.style.fontSize !== undefined) html += `<div class="prop-row"><label>Font</label><input type="number" id="p-fs" value="${opt.style.fontSize}" min="6" max="72" style="width:55px;"> px</div>`;
    if (opt.style.fontFamily) html += `<div class="prop-row"><label>Family</label><select id="p-ff">${["Arial","Helvetica","Times New Roman","Courier New","Verdana","Georgia"].map((f) => `<option value="${f}" ${opt.style.fontFamily===f?"selected":""}>${f}</option>`).join("")}</select></div>`;
    if (opt.style.borderColor !== undefined) html += `<div class="prop-row"><label>Border</label><input type="color" id="p-bc" value="${opt.style.borderColor||"#333"}"></div>`;
    if (opt.style.borderSize !== undefined) html += `<div class="prop-row"><label>Brd W</label><input type="number" id="p-bs" value="${opt.style.borderSize}" min="0" max="10"></div>`;
    if (opt.style.rotate !== undefined) html += `<div class="prop-row"><label>Rotate</label><input type="number" id="p-rot" value="${opt.style.rotate}" min="-360" max="360">&#176;</div>`;
    if (opt.style.gradient) html += `<div class="prop-row"><label>Gradient</label><select id="p-grad">${["none","centerToTopAndBottom","centerToAllAround","leftToRight","topToBottom"].map((g) => `<option value="${g}" ${opt.style.gradient===g?"selected":""}>${g}</option>`).join("")}</select></div>`;
  }
  if (opt.shape) html += `<div class="prop-row"><label>Shape</label><select id="p-shape">${["rect","roundRect","circle","triangle","rhombus","parallelogram","trapezium","pentagon","hexagon","octagon","arrow","cylinder","none"].map((s) => `<option value="${s}" ${opt.shape===s?"selected":""}>${s}</option>`).join("")}</select></div>`;
  if (opt.width) html += `<div class="prop-row"><label>Width</label><input type="number" id="p-w" value="${opt.width}" min="5"></div>`;
  if (opt.content !== undefined) html += `<div class="prop-row"><label>Content</label><input type="text" id="p-content" value="${esc(opt.content)}"></div>`;
  if (opt.name !== undefined) html += `<div class="prop-row"><label>Domain</label><input type="text" id="p-dname" value="${esc(opt.name)}"></div>`;
  if (opt.nameTextStyle) {
    if (opt.nameTextStyle.fontSize !== undefined) html += `<div class="prop-row"><label>Nm sz</label><input type="number" id="p-nfs" value="${opt.nameTextStyle.fontSize}" min="6" max="72" style="width:55px;"> px</div>`;
    if (opt.nameTextStyle.location) html += `<div class="prop-row"><label>Nm pos</label><select id="p-nloc">${["center","top","bottom","hide"].map((l) => `<option value="${l}" ${opt.nameTextStyle.location===l?"selected":""}>${l}</option>`).join("")}</select></div>`;
  }
  if (opt.text && opt.text.style) {
    if (opt.text.style.fontSize !== undefined) html += `<div class="prop-row"><label>Txt sz</label><input type="number" id="p-tfs" value="${opt.text.style.fontSize}" min="6" max="72" style="width:55px;"> px</div>`;
    if (opt.text.position) html += `<div class="prop-row"><label>Txt pos</label><select id="p-tpos">${["center","top","bottom","hide"].map((l) => `<option value="${l}" ${opt.text.position===l?"selected":""}>${l}</option>`).join("")}</select></div>`;
    if (opt.text.content !== undefined) html += `<div class="prop-row"><label>Txt</label><input type="text" id="p-txt" value="${esc(opt.text.content)}"></div>`;
  }
  if (opt.style && opt.style.texture) html += `<div class="prop-row"><label>Texture</label><select id="p-tex">${["none","stripe","dot","grid"].map((t) => `<option value="${t}" ${opt.style.texture.type===t?"selected":""}>${t}</option>`).join("")}</select></div>`;
  if (opt.borderStyle) html += `<div class="prop-row"><label>Dash</label><select id="p-dash"><option value="false" ${!opt.borderStyle.isDash?"selected":""}>Solid</option><option value="true" ${opt.borderStyle.isDash?"selected":""}>Dashed</option></select></div>`;
  if (opt.location !== undefined) html += `<div class="prop-row"><label>Location</label><input type="text" id="p-loc" value="${opt.location}"></div>`;

  html += "</div>";
  propertyPanel.innerHTML = html;
  bindPropertyEvents(selected);
  updateSelectionInfo(selected);
}

function esc(s) {
  return !s ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeUpdate(selected, changes) {
  if (!selected || !selected.option) return;
  try {
    const newOpt = JSON.parse(JSON.stringify(selected.option));
    for (const [key, value] of Object.entries(changes)) {
      const parts = key.split(".");
      let cur = newOpt;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] === undefined) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
    }
    if (typeof selected.update === "function") selected.update(newOpt);
    updateSelectionInfo(selected);
  } catch (e) { console.warn("Update error:", e); }
}

function bindPropertyEvents(selected) {
  const byId = (id) => document.getElementById(id);
  byId("p-name")?.addEventListener("change", function () { safeUpdate(selected, { displayName: this.value }); });
  const sEl = byId("p-start"), eEl = byId("p-end");
  if (sEl && eEl) {
    const fn = () => {
      const s = parseInt(sEl.value), en = parseInt(eEl.value);
      if (!isNaN(s) && !isNaN(en) && s > 0 && en > s) safeUpdate(selected, { "position.start.site": s, "position.end.site": en });
    };
    sEl.addEventListener("change", fn);
    eEl.addEventListener("change", fn);
  }
  byId("p-cx")?.addEventListener("change", function () { const v = parseInt(this.value); if (!isNaN(v)) safeUpdate(selected, { "coordinate.cx": v }); });
  byId("p-cy")?.addEventListener("change", function () { const v = parseInt(this.value); if (!isNaN(v)) safeUpdate(selected, { "coordinate.cy": v }); });
  byId("p-px")?.addEventListener("change", function () { const v = parseInt(this.value); if (!isNaN(v)) safeUpdate(selected, { "position.x": v }); });
  byId("p-py")?.addEventListener("change", function () { const v = parseInt(this.value); if (!isNaN(v)) safeUpdate(selected, { "position.y": v }); });
  byId("p-color")?.addEventListener("input", function () { safeUpdate(selected, { "style.color": this.value }); });
  byId("p-height")?.addEventListener("change", function () { safeUpdate(selected, { "style.height": parseInt(this.value) }); });
  byId("p-fs")?.addEventListener("change", function () { safeUpdate(selected, { "style.fontSize": parseInt(this.value) }); });
  byId("p-ff")?.addEventListener("change", function () { safeUpdate(selected, { "style.fontFamily": this.value }); });
  byId("p-bc")?.addEventListener("input", function () { safeUpdate(selected, { "style.borderColor": this.value }); });
  byId("p-bs")?.addEventListener("change", function () { safeUpdate(selected, { "style.borderSize": parseInt(this.value) }); });
  byId("p-rot")?.addEventListener("change", function () { safeUpdate(selected, { "style.rotate": parseInt(this.value) }); });
  byId("p-grad")?.addEventListener("change", function () { safeUpdate(selected, { "style.gradient": this.value }); });
  byId("p-shape")?.addEventListener("change", function () { safeUpdate(selected, { shape: this.value }); });
  byId("p-w")?.addEventListener("change", function () { safeUpdate(selected, { width: parseInt(this.value) }); });
  byId("p-content")?.addEventListener("change", function () { safeUpdate(selected, { content: this.value }); });
  byId("p-dname")?.addEventListener("change", function () { safeUpdate(selected, { name: this.value }); });
  byId("p-nfs")?.addEventListener("change", function () { safeUpdate(selected, { "nameTextStyle.fontSize": parseInt(this.value) }); });
  byId("p-nloc")?.addEventListener("change", function () { safeUpdate(selected, { "nameTextStyle.location": this.value }); });
  byId("p-tfs")?.addEventListener("change", function () { safeUpdate(selected, { "text.style.fontSize": parseInt(this.value) }); });
  byId("p-tpos")?.addEventListener("change", function () { safeUpdate(selected, { "text.position": this.value }); });
  byId("p-txt")?.addEventListener("change", function () { safeUpdate(selected, { "text.content": this.value }); });
  byId("p-tex")?.addEventListener("change", function () { safeUpdate(selected, { "style.texture.type": this.value }); });
  byId("p-dash")?.addEventListener("change", function () { safeUpdate(selected, { "borderStyle.isDash": this.value === "true" }); });
  byId("p-loc")?.addEventListener("change", function () { safeUpdate(selected, { location: this.value }); });
}

function patchInstance(inst) {
  const methods = ["createProtein", "createText", "createMarker", "createProteinOrNucleotide", "createLine", "createBracket"];
  methods.forEach((method) => {
    const orig = inst[method];
    inst[method] = function (...args) {
      const el = orig.apply(this, args);
      if (el && el.nodes) {
        el.nodes.addEventListener("mousedown", () => {
          setTimeout(() => { selectedElement = el; renderPropertyPanel(el); updateSelectionInfo(el); }, 10);
        });
      }
      if (method === "createProteinOrNucleotide" && el) {
        const origD = el.createDomain;
        if (origD) {
          el.createDomain = function (opt) {
            const d = origD.call(this, opt);
            d.nodes.addEventListener("mousedown", () => {
              setTimeout(() => { selectedElement = d; renderPropertyPanel(d); updateSelectionInfo(d); }, 10);
            });
            return d;
          };
        }
        const origS = el.createSite;
        if (origS) {
          el.createSite = function (opt) {
            const s = origS.call(this, opt);
            s.nodes.addEventListener("mousedown", () => {
              setTimeout(() => { selectedElement = s; renderPropertyPanel(s); updateSelectionInfo(s); }, 10);
            });
            return s;
          };
        }
      }
      return el;
    };
  });
  inst.nodes.addEventListener("mousedown", () => {
    setTimeout(() => {
      const sel = inst.config.selected;
      if (sel && sel !== selectedElement) { selectedElement = sel; renderPropertyPanel(sel); updateSelectionInfo(sel); }
      else if (!sel && selectedElement) { selectedElement = null; renderPropertyPanel(null); updateSelectionInfo(null); }
    }, 20);
  });
}

setInterval(() => {
  if (!ibsInstance) { deleteSelectedBtn.disabled = true; return; }
  const sel = ibsInstance.config.selected;
  deleteSelectedBtn.disabled = !sel;
  const selChanged = sel !== selectedElement;
  if (sel && selChanged) { selectedElement = sel; renderPropertyPanel(sel); updateSelectionInfo(sel); }
  if (!sel && selectedElement) { selectedElement = null; renderPropertyPanel(null); updateSelectionInfo(null); }
  updateStatusBar();
}, 200);

function ensureIbsInstance() {
  if (!ibsInstance) {
    initIbs();
  }
  return ibsInstance;
}

function getCanvasCenter() {
  if (!ibsInstance) return { x: 200, y: 200 };
  const config = ibsInstance.config;
  return {
    x: config.canvasWidth / 2,
    y: config.canvasHeight / 2
  };
}

initInsertButtons();
clearAll();
