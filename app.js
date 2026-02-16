const SUPABASE_URL = "https://uuwabhdzcxolhzhmrnhm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d2FiaGR6Y3hvbGh6aG1ybmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDQxNjIsImV4cCI6MjA4NTk4MDE2Mn0.lC0yej-sbLVVSQZcizU2A9E4yxpz-rY_DWUpOgjQbPU";
const SESSION_KEY = "peso_supabase_session_v1";
const TAB_KEY = "registro_tab_v1";
const TAB_IDS = ["todayPanel", "weightPanel", "medicationPanel"];

const loginCard = document.getElementById("loginCard");
const zonaPrivada = document.getElementById("zonaPrivada");
const estadoApp = document.getElementById("estadoApp");
const mensaje = document.getElementById("mensaje");

const mainTabs = document.getElementById("mainTabs");
const todayPanel = document.getElementById("todayPanel");
const weightPanel = document.getElementById("weightPanel");
const medicationPanel = document.getElementById("medicationPanel");
const panelMap = {
  todayPanel,
  weightPanel,
  medicationPanel,
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

const medTodayBadge = document.getElementById("medTodayBadge");
const medScheduledList = document.getElementById("medScheduledList");
const medPrnList = document.getElementById("medPrnList");
const medHistoryMedication = document.getElementById("medHistoryMedication");
const medHistorySource = document.getElementById("medHistorySource");
const medHistoryFrom = document.getElementById("medHistoryFrom");
const medHistoryTo = document.getElementById("medHistoryTo");
const medHistoryApply = document.getElementById("medHistoryApply");
const medHistoryList = document.getElementById("medHistoryList");
const medCreateName = document.getElementById("medCreateName");
const medCreateType = document.getElementById("medCreateType");
const medCreateWindowField = document.getElementById("medCreateWindowField");
const medCreateWindow = document.getElementById("medCreateWindow");
const medCreateStart = document.getElementById("medCreateStart");
const medCreateNotes = document.getElementById("medCreateNotes");
const medCreateSubmit = document.getElementById("medCreateSubmit");

let currentSession = loadSession();
let medicationSeedChecked = false;
let medicationCache = {
  medicationsAll: [],
  medications: [],
  plans: [],
  plansById: new Map(),
  medicationById: new Map(),
  latestScheduledTodayByPlan: new Map(),
  latestExtraByPlan: new Map(),
  intakes: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const EXTRA_SOFT_BRAKE_HOURS = 4;

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
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const diff = Math.floor((end.getTime() - start.getTime()) / DAY_MS);
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

function sourceLabel(value) {
  return value === "scheduled" ? "programada" : "extra";
}

function reasonLabel(value) {
  if (value === "nervios") return "nervios";
  if (value === "tics") return "tics";
  if (value === "presentacion") return "presentacion";
  if (value === "otro") return "otro";
  return "";
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
  habitCounter.textContent = `${habits.length} habito${habits.length === 1 ? "" : "s"}`;
  habitSummary.textContent = `${date}: ${yesCount} si, ${noCount} no, ${pendingCount} pendientes.`;
}

function resetMedicationUI() {
  medicationCache = {
    medicationsAll: [],
    medications: [],
    plans: [],
    plansById: new Map(),
    medicationById: new Map(),
    latestScheduledTodayByPlan: new Map(),
    latestExtraByPlan: new Map(),
    intakes: [],
  };
  medTodayBadge.textContent = "0 programadas pendientes";
  medScheduledList.innerHTML = '<div class="empty-message">No hay medicaciones programadas activas.</div>';
  medPrnList.innerHTML = '<div class="empty-message">No hay medicaciones a demanda activas.</div>';
  medHistoryList.innerHTML = '<div class="empty-message">Aun no hay eventos de medicacion.</div>';
  medHistoryMedication.innerHTML = '<option value="">Todas</option>';
}

function populateMedicationFilterOptions(medications) {
  const currentValue = medHistoryMedication.value;
  const options = [
    '<option value="">Todas</option>',
    ...medications.map((med) => `<option value="${med.id}">${escapeHtml(med.name)}</option>`),
  ];
  medHistoryMedication.innerHTML = options.join("");
  medHistoryMedication.value = medications.some((med) => String(med.id) === String(currentValue))
    ? currentValue
    : "";
}

function timeWindowLabel(timeWindow) {
  if (timeWindow === "morning") return "manana";
  if (timeWindow === "afternoon") return "tarde";
  if (timeWindow === "night") return "noche";
  return "sin ventana";
}

function renderMedicationToday(plans, medicationsById, todayScheduledByPlan, latestExtraByPlan) {
  const scheduledPlans = plans.filter((plan) => plan.type === "scheduled");
  const prnPlans = plans.filter((plan) => plan.type === "prn");

  const pendingScheduled = scheduledPlans.filter((plan) => !todayScheduledByPlan.has(plan.id)).length;
  medTodayBadge.textContent = `${pendingScheduled} programadas pendientes`;

  if (scheduledPlans.length === 0) {
    medScheduledList.innerHTML = '<div class="empty-message">No hay medicaciones programadas activas.</div>';
  } else {
    medScheduledList.innerHTML = scheduledPlans
      .map((plan) => {
        const med = medicationsById.get(plan.medication_id);
        const medName = med ? med.name : "Medicacion";
        const takenToday = todayScheduledByPlan.get(plan.id) || null;
        const scheduleMeta = `1 vez al dia (${timeWindowLabel(plan.time_window)})`;

        return `
          <article class="med-item">
            <div class="med-item-main">
              <div class="med-name">${escapeHtml(medName)}</div>
              <div class="med-meta">${scheduleMeta}</div>
            </div>
            ${
              takenToday
                ? `<div class="med-taken">Tomada a las ${formatTime(takenToday.timestamp)}</div>`
                : '<div class="med-meta">Pendiente de registrar hoy.</div>'
            }
            <div class="med-actions">
              ${
                takenToday
                  ? ""
                  : `<button
                      type="button"
                      class="primary"
                      data-med-action="take-scheduled"
                      data-plan-id="${plan.id}"
                    >
                      Marcar como tomada
                    </button>`
              }
              ${
                takenToday
                  ? `<button
                      type="button"
                      class="ghost"
                      data-med-action="undo-scheduled"
                      data-intake-id="${takenToday.id}"
                    >
                      Deshacer
                    </button>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (prnPlans.length === 0) {
    medPrnList.innerHTML = '<div class="empty-message">No hay medicaciones a demanda activas.</div>';
  } else {
    medPrnList.innerHTML = prnPlans
      .map((plan) => {
        const med = medicationsById.get(plan.medication_id);
        const medName = med ? med.name : "Medicacion";
        const lastExtra = latestExtraByPlan.get(plan.id);
        const isRecentExtra =
          lastExtra &&
          Math.abs(Date.now() - new Date(lastExtra.timestamp).getTime()) / (60 * 60 * 1000) <=
            EXTRA_SOFT_BRAKE_HOURS;
        const warning = isRecentExtra
          ? `<div class="med-warning">Ultima extra fue a las ${formatTime(lastExtra.timestamp)}</div>`
          : "";

        return `
          <article class="med-item">
            <div class="med-item-main">
              <div class="med-name">${escapeHtml(medName)} extra</div>
              <div class="med-meta">A demanda</div>
            </div>
            ${warning}
            <div class="med-extra-fields">
              <label class="field">
                <span>Motivo</span>
                <select data-prn-reason-for="${plan.id}">
                  <option value="">Sin motivo</option>
                  <option value="nervios">Nervios</option>
                  <option value="tics">Tics</option>
                  <option value="presentacion">Presentacion</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label class="field">
                <span>Notas</span>
                <input type="text" data-prn-notes-for="${plan.id}" placeholder="Opcional" />
              </label>
              <button
                type="button"
                class="secondary"
                data-med-action="take-extra"
                data-plan-id="${plan.id}"
              >
                Registrar toma extra
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }
}

function renderMedicationHistory(items, medicationsById) {
  if (items.length === 0) {
    medHistoryList.innerHTML = '<div class="empty-message">Aun no hay eventos de medicacion.</div>';
    return;
  }

  const grouped = new Map();
  for (const item of items) {
    const day = isoToLocalDateString(item.timestamp);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(item);
  }

  const blocks = Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayItems]) => {
      const events = dayItems
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
        .map((event) => {
          const med = medicationsById.get(event.medication_id);
          const medName = med ? med.name : "Medicacion";
          const amount = Number(event.amount || 1);
          const amountLabel = Number.isNaN(amount) ? "" : ` x${amount}`;
          const reason = event.reason ? `, ${reasonLabel(event.reason)}` : "";
          const notes = event.notes ? ` - ${escapeHtml(event.notes)}` : "";
          return `<li>${escapeHtml(medName)}${amountLabel} ${formatTime(event.timestamp)} (${sourceLabel(
            event.source
          )}${reason})${notes}</li>`;
        })
        .join("");

      return `
        <article class="med-history-day">
          <div class="med-history-day-title">${dayLabel(day)} (${day})</div>
          <ul class="med-history-events">${events}</ul>
        </article>
      `;
    })
    .join("");

  medHistoryList.innerHTML = blocks;
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
  renderHabitTable([], new Map(), new Map(), new Map(), getSelectedHabitDate());
  resetMedicationUI();
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

async function fetchHabitChecksUntil(logDate) {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "habit_id,status,log_date",
    user_id: `eq.${currentSession.user.id}`,
    log_date: `lte.${logDate}`,
    order: "log_date.asc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/habit_checks?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

function isActiveOnDate(item, date) {
  if (item.active_from && item.active_from > date) return false;
  if (item.active_to && item.active_to < date) return false;
  return true;
}

async function fetchMedicationsCatalog() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "id,name,form,strength,notes,active_from,active_to",
    user_id: `eq.${currentSession.user.id}`,
    order: "name.asc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/medications?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function fetchMedicationPlans() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "id,medication_id,type,frequency,time_window,target_time,tolerance_minutes,active_from,active_to",
    user_id: `eq.${currentSession.user.id}`,
    order: "id.asc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/medication_plans?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function fetchMedicationIntakes() {
  await refreshSessionIfNeeded();
  if (!currentSession) return [];

  const params = new URLSearchParams({
    select: "id,medication_id,plan_id,timestamp,amount,source,reason,notes,created_at",
    user_id: `eq.${currentSession.user.id}`,
    order: "timestamp.desc",
  });

  return apiFetch(`${SUPABASE_URL}/rest/v1/medication_intakes?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
}

async function ensureMedicationSeed() {
  if (medicationSeedChecked) return;
  await refreshSessionIfNeeded();
  if (!currentSession) return;

  const today = todayLocalDateString();
  let medications = await fetchMedicationsCatalog();

  const requiredMedications = [
    { name: "Lorazepam", active_from: today },
    { name: "Atorvastatina", active_from: today },
  ];

  const existingByName = new Map(medications.map((med) => [med.name.toLowerCase(), med]));
  const missingMedications = requiredMedications.filter((med) => !existingByName.has(med.name.toLowerCase()));

  if (missingMedications.length > 0) {
    const rows = missingMedications.map((med) => ({
      user_id: currentSession.user.id,
      name: med.name,
      active_from: med.active_from,
    }));
    await apiFetch(`${SUPABASE_URL}/rest/v1/medications`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(rows),
    });
    medications = await fetchMedicationsCatalog();
  }

  const byName = new Map(medications.map((med) => [med.name.toLowerCase(), med]));
  const plans = await fetchMedicationPlans();
  const planExists = (medicationId, type, timeWindow) =>
    plans.some(
      (plan) =>
        Number(plan.medication_id) === Number(medicationId) &&
        plan.type === type &&
        ((plan.time_window || null) === (timeWindow || null)) &&
        (plan.active_to || null) === null
    );

  const lorazepam = byName.get("lorazepam");
  const atorvastatina = byName.get("atorvastatina");
  const rows = [];
  const buildPlanRow = ({ medicationId, type, frequency = null, timeWindow = null }) => ({
    user_id: currentSession.user.id,
    medication_id: medicationId,
    type,
    frequency,
    time_window: timeWindow,
    target_time: null,
    tolerance_minutes: null,
    active_from: today,
    active_to: null,
  });

  if (lorazepam && !planExists(lorazepam.id, "scheduled", "morning")) {
    rows.push(buildPlanRow({ medicationId: lorazepam.id, type: "scheduled", frequency: "daily", timeWindow: "morning" }));
  }
  if (lorazepam && !planExists(lorazepam.id, "prn", null)) {
    rows.push(buildPlanRow({ medicationId: lorazepam.id, type: "prn" }));
  }
  if (atorvastatina && !planExists(atorvastatina.id, "scheduled", "morning")) {
    rows.push(
      buildPlanRow({ medicationId: atorvastatina.id, type: "scheduled", frequency: "daily", timeWindow: "morning" })
    );
  }

  if (rows.length > 0) {
    await apiFetch(`${SUPABASE_URL}/rest/v1/medication_plans`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(rows),
    });
  }

  medicationSeedChecked = true;
}

function refreshMedicationHistory() {
  const { intakes, medicationById } = medicationCache;
  const medicationFilter = medHistoryMedication.value;
  const sourceFilter = medHistorySource.value;
  const fromDate = medHistoryFrom.value;
  const toDate = medHistoryTo.value;

  const filtered = intakes.filter((item) => {
    const itemDate = isoToLocalDateString(item.timestamp);
    if (medicationFilter && String(item.medication_id) !== String(medicationFilter)) return false;
    if (sourceFilter && item.source !== sourceFilter) return false;
    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;
    return true;
  });

  renderMedicationHistory(filtered, medicationById);
}

async function refreshMedications() {
  await ensureMedicationSeed();

  const [medicationsAll, plansAll, intakes] = await Promise.all([
    fetchMedicationsCatalog(),
    fetchMedicationPlans(),
    fetchMedicationIntakes(),
  ]);

  const today = todayLocalDateString();
  const medicationById = new Map(medicationsAll.map((med) => [Number(med.id), med]));
  const activeMedications = medicationsAll.filter((med) => isActiveOnDate(med, today));
  const activeMedicationIds = new Set(activeMedications.map((med) => Number(med.id)));
  const activePlans = plansAll.filter(
    (plan) => activeMedicationIds.has(Number(plan.medication_id)) && isActiveOnDate(plan, today)
  );
  const plansById = new Map(activePlans.map((plan) => [Number(plan.id), plan]));

  const todayScheduledByPlan = new Map();
  const latestExtraByPlan = new Map();

  for (const intake of intakes) {
    const planId = intake.plan_id == null ? null : Number(intake.plan_id);
    if (planId == null || !plansById.has(planId)) continue;

    if (intake.source === "scheduled" && isoToLocalDateString(intake.timestamp) === today) {
      const prev = todayScheduledByPlan.get(planId);
      if (!prev || prev.timestamp < intake.timestamp) todayScheduledByPlan.set(planId, intake);
    }

    if (intake.source === "extra") {
      const prev = latestExtraByPlan.get(planId);
      if (!prev || prev.timestamp < intake.timestamp) latestExtraByPlan.set(planId, intake);
    }
  }

  medicationCache = {
    medicationsAll,
    medications: activeMedications,
    plans: activePlans,
    plansById,
    medicationById,
    latestScheduledTodayByPlan: todayScheduledByPlan,
    latestExtraByPlan,
    intakes,
  };

  populateMedicationFilterOptions(medicationsAll);
  renderMedicationToday(activePlans, medicationById, todayScheduledByPlan, latestExtraByPlan);
  refreshMedicationHistory();
}

function updateMedicationCreateVisibility() {
  const isScheduled = medCreateType.value === "scheduled";
  medCreateWindowField.classList.toggle("hidden", !isScheduled);
}

async function findMedicationByName(name) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const cached = medicationCache.medicationsAll.find((med) => med.name.toLowerCase() === normalized);
  if (cached) return cached;

  const params = new URLSearchParams({
    select: "id,name,active_from,active_to",
    user_id: `eq.${currentSession.user.id}`,
    name: `ilike.${name}`,
    limit: "5",
  });
  const matches = await apiFetch(`${SUPABASE_URL}/rest/v1/medications?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });
  return matches.find((med) => med.name.toLowerCase() === normalized) || null;
}

async function handleCreateMedicationPlan() {
  const ok = await ensureAuthenticated("Inicia sesion para crear tratamientos.");
  if (!ok) return;

  const name = medCreateName.value.trim();
  const type = medCreateType.value;
  const windowValue = medCreateWindow.value;
  const start = medCreateStart.value || todayLocalDateString();
  const notes = medCreateNotes.value.trim();

  if (!name) {
    setMessage("Indica el nombre de la medicacion.");
    return;
  }

  medCreateSubmit.disabled = true;
  try {
    let medication = await findMedicationByName(name);
    if (!medication) {
      const inserted = await apiFetch(`${SUPABASE_URL}/rest/v1/medications`, {
        method: "POST",
        headers: authHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify([
          {
            user_id: currentSession.user.id,
            name,
            notes: notes || null,
            active_from: start,
            active_to: null,
          },
        ]),
      });
      medication = inserted[0];
    }

    const existingPlans = medicationCache.plans.filter(
      (plan) =>
        Number(plan.medication_id) === Number(medication.id) &&
        plan.type === type &&
        (type === "prn" || plan.time_window === windowValue) &&
        !plan.active_to
    );
    if (existingPlans.length > 0) {
      setMessage("Ya existe un plan activo igual para esta medicacion.");
      return;
    }

    await apiFetch(`${SUPABASE_URL}/rest/v1/medication_plans`, {
      method: "POST",
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify([
        {
          user_id: currentSession.user.id,
          medication_id: medication.id,
          type,
          frequency: type === "scheduled" ? "daily" : null,
          time_window: type === "scheduled" ? windowValue : null,
          target_time: null,
          tolerance_minutes: null,
          active_from: start,
          active_to: null,
        },
      ]),
    });

    medCreateName.value = "";
    medCreateNotes.value = "";
    medCreateType.value = "scheduled";
    medCreateWindow.value = "morning";
    medCreateStart.value = todayLocalDateString();
    updateMedicationCreateVisibility();

    await refreshMedications();
    setMessage("Tratamiento guardado.");
  } catch (error) {
    setMessage(`No se pudo guardar el tratamiento: ${error.message}`);
  } finally {
    medCreateSubmit.disabled = false;
  }
}

async function refreshWeights() {
  const weights = await fetchWeightRecords();
  renderWeightTable(weights);
}

async function refreshHabits() {
  const logDate = getSelectedHabitDate();
  const [habits, checksUntilDate] = await Promise.all([fetchHabits(), fetchHabitChecksUntil(logDate)]);

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
}

async function refreshAllData() {
  const [weightsResult, habitsResult, medicationResult] = await Promise.allSettled([
    refreshWeights(),
    refreshHabits(),
    refreshMedications(),
  ]);

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

  if (medicationResult.status === "rejected") {
    const detail = medicationResult.reason.message || "error desconocido";
    const missingTables =
      detail.includes('relation "medications" does not exist') ||
      detail.includes('relation "medication_plans" does not exist') ||
      detail.includes('relation "medication_intakes" does not exist');

    if (missingTables) {
      setStatus("Falta crear tablas de medicaciones en Supabase. Ejecuta supabase_medications.sql.");
      resetMedicationUI();
    } else {
      setStatus(`Error en medicaciones: ${detail}`);
    }
  }

  if (
    weightsResult.status === "fulfilled" &&
    habitsResult.status === "fulfilled" &&
    medicationResult.status === "fulfilled"
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

async function handleTakeScheduledMedication(planId) {
  const ok = await ensureAuthenticated("Inicia sesion para registrar medicaciones.");
  if (!ok) return;

  const plan = medicationCache.plansById.get(Number(planId));
  if (!plan) return;

  const existing = medicationCache.latestScheduledTodayByPlan.get(Number(planId));
  if (existing) {
    const allowDuplicate = confirm(
      `Ya registraste esta dosis hoy a las ${formatTime(
        existing.timestamp
      )}. ¿Registrar otra igualmente?`
    );
    if (!allowDuplicate) return;
  }

  await apiFetch(`${SUPABASE_URL}/rest/v1/medication_intakes`, {
    method: "POST",
    headers: authHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([
      {
        user_id: currentSession.user.id,
        medication_id: plan.medication_id,
        plan_id: plan.id,
        timestamp: nowISO(),
        amount: 1,
        source: "scheduled",
      },
    ]),
  });

  await refreshMedications();
  setMessage("Toma programada registrada.");
}

async function handleUndoScheduledMedication(intakeId) {
  const ok = await ensureAuthenticated("Inicia sesion para modificar medicaciones.");
  if (!ok) return;

  const params = new URLSearchParams({
    id: `eq.${intakeId}`,
    user_id: `eq.${currentSession.user.id}`,
  });

  await apiFetch(`${SUPABASE_URL}/rest/v1/medication_intakes?${params.toString()}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });

  await refreshMedications();
  setMessage("Toma programada deshecha.");
}

async function handleTakeExtraMedication(planId) {
  const ok = await ensureAuthenticated("Inicia sesion para registrar medicaciones.");
  if (!ok) return;

  const numericPlanId = Number(planId);
  const plan = medicationCache.plansById.get(numericPlanId);
  if (!plan) return;

  const reasonInput = medPrnList.querySelector(`[data-prn-reason-for="${numericPlanId}"]`);
  const notesInput = medPrnList.querySelector(`[data-prn-notes-for="${numericPlanId}"]`);
  const reasonValue = reasonInput ? reasonInput.value : "";
  const notesValue = notesInput ? notesInput.value.trim() : "";

  const previousExtra = medicationCache.latestExtraByPlan.get(numericPlanId);
  let warning = "";
  if (previousExtra) {
    const diffHours = Math.abs(Date.now() - new Date(previousExtra.timestamp).getTime()) / (60 * 60 * 1000);
    if (diffHours <= EXTRA_SOFT_BRAKE_HOURS) {
      warning = ` Ultima extra: ${formatTime(previousExtra.timestamp)}.`;
    }
  }

  await apiFetch(`${SUPABASE_URL}/rest/v1/medication_intakes`, {
    method: "POST",
    headers: authHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([
      {
        user_id: currentSession.user.id,
        medication_id: plan.medication_id,
        plan_id: plan.id,
        timestamp: nowISO(),
        amount: 1,
        source: "extra",
        reason: reasonValue || null,
        notes: notesValue || null,
      },
    ]),
  });

  await refreshMedications();
  setMessage(`Toma extra registrada.${warning}`);
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
    const descriptionToggle = event.target.closest("button[data-toggle-description]");
    if (descriptionToggle) {
      const habitId = descriptionToggle.dataset.toggleDescription;
      const description = habitsTable.querySelector(`[data-description-for="${habitId}"]`);
      if (description) {
        const nextHidden = !description.classList.contains("hidden");
        description.classList.toggle("hidden", nextHidden);
        descriptionToggle.setAttribute("aria-expanded", String(!nextHidden));
      }
      return;
    }

    const statusBtn = event.target.closest("button[data-habit-id][data-status]");
    if (statusBtn) {
      await upsertHabitStatus(statusBtn.dataset.habitId, statusBtn.dataset.status);
    }
  });

  medScheduledList.addEventListener("click", async (event) => {
    const takeBtn = event.target.closest('button[data-med-action="take-scheduled"]');
    if (takeBtn) {
      try {
        await handleTakeScheduledMedication(takeBtn.dataset.planId);
      } catch (error) {
        setMessage(`No se pudo registrar la toma: ${error.message}`);
      }
      return;
    }

    const undoBtn = event.target.closest('button[data-med-action="undo-scheduled"]');
    if (undoBtn) {
      try {
        await handleUndoScheduledMedication(undoBtn.dataset.intakeId);
      } catch (error) {
        setMessage(`No se pudo deshacer: ${error.message}`);
      }
    }
  });

  medPrnList.addEventListener("click", async (event) => {
    const extraBtn = event.target.closest('button[data-med-action="take-extra"]');
    if (!extraBtn) return;

    try {
      await handleTakeExtraMedication(extraBtn.dataset.planId);
    } catch (error) {
      setMessage(`No se pudo registrar la extra: ${error.message}`);
    }
  });

  medHistoryApply.addEventListener("click", () => {
    refreshMedicationHistory();
  });

  medHistoryMedication.addEventListener("change", () => {
    refreshMedicationHistory();
  });

  medHistorySource.addEventListener("change", () => {
    refreshMedicationHistory();
  });

  medHistoryFrom.addEventListener("change", () => {
    refreshMedicationHistory();
  });

  medHistoryTo.addEventListener("change", () => {
    refreshMedicationHistory();
  });

  medCreateType.addEventListener("change", () => {
    updateMedicationCreateVisibility();
  });

  medCreateSubmit.addEventListener("click", async () => {
    await handleCreateMedicationPlan();
  });

  window.addEventListener("error", (event) => {
    const detail = event && event.message ? event.message : "Error de JavaScript.";
    setStatus(detail);
  });
}

async function init() {
  const today = todayLocalDateString();
  habitDateInput.value = today;
  medHistoryFrom.value = addDaysToDateString(today, -14);
  medHistoryTo.value = today;
  medCreateStart.value = today;
  updateMedicationCreateVisibility();
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
