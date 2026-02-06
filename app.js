const STORAGE_KEY = "peso_registros";

const pesoInput = document.getElementById("peso");
const fechaActual = document.getElementById("fechaActual");
const guardarBtn = document.getElementById("guardar");
const tabla = document.getElementById("tabla");
const contador = document.getElementById("contador");
const exportarBtn = document.getElementById("exportar");
const importarInput = document.getElementById("importar");
const limpiarBtn = document.getElementById("limpiar");
const mensaje = document.getElementById("mensaje");

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && r.ts && typeof r.weight === "number");
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function updateNow() {
  fechaActual.textContent = formatDate(nowISO());
}

function setMessage(text) {
  mensaje.textContent = text;
  if (!text) return;
  setTimeout(() => {
    if (mensaje.textContent === text) mensaje.textContent = "";
  }, 3000);
}

function renderTable(records) {
  if (records.length === 0) {
    tabla.innerHTML = `<tr class="empty"><td colspan="3">Aún no hay registros.</td></tr>`;
    contador.textContent = "0 registros";
    return;
  }

  const rows = records
    .slice()
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .map((r, index) => {
      return `
        <tr>
          <td>${formatDate(r.ts)}</td>
          <td>${r.weight.toFixed(1)}</td>
          <td><button class="ghost" data-index="${index}">Eliminar</button></td>
        </tr>
      `;
    })
    .join("");

  tabla.innerHTML = rows;
  contador.textContent = `${records.length} registro${records.length === 1 ? "" : "s"}`;
}

function addRecord(weight) {
  const records = loadRecords();
  records.push({ ts: nowISO(), weight });
  saveRecords(records);
  renderTable(records);
}

function deleteRecord(index) {
  const records = loadRecords();
  const sorted = records.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const recordToDelete = sorted[index];
  const filtered = records.filter((r) => !(r.ts === recordToDelete.ts && r.weight === recordToDelete.weight));
  saveRecords(filtered);
  renderTable(filtered);
}

function exportCSV() {
  const records = loadRecords();
  if (records.length === 0) {
    setMessage("No hay registros para exportar.");
    return;
  }
  const header = "timestamp,weight";
  const lines = records.map((r) => `${r.ts},${r.weight}`);
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peso-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setMessage("CSV exportado.");
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  let start = 0;
  if (lines[0].toLowerCase().includes("timestamp")) {
    start = 1;
  }

  const records = [];
  for (let i = start; i < lines.length; i += 1) {
    const [tsRaw, weightRaw] = lines[i].split(",");
    const ts = tsRaw ? tsRaw.trim() : "";
    const weight = Number(weightRaw);
    if (!ts || Number.isNaN(weight)) continue;
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) continue;
    records.push({ ts: date.toISOString(), weight });
  }
  return records;
}

function mergeRecords(existing, incoming) {
  const map = new Map();
  const all = [...existing, ...incoming];
  for (const r of all) {
    map.set(`${r.ts}-${r.weight}`, r);
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function init() {
  updateNow();
  setInterval(updateNow, 1000);
  renderTable(loadRecords());
}

init();

guardarBtn.addEventListener("click", () => {
  const value = Number(pesoInput.value);
  if (Number.isNaN(value) || value <= 0) {
    setMessage("Ingresa un peso válido.");
    return;
  }
  addRecord(Number(value.toFixed(1)));
  pesoInput.value = "";
  setMessage("Registro guardado.");
});

pesoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") guardarBtn.click();
});

tabla.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (Number.isNaN(index)) return;
  deleteRecord(index);
  setMessage("Registro eliminado.");
});

exportarBtn.addEventListener("click", exportCSV);

importarInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const imported = parseCSV(text);
  if (imported.length === 0) {
    setMessage("No se encontraron registros válidos en el CSV.");
    return;
  }
  const merged = mergeRecords(loadRecords(), imported);
  saveRecords(merged);
  renderTable(merged);
  setMessage(`Importados ${imported.length} registros.`);
  importarInput.value = "";
});

limpiarBtn.addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar todos los registros?")) return;
  saveRecords([]);
  renderTable([]);
  setMessage("Registros borrados.");
});
