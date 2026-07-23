// Build 2026-07-23: medication prescriptions are stored as treatment periods.
const SUPABASE_URL = "https://uuwabhdzcxolhzhmrnhm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d2FiaGR6Y3hvbGh6aG1ybmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDQxNjIsImV4cCI6MjA4NTk4MDE2Mn0.lC0yej-sbLVVSQZcizU2A9E4yxpz-rY_DWUpOgjQbPU";
const SESSION_KEY = "peso_supabase_session_v1";
const TAB_KEY = "registro_tab_v1";
const TAB_IDS = ["todayPanel", "weightPanel", "medicationPanel", "reportsPanel"];

const loginCard = document.getElementById("loginCard");
const zonaPrivada = document.getElementById("zonaPrivada");
const estadoApp = document.getElementById("estadoApp");
const mensaje = document.getElementById("mensaje");
const appDate = document.getElementById("appDate");
const mainTabs = document.getElementById("mainTabs");
const tabHabitsProgress = document.getElementById("tabHabitsProgress");
const tabMedicationStatusText = document.getElementById("tabMedicationStatusText");
const headerMenu = document.getElementById("headerMenu");
const menuToggle = document.getElementById("menuToggle");
const headerMenuPanel = document.getElementById("headerMenuPanel");

const todayPanel = document.getElementById("todayPanel");
const weightPanel = document.getElementById("weightPanel");
const medicationPanel = document.getElementById("medicationPanel");
const reportsPanel = document.getElementById("reportsPanel");
const panelMap = {
  todayPanel,
  weightPanel,
  medicationPanel,
  reportsPanel,
};

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authModeLoginBtn = document.getElementById("authModeLogin");
const authModeRegisterBtn = document.getElementById("authModeRegister");
const confirmPasswordField = document.getElementById("confirmPasswordField");
const confirmPasswordInput = document.getElementById("confirmPassword");
const authModeHint = document.getElementById("authModeHint");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");

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
const exportHabitsBtn = document.getElementById("exportHabits");

const medNewTreatment = document.getElementById("medNewTreatment");
const medActiveBadge = document.getElementById("medActiveBadge");
const medActiveList = document.getElementById("medActiveList");
const medHistoryBadge = document.getElementById("medHistoryBadge");
const medHistoryList = document.getElementById("medHistoryList");
const medFormCard = document.getElementById("medFormCard");
const medFormTitle = document.getElementById("medFormTitle");
const medTreatmentForm = document.getElementById("medTreatmentForm");
const medFormCancel = document.getElementById("medFormCancel");
const medFormSubmit = document.getElementById("medFormSubmit");
const medFormError = document.getElementById("medFormError");
const medEditId = document.getElementById("medEditId");
const medName = document.getElementById("medName");
const medActiveIngredient = document.getElementById("medActiveIngredient");
const medDose = document.getElementById("medDose");
const medFrequency = document.getElementById("medFrequency");
const medStartDate = document.getElementById("medStartDate");
const medEndDate = document.getElementById("medEndDate");
const medStatus = document.getElementById("medStatus");
const medReason = document.getElementById("medReason");
const medPrescriber = document.getElementById("medPrescriber");
const medSuspensionReasonField = document.getElementById("medSuspensionReasonField");
const medSuspensionReason = document.getElementById("medSuspensionReason");
const medInstructions = document.getElementById("medInstructions");
const medNotes = document.getElementById("medNotes");
const reportsList = document.getElementById("reportsList");
const reportDetail = document.getElementById("reportDetail");
const reportGenerateNow = document.getElementById("reportGenerateNow");

let currentSession = loadSession();
let authMode = "login";
let tabStatusState = {
  habitsDone: 0,
  habitsTotal: 0,
  activeMedications: 0,
};
let isHeaderMenuOpen = false;
let reportsCache = [];
let selectedReportId = null;
let medicationCache = {
  treatments: [],
  byId: new Map(),
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 6;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseDateOnly(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToDateOnlyString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDaysToDateString(dateString, deltaDays) {
  const date = parseDateOnly(dateString);
  date.setDate(date.getDate() + deltaDays);
  return dateToDateOnlyString(date);
}

function inclusiveDayDistance(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  const diff = Math.floor((end - start) / DAY_MS);
  if (diff < 0) return 0;
  return diff + 1;
}

function startOfLocalDayIso(dateString) {
  const day = parseDateOnly(dateString);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  return start.toISOString();
}

function endOfLocalDayExclusiveIso(dateString) {
  const day = parseDateOnly(dateString);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
  return end.toISOString();
}

function isoToLocalDateString(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function dayLabel(dateString) {
  const today = todayLocalDateString();
  const yesterday = addDaysToDateString(today, -1);
  if (dateString === today) return "Hoy";
  if (dateString === yesterday) return "Ayer";
  const date = parseDateOnly(dateString);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function setHeaderDate(date = new Date()) {
  if (!appDate) return;

  const formatter = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const value = formatter.format(date);
  appDate.textContent = value.charAt(0).toUpperCase() + value.slice(1);
}

function renderTabStatus() {
  if (tabHabitsProgress) {
    tabHabitsProgress.textContent = `${tabStatusState.habitsDone}/${tabStatusState.habitsTotal}`;
  }

  if (tabMedicationStatusText) {
    const count = Number(tabStatusState.activeMedications || 0);
    tabMedicationStatusText.textContent = `${count} activo${count === 1 ? "" : "s"}`;
  }
}

function resetTabStatus() {
  tabStatusState = {
    habitsDone: 0,
    habitsTotal: 0,
    activeMedications: 0,
  };
  renderTabStatus();
}

function setHeaderMenuOpen(nextOpen) {
  isHeaderMenuOpen = !!nextOpen;
  if (!headerMenuPanel || !menuToggle) return;
  headerMenuPanel.classList.toggle("hidden", !isHeaderMenuOpen);
  menuToggle.setAttribute("aria-expanded", String(isHeaderMenuOpen));
}

function closeHeaderMenu() {
  setHeaderMenuOpen(false);
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

function formatDateOnly(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function isValidDateOnly(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const date = parseDateOnly(dateString);
  return !Number.isNaN(date.getTime()) && dateToDateOnlyString(date) === dateString;
}

function formatWeekLabel(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const monthStart = start.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const monthEnd = end.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  if (sameMonth) {
    return `Informe semana ${pad2(start.getDate())}-${pad2(end.getDate())} ${monthEnd} ${end.getFullYear()}`;
  }
  return `Informe semana ${pad2(start.getDate())} ${monthStart}-${pad2(end.getDate())} ${monthEnd} ${end.getFullYear()}`;
}

function percentageLabel(rate) {
  if (rate == null || Number.isNaN(Number(rate))) return "-";
  return `${Math.round(Number(rate) * 100)}%`;
}

function updateNow() {
  fechaActual.textContent = formatDate(nowISO());
  setHeaderDate();
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

function getCurrentUserId() {
  return currentSession && currentSession.user && currentSession.user.id ? currentSession.user.id : null;
}

function setSession(session) {
  const previousUserId = getCurrentUserId();
  const nextUserId = session && session.user && session.user.id ? session.user.id : null;

  currentSession = session;

  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }

  if (previousUserId !== nextUserId) resetMedicationUI();
}

function clearSession() {
  setSession(null);
}

function isSessionExpired(session) {
  if (!session || !session.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= session.expires_at - 30;
}

function buildSessionRecord(payload, fallbackUser = null) {
  if (!payload || typeof payload !== "object") return null;

  const user = payload.user || fallbackUser || null;
  if (!payload.access_token || !payload.refresh_token || !user || !user.id) return null;

  const expiresAt = Number(payload.expires_at);
  const expiresIn = Number(payload.expires_in);
  const resolvedExpiresAt = Number.isFinite(expiresAt)
    ? expiresAt
    : Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600);

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: resolvedExpiresAt,
    user,
  };
}

function extractSessionFromAuthResponse(payload) {
  const directSession = buildSessionRecord(payload);
  if (directSession) return directSession;

  if (payload && typeof payload === "object" && payload.session) {
    return buildSessionRecord(payload.session, payload.user || payload.session.user || null);
  }

  return null;
}

function createUserScopedParams(params = {}) {
  return new URLSearchParams({
    ...params,
    user_id: `eq.${getCurrentUserId()}`,
  });
}

function withCurrentUserId(row) {
  return {
    ...row,
    user_id: getCurrentUserId(),
  };
}

function translateAuthError(message) {
  const detail = String(message || "").toLowerCase();
  if (detail.includes("invalid login credentials")) return "Email o clave incorrectos.";
  if (detail.includes("email not confirmed")) return "Confirma tu email antes de iniciar sesion.";
  if (detail.includes("user already registered")) return "Ya existe una cuenta con ese email.";
  if (detail.includes("signup is disabled")) return "El registro esta desactivado en Supabase Auth.";
  if (detail.includes("password should be at least")) {
    return `La clave debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (detail.includes("rate limit")) return "Has llegado al limite temporal de intentos o emails.";
  return message || "Se produjo un error de autenticacion.";
}

function translateDataError(message) {
  const detail = String(message || "").toLowerCase();
  if (detail.includes("row-level security") || detail.includes("permission denied")) {
    return "Permisos de Supabase bloqueados. Ejecuta supabase_rls_repair.sql en el SQL Editor.";
  }
  return message || "Se produjo un error de datos.";
}

function formatApiError(error) {
  if (!error) return "error desconocido";

  const parts = [];
  if (error.status) parts.push(`HTTP ${error.status}`);
  if (error.code) parts.push(`code ${error.code}`);
  if (error.message) parts.push(error.message);
  if (error.details) parts.push(`details: ${error.details}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);

  return parts.length > 0 ? parts.join(" | ") : String(error);
}

function resetAuthValidation() {
  emailInput.setCustomValidity("");
  passwordInput.setCustomValidity("");
  if (confirmPasswordInput) confirmPasswordInput.setCustomValidity("");
}

function reportAuthFieldError(input, message) {
  input.setCustomValidity(message);
  input.reportValidity();
  input.focus();
  return null;
}

function validateAuthForm(mode) {
  resetAuthValidation();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const passwordConfirmation = confirmPasswordInput ? confirmPasswordInput.value : "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) return reportAuthFieldError(emailInput, "Introduce un email.");
  if (!emailPattern.test(email)) return reportAuthFieldError(emailInput, "Introduce un email valido.");
  if (!password) return reportAuthFieldError(passwordInput, "Introduce una clave.");

  if (mode === "register" && password.length < PASSWORD_MIN_LENGTH) {
    return reportAuthFieldError(
      passwordInput,
      `La clave debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
    );
  }

  if (mode === "register" && !passwordConfirmation) {
    return reportAuthFieldError(confirmPasswordInput, "Confirma la clave.");
  }

  if (mode === "register" && password !== passwordConfirmation) {
    return reportAuthFieldError(confirmPasswordInput, "Las claves no coinciden.");
  }

  return {
    email,
    password,
    passwordConfirmation,
  };
}

function resetAuthForm({ keepEmail = false } = {}) {
  resetAuthValidation();
  if (!keepEmail) emailInput.value = "";
  passwordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  const isRegister = authMode === "register";

  if (authTitle) authTitle.textContent = isRegister ? "Crear cuenta" : "Acceso";
  if (authSubtitle) {
    authSubtitle.textContent = isRegister
      ? "Crea una cuenta para empezar a guardar datos por usuario."
      : "Inicia sesion para ver y guardar tus datos.";
  }
  if (authModeHint) {
    authModeHint.textContent = isRegister
      ? "Si tu proyecto exige confirmacion por email, te guiaremos en ese flujo al terminar el alta."
      : "Usa tu cuenta existente para seguir trabajando con tus datos.";
  }
  if (confirmPasswordField) confirmPasswordField.classList.toggle("hidden", !isRegister);
  if (authModeLoginBtn) {
    authModeLoginBtn.classList.toggle("is-active", !isRegister);
    authModeLoginBtn.setAttribute("aria-pressed", String(!isRegister));
  }
  if (authModeRegisterBtn) {
    authModeRegisterBtn.classList.toggle("is-active", isRegister);
    authModeRegisterBtn.setAttribute("aria-pressed", String(isRegister));
  }

  passwordInput.setAttribute("autocomplete", isRegister ? "new-password" : "current-password");
  if (loginBtn) loginBtn.textContent = isRegister ? "Crear cuenta" : "Entrar";
  resetAuthValidation();
}

function buildAuthRedirectMessage(flowType) {
  if (flowType === "signup" || flowType === "email") return "Email confirmado y sesion iniciada.";
  return "Sesion iniciada.";
}

function clearAuthRedirectHash() {
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

async function fetchUserForAccessToken(accessToken) {
  return apiFetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function handleAuthRedirectResult() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const errorDescription = params.get("error_description") || params.get("error");
  const flowType = params.get("type") || "";

  if (!accessToken && !refreshToken && !errorDescription) return false;

  clearAuthRedirectHash();

  if (errorDescription) {
    setStatus("No se pudo completar la autenticacion por email.");
    setMessage(translateAuthError(errorDescription));
    return true;
  }

  try {
    const user = await fetchUserForAccessToken(accessToken);
    const session = buildSessionRecord(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: params.get("expires_at"),
        expires_in: params.get("expires_in"),
        user,
      },
      user
    );

    if (!session) throw new Error("No se pudo recuperar la sesion desde el enlace de autenticacion.");

    setSession(session);
    setAuthMode("login");
    setAuthenticatedUI(true);
    setActiveTab(loadPreferredTab());
    await refreshAllData();
    setMessage(buildAuthRedirectMessage(flowType));
  } catch (error) {
    clearSession();
    setAuthenticatedUI(false);
    setStatus("No se pudo recuperar la sesion del enlace.");
    setMessage(translateAuthError(error.message));
  }

  return true;
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

  if (mainTabs) {
    const tabButtons = mainTabs.querySelectorAll("button[data-tab-target]");
    for (const button of tabButtons) {
      const isTarget = button.dataset.tabTarget === targetId;
      button.classList.toggle("is-active", isTarget);
    }
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
    const error = new Error(detail);
    error.status = response.status;
    error.code = body.code || body.error || "";
    error.details = body.details || "";
    error.hint = body.hint || "";
    throw error;
  }

  return body;
}

async function apiFetchAllRows(url, options = {}, pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("limit", String(pageSize));
    pageUrl.searchParams.set("offset", String(offset));

    const page = await apiFetch(pageUrl.toString(), options);
    if (!Array.isArray(page)) throw new Error("La respuesta paginada no contiene una lista.");

    rows.push(...page);
    if (page.length < pageSize) return rows;

    offset += page.length;
  }
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

    const session = extractSessionFromAuthResponse(refreshed);
    if (!session) throw new Error("No se pudo refrescar la sesion.");
    setSession(session);
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

function renderHabitTable(habits, selectedStatusByHabit, statusByHabitDate, yesCountByHabit, date) {
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
      const habitId = Number(habit.id);
      const status = selectedStatusByHabit.has(habitId) ? selectedStatusByHabit.get(habitId) : null;

      if (status === 1) yesCount += 1;
      if (status === 0) noCount += 1;
      if (status === null) pendingCount += 1;

      const yesActive = status === 1 ? "is-active" : "";
      const noActive = status === 0 ? "is-active" : "";

      const createdDate = (habit.created_at || "").slice(0, 10);
      const totalDays = createdDate ? inclusiveDayDistance(createdDate, date) : 0;
      const yesDays = yesCountByHabit.get(habitId) || 0;
      const percentage = totalDays > 0 ? Math.round((yesDays / totalDays) * 100) : 0;
      const progressLabel =
        totalDays > 0 ? `${yesDays}/${totalDays} dias · ${percentage}%` : "No existia en esta fecha";

      const perDayStatus = statusByHabitDate.get(habitId) || new Map();
      const streakDots = [];
      for (let offset = 6; offset >= 0; offset -= 1) {
        const day = addDaysToDateString(date, -offset);
        const dayStatus = perDayStatus.has(day) ? Number(perDayStatus.get(day)) : null;
        const dotClass = dayStatus === 1 ? "yes" : dayStatus === 0 ? "no" : "pending";
        const dotLabel = dayStatus === 1 ? "Si" : dayStatus === 0 ? "No" : "Pendiente";
        streakDots.push(
          `<span class="streak-dot ${dotClass}" title="${day}: ${dotLabel}" aria-label="${day}: ${dotLabel}"></span>`
        );
      }

      const description = habit.description
        ? `<div class="habit-description hidden" data-description-for="${habitId}">${escapeHtml(
            habit.description
          )}</div>`
        : "";
      const nameContent = habit.description
        ? `<button type="button" class="habit-name habit-name-toggle" data-toggle-description="${habitId}" aria-expanded="false">${escapeHtml(
            habit.name
          )}</button>`
        : `<div class="habit-name">${escapeHtml(habit.name)}</div>`;

      return `
        <tr>
          <td>
            ${nameContent}
            <div class="habit-metrics">${progressLabel}</div>
            <div class="habit-streak" aria-hidden="true">${streakDots.join("")}</div>
            ${description}
          </td>
          <td>
            <div class="habit-checks">
              <button type="button" class="habit-btn yes ${yesActive}" data-habit-id="${habit.id}" data-status="1">Si</button>
              <button type="button" class="habit-btn no ${noActive}" data-habit-id="${habit.id}" data-status="0">No</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  habitsTable.innerHTML = rows;
  bindRenderedHabitActions();
  habitCounter.textContent = `${habits.length} habito${habits.length === 1 ? "" : "s"}`;
  habitSummary.textContent = `${date}: ${yesCount} si, ${noCount} no, ${pendingCount} pendientes.`;
}

function bindRenderedHabitActions() {
  const descriptionButtons = habitsTable.querySelectorAll("button[data-toggle-description]");
  for (const button of descriptionButtons) {
    button.addEventListener("click", () => {
      const habitId = button.dataset.toggleDescription;
      const description = habitsTable.querySelector(`[data-description-for="${habitId}"]`);
      if (!description) return;

      const nextHidden = !description.classList.contains("hidden");
      description.classList.toggle("hidden", nextHidden);
      button.setAttribute("aria-expanded", String(!nextHidden));
    });
  }

  const statusButtons = habitsTable.querySelectorAll("button[data-habit-id][data-status]");
  for (const button of statusButtons) {
    button.addEventListener("click", async () => {
      const rowButtons = button.closest(".habit-checks")?.querySelectorAll(".habit-btn") || [];
      for (const rowButton of rowButtons) rowButton.disabled = true;

      try {
        await upsertHabitStatus(button.dataset.habitId, button.dataset.status);
      } finally {
        for (const rowButton of rowButtons) rowButton.disabled = false;
      }
    });
  }
}

function resetMedicationUI() {
  medicationCache = {
    treatments: [],
    byId: new Map(),
  };
  medActiveBadge.textContent = "0 activos";
  medHistoryBadge.textContent = "0 periodos";
  medActiveList.innerHTML = '<div class="empty-message">No hay tratamientos activos.</div>';
  medHistoryList.innerHTML = '<div class="empty-message">Aun no hay tratamientos finalizados o suspendidos.</div>';
  tabStatusState = {
    ...tabStatusState,
    activeMedications: 0,
  };
  renderTabStatus();
}

function medicationStatusLabel(status) {
  if (status === "finished") return "Finalizado";
  if (status === "suspended") return "Suspendido";
  return "Activo";
}

function isTreatmentActive(treatment, today = todayLocalDateString()) {
  return treatment.status === "active" && (!treatment.end_date || treatment.end_date >= today);
}

function treatmentDuration(treatment) {
  const end = treatment.end_date || todayLocalDateString();
  const days = inclusiveDayDistance(treatment.start_date, end);
  if (days <= 0) return "-";
  return `${days} dia${days === 1 ? "" : "s"}`;
}

function treatmentCard(treatment, historical = false) {
  const status = medicationStatusLabel(treatment.status);
  const suspension = treatment.status === "suspended" && treatment.suspension_reason
    ? `<div class="med-detail"><b>Motivo de suspension:</b> ${escapeHtml(treatment.suspension_reason)}</div>`
    : "";
  const reason = treatment.reason
    ? `<div class="med-detail"><b>Motivo:</b> ${escapeHtml(treatment.reason)}</div>`
    : "";
  const actions = historical
    ? `<button class="ghost" type="button" data-med-action="edit" data-med-id="${treatment.id}">Editar</button>
       <button class="secondary" type="button" data-med-action="reactivate" data-med-id="${treatment.id}">Reactivar</button>
       <button class="danger" type="button" data-med-action="delete" data-med-id="${treatment.id}">Eliminar</button>`
    : `<button class="ghost" type="button" data-med-action="edit" data-med-id="${treatment.id}">Editar</button>
       <button class="secondary" type="button" data-med-action="finish" data-med-id="${treatment.id}">Finalizar</button>
       <button class="secondary" type="button" data-med-action="suspend" data-med-id="${treatment.id}">Suspender</button>
       <button class="danger" type="button" data-med-action="delete" data-med-id="${treatment.id}">Eliminar</button>`;

  return `<article class="med-item">
    <div class="med-item-main">
      <div><div class="med-name">${escapeHtml(treatment.name)}</div>
      ${treatment.active_ingredient ? `<div class="med-meta">${escapeHtml(treatment.active_ingredient)}</div>` : ""}</div>
      <span class="med-status med-status-${treatment.status}">${status}</span>
    </div>
    <div class="med-summary-grid">
      <div><b>Dosis</b><span>${escapeHtml(treatment.dose || "-")}</span></div>
      <div><b>Frecuencia</b><span>${escapeHtml(treatment.frequency || "-")}</span></div>
      <div><b>Inicio</b><span>${formatDateOnly(treatment.start_date)}</span></div>
      ${historical ? `<div><b>Fin</b><span>${formatDateOnly(treatment.end_date)}</span></div><div><b>Duracion</b><span>${treatmentDuration(treatment)}</span></div>` : ""}
    </div>
    ${reason}${suspension}
    <div class="med-actions">${actions}</div>
  </article>`;
}

function renderTreatments(treatments) {
  const active = treatments.filter((item) => isTreatmentActive(item));
  const historical = treatments
    .filter((item) => !isTreatmentActive(item))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  medActiveBadge.textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
  medHistoryBadge.textContent = `${historical.length} periodo${historical.length === 1 ? "" : "s"}`;
  medActiveList.innerHTML = active.length
    ? active.map((item) => treatmentCard(item, false)).join("")
    : '<div class="empty-message">No hay tratamientos activos.</div>';
  medHistoryList.innerHTML = historical.length
    ? historical.map((item) => treatmentCard(item, true)).join("")
    : '<div class="empty-message">Aun no hay tratamientos finalizados o suspendidos.</div>';
}

function resetReportsUI() {
  reportsCache = [];
  selectedReportId = null;
  if (reportsList) {
    reportsList.innerHTML = '<div class="empty-message">Aun no hay informes generados.</div>';
  }
  if (reportDetail) {
    reportDetail.innerHTML = '<div class="empty-message">Selecciona un informe para ver el detalle.</div>';
  }
}

function reportSummaryWithoutMedication(summary) {
  return String(summary || "Sin resumen.")
    .split("\n")
    .filter((line) => !/^Medicacion:/i.test(line.trim()))
    .join("\n");
}

function renderReportDetail(report) {
  if (!reportDetail) return;
  if (!report) {
    reportDetail.innerHTML = '<div class="empty-message">Selecciona un informe para ver el detalle.</div>';
    return;
  }

  const payload = report.payload_json && typeof report.payload_json === "object" ? report.payload_json : {};
  const week = payload.week || {};
  const allTime = payload.all_time || {};
  const weekHabits = week.habits || {};
  const weekWeight = week.weight || {};
  const allHabits = allTime.habits || {};
  const allWeight = allTime.weight || {};

  const weightWeekMean = weekWeight.mean_weight == null ? "-" : `${Number(weekWeight.mean_weight).toFixed(1)} kg`;
  const weightAllMean =
    allWeight.mean_weight_all_time == null ? "-" : `${Number(allWeight.mean_weight_all_time).toFixed(1)} kg`;
  const weightDelta =
    weekWeight.week_change_mean == null ? "-" : `${Number(weekWeight.week_change_mean).toFixed(1)} kg`;
  const changeSinceStart =
    allWeight.change_since_start == null ? "-" : `${Number(allWeight.change_since_start).toFixed(1)} kg`;

  reportDetail.innerHTML = `
    <p class="report-summary">${escapeHtml(reportSummaryWithoutMedication(report.summary_text))}</p>
    <div class="report-blocks">
      <article class="report-block">
        <div class="report-block-title">Habitos</div>
        <div class="report-kv">
          Semana: <b>${percentageLabel(weekHabits.global_rate)}</b> (${Number(weekHabits.total_done || 0)}/${Number(
            weekHabits.total_target || 0
          )})<br>
          Delta vs previa: <b>${
            weekHabits.delta_rate == null ? "-" : `${Math.round(Number(weekHabits.delta_rate) * 100)}%`
          }</b><br>
          Historico: <b>${percentageLabel(allHabits.global_rate)}</b>
        </div>
      </article>
      <article class="report-block">
        <div class="report-block-title">Peso</div>
        <div class="report-kv">
          Media semana: <b>${weightWeekMean}</b><br>
          Registros semana: <b>${Number(weekWeight.n_measurements || 0)}</b><br>
          Cambio media: <b>${weightDelta}</b><br>
          Media historica: <b>${weightAllMean}</b><br>
          Cambio desde inicio: <b>${changeSinceStart}</b>
        </div>
      </article>
    </div>
  `;
}

function renderReportsList() {
  if (!reportsList) return;

  if (reportsCache.length === 0) {
    reportsList.innerHTML = '<div class="empty-message">Aun no hay informes generados.</div>';
    renderReportDetail(null);
    return;
  }

  reportsList.innerHTML = reportsCache
    .map((report) => {
      const activeClass = Number(report.id) === Number(selectedReportId) ? "is-active" : "";
      const label = formatWeekLabel(report.week_start, report.week_end);
      const generated = report.generated_at ? formatDate(report.generated_at) : "-";
      return `
        <button type="button" class="report-item ${activeClass}" data-report-id="${report.id}">
          <div class="report-title">${escapeHtml(label)}</div>
          <div class="report-preview">${escapeHtml(reportSummaryWithoutMedication(report.summary_text))}</div>
          <div class="report-meta">Generado: ${generated}</div>
        </button>
      `;
    })
    .join("");

  const selected = reportsCache.find((report) => Number(report.id) === Number(selectedReportId)) || reportsCache[0];
  selectedReportId = selected ? Number(selected.id) : null;
  renderReportDetail(selected || null);
}

async function fetchWeeklyReports() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "id,generated_at,week_start,week_end,payload_json,summary_text,created_at",
    order: "week_start.desc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/weekly_reports?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function refreshReports() {
  const reports = await fetchWeeklyReports();
  reportsCache = reports;
  if (!reportsCache.some((report) => Number(report.id) === Number(selectedReportId))) {
    selectedReportId = reportsCache.length > 0 ? Number(reportsCache[0].id) : null;
  }
  renderReportsList();
}

function setAuthenticatedUI(isAuthenticated, options = {}) {
  const shouldResetAuthForm = options.resetAuthForm !== false;
  loginCard.classList.toggle("hidden", isAuthenticated);
  zonaPrivada.classList.toggle("hidden", !isAuthenticated);
  if (mainTabs) mainTabs.classList.toggle("hidden", !isAuthenticated);
  if (headerMenu) headerMenu.classList.toggle("hidden", !isAuthenticated);
  closeHeaderMenu();

  if (isAuthenticated) {
    setStatus("");
    renderTabStatus();
    return;
  }

  setStatus("Inicia sesion para usar la app.");
  resetTabStatus();
  renderWeightTable([]);
  renderHabitTable([], new Map(), new Map(), new Map(), getSelectedHabitDate());
  resetMedicationUI();
  resetReportsUI();
  if (shouldResetAuthForm) resetAuthForm();
  setActiveTab("todayPanel");
}

async function fetchWeightRecords() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "id,ts,weight",
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

  const params = createUserScopedParams({
    select: "id,name,description,is_active,created_at",
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

async function fetchAllHabits() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "id,name,description,is_active,created_at",
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

async function fetchHabitChecksUntil(logDate) {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "habit_id,status,log_date",
    log_date: `lte.${logDate}`,
    order: "log_date.asc,habit_id.asc,id.asc",
  });

  return apiFetchAllRows(`${SUPABASE_URL}/rest/v1/habit_checks?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function fetchHabitChecksAll() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "habit_id,status,log_date",
    order: "log_date.asc,habit_id.asc,id.asc",
  });

  return apiFetchAllRows(`${SUPABASE_URL}/rest/v1/habit_checks?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function fetchPrescribedMedications() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = createUserScopedParams({
    select: "id,name,active_ingredient,dose,frequency,start_date,end_date,status,reason,prescriber,instructions,notes,suspension_reason,created_at,updated_at",
    order: "start_date.desc,id.desc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/prescribed_medications?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function refreshMedications() {
  const treatments = await fetchPrescribedMedications();
  const activeCount = treatments.filter((item) => isTreatmentActive(item)).length;
  medicationCache = {
    treatments,
    byId: new Map(treatments.map((item) => [Number(item.id), item])),
  };
  renderTreatments(treatments);
  tabStatusState = {
    ...tabStatusState,
    activeMedications: activeCount,
  };
  renderTabStatus();
}

function updateMedicationFormVisibility() {
  medSuspensionReasonField.classList.toggle("hidden", medStatus.value !== "suspended");
}

function showMedicationForm(treatment = null) {
  medTreatmentForm.reset();
  medEditId.value = treatment ? treatment.id : "";
  medFormTitle.textContent = treatment ? "Editar tratamiento" : "Nuevo tratamiento";
  medName.value = treatment?.name || "";
  medActiveIngredient.value = treatment?.active_ingredient || "";
  medDose.value = treatment?.dose || "";
  medFrequency.value = treatment?.frequency || "";
  medStartDate.value = treatment?.start_date || todayLocalDateString();
  medEndDate.value = treatment?.end_date || "";
  medStatus.value = treatment?.status || "active";
  medReason.value = treatment?.reason || "";
  medPrescriber.value = treatment?.prescriber || "";
  medSuspensionReason.value = treatment?.suspension_reason || "";
  medInstructions.value = treatment?.instructions || "";
  medNotes.value = treatment?.notes || "";
  medFormError.textContent = "";
  updateMedicationFormVisibility();
  medFormCard.classList.remove("hidden");
  medFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideMedicationForm() {
  medFormCard.classList.add("hidden");
  medFormError.textContent = "";
}

function nullableInput(input) {
  const value = input.value.trim();
  return value || null;
}

function medicationFormPayload() {
  const payload = {
    name: medName.value.trim(),
    active_ingredient: nullableInput(medActiveIngredient),
    dose: nullableInput(medDose),
    frequency: nullableInput(medFrequency),
    start_date: medStartDate.value,
    end_date: medEndDate.value || null,
    status: medStatus.value,
    reason: nullableInput(medReason),
    prescriber: nullableInput(medPrescriber),
    instructions: nullableInput(medInstructions),
    notes: nullableInput(medNotes),
    suspension_reason: medStatus.value === "suspended" ? nullableInput(medSuspensionReason) : null,
  };
  if (!payload.name) throw new Error("El nombre del medicamento es obligatorio.");
  if (!payload.start_date) throw new Error("La fecha de inicio es obligatoria.");
  if (payload.end_date && payload.end_date < payload.start_date) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }
  if ((payload.status === "finished" || payload.status === "suspended") && !payload.end_date) {
    throw new Error("Los tratamientos finalizados o suspendidos necesitan fecha de fin.");
  }
  return payload;
}

async function handleSaveMedication(event) {
  event.preventDefault();
  const ok = await ensureAuthenticated("Inicia sesion para guardar tratamientos.");
  if (!ok) return;
  medFormSubmit.disabled = true;
  try {
    const payload = medicationFormPayload();
    const id = medEditId.value;
    const endpoint = id
      ? `${SUPABASE_URL}/rest/v1/prescribed_medications?${createUserScopedParams({ id: `eq.${id}` }).toString()}`
      : `${SUPABASE_URL}/rest/v1/prescribed_medications`;
    await apiFetch(endpoint, {
      method: id ? "PATCH" : "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(id ? payload : [withCurrentUserId(payload)]),
    });
    hideMedicationForm();
    await refreshMedications();
    setMessage(id ? "Tratamiento actualizado." : "Tratamiento creado.");
  } catch (error) {
    medFormError.textContent = error.message;
  } finally {
    medFormSubmit.disabled = false;
  }
}

async function patchMedication(id, changes, successMessage) {
  const params = createUserScopedParams({ id: `eq.${id}` });
  await apiFetch(`${SUPABASE_URL}/rest/v1/prescribed_medications?${params.toString()}`, {
    method: "PATCH",
    headers: authHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(changes),
  });
  await refreshMedications();
  setMessage(successMessage);
}

async function handleMedicationAction(action, id) {
  const treatment = medicationCache.byId.get(Number(id));
  if (!treatment) return;
  if (action === "edit") return showMedicationForm(treatment);
  const ok = await ensureAuthenticated("Inicia sesion para modificar tratamientos.");
  if (!ok) return;
  if (action === "delete") {
    if (!confirm(`¿Eliminar el periodo de ${treatment.name}? Esta accion no se puede deshacer.`)) return;
    const params = createUserScopedParams({ id: `eq.${id}` });
    await apiFetch(`${SUPABASE_URL}/rest/v1/prescribed_medications?${params.toString()}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await refreshMedications();
    setMessage("Tratamiento eliminado.");
    return;
  }
  if (action === "reactivate") {
    await patchMedication(id, { status: "active", end_date: null, suspension_reason: null }, "Tratamiento reactivado.");
    return;
  }
  const endDate = prompt("Fecha de fin (AAAA-MM-DD)", todayLocalDateString());
  if (endDate == null) return;
  if (!isValidDateOnly(endDate) || endDate < treatment.start_date) {
    setMessage("Introduce una fecha valida que no sea anterior al inicio.");
    return;
  }
  if (action === "finish") {
    await patchMedication(id, { status: "finished", end_date: endDate, suspension_reason: null }, "Tratamiento finalizado.");
  } else if (action === "suspend") {
    const reason = prompt("Motivo de suspension (opcional)", treatment.suspension_reason || "");
    if (reason == null) return;
    await patchMedication(id, { status: "suspended", end_date: endDate, suspension_reason: reason.trim() || null }, "Tratamiento suspendido.");
  }
}

async function refreshWeights() {
  const weights = await fetchWeightRecords();
  renderWeightTable(weights);
}

async function refreshHabits() {
  const logDate = getSelectedHabitDate();
  const today = todayLocalDateString();
  const fetchUntilDate = logDate > today ? logDate : today;
  const [habits, checksUntilDate] = await Promise.all([fetchHabits(), fetchHabitChecksUntil(fetchUntilDate)]);

  const selectedStatusByHabit = new Map();
  const statusByHabitDate = new Map();
  const yesCountByHabit = new Map();

  for (const check of checksUntilDate) {
    const habitId = Number(check.habit_id);
    const status = Number(check.status);
    const day = check.log_date;

    if (!statusByHabitDate.has(habitId)) statusByHabitDate.set(habitId, new Map());
    statusByHabitDate.get(habitId).set(day, status);

    if (day === logDate) {
      selectedStatusByHabit.set(habitId, status);
    }

    if (status === 1) {
      yesCountByHabit.set(habitId, (yesCountByHabit.get(habitId) || 0) + 1);
    }
  }

  renderHabitTable(habits, selectedStatusByHabit, statusByHabitDate, yesCountByHabit, logDate);

  const activeHabitsToday = habits.filter((habit) => {
    const createdDate = (habit.created_at || "").slice(0, 10);
    return !createdDate || createdDate <= today;
  });

  let habitsDoneToday = 0;
  for (const habit of activeHabitsToday) {
    const habitStatuses = statusByHabitDate.get(Number(habit.id));
    if (!habitStatuses) continue;
    if (Number(habitStatuses.get(today)) === 1) habitsDoneToday += 1;
  }

  tabStatusState = {
    ...tabStatusState,
    habitsDone: habitsDoneToday,
    habitsTotal: activeHabitsToday.length,
  };
  renderTabStatus();
}

async function refreshAllData() {
  const [weightsResult, habitsResult, medicationResult, reportsResult] = await Promise.allSettled([
    refreshWeights(),
    refreshHabits(),
    refreshMedications(),
    refreshReports(),
  ]);

  if (weightsResult.status === "rejected") {
    const detail = weightsResult.reason.message || "error desconocido";
    const missingTable = detail.includes('relation "weights" does not exist');
    if (missingTable) {
      setStatus("Falta crear tablas de peso en Supabase. Ejecuta supabase_weights.sql.");
      renderWeightTable([]);
    } else {
      setStatus(`Error en peso: ${detail}`);
    }
  }

  if (habitsResult.status === "rejected") {
    const detail = habitsResult.reason.message || "error desconocido";
    tabStatusState = {
      ...tabStatusState,
      habitsDone: 0,
      habitsTotal: 0,
    };
    renderTabStatus();
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

  if (medicationResult.status === "rejected") {
    const detail = medicationResult.reason.message || "error desconocido";
    const missingTables = detail.includes('relation "prescribed_medications" does not exist');

    if (missingTables) {
      setStatus("Falta crear la tabla de tratamientos. Ejecuta supabase_prescribed_medications.sql en Supabase.");
      resetMedicationUI();
    } else {
      setStatus(`Error en medicaciones: ${detail}`);
    }
  }

  if (reportsResult.status === "rejected") {
    const detail = reportsResult.reason.message || "error desconocido";
    const missingTable = detail.includes('relation "weekly_reports" does not exist');

    if (missingTable) {
      setStatus("Falta crear tablas de informes en Supabase. Ejecuta supabase_weekly_reports.sql.");
      resetReportsUI();
    } else {
      setStatus(`Error en informes: ${detail}`);
    }
  }

  if (
    weightsResult.status === "fulfilled" &&
    habitsResult.status === "fulfilled" &&
    medicationResult.status === "fulfilled" &&
    reportsResult.status === "fulfilled"
  ) {
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

function escapeCSVCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function handleLogin() {
  const credentials = validateAuthForm("login");
  if (!credentials) return;
  const { email, password } = credentials;

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

    const session = extractSessionFromAuthResponse(data);
    if (!session) throw new Error("La respuesta de login no incluye una sesion valida.");

    setSession(session);
    setAuthMode("login");
    setAuthenticatedUI(true);
    setActiveTab(loadPreferredTab());
    await refreshAllData();
    setMessage("Sesion iniciada.");
  } catch (error) {
    setStatus("No se pudo iniciar sesion.");
    setMessage(translateAuthError(error.message));
  } finally {
    loginBtn.disabled = false;
  }
}

function isSignupConfirmationPending(response) {
  const user = response && typeof response === "object" ? response.user || response : null;
  if (!user || typeof user !== "object") return false;
  if (Array.isArray(user.identities) && user.identities.length === 0) return true;
  return !(user.confirmed_at || user.email_confirmed_at);
}

async function handleRegister() {
  const credentials = validateAuthForm("register");
  if (!credentials) return;
  const { email, password } = credentials;

  loginBtn.disabled = true;
  setStatus("Creando cuenta...");

  try {
    const response = await apiFetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const session = extractSessionFromAuthResponse(response);
    if (session) {
      setSession(session);
      setAuthMode("login");
      setAuthenticatedUI(true);
      setActiveTab(loadPreferredTab());
      await refreshAllData();
      setMessage("Cuenta creada y sesion iniciada.");
      return;
    }

    if (isSignupConfirmationPending(response)) {
      setAuthMode("login");
      resetAuthForm({ keepEmail: true });
      setAuthenticatedUI(false, { resetAuthForm: false });
      setStatus("Revisa tu email para confirmar la cuenta.");
      setMessage("Cuenta creada. Cuando confirmes el email, volveras aqui con la sesion iniciada.");
      return;
    }

    await handleLogin();
  } catch (error) {
    setStatus("No se pudo completar el registro.");
    setMessage(translateAuthError(error.message));
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
  setAuthMode("login");
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
        withCurrentUserId({
          ts: nowISO(),
          weight: Number(value.toFixed(1)),
        }),
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

  const params = createUserScopedParams({
    id: `eq.${id}`,
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

async function handleExportHabits() {
  const ok = await ensureAuthenticated("Inicia sesion para exportar.");
  if (!ok) return;

  try {
    const [habits, checks] = await Promise.all([fetchAllHabits(), fetchHabitChecksAll()]);
    if (checks.length === 0) {
      setMessage("No hay registros de habitos para exportar.");
      return;
    }

    const habitsById = new Map(habits.map((habit) => [Number(habit.id), habit]));
    const rows = checks.map((check) => {
      const habit = habitsById.get(Number(check.habit_id));
      return [
        check.log_date,
        habit ? habit.name : `Habito ${check.habit_id}`,
        Number(check.status) === 1 ? "yes" : "no",
        habit ? habit.description : "",
      ]
        .map(escapeCSVCell)
        .join(",");
    });
    const csv = ["date,habit,status,description", ...rows].join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitos-${todayLocalDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("CSV de habitos exportado.");
  } catch (error) {
    setMessage(`No se pudieron exportar los habitos: ${error.message}`);
  }
}

async function handleExportAllData() {
  const ok = await ensureAuthenticated("Inicia sesion para exportar datos.");
  if (!ok) return;

  try {
    const [weights, habits, habitChecks, prescribedMedications] = await Promise.all([
      fetchWeightRecords(),
      fetchHabits(),
      fetchHabitChecksAll(),
      fetchPrescribedMedications(),
    ]);

    const payload = {
      exported_at: nowISO(),
      user_id: getCurrentUserId(),
      weights,
      habits,
      habit_checks: habitChecks,
      prescribed_medications: prescribedMedications,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro-personal-${todayLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Datos exportados.");
  } catch (error) {
    setMessage(`No se pudo exportar datos: ${error.message}`);
  }
}

async function handleGenerateWeeklyReportNow(force = false) {
  const ok = await ensureAuthenticated("Inicia sesion para generar informes.");
  if (!ok) return;

  if (reportGenerateNow) reportGenerateNow.disabled = true;
  try {
    const result = await apiFetch(`${SUPABASE_URL}/rest/v1/rpc/generate_weekly_report_now`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({ p_force: !!force }),
    });

    const payload = Array.isArray(result) ? result[0] : result;
    await refreshReports();
    setActiveTab("reportsPanel");

    if (payload && payload.generated_new === false) {
      setMessage("El informe de esa semana ya existia. Se mostro el existente.");
    } else {
      setMessage("Informe semanal generado.");
    }
  } catch (error) {
    setMessage(`No se pudo generar el informe: ${error.message}`);
  } finally {
    if (reportGenerateNow) reportGenerateNow.disabled = false;
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
      user_id: getCurrentUserId(),
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

  const params = createUserScopedParams();

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
        withCurrentUserId({
          name,
          description: description || null,
          is_active: true,
        }),
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
  const row = withCurrentUserId({
    habit_id: Number(habitId),
    log_date: logDate,
    status: Number(status),
  });

  try {
    await apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?on_conflict=user_id,habit_id,log_date`, {
      method: "POST",
      headers: authHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([row]),
    });

    await refreshHabits();
    setMessage("Seguimiento guardado.");
  } catch (error) {
    try {
      await saveHabitStatusWithoutUpsert(row);
      await refreshHabits();
      setMessage("Seguimiento guardado.");
    } catch (fallbackError) {
      const readableError = translateDataError(fallbackError.message || error.message);
      setMessage(
        `No se pudo guardar el seguimiento: ${readableError}. Diagnostico: upsert=${formatApiError(
          error
        )}; fallback=${formatApiError(fallbackError)}`
      );
    }
  }
}

async function saveHabitStatusWithoutUpsert(row) {
  const params = createUserScopedParams({
    select: "id",
    habit_id: `eq.${row.habit_id}`,
    log_date: `eq.${row.log_date}`,
    order: "created_at.desc",
    limit: "1",
  });

  const existing = await apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });

  const existingId = existing && existing[0] ? existing[0].id : null;

  if (existingId) {
    await apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?id=eq.${existingId}`, {
      method: "PATCH",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ status: row.status }),
    });
    return;
  }

  await apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks`, {
    method: "POST",
    headers: authHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([row]),
  });
}

function bindEvents() {
  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authMode === "register") {
        await handleRegister();
        return;
      }
      await handleLogin();
    });
  }

  if (authModeLoginBtn) {
    authModeLoginBtn.addEventListener("click", () => {
      setAuthMode("login");
    });
  }

  if (authModeRegisterBtn) {
    authModeRegisterBtn.addEventListener("click", () => {
      setAuthMode("register");
    });
  }

  emailInput.addEventListener("input", () => {
    resetAuthValidation();
  });

  passwordInput.addEventListener("input", () => {
    resetAuthValidation();
  });

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => {
      resetAuthValidation();
    });
  }

  if (mainTabs) {
    mainTabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tab-target]");
      if (!button) return;
      setActiveTab(button.dataset.tabTarget);
    });
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setHeaderMenuOpen(!isHeaderMenuOpen);
    });
  }

  if (headerMenuPanel) {
    headerMenuPanel.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("button[data-menu-action]");
      if (!actionButton) return;

      closeHeaderMenu();
      const action = actionButton.dataset.menuAction;

      if (action === "logout") {
        await handleLogout();
        return;
      }
      if (action === "export") {
        await handleExportAllData();
        return;
      }
      if (action === "settings") {
        setMessage("Configuracion disponible proximamente.");
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!isHeaderMenuOpen || !headerMenu) return;
    if (headerMenu.contains(event.target)) return;
    closeHeaderMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHeaderMenu();
  });

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

  exportHabitsBtn.addEventListener("click", async () => {
    await handleExportHabits();
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

  medNewTreatment.addEventListener("click", () => showMedicationForm());
  medFormCancel.addEventListener("click", hideMedicationForm);
  medStatus.addEventListener("change", updateMedicationFormVisibility);
  medTreatmentForm.addEventListener("submit", handleSaveMedication);

  const medicationActionHandler = async (event) => {
    const button = event.target.closest("button[data-med-action][data-med-id]");
    if (!button) return;
    try {
      await handleMedicationAction(button.dataset.medAction, button.dataset.medId);
    } catch (error) {
      setMessage(`No se pudo modificar el tratamiento: ${error.message}`);
    }
  };
  medActiveList.addEventListener("click", medicationActionHandler);
  medHistoryList.addEventListener("click", medicationActionHandler);

  if (reportsList) {
    reportsList.addEventListener("click", (event) => {
      const item = event.target.closest("button[data-report-id]");
      if (!item) return;
      selectedReportId = Number(item.dataset.reportId);
      renderReportsList();
    });
  }

  if (reportGenerateNow) {
    reportGenerateNow.addEventListener("click", async () => {
      await handleGenerateWeeklyReportNow(false);
    });
  }

  window.addEventListener("error", (event) => {
    const detail = event && event.message ? event.message : "Error de JavaScript.";
    setStatus(detail);
  });
}

async function init() {
  const today = todayLocalDateString();
  habitDateInput.value = today;
  medStartDate.value = today;
  setAuthMode("login");
  updateMedicationFormVisibility();
  updateNow();
  setInterval(updateNow, 1000);
  resetTabStatus();
  bindEvents();
  setActiveTab(loadPreferredTab());

  const handledRedirect = await handleAuthRedirectResult();
  if (handledRedirect) return;

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
