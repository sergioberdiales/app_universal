const SUPABASE_URL = "https://uuwabhdzcxolhzhmrnhm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d2FiaGR6Y3hvbGh6aG1ybmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDQxNjIsImV4cCI6MjA4NTk4MDE2Mn0.lC0yej-sbLVVSQZcizU2A9E4yxpz-rY_DWUpOgjQbPU";
const SESSION_KEY = "peso_supabase_session_v1";

const loginCard = document.getElementById("loginCard");
const sessionCard = document.getElementById("sessionCard");
const zonaPrivada = document.getElementById("zonaPrivada");
const estadoApp = document.getElementById("estadoApp");

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

let currentSession = loadSession();

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "fecha invalida";

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function updateNow() {
  fechaActual.textContent = formatDate(nowISO());
}

function setMessage(text) {
  mensaje.textContent = text || "";
  if (!text) return;

  setTimeout(() => {
    if (mensaje.textContent === text) mensaje.textContent = "";
  }, 5000);
}

function setStatus(text) {
  estadoApp.textContent = text || "";
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.access_token || !parsed.user || !parsed.user.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  currentSession = null;
  localStorage.removeItem(SESSION_KEY);
}

function isSessionExpired(session) {
  if (!session || !session.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= session.expires_at - 30;
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const body = await readJsonSafe(response);

  if (!response.ok) {
    const detail = body.error_description || body.message || body.error || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return body;
}

async function refreshSessionIfNeeded() {
  if (!currentSession) return null;
  if (!isSessionExpired(currentSession)) return currentSession;
  if (!currentSession.refresh_token) {
    clearSession();
    return null;
  }

  try {
    const refreshed = await apiFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
    });

    currentSession = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      user: refreshed.user,
    };
    saveSession(currentSession);
    return currentSession;
  } catch {
    clearSession();
    return null;
  }
}

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${currentSession.access_token}`,
    "Content-Type": "application/json",
  };
}

function setAuthenticatedUI(isAuthenticated) {
  loginCard.classList.toggle("hidden", isAuthenticated);
  sessionCard.classList.toggle("hidden", !isAuthenticated);
  zonaPrivada.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated) {
    sessionStatus.textContent = currentSession.user.email;
    setStatus("");
  } else {
    sessionStatus.textContent = "-";
    setStatus("Inicia sesion para usar la app.");
    renderTable([]);
  }
}

function renderTable(records) {
  if (records.length === 0) {
    tabla.innerHTML = '<tr class="empty"><td colspan="3">Aun no hay registros.</td></tr>';
    contador.textContent = "0 registros";
    return;
  }

  const rows = records
    .map(
      (r) => `
      <tr>
        <td>${formatDate(r.ts)}</td>
        <td>${Number(r.weight).toFixed(1)}</td>
        <td><button class="ghost" data-id="${r.id}">Eliminar</button></td>
      </tr>
    `
    )
    .join("");

  tabla.innerHTML = rows;
  contador.textContent = `${records.length} registro${records.length === 1 ? "" : "s"}`;
}

async function fetchRecords() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "id,ts,weight",
    user_id: `eq.${currentSession.user.id}`,
    order: "ts.desc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/weights?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function refreshAndRender() {
  const records = await fetchRecords();
  renderTable(records);
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const hasHeader = lines[0].toLowerCase().includes("timestamp");
  const startIndex = hasHeader ? 1 : 0;

  const records = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const [timestamp, weightRaw] = lines[i].split(",");
    const ts = timestamp ? timestamp.trim() : "";
    const weight = Number(weightRaw);
    if (!ts || Number.isNaN(weight)) continue;

    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) continue;

    records.push({ ts: date.toISOString(), weight: Number(weight.toFixed(1)) });
  }

  return records;
}

async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setMessage("Ingresa email y clave.");
    return;
  }

  loginBtn.disabled = true;
  setStatus("Iniciando sesion...");

  try {
    const data = await apiFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    currentSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user,
    };

    saveSession(currentSession);
    setAuthenticatedUI(true);
    await refreshAndRender();
    setMessage("Sesion iniciada.");
  } catch (error) {
    setStatus("No se pudo iniciar sesion.");
    setMessage(`Login fallido: ${error.message}`);
  } finally {
    loginBtn.disabled = false;
  }
}

async function handleLogout() {
  try {
    if (currentSession && currentSession.access_token) {
      await apiFetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });
    }
  } catch {
    // Ignore remote logout errors; local logout still succeeds.
  }

  clearSession();
  setAuthenticatedUI(false);
  setMessage("Sesion cerrada.");
}

async function handleAddRecord() {
  await refreshSessionIfNeeded();
  if (!currentSession) {
    setAuthenticatedUI(false);
    setMessage("Inicia sesion para guardar.");
    return;
  }

  const value = Number(pesoInput.value);
  if (Number.isNaN(value) || value <= 0) {
    setMessage("Ingresa un peso valido.");
    return;
  }

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/weights`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: currentSession.user.id,
          ts: nowISO(),
          weight: Number(value.toFixed(1)),
        },
      ]),
    });

    pesoInput.value = "";
    await refreshAndRender();
    setMessage("Registro guardado.");
  } catch (error) {
    setMessage(`No se pudo guardar: ${error.message}`);
  }
}

async function handleDeleteRecord(id) {
  await refreshSessionIfNeeded();
  if (!currentSession) {
    setAuthenticatedUI(false);
    return;
  }

  const params = new URLSearchParams({
    id: `eq.${id}`,
    user_id: `eq.${currentSession.user.id}`,
  });

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/weights?${params.toString()}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    await refreshAndRender();
    setMessage("Registro eliminado.");
  } catch (error) {
    setMessage(`No se pudo eliminar: ${error.message}`);
  }
}

async function handleExport() {
  try {
    const records = await fetchRecords();
    if (records.length === 0) {
      setMessage("No hay registros para exportar.");
      return;
    }

    const csv = ["timestamp,weight", ...records.map((r) => `${r.ts},${r.weight}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peso-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("CSV exportado.");
  } catch (error) {
    setMessage(`No se pudo exportar: ${error.message}`);
  }
}

async function handleImport(file) {
  try {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      setMessage("No se encontraron registros validos en el CSV.");
      return;
    }

    await refreshSessionIfNeeded();
    if (!currentSession) {
      setAuthenticatedUI(false);
      setMessage("Inicia sesion para importar.");
      return;
    }

    const rows = parsed.map((r) => ({
      user_id: currentSession.user.id,
      ts: r.ts,
      weight: r.weight,
    }));

    await apiFetch(`${SUPABASE_URL}/rest/v1/weights`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    await refreshAndRender();
    setMessage(`Importados ${rows.length} registros.`);
  } catch (error) {
    setMessage(`No se pudo importar: ${error.message}`);
  } finally {
    importarInput.value = "";
  }
}

async function handleClearAll() {
  if (!confirm("Seguro que quieres borrar todos los registros?")) return;

  await refreshSessionIfNeeded();
  if (!currentSession) {
    setAuthenticatedUI(false);
    return;
  }

  const params = new URLSearchParams({
    user_id: `eq.${currentSession.user.id}`,
  });

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/weights?${params.toString()}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    renderTable([]);
    setMessage("Registros borrados.");
  } catch (error) {
    setMessage(`No se pudo borrar: ${error.message}`);
  }
}

function bindEvents() {
  loginBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogin();
  });

  passwordInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleLogin();
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await handleLogout();
  });

  guardarBtn.addEventListener("click", async () => {
    await handleAddRecord();
  });

  pesoInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleAddRecord();
    }
  });

  tabla.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const id = button.dataset.id;
    if (!id) return;
    await handleDeleteRecord(id);
  });

  exportarBtn.addEventListener("click", async () => {
    await handleExport();
  });

  importarInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    await handleImport(file);
  });

  limpiarBtn.addEventListener("click", async () => {
    await handleClearAll();
  });

  window.addEventListener("error", (event) => {
    const detail = event && event.message ? event.message : "Error de JavaScript.";
    setStatus(detail);
  });
}

async function init() {
  updateNow();
  setInterval(updateNow, 1000);
  bindEvents();

  if (!currentSession) {
    setAuthenticatedUI(false);
    return;
  }

  await refreshSessionIfNeeded();
  if (!currentSession) {
    setAuthenticatedUI(false);
    return;
  }

  setAuthenticatedUI(true);
  try {
    await refreshAndRender();
  } catch (error) {
    setStatus(`Error al cargar datos: ${error.message}`);
  }
}

init().catch((error) => {
  setStatus(`Error al iniciar: ${error.message}`);
});
