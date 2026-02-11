const SUPABASE_URL = "https://uuwabhdzcxolhzhmrnhm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d2FiaGR6Y3hvbGh6aG1ybmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDQxNjIsImV4cCI6MjA4NTk4MDE2Mn0.lC0yej-sbLVVSQZcizU2A9E4yxpz-rY_DWUpOgjQbPU";
const SESSION_KEY = "peso_supabase_session_v1";
const TAB_KEY = "registro_tab_v1";
const TAB_IDS = ["todayPanel", "weightPanel", "historyPanel"];

const loginCard = document.getElementById("loginCard");
const zonaPrivada = document.getElementById("zonaPrivada");
const estadoApp = document.getElementById("estadoApp");
const mensaje = document.getElementById("mensaje");

const mainTabs = document.getElementById("mainTabs");
const todayPanel = document.getElementById("todayPanel");
const weightPanel = document.getElementById("weightPanel");
const historyPanel = document.getElementById("historyPanel");
const panelMap = {
  todayPanel,
  weightPanel,
  historyPanel,
};

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");

const pesoInput = document.getElementById("peso");
const fechaActual = document.getElementById("fechaActual");
const guardarBtn = document.getElementById("guardar");
const tabla = document.getElementById("tabla");
const contador = document.getElementById("contador");
const exportarBtn = document.getElementById("exportar");
const importarInput = document.getElementById("importar");
const limpiarBtn = document.getElementById("limpiar");

const habitNameInput = document.getElementById("habitName");
const habitDescriptionInput = document.getElementById("habitDescription");
const createHabitBtn = document.getElementById("createHabit");
const habitDateInput = document.getElementById("habitDate");
const habitsTable = document.getElementById("habitsTable");
const habitCounter = document.getElementById("habitCounter");
const habitSummary = document.getElementById("habitSummary");
const newHabitDetails = document.getElementById("newHabitDetails");

let currentSession = loadSession();

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function getSelectedHabitDate() {
  const date = habitDateInput.value || todayLocalDateString();
  habitDateInput.value = date;
  return date;
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "fecha invalida";

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function loadPreferredTab() {
  const stored = localStorage.getItem(TAB_KEY);
  return TAB_IDS.includes(stored) ? stored : "todayPanel";
}

function setPreferredTab(tabId) {
  localStorage.setItem(TAB_KEY, tabId);
}

function setActiveTab(tabId) {
  const targetId = TAB_IDS.includes(tabId) ? tabId : "todayPanel";

  for (const id of TAB_IDS) {
    const panel = panelMap[id];
    if (!panel) continue;
    const active = id === targetId;
    panel.classList.toggle("hidden", !active);
    panel.classList.toggle("is-active", active);
  }

  if (!mainTabs) return;
  const tabButtons = mainTabs.querySelectorAll("button[data-tab-target]");
  for (const button of tabButtons) {
    const active = button.dataset.tabTarget === targetId;
    button.classList.toggle("is-active", active);
  }

  setPreferredTab(targetId);
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

async function ensureAuthenticated(messageIfNot = "Inicia sesion para continuar.") {
  await refreshSessionIfNeeded();
  if (currentSession) return true;

  setAuthenticatedUI(false);
  setMessage(messageIfNot);
  return false;
}

function authHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${currentSession.access_token}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function renderWeightTable(records) {
  if (records.length === 0) {
    tabla.innerHTML = '<tr class="empty"><td colspan="3">Aun no hay registros.</td></tr>';
    contador.textContent = "0 registros";
    return;
  }

  const rows = records
    .map(
      (item) => `
        <tr>
          <td>${formatDate(item.ts)}</td>
          <td>${Number(item.weight).toFixed(1)}</td>
          <td><button class="ghost" data-id="${item.id}">Eliminar</button></td>
        </tr>
      `
    )
    .join("");

  tabla.innerHTML = rows;
  contador.textContent = `${records.length} registro${records.length === 1 ? "" : "s"}`;
}

function renderHabitTable(habits, checksByHabit, date) {
  if (habits.length === 0) {
    habitsTable.innerHTML = '<tr class="empty"><td colspan="2">Aun no hay habitos creados.</td></tr>';
    habitCounter.textContent = "0 habitos";
    habitSummary.textContent = "Crea tu primer habito para empezar.";
    return;
  }

  let yesCount = 0;
  let noCount = 0;
  let pendingCount = 0;

  const rows = habits
    .map((habit) => {
      const status = checksByHabit.has(habit.id) ? checksByHabit.get(habit.id) : null;

      if (status === 1) yesCount += 1;
      if (status === 0) noCount += 1;
      if (status === null) pendingCount += 1;

      const yesActive = status === 1 ? "is-active" : "";
      const noActive = status === 0 ? "is-active" : "";

      const description = habit.description
        ? `<div class="habit-description">${escapeHtml(habit.description)}</div>`
        : "";

      return `
        <tr>
          <td>
            <div class="habit-name">${escapeHtml(habit.name)}</div>
            ${description}
          </td>
          <td>
            <div class="habit-checks">
              <button class="habit-btn yes ${yesActive}" data-habit-id="${habit.id}" data-status="1">Si</button>
              <button class="habit-btn no ${noActive}" data-habit-id="${habit.id}" data-status="0">No</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  habitsTable.innerHTML = rows;
  habitCounter.textContent = `${habits.length} habito${habits.length === 1 ? "" : "s"}`;
  habitSummary.textContent = `${date}: ${yesCount} si, ${noCount} no, ${pendingCount} pendientes.`;
}

function setAuthenticatedUI(isAuthenticated) {
  loginCard.classList.toggle("hidden", isAuthenticated);
  zonaPrivada.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated) {
    setStatus("");
    return;
  }

  setStatus("Inicia sesion para usar la app.");
  renderWeightTable([]);
  renderHabitTable([], new Map(), getSelectedHabitDate());
  setActiveTab("todayPanel");
}

async function fetchWeightRecords() {
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

async function fetchHabits() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "id,name,description,is_active,created_at",
    user_id: `eq.${currentSession.user.id}`,
    is_active: "eq.true",
    order: "created_at.asc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/habits?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function fetchHabitChecks(logDate) {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "habit_id,status,log_date",
    user_id: `eq.${currentSession.user.id}`,
    log_date: `eq.${logDate}`,
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function refreshWeights() {
  const weights = await fetchWeightRecords();
  renderWeightTable(weights);
}

async function refreshHabits() {
  const logDate = getSelectedHabitDate();
  const [habits, checks] = await Promise.all([fetchHabits(), fetchHabitChecks(logDate)]);

  const checksByHabit = new Map();
  for (const check of checks) {
    checksByHabit.set(Number(check.habit_id), Number(check.status));
  }

  renderHabitTable(habits, checksByHabit, logDate);
}

async function refreshAllData() {
  const [weightsResult, habitsResult] = await Promise.allSettled([refreshWeights(), refreshHabits()]);

  if (weightsResult.status === "rejected") {
    setStatus(`Error en peso: ${weightsResult.reason.message}`);
  }

  if (habitsResult.status === "rejected") {
    const detail = habitsResult.reason.message || "error desconocido";
    const missingTables =
      detail.includes('relation "habits" does not exist') ||
      detail.includes('relation "habit_checks" does not exist');

    if (missingTables) {
      setStatus("Falta crear tablas de habitos en Supabase. Ejecuta supabase_habits.sql.");
      habitSummary.textContent = "Pendiente: ejecutar SQL de habitos en Supabase.";
      habitsTable.innerHTML =
        '<tr class="empty"><td colspan="2">Habitos no disponible hasta crear tablas.</td></tr>';
      habitCounter.textContent = "0 habitos";
    } else {
      setStatus(`Error en habitos: ${detail}`);
    }
  }

  if (weightsResult.status === "fulfilled" && habitsResult.status === "fulfilled") {
    setStatus("");
  }
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
    setActiveTab(loadPreferredTab());
    await refreshAllData();
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
    // Ignore remote logout errors; local logout still continues.
  }

  clearSession();
  setAuthenticatedUI(false);
  setMessage("Sesion cerrada.");
}

async function handleAddWeight() {
  const ok = await ensureAuthenticated("Inicia sesion para guardar peso.");
  if (!ok) return;

  const value = Number(pesoInput.value);
  if (Number.isNaN(value) || value <= 0) {
    setMessage("Ingresa un peso valido.");
    return;
  }

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/weights`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify([
        {
          user_id: currentSession.user.id,
          ts: nowISO(),
          weight: Number(value.toFixed(1)),
        },
      ]),
    });

    pesoInput.value = "";
    await refreshWeights();
    setMessage("Registro de peso guardado.");
  } catch (error) {
    setMessage(`No se pudo guardar el peso: ${error.message}`);
  }
}

async function handleDeleteWeight(id) {
  const ok = await ensureAuthenticated();
  if (!ok) return;

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

    await refreshWeights();
    setMessage("Registro eliminado.");
  } catch (error) {
    setMessage(`No se pudo eliminar: ${error.message}`);
  }
}

async function handleExportWeights() {
  const ok = await ensureAuthenticated("Inicia sesion para exportar.");
  if (!ok) return;

  try {
    const records = await fetchWeightRecords();
    if (records.length === 0) {
      setMessage("No hay registros para exportar.");
      return;
    }

    const csv = ["timestamp,weight", ...records.map((row) => `${row.ts},${row.weight}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peso-${todayLocalDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("CSV exportado.");
  } catch (error) {
    setMessage(`No se pudo exportar: ${error.message}`);
  }
}

async function handleImportWeights(file) {
  const ok = await ensureAuthenticated("Inicia sesion para importar.");
  if (!ok) return;

  try {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      setMessage("No se encontraron registros validos en el CSV.");
      return;
    }

    const rows = parsed.map((row) => ({
      user_id: currentSession.user.id,
      ts: row.ts,
      weight: row.weight,
    }));

    await apiFetch(`${SUPABASE_URL}/rest/v1/weights`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(rows),
    });

    await refreshWeights();
    setMessage(`Importados ${rows.length} registros de peso.`);
  } catch (error) {
    setMessage(`No se pudo importar: ${error.message}`);
  } finally {
    importarInput.value = "";
  }
}

async function handleClearWeights() {
  const ok = await ensureAuthenticated("Inicia sesion para borrar.");
  if (!ok) return;
  if (!confirm("Seguro que quieres borrar todos los registros de peso?")) return;

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

    renderWeightTable([]);
    setMessage("Registros de peso borrados.");
  } catch (error) {
    setMessage(`No se pudo borrar: ${error.message}`);
  }
}

async function handleCreateHabit() {
  const ok = await ensureAuthenticated("Inicia sesion para crear habitos.");
  if (!ok) return;

  const name = habitNameInput.value.trim();
  const description = habitDescriptionInput.value.trim();

  if (!name) {
    setMessage("El nombre del habito es obligatorio.");
    return;
  }

  createHabitBtn.disabled = true;

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/habits`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify([
        {
          user_id: currentSession.user.id,
          name,
          description: description || null,
          is_active: true,
        },
      ]),
    });

    habitNameInput.value = "";
    habitDescriptionInput.value = "";
    if (newHabitDetails) newHabitDetails.open = false;

    await refreshHabits();
    setMessage("Habito creado.");
  } catch (error) {
    setMessage(`No se pudo crear el habito: ${error.message}`);
  } finally {
    createHabitBtn.disabled = false;
  }
}

async function upsertHabitStatus(habitId, status) {
  const ok = await ensureAuthenticated("Inicia sesion para registrar habitos.");
  if (!ok) return;

  const logDate = getSelectedHabitDate();

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?on_conflict=user_id,habit_id,log_date`, {
      method: "POST",
      headers: authHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([
        {
          user_id: currentSession.user.id,
          habit_id: Number(habitId),
          log_date: logDate,
          status: Number(status),
        },
      ]),
    });

    await refreshHabits();
  } catch (error) {
    setMessage(`No se pudo guardar el seguimiento: ${error.message}`);
  }
}

function bindEvents() {
  loginBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogin();
  });

  passwordInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await handleLogin();
  });

  logoutBtn.addEventListener("click", async () => {
    await handleLogout();
  });

  if (mainTabs) {
    mainTabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tab-target]");
      if (!button) return;
      setActiveTab(button.dataset.tabTarget);
    });
  }

  guardarBtn.addEventListener("click", async () => {
    await handleAddWeight();
  });

  pesoInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await handleAddWeight();
  });

  tabla.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const id = button.dataset.id;
    if (!id) return;
    await handleDeleteWeight(id);
  });

  exportarBtn.addEventListener("click", async () => {
    await handleExportWeights();
  });

  importarInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    await handleImportWeights(file);
  });

  limpiarBtn.addEventListener("click", async () => {
    await handleClearWeights();
  });

  createHabitBtn.addEventListener("click", async () => {
    await handleCreateHabit();
  });

  habitNameInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await handleCreateHabit();
  });

  habitDescriptionInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await handleCreateHabit();
  });

  habitDateInput.addEventListener("change", async () => {
    const ok = await ensureAuthenticated();
    if (!ok) return;

    try {
      await refreshHabits();
    } catch (error) {
      setStatus(`Error en habitos: ${error.message}`);
    }
  });

  habitsTable.addEventListener("click", async (event) => {
    const statusBtn = event.target.closest("button[data-habit-id][data-status]");
    if (statusBtn) {
      await upsertHabitStatus(statusBtn.dataset.habitId, statusBtn.dataset.status);
    }
  });

  window.addEventListener("error", (event) => {
    const detail = event && event.message ? event.message : "Error de JavaScript.";
    setStatus(detail);
  });
}

async function init() {
  habitDateInput.value = todayLocalDateString();
  updateNow();
  setInterval(updateNow, 1000);
  bindEvents();
  setActiveTab(loadPreferredTab());

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
  setActiveTab(loadPreferredTab());

  try {
    await refreshAllData();
  } catch (error) {
    setStatus(`Error al cargar datos: ${error.message}`);
  }
}

init().catch((error) => {
  setStatus(`Error al iniciar: ${error.message}`);
});
