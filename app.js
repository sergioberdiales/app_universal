const SUPABASE_URL = "https://uuwabhdzcxolhzhmrnhm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d2FiaGR6Y3hvbGh6aG1ybmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDQxNjIsImV4cCI6MjA4NTk4MDE2Mn0.lC0yej-sbLVVSQZcizU2A9E4yxpz-rY_DWUpOgjQbPU";

const pesoInput = document.getElementById("peso");
const fechaActual = document.getElementById("fechaActual");
const guardarBtn = document.getElementById("guardar");
const tabla = document.getElementById("tabla");
const contador = document.getElementById("contador");
const exportarBtn = document.getElementById("exportar");
const importarInput = document.getElementById("importar");
const limpiarBtn = document.getElementById("limpiar");
const mensaje = document.getElementById("mensaje");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const sessionStatus = document.getElementById("sessionStatus");

const supabaseLib = window.supabase;
const clientReady = Boolean(supabaseLib && typeof supabaseLib.createClient === "function");
const supabase = clientReady ? supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

function updateNow() {
  fechaActual.textContent = formatDate(nowISO());
}

function setMessage(text) {
  mensaje.textContent = text;
  if (!text) return;
  setTimeout(() => {
    if (mensaje.textContent === text) mensaje.textContent = "";
  }, 5000);
}

function showError(prefix, error) {
  const detail = error && error.message ? `: ${error.message}` : "";
  setMessage(`${prefix}${detail}`);
}

async function getCurrentUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

async function loadRecords() {
  if (!supabase) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weights")
    .select("id, ts, weight")
    .eq("user_id", user.id)
    .order("ts", { ascending: true });

  if (error) {
    showError("No se pudo cargar el historial", error);
    return [];
  }

  return data.map((r) => ({ id: r.id, ts: r.ts, weight: Number(r.weight) }));
}

function renderTable(records) {
  if (records.length === 0) {
    tabla.innerHTML = `<tr class="empty"><td colspan="3">Aún no hay registros.</td></tr>`;
    contador.textContent = "0 registros";
    return;
  }

  const sorted = records.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const rows = sorted
    .map(
      (r) => `
        <tr>
          <td>${formatDate(r.ts)}</td>
          <td>${r.weight.toFixed(1)}</td>
          <td><button class="ghost" data-id="${r.id}">Eliminar</button></td>
        </tr>
      `
    )
    .join("");

  tabla.innerHTML = rows;
  contador.textContent = `${records.length} registro${records.length === 1 ? "" : "s"}`;
}

function setAuthUI(session) {
  const loggedIn = Boolean(session && session.user);
  loginBtn.classList.toggle("hidden", loggedIn);
  logoutBtn.classList.toggle("hidden", !loggedIn);
  emailInput.disabled = loggedIn;
  passwordInput.disabled = loggedIn;
  sessionStatus.textContent = loggedIn ? session.user.email : "sin sesión";
}

async function ensureSession() {
  if (!supabase) {
    setAuthUI(null);
    return null;
  }
  const { data } = await supabase.auth.getSession();
  setAuthUI(data.session);
  return data.session;
}

function setCloudActionsEnabled(enabled) {
  guardarBtn.disabled = !enabled;
  exportarBtn.disabled = !enabled;
  importarInput.disabled = !enabled;
  limpiarBtn.disabled = !enabled;
}

async function refreshRecords() {
  const records = await loadRecords();
  renderTable(records);
}

async function addRecord(weight) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) {
    setMessage("Inicia sesión para guardar.");
    return;
  }

  const { error } = await supabase.from("weights").insert({
    user_id: user.id,
    ts: nowISO(),
    weight,
  });

  if (error) {
    showError("No se pudo guardar el registro", error);
    return;
  }

  await refreshRecords();
}

async function deleteRecord(id) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) {
    setMessage("Inicia sesión para eliminar.");
    return;
  }

  const { error } = await supabase
    .from("weights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    showError("No se pudo eliminar el registro", error);
    return;
  }

  await refreshRecords();
}

async function exportCSV() {
  const records = await loadRecords();
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
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

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

async function init() {
  updateNow();
  setInterval(updateNow, 1000);

  if (!supabase) {
    setCloudActionsEnabled(false);
    sessionStatus.textContent = "error de conexión";
    setMessage("No se pudo cargar Supabase. Recarga la página.");
    renderTable([]);
    return;
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    setAuthUI(session);
    if (session) {
      setCloudActionsEnabled(true);
      await refreshRecords();
    } else {
      setCloudActionsEnabled(false);
      renderTable([]);
    }
  });

  const session = await ensureSession();
  setCloudActionsEnabled(Boolean(session));
  if (session) {
    await refreshRecords();
  } else {
    renderTable([]);
  }
}

init();

guardarBtn.addEventListener("click", async () => {
  const value = Number(pesoInput.value);
  if (Number.isNaN(value) || value <= 0) {
    setMessage("Ingresa un peso válido.");
    return;
  }

  const session = await ensureSession();
  if (!session) {
    setMessage("Inicia sesión para guardar.");
    return;
  }

  await addRecord(Number(value.toFixed(1)));
  pesoInput.value = "";
  setMessage("Registro guardado.");
});

pesoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") guardarBtn.click();
});

tabla.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const id = button.dataset.id;
  if (!id) return;

  await deleteRecord(id);
  setMessage("Registro eliminado.");
});

exportarBtn.addEventListener("click", async () => {
  const session = await ensureSession();
  if (!session) {
    setMessage("Inicia sesión para exportar.");
    return;
  }
  await exportCSV();
});

importarInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const imported = parseCSV(text);
  if (imported.length === 0) {
    setMessage("No se encontraron registros válidos en el CSV.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    setMessage("Inicia sesión para importar.");
    return;
  }

  const rows = imported.map((r) => ({
    user_id: user.id,
    ts: r.ts,
    weight: r.weight,
  }));

  const { error } = await supabase.from("weights").insert(rows);
  if (error) {
    showError("No se pudo importar el CSV", error);
    return;
  }

  await refreshRecords();
  setMessage(`Importados ${imported.length} registros.`);
  importarInput.value = "";
});

limpiarBtn.addEventListener("click", async () => {
  if (!confirm("¿Seguro que quieres borrar todos los registros?")) return;

  const user = await getCurrentUser();
  if (!user) {
    setMessage("Inicia sesión para borrar.");
    return;
  }

  const { error } = await supabase.from("weights").delete().eq("user_id", user.id);
  if (error) {
    showError("No se pudo borrar", error);
    return;
  }

  renderTable([]);
  setMessage("Registros borrados.");
});

loginBtn.addEventListener("click", async () => {
  if (!supabase) {
    setMessage("Supabase no está disponible en este momento.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    setMessage("Ingresa email y clave.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showError("No se pudo iniciar sesión", error);
    return;
  }

  const session = await ensureSession();
  if (session) {
    await refreshRecords();
    setMessage("Sesión iniciada.");
  }
});

logoutBtn.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  setAuthUI(null);
  setCloudActionsEnabled(false);
  renderTable([]);
  setMessage("Sesión cerrada.");
});
