const employeesDefault = [
  "Sagar Dhakal",
  "Prakash Dhakal",
  "Pradip Pandey",
  "Anuj Poudel",
  "Anjila Khadka",
  "Hari Pathak",
  "Demo 1",
  "Demo 2",
];

const locationsDefault = ["Koivistonkylä", "Ylöjärvi"];
const shifts = [
  "00:00-00:00",
  "07:00-15:00",
  "08:45-20:00",
  "09:00-14:00",
  "09:00-16:00",
  "09:00-17:00",
  "09:00-18:30",
  "09:00-19:00",
  "09:00-19:30",
  "09:00-20:00",
  "09:00-20:30",
  "10:00-18:30",
  "10:00-19:00",
  "11:00-20:00",
  "13:00-18:00",
  "14:00-19:00",
  "14:00-19:30",
  "14:00-21:00",
  "15:00-20:30",
  "17:00-23:00",
  "OFF",
  "Wish OFF",
  "Sick leave",
];
const nonWorkingShifts = ["OFF", "Wish OFF", "Sick leave", "00:00-00:00"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const stateKey = "dgtech-shiftplanner-v1";
const sessionKey = "dgtech-shiftplanner-session";
const hadSavedState = Boolean(localStorage.getItem("dgtech-shiftplanner-v1"));
let sessionToken = localStorage.getItem(sessionKey) || "";
let serverReady = false;
let bootstrapping = true;
let employeeRequestDay = "";

const initialState = {
  year: 2026,
  month: 4,
  view: "schedule",
  role: "employer",
  activeEmployee: employeesDefault[0],
  report: {
    type: "month",
    employee: employeesDefault[0],
    location: locationsDefault[0],
    week: "",
    threeWeek: "1",
  },
  duplicate: {
    period: "week",
    fromBlock: "1",
    targetYear: 2026,
    targetMonth: 4,
    targetBlock: "2",
  },
  quickDuplicate: {
    targetWeek: "",
    targetThreeWeeks: "",
  },
  history: [],
  employees: employeesDefault,
  locations: locationsDefault,
  months: {},
  auth: {
    employers: [],
    employees: [],
    invites: [],
    session: null,
  },
};

let state = loadState();

const el = {
  authScreen: document.querySelector("#authScreen"),
  setupForm: document.querySelector("#setupForm"),
  loginForm: document.querySelector("#loginForm"),
  inviteForm: document.querySelector("#inviteForm"),
  inviteText: document.querySelector("#inviteText"),
  inviteName: document.querySelector("#inviteName"),
  loginUser: document.querySelector("#loginUser"),
  loginPassword: document.querySelector("#loginPassword"),
  setupName: document.querySelector("#setupName"),
  setupEmail: document.querySelector("#setupEmail"),
  setupUsername: document.querySelector("#setupUsername"),
  setupPassword: document.querySelector("#setupPassword"),
  inviteEmail: document.querySelector("#inviteEmail"),
  inviteUsername: document.querySelector("#inviteUsername"),
  invitePassword: document.querySelector("#invitePassword"),
  yearSelect: document.querySelector("#yearSelect"),
  monthSelect: document.querySelector("#monthSelect"),
  userRole: document.querySelector("#userRole"),
  userName: document.querySelector("#userName"),
  logoutButton: document.querySelector("#logoutButton"),
  pageTitle: document.querySelector("#pageTitle"),
  pageMeta: document.querySelector("#pageMeta"),
  scheduleTable: document.querySelector("#scheduleTable"),
  employeeSummary: document.querySelector("#employeeSummary"),
  locationSummary: document.querySelector("#locationSummary"),
  locationRoster: document.querySelector("#locationRoster"),
  weekSummary: document.querySelector("#weekSummary"),
  reportType: document.querySelector("#reportType"),
  reportEmployee: document.querySelector("#reportEmployee"),
  reportLocation: document.querySelector("#reportLocation"),
  reportWeek: document.querySelector("#reportWeek"),
  reportThreeWeek: document.querySelector("#reportThreeWeek"),
  reportPreview: document.querySelector("#reportPreview"),
  employeeFilter: document.querySelector("#employeeFilter"),
  copyLastWeek: document.querySelector("#copyLastWeek"),
  copyLastThreeWeeks: document.querySelector("#copyLastThreeWeeks"),
  copyLastMonth: document.querySelector("#copyLastMonth"),
  quickTargetWeek: document.querySelector("#quickTargetWeek"),
  quickTargetThreeWeeks: document.querySelector("#quickTargetThreeWeeks"),
  employeeEditor: document.querySelector("#employeeEditor"),
  locationEditor: document.querySelector("#locationEditor"),
  employerEditor: document.querySelector("#employerEditor"),
  inviteEditor: document.querySelector("#inviteEditor"),
  historyList: document.querySelector("#historyList"),
  newEmployee: document.querySelector("#newEmployee"),
  newLocation: document.querySelector("#newLocation"),
  newEmployerName: document.querySelector("#newEmployerName"),
  newEmployerEmail: document.querySelector("#newEmployerEmail"),
  newEmployerUsername: document.querySelector("#newEmployerUsername"),
  newEmployerPassword: document.querySelector("#newEmployerPassword"),
  duplicatePeriod: document.querySelector("#duplicatePeriod"),
  duplicateFromBlock: document.querySelector("#duplicateFromBlock"),
  duplicateYear: document.querySelector("#duplicateYear"),
  duplicateMonth: document.querySelector("#duplicateMonth"),
  duplicateToBlock: document.querySelector("#duplicateToBlock"),
  duplicateShifts: document.querySelector("#duplicateShifts"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  const saved = localStorage.getItem(stateKey);
  if (!saved) return structuredClone(initialState);
  try {
    const parsed = JSON.parse(saved);
    return mergeLoadedState(parsed);
  } catch {
    return structuredClone(initialState);
  }
}

async function apiRequest(action, payload = {}) {
  const response = await fetch("/api/app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token: sessionToken, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Server request failed");
  if (data.token) {
    sessionToken = data.token;
    localStorage.setItem(sessionKey, sessionToken);
  }
  if (data.state) {
    state = mergeLoadedState(data.state);
    localStorage.setItem(stateKey, JSON.stringify(state));
  }
  serverReady = true;
  return data;
}

function mergeLoadedState(parsed) {
  return {
    ...structuredClone(initialState),
    ...parsed,
    employees: parsed.employees?.length ? parsed.employees : employeesDefault,
    locations: parsed.locations?.length ? parsed.locations : locationsDefault,
    months: parsed.months ?? {},
    auth: {
      employers: parsed.auth?.employers ?? [],
      employees: parsed.auth?.employees ?? [],
      invites: parsed.auth?.invites ?? [],
      session: parsed.auth?.session ?? null,
    },
    role: parsed.role === "employee" ? "employee" : "employer",
    activeEmployee: parsed.activeEmployee ?? employeesDefault[0],
    report: { ...structuredClone(initialState.report), ...(parsed.report ?? {}) },
    duplicate: { ...structuredClone(initialState.duplicate), ...(parsed.duplicate ?? {}) },
    quickDuplicate: { ...structuredClone(initialState.quickDuplicate), ...(parsed.quickDuplicate ?? {}) },
    history: parsed.history ?? [],
  };
}

function saveState(show = false) {
  localStorage.setItem(stateKey, JSON.stringify(state));
  if (serverReady && isEmployer()) {
    apiRequest("saveState", { state: stateForServer() }).catch((error) => toast(error.message));
  }
  if (show) toast("Saved");
}

function stateForServer() {
  return {
    year: state.year,
    month: state.month,
    view: state.view,
    activeEmployee: state.activeEmployee,
    report: state.report,
    duplicate: state.duplicate,
    quickDuplicate: state.quickDuplicate,
    history: state.history,
    employees: state.employees,
    locations: state.locations,
    months: state.months,
  };
}

function createId(prefix = "id") {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function passwordHash(password) {
  return `local-${btoa(unescape(encodeURIComponent(password)))}`;
}

function normalizeLogin(value) {
  return String(value ?? "").trim().toLowerCase();
}

function currentUser() {
  const session = state.auth.session;
  if (!session) return null;
  const list = session.type === "employee" ? state.auth.employees : state.auth.employers;
  const user = list.find((item) => item.id === session.id);
  return user ? { ...user, type: session.type } : null;
}

function isEmployer() {
  return currentUser()?.type === "employer";
}

function isEmployee() {
  return currentUser()?.type === "employee";
}

function syncAuthRole() {
  const user = currentUser();
  if (!user) {
    state.auth.session = null;
    return;
  }
  state.role = user.type;
  if (user.type === "employee") {
    state.activeEmployee = user.employeeName;
    if (!["schedule", "reports"].includes(state.view)) state.view = "schedule";
  }
}

function inviteFromHash() {
  const match = window.location.hash.match(/^#invite=(.+)$/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  return state.auth.invites.find((invite) => invite.token === token && !invite.used) ?? null;
}

function inviteTokenFromHash() {
  return window.location.hash.match(/^#invite=(.+)$/)?.[1] ? decodeURIComponent(window.location.hash.match(/^#invite=(.+)$/)[1]) : "";
}

function inviteLink(token) {
  const base = window.location.href.split("#")[0];
  return `${base}#invite=${encodeURIComponent(token)}`;
}

function renderAuth() {
  const user = currentUser();
  const needsSetup = state.auth.employers.length === 0;
  const invite = inviteFromHash();
  document.body.classList.toggle("auth-locked", !user);
  el.authScreen.hidden = Boolean(user);

  if (!user && bootstrapping) {
    el.setupForm.hidden = true;
    el.loginForm.hidden = true;
    el.inviteForm.hidden = true;
    return;
  }

  if (user) {
    el.userRole.textContent = user.type === "employer" ? "Employer" : "Employee";
    el.userName.textContent = user.type === "employee" ? user.employeeName : user.name;
    return;
  }

  el.setupForm.hidden = !needsSetup;
  el.loginForm.hidden = needsSetup || Boolean(invite);
  el.inviteForm.hidden = !invite || needsSetup;
  if (invite) {
    el.inviteName.value = invite.employeeName;
    el.inviteText.textContent = `${invite.employeeName}, confirm your login details to view the team schedule.`;
  }
}

function monthKey(year = state.year, month = state.month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function daysInMonth(year = state.year, month = state.month) {
  return new Date(year, month + 1, 0).getDate();
}

function ensureMonth(year = state.year, month = state.month) {
  const key = monthKey(year, month);
  if (state.months[key]) return state.months[key];
  const data = {};
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    data[day] = {};
    for (const employee of state.employees) {
      data[day][employee] = {
        shift: "00:00-00:00",
        location: state.locations[0] ?? "",
        comment: "",
        published: false,
        publishedShift: "",
        paidShift: "",
      };
    }
  }
  state.months[key] = data;
  return data;
}

function normalizeMonthData() {
  const data = ensureMonth();
  if (!state.employees.includes(state.activeEmployee)) state.activeEmployee = state.employees[0] ?? "";
  if (!state.employees.includes(state.report.employee)) state.report.employee = state.employees[0] ?? "";
  if (!state.locations.includes(state.report.location)) state.report.location = state.locations[0] ?? "";
  for (let day = 1; day <= daysInMonth(); day += 1) {
    data[day] ??= {};
    for (const employee of state.employees) {
      data[day][employee] ??= { shift: "00:00-00:00", location: state.locations[0] ?? "" };
      data[day][employee].shift ||= "00:00-00:00";
      data[day][employee].location ||= state.locations[0] ?? "";
      data[day][employee].comment ||= "";
      data[day][employee].published = Boolean(data[day][employee].published);
      data[day][employee].publishedShift ||= data[day][employee].published ? data[day][employee].shift : "";
      data[day][employee].paidShift ||= "";
    }
    for (const employee of Object.keys(data[day])) {
      if (!state.employees.includes(employee)) delete data[day][employee];
    }
  }
}

function hoursFromShift(shift) {
  const normalized = normalizeShift(shift);
  if (!normalized || nonWorkingShifts.includes(normalized)) return 0;
  const [start, end] = normalized.split("-");
  if (!start || !end) return 0;
  const toHours = (value) => {
    const [h, m] = value.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h + m / 60;
  };
  let diff = toHours(end) - toHours(start);
  if (diff < 0) diff += 24;
  return diff;
}

function normalizeShift(value) {
  const raw = String(value ?? "").trim().replace(/[–—]/g, "-");
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (!compact) return "";
  if (compact === "OFF") return "OFF";
  if (compact === "WISHOFF") return "Wish OFF";
  if (compact === "SICKLEAVE") return "Sick leave";
  return compact;
}

function isValidShift(value) {
  const normalized = normalizeShift(value);
  if (normalized === "" || nonWorkingShifts.includes(normalized)) return true;
  return /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(normalized);
}

function hoursForEntry(entry) {
  if (!entry) return 0;
  if (entry.shift === "Sick leave") return hoursFromShift(entry.paidShift || entry.publishedShift);
  return hoursFromShift(entry.shift);
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dayInfo(day) {
  const date = new Date(state.year, state.month, day);
  const holidayName = finnishHolidayName(date);
  const isSunday = date.getDay() === 0;
  return {
    label: date.toLocaleDateString("en-US", { weekday: "short" }),
    isoWeek: getISOWeek(date),
    holidayName,
    isSunday,
    isRedDay: isSunday || Boolean(holidayName),
  };
}

function getISOWeek(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function saturdayBetween(year, month, startDay, endDay) {
  for (let day = startDay; day <= endDay; day += 1) {
    const date = new Date(year, month, day);
    if (date.getDay() === 6) return date;
  }
  return new Date(year, month, startDay);
}

function finnishHolidays(year) {
  const easter = easterSunday(year);
  const holidays = new Map([
    [`${year}-01-01`, "New Year's Day"],
    [`${year}-01-06`, "Epiphany"],
    [`${year}-05-01`, "May Day"],
    [`${year}-12-06`, "Independence Day"],
    [`${year}-12-24`, "Christmas Eve"],
    [`${year}-12-25`, "Christmas Day"],
    [`${year}-12-26`, "Boxing Day"],
  ]);
  holidays.set(dateKey(addDays(easter, -2)), "Good Friday");
  holidays.set(dateKey(easter), "Easter Sunday");
  holidays.set(dateKey(addDays(easter, 1)), "Easter Monday");
  holidays.set(dateKey(addDays(easter, 39)), "Ascension Day");
  holidays.set(dateKey(addDays(easter, 49)), "Whit Sunday");
  holidays.set(dateKey(saturdayBetween(year, 5, 20, 26)), "Midsummer Day");
  holidays.set(dateKey(addDays(saturdayBetween(year, 5, 20, 26), -1)), "Midsummer Eve");
  const allSaints = saturdayBetween(year, 10, 1, 6);
  if (new Date(year, 9, 31).getDay() === 6) holidays.set(`${year}-10-31`, "All Saints' Day");
  else holidays.set(dateKey(allSaints), "All Saints' Day");
  return holidays;
}

function finnishHolidayName(date) {
  return finnishHolidays(date.getFullYear()).get(dateKey(date)) || "";
}

function dayLabel(info) {
  return `${esc(info.label)}${info.holidayName ? `<small>${esc(info.holidayName)}</small>` : ""}`;
}

function classForShift(shift) {
  if (shift === "OFF") return "off";
  if (shift === "Wish OFF") return "wish";
  if (shift === "Sick leave") return "sick";
  if (shift === "09:00-14:00") return "morning";
  if (shift === "09:00-17:00") return "day";
  if (shift === "13:00-18:00") return "afternoon";
  if (shift === "17:00-23:00") return "evening";
  return "blank";
}

function classForLocation(location) {
  return `loc-${location.toLowerCase().replaceAll(" ", "-")}`;
}

function visibleEmployees() {
  return state.employees;
}

function daysForPeriod(period = "month", value = "") {
  const allDays = Array.from({ length: daysInMonth() }, (_, index) => index + 1);
  if (period === "week") {
    return allDays.filter((day) => String(dayInfo(day).isoWeek) === String(value));
  }
  if (period === "threeWeeks") {
    const block = Number(value || 1);
    const start = (block - 1) * 21 + 1;
    const end = Math.min(daysInMonth(), start + 20);
    return allDays.filter((day) => day >= start && day <= end);
  }
  return allDays;
}

function daysInSpecificMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function mondayOnOrBefore(date) {
  const day = date.getDay() || 7;
  return addDays(date, 1 - day);
}

function dateRange(startDate, length) {
  return Array.from({ length }, (_, index) => addDays(startDate, index));
}

function formatShortDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

function blockTouchesMonth(dates, year, month) {
  return dates.some((date) => date.getFullYear() === year && date.getMonth() === month);
}

function duplicateBlocks(period, year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month, daysInSpecificMonth(year, month));
  if (period === "month") {
    const dates = dateRange(firstDay, daysInSpecificMonth(year, month));
    return [{ label: "Full month", value: "month", dates }];
  }
  const blockLength = period === "threeWeeks" ? 21 : 7;
  const blocks = [];
  for (let start = mondayOnOrBefore(firstDay), block = 1; start <= lastDay; start = addDays(start, blockLength), block += 1) {
    const dates = dateRange(start, blockLength);
    if (!blockTouchesMonth(dates, year, month)) continue;
    const prefix = period === "threeWeeks" ? `3 weeks ${block}` : `Week ${block}`;
    blocks.push({
      label: `${prefix}: ${formatShortDate(dates[0])}-${formatShortDate(dates.at(-1))}`,
      value: dateKey(dates[0]),
      dates,
    });
  }
  return blocks;
}

function logHistory(action) {
  const user = currentUser();
  state.history ??= [];
  state.history.unshift({
    id: createId("history"),
    at: new Date().toISOString(),
    action,
    user: user?.name || user?.employeeName || "Unknown",
  });
  state.history = state.history.slice(0, 40);
}

function getStats(options = {}) {
  normalizeMonthData();
  const data = ensureMonth();
  const employees = options.employees ?? state.employees;
  const selectedDays = options.days ?? daysForPeriod();
  const selectedLocation = options.location ?? "";
  const employeeStats = Object.fromEntries(
    employees.map((employee) => [
      employee,
      {
        total: 0,
        days: 0,
        byLocation: Object.fromEntries(state.locations.map((location) => [location, 0])),
        byWeek: {},
      },
    ]),
  );
  const locationStats = Object.fromEntries(
    state.locations.map((location) => [location, { total: 0, shifts: 0, byEmployee: {} }]),
  );
  const weekStats = {};
  let total = 0;
  let shiftsWorked = 0;

  for (const day of selectedDays) {
    const week = dayInfo(day).isoWeek;
    weekStats[week] ??= { total: 0, shifts: 0, days: new Set() };
    for (const employee of employees) {
      const entry = data[day][employee];
      if (!canSeeEntry(employee, entry)) continue;
      if (selectedLocation && entry.location !== selectedLocation) continue;
      const hours = hoursForEntry(entry);
      const location = entry.location;
      total += hours;
      employeeStats[employee].total += hours;
      employeeStats[employee].byWeek[week] = (employeeStats[employee].byWeek[week] ?? 0) + hours;
      if (hours > 0) {
        shiftsWorked += 1;
        employeeStats[employee].days += 1;
        if (employeeStats[employee].byLocation[location] !== undefined) {
          employeeStats[employee].byLocation[location] += hours;
        }
        if (locationStats[location]) {
          locationStats[location].total += hours;
          locationStats[location].shifts += 1;
          locationStats[location].byEmployee[employee] = (locationStats[location].byEmployee[employee] ?? 0) + hours;
        }
        weekStats[week].shifts += 1;
        weekStats[week].days.add(day);
      }
      weekStats[week].total += hours;
    }
  }

  return { total, shiftsWorked, employeeStats, locationStats, weekStats };
}

function renderSelectors() {
  document.querySelector("#shiftOptions").innerHTML = shifts.map((shift) => `<option value="${shift}"></option>`).join("");

  el.yearSelect.innerHTML = "";
  for (let year = 2026; year <= 2030; year += 1) {
    const option = new Option(year, year);
    option.selected = year === state.year;
    el.yearSelect.append(option);
  }

  el.monthSelect.innerHTML = "";
  monthNames.forEach((name, index) => {
    const option = new Option(name, index);
    option.selected = index === state.month;
    el.monthSelect.append(option);
  });

  renderReportSelectors();
  renderQuickDuplicateControls();
}

function renderSelect(select, values, selectedValue) {
  select.innerHTML = "";
  for (const value of values) {
    const option = new Option(value, value);
    option.selected = value === selectedValue;
    select.append(option);
  }
}

function availableWeeks() {
  return [...new Set(daysForPeriod().map((day) => dayInfo(day).isoWeek))].sort((a, b) => a - b);
}

function renderReportSelectors() {
  const reportTypes =
    isEmployee()
      ? [
          ["month", "My month"],
          ["week", "My week"],
          ["threeWeeks", "My 3-week period"],
        ]
      : [
          ["month", "Full month"],
          ["employee", "Employee"],
          ["restaurant", "Restaurant"],
          ["week", "One week"],
          ["threeWeeks", "Three weeks"],
        ];
  if (!reportTypes.some(([value]) => value === state.report.type)) state.report.type = "month";
  el.reportType.innerHTML = "";
  for (const [value, label] of reportTypes) {
    const option = new Option(label, value);
    option.selected = value === state.report.type;
    el.reportType.append(option);
  }
  renderSelect(el.reportEmployee, state.employees, state.report.employee);
  renderSelect(el.reportLocation, state.locations, state.report.location);

  const weeks = availableWeeks().map(String);
  if (!weeks.includes(String(state.report.week))) state.report.week = weeks[0] ?? "";
  renderSelect(el.reportWeek, weeks.map((week) => `Week ${week}`), `Week ${state.report.week}`);
  [...el.reportWeek.options].forEach((option) => {
    option.value = option.textContent.replace("Week ", "");
  });
  el.reportWeek.value = String(state.report.week);

  const blocks = [
    { label: "Days 1-21", value: "1" },
    { label: `Days 22-${daysInMonth()}`, value: "2" },
  ];
  el.reportThreeWeek.innerHTML = "";
  for (const block of blocks) {
    const option = new Option(block.label, block.value);
    option.selected = block.value === String(state.report.threeWeek);
    el.reportThreeWeek.append(option);
  }
}

function renderQuickDuplicateControls() {
  if (!el.quickTargetWeek || !el.quickTargetThreeWeeks) return;
  const weekBlocks = duplicateBlocks("week", state.year, state.month);
  const threeWeekBlocks = duplicateBlocks("threeWeeks", state.year, state.month);
  if (!weekBlocks.some((block) => block.value === state.quickDuplicate.targetWeek)) state.quickDuplicate.targetWeek = weekBlocks[0]?.value ?? "";
  if (!threeWeekBlocks.some((block) => block.value === state.quickDuplicate.targetThreeWeeks)) state.quickDuplicate.targetThreeWeeks = threeWeekBlocks[0]?.value ?? "";
  el.quickTargetWeek.innerHTML = weekBlocks.map((block) => `<option value="${esc(block.value)}" ${block.value === state.quickDuplicate.targetWeek ? "selected" : ""}>${esc(block.label)}</option>`).join("");
  el.quickTargetThreeWeeks.innerHTML = threeWeekBlocks.map((block) => `<option value="${esc(block.value)}" ${block.value === state.quickDuplicate.targetThreeWeeks ? "selected" : ""}>${esc(block.label)}</option>`).join("");
}

function renderShell() {
  el.pageTitle.textContent = `${monthNames[state.month]} ${state.year} Schedule`;
  el.pageMeta.textContent = isEmployee() ? `${state.activeEmployee} read-only team schedule` : state.locations.join(" and ");
  const stats = getStats({ employees: visibleEmployees() });
  document.querySelector("#kpiTotal").textContent = formatNumber(stats.total);
  document.querySelector("#kpiKoivisto").textContent = formatNumber(stats.locationStats["Koivistonkylä"]?.total ?? 0);
  document.querySelector("#kpiYlojarvi").textContent = formatNumber(stats.locationStats["Ylöjärvi"]?.total ?? 0);
  document.querySelector("#kpiShifts").textContent = stats.shiftsWorked;
}

function renderSchedule() {
  if (isEmployee()) {
    renderEmployeeSchedule();
    return;
  }
  const filter = el.employeeFilter.value.trim().toLowerCase();
  const employees = visibleEmployees().filter((employee) => employee.toLowerCase().includes(filter));
  const rows = [];
  rows.push(`<table><thead><tr><th>Date</th><th>Day</th>${employees.map((e) => `<th>${esc(e)}</th>`).join("")}<th>Daily Hours</th></tr></thead><tbody>`);

  for (const block of duplicateBlocks("week", state.year, state.month)) {
    const visibleDates = block.dates.filter((date) => date.getFullYear() === state.year && date.getMonth() === state.month);
    if (!visibleDates.length) continue;
    rows.push(`<tr class="week-divider"><td colspan="${employees.length + 3}">${esc(block.label)}</td></tr>`);
    for (const date of visibleDates) {
      const day = date.getDate();
      const data = ensureMonth(state.year, state.month);
      const info = dayInfo(day);
      const total = employees.reduce((sum, employee) => {
        const entry = data[day][employee];
        return canSeeEntry(employee, entry) ? sum + hoursForEntry(entry) : sum;
      }, 0);
      const redClass = info.isRedDay ? " red-day-row" : "";
      const redTitle = info.holidayName || (info.isSunday ? "Sunday" : "");
      rows.push(`<tr class="${redClass.trim()}" title="${esc(redTitle)}"><td class="date-cell ${info.isRedDay ? "red-day-cell" : ""}">${day}</td><td class="day-cell ${info.isRedDay ? "red-day-cell" : ""}">${dayLabel(info)}</td>`);
      for (const employee of employees) {
        const entry = data[day][employee];
        rows.push(`<td>${scheduleCell(day, employee, entry)}</td>`);
      }
      rows.push(`<td class="daily-total">${formatNumber(total)}</td></tr>`);
    }
    const weeklyEmployeeTotals = employees.map((employee) =>
      block.dates.reduce((sum, date) => {
        if (date.getFullYear() !== state.year || date.getMonth() !== state.month) return sum;
        const entry = dataForDate(date)?.[employee];
        return canSeeEntry(employee, entry) ? sum + hoursForEntry(entry) : sum;
      }, 0),
    );
    const weeklyTotal = weeklyEmployeeTotals.reduce((sum, value) => sum + value, 0);
    rows.push(`<tr class="week-total-row"><td></td><td>Weekly total</td>${weeklyEmployeeTotals.map((total) => `<td>${formatNumber(total)}</td>`).join("")}<td>${formatNumber(weeklyTotal)}</td></tr>`);
  }

  rows.push("</tbody></table>");
  el.scheduleTable.innerHTML = rows.join("");
}

function renderEmployeeSchedule() {
  const employee = state.activeEmployee;
  const data = ensureMonth();
  const rows = [];
  rows.push(`<div class="employee-week-list">`);
  for (const block of duplicateBlocks("week", state.year, state.month)) {
    const visibleDates = block.dates.filter((date) => date.getFullYear() === state.year && date.getMonth() === state.month);
    if (!visibleDates.length) continue;
    const weekTotal = visibleDates.reduce((sum, date) => sum + hoursForEntry(data[date.getDate()]?.[employee]), 0);
    const isOpen = visibleDates.some((date) => !data[date.getDate()]?.[employee]?.published);
    rows.push(`
      <article class="employee-week-card">
        <header>
          <h3>Week ${dayInfo(visibleDates[0].getDate()).isoWeek} / ${state.year}</h3>
          <span>${isOpen ? "OPEN" : "ACTUAL SHIFTS"}<i></i></span>
        </header>
        <div class="employee-days">
    `);
    for (const date of visibleDates) {
      const day = date.getDate();
      const entry = data[day]?.[employee];
      const info = dayInfo(day);
      rows.push(`
        <div class="employee-day-row ${info.isRedDay ? "employee-red-day" : ""}">
          <div class="employee-date">${employeeDayLabel(date)}</div>
          <div class="employee-shift-area">${employeeShiftCard(day, employee, entry)}</div>
        </div>
      `);
      if (String(employeeRequestDay) === String(day) && entry && !entry.published) {
        rows.push(employeeRequestPanel(day, employee, entry));
      }
    }
    rows.push(`
        </div>
        <footer><span>Total</span><strong>${formatDuration(weekTotal)}</strong></footer>
      </article>
    `);
  }
  rows.push(`</div>`);
  el.scheduleTable.innerHTML = rows.join("");
}

function employeeShiftCard(day, employee, entry) {
  if (!entry) return "";
  if (entry.published) {
    const label = entry.shift === "Sick leave" ? `Sick leave (${entry.paidShift || entry.publishedShift || "paid shift"})` : reportShiftText(entry);
    return `<button class="employee-shift-card" type="button" data-open-entry="${day}"><span>${esc(label)}</span><b>Locked</b></button>`;
  }
  if (entry.shift === "Wish OFF") {
    return `<button class="employee-shift-card wish-card" type="button" data-request-day="${day}"><span>Wish OFF</span><b>+</b></button>`;
  }
  return `<button class="employee-add-shift" type="button" data-request-day="${day}" aria-label="Request wish off for ${employee} on day ${day}">+</button>`;
}

function employeeRequestPanel(day, employee, entry) {
  return `
    <div class="employee-request-panel">
      <div class="request-times">
        <label>Start<input value="12:00 AM" readonly /></label>
        <label>End<input value="12:00 AM" readonly /></label>
        <label>Total<input value="0:00" readonly /></label>
      </div>
      <label>Workplace<select disabled><option>${esc(entry.location || state.locations[0] || "")}</option></select></label>
      <label>Working hour type<select data-request-type="${day}"><option value="Wish OFF">Wish OFF</option></select></label>
      <label>Information<textarea data-request-comment="${day}" rows="3" placeholder="Comment">${esc(entry.comment)}</textarea></label>
      <button class="primary-button" type="button" data-save-request="${day}" data-request-employee="${encodeURIComponent(employee)}">Save request</button>
    </div>
  `;
}

function employeeDayLabel(date) {
  return `${date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function scheduleCell(day, employee, entry) {
  const visible = canSeeEntry(employee, entry) || employee === state.activeEmployee;
  if (!visible) return `<div class="schedule-cell muted-cell">Unpublished</div>`;
  const tools = isEmployer()
    ? `<button class="publish-button ${entry.published ? "published" : ""}" type="button" data-publish-day="${day}" data-publish-employee="${encodeURIComponent(employee)}">${entry.published ? "Published" : "Publish"}</button>`
    : entry.published
      ? `<span class="published-badge">Published</span>`
      : `<span class="published-badge draft">Unpublished</span>`;
  const sickPaid = entry.shift === "Sick leave" && hoursForEntry(entry) > 0 ? `<span class="paid-shift">Paid: ${esc(entry.paidShift || entry.publishedShift)}</span>` : "";
  return `
    <div class="schedule-cell ${entry.published ? "published-cell" : "draft-cell"}">
      ${shiftSelect(day, employee, entry)}
      ${locationSelect(day, employee, entry)}
      ${commentInput(day, employee, entry)}
      <div class="cell-tools">${tools}${sickPaid}</div>
    </div>
  `;
}

function shiftSelect(day, employee, entry) {
  const value = entry.shift;
  const locked = canEditEntry(employee, entry, "shift") ? "" : "readonly";
  return `
    <input
      class="shift-select ${classForShift(value)}"
      data-day="${day}"
      data-employee="${encodeURIComponent(employee)}"
      data-field="shift"
      value="${esc(value)}"
      list="shiftOptions"
      inputmode="text"
      ${locked}
      aria-label="${esc(employee)} shift on day ${day}"
    />
  `;
}

function locationSelect(day, employee, entry) {
  const value = entry.location;
  const locked = canEditEntry(employee, entry, "location") ? "" : "disabled";
  return `
    <select class="location-select ${classForLocation(value)}" data-day="${day}" data-employee="${encodeURIComponent(employee)}" data-field="location" ${locked}>
      ${state.locations.map((location) => `<option value="${esc(location)}" ${location === value ? "selected" : ""}>${esc(location)}</option>`).join("")}
    </select>
  `;
}

function commentInput(day, employee, entry) {
  const locked = canEditEntry(employee, entry, "comment") ? "" : "readonly";
  return `
    <textarea class="comment-input" data-day="${day}" data-employee="${encodeURIComponent(employee)}" data-field="comment" rows="2" placeholder="Comment" ${locked}>${esc(entry.comment)}</textarea>
  `;
}

function canEditEntry(employee, entry, field) {
  if (isEmployer()) return true;
  if (employee !== state.activeEmployee || entry.published) return false;
  return field === "shift" || field === "comment";
}

function canSeeEntry(employee, entry) {
  if (isEmployer()) return true;
  if (entry?.published) return true;
  return employee === state.activeEmployee && entry?.shift === "Wish OFF";
}

function renderEmployeeSummary() {
  const employees = visibleEmployees();
  const { employeeStats } = getStats({ employees });
  const weeks = [...new Set(Object.values(employeeStats).flatMap((stat) => Object.keys(stat.byWeek)))].sort((a, b) => Number(a) - Number(b));
  const locationHeaders = state.locations.map((loc) => `<th>${esc(loc)}</th>`).join("");
  const weekHeaders = weeks.map((week) => `<th>Week ${week}</th>`).join("");
  const rows = employees
    .map((employee) => {
      const stat = employeeStats[employee];
      return `
        <tr>
          <td>${esc(employee)}</td>
          ${state.locations.map((loc) => `<td>${formatNumber(stat.byLocation[loc] ?? 0)}</td>`).join("")}
          <td class="total">${formatNumber(stat.total)}</td>
          <td>${stat.days}</td>
          ${weeks.map((week) => `<td>${formatNumber(stat.byWeek[week] ?? 0)}</td>`).join("")}
        </tr>
      `;
    })
    .join("");
  el.employeeSummary.innerHTML = `
    <table class="summary-table">
      <thead><tr><th>Employee</th>${locationHeaders}<th>Total Hours</th><th>Days</th>${weekHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLocationSummary() {
  const employees = visibleEmployees();
  const { locationStats } = getStats({ employees });
  el.locationSummary.innerHTML = `
    <table class="summary-table">
      <thead><tr><th>Restaurant</th><th>Total Hours</th><th>Shifts</th>${employees.map((e) => `<th>${esc(e)}</th>`).join("")}</tr></thead>
      <tbody>
        ${state.locations
          .map((loc) => {
            const stat = locationStats[loc];
            return `<tr><td>${esc(loc)}</td><td class="total">${formatNumber(stat.total)}</td><td>${stat.shifts}</td>${employees.map((e) => `<td>${formatNumber(stat.byEmployee[e] ?? 0)}</td>`).join("")}</tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `;

  const data = ensureMonth();
  const blocks = [];
  for (let day = 1; day <= daysInMonth(); day += 1) {
    const active = [];
    for (const employee of employees) {
      const entry = data[day][employee];
      const hours = hoursForEntry(entry);
      if (hours > 0) active.push({ employee, ...entry, hours });
    }
    if (!active.length) continue;
    const info = dayInfo(day);
    blocks.push(`
      <section class="roster-day ${info.isRedDay ? "red-day-roster" : ""}">
        <h3>${day} ${dayLabel(info)}</h3>
        ${active
          .map((row) => `<div class="roster-row"><span>${esc(row.employee)}</span><strong>${esc(row.shift)}</strong><span>${esc(row.location)}</span></div>`)
          .join("")}
      </section>
    `);
  }
  el.locationRoster.innerHTML = blocks.join("") || `<div class="roster-day"><h3>No assigned shifts</h3></div>`;
}

function renderWeeks() {
  const { weekStats } = getStats({ employees: visibleEmployees() });
  const max = Math.max(1, ...Object.values(weekStats).map((w) => w.total));
  el.weekSummary.innerHTML = `
    <div class="week-cards">
      ${Object.entries(weekStats)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(
          ([week, stat]) => `
            <article class="week-card">
              <h3>Week ${week}</h3>
              <p><strong>${formatNumber(stat.total)}</strong> hours</p>
              <p>${stat.shifts} working shifts</p>
              <div class="week-bar"><span style="width:${Math.round((stat.total / max) * 100)}%"></span></div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSettings() {
  renderDuplicateControls();
  renderHistory();
  el.employeeEditor.innerHTML = state.employees
    .map(
      (name) => `
        <div class="editor-row">
          <input type="text" value="${esc(name)}" data-edit-employee="${encodeURIComponent(name)}" />
          <button type="button" data-create-invite="${encodeURIComponent(name)}">Login link</button>
          <button type="button" data-save-employee="${encodeURIComponent(name)}">Save</button>
          <button type="button" data-remove-employee="${encodeURIComponent(name)}">Remove</button>
        </div>
      `,
    )
    .join("");
  el.locationEditor.innerHTML = state.locations
    .map(
      (name) => `
        <div class="editor-row">
          <input type="text" value="${esc(name)}" data-edit-location="${encodeURIComponent(name)}" />
          <button type="button" data-save-location="${encodeURIComponent(name)}">Save</button>
          <button type="button" data-remove-location="${encodeURIComponent(name)}">Remove</button>
        </div>
      `,
    )
    .join("");

  el.employerEditor.innerHTML =
    state.auth.employers
      .map(
        (account) => `
          <div class="editor-row account-row">
            <input type="text" value="${esc(account.name)}" data-edit-employer-name="${account.id}" aria-label="Employer name" />
            <input type="email" value="${esc(account.email)}" data-edit-employer-email="${account.id}" aria-label="Employer email" />
            <input type="text" value="${esc(account.username)}" data-edit-employer-username="${account.id}" aria-label="Employer username" />
            <button type="button" data-save-employer="${account.id}">Save</button>
            <button type="button" data-remove-employer="${account.id}">Remove</button>
          </div>
        `,
      )
      .join("") || `<p class="empty-note">No employer IDs yet.</p>`;

  el.inviteEditor.innerHTML = state.employees
    .map((employee) => {
      const invite = state.auth.invites.find((item) => item.employeeName === employee && !item.used);
      const employeeAccount = state.auth.employees.find((item) => item.employeeName === employee);
      return `
        <div class="invite-row">
          <strong>${esc(employee)}</strong>
          <span>${employeeAccount ? `Login active: ${esc(employeeAccount.username)}` : "No login yet"}</span>
          <button type="button" data-create-invite="${encodeURIComponent(employee)}">Create link</button>
          ${invite ? `<input readonly value="${esc(inviteLink(invite.token))}" aria-label="${esc(employee)} login link" />` : ""}
        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!el.historyList) return;
  const rows = (state.history ?? []).slice(0, 12);
  el.historyList.innerHTML =
    rows
      .map((item) => {
        const date = new Date(item.at);
        const stamp = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
        return `<div class="history-row"><span>${esc(stamp)}</span><strong>${esc(item.action)}</strong><em>${esc(item.user)}</em></div>`;
      })
      .join("") || `<p class="empty-note">No saved history yet.</p>`;
}

function renderDuplicateControls() {
  if (!el.duplicatePeriod) return;
  const duplicate = state.duplicate;
  duplicate.targetYear = Number(duplicate.targetYear || state.year);
  duplicate.targetMonth = Number.isFinite(Number(duplicate.targetMonth)) ? Number(duplicate.targetMonth) : state.month;

  el.duplicatePeriod.value = duplicate.period;
  el.duplicateYear.innerHTML = "";
  for (let year = 2026; year <= 2030; year += 1) {
    const option = new Option(year, year);
    option.selected = year === Number(duplicate.targetYear);
    el.duplicateYear.append(option);
  }
  el.duplicateMonth.innerHTML = "";
  monthNames.forEach((name, index) => {
    const option = new Option(name, index);
    option.selected = index === Number(duplicate.targetMonth);
    el.duplicateMonth.append(option);
  });

  const fromBlocks = duplicateBlocks(duplicate.period, state.year, state.month);
  const toBlocks = duplicateBlocks(duplicate.period, Number(duplicate.targetYear), Number(duplicate.targetMonth));
  if (!fromBlocks.some((block) => block.value === duplicate.fromBlock)) duplicate.fromBlock = fromBlocks[0]?.value ?? "";
  if (!toBlocks.some((block) => block.value === duplicate.targetBlock)) duplicate.targetBlock = toBlocks[0]?.value ?? "";

  el.duplicateFromBlock.innerHTML = fromBlocks.map((block) => `<option value="${esc(block.value)}" ${block.value === duplicate.fromBlock ? "selected" : ""}>${esc(block.label)}</option>`).join("");
  el.duplicateToBlock.innerHTML = toBlocks.map((block) => `<option value="${esc(block.value)}" ${block.value === duplicate.targetBlock ? "selected" : ""}>${esc(block.label)}</option>`).join("");
  el.duplicateFromBlock.disabled = duplicate.period === "month";
  el.duplicateToBlock.disabled = duplicate.period === "month";
}

function getReportConfig() {
  const type = isEmployee() && state.report.type !== "week" && state.report.type !== "threeWeeks" ? "employee" : state.report.type;
  let title = `${monthNames[state.month]} ${state.year}`;
  let employees = [...state.employees];
  let location = "";
  let days = daysForPeriod();

  if (type === "employee") {
    employees = [isEmployee() ? state.activeEmployee : state.report.employee];
    title = `${employees[0]} - ${title}`;
  }
  if (type === "restaurant") {
    location = state.report.location;
    title = `${location} - ${title}`;
  }
  if (type === "week") {
    days = daysForPeriod("week", state.report.week);
    title = `Week ${state.report.week} - ${title}`;
    if (isEmployee()) employees = [state.activeEmployee];
  }
  if (type === "threeWeeks") {
    days = daysForPeriod("threeWeeks", state.report.threeWeek);
    const first = days[0] ?? 1;
    const last = days.at(-1) ?? daysInMonth();
    title = `Days ${first}-${last} - ${title}`;
    if (isEmployee()) employees = [state.activeEmployee];
  }
  if (type === "month" && isEmployee()) employees = [state.activeEmployee];

  return { type, title, employees, location, days };
}

function buildReportHtml(config = getReportConfig()) {
  const data = ensureMonth();
  const visibleEmployees = config.employees.filter((employee) =>
    config.days.some((day) => {
      const entry = data[day]?.[employee];
      if (!entry) return false;
      if (!canSeeEntry(employee, entry)) return false;
      if (config.location && entry.location !== config.location) return false;
      return hoursForEntry(entry) > 0;
    }),
  );
  const reportEmployees = visibleEmployees.length ? visibleEmployees : [];
  const weekGroups = reportWeekGroups(config.days);
  const periodLabel = config.type === "threeWeeks" ? "3 Week Total" : config.type === "month" ? "Month Total" : "Period Total";
  const employeeHead = reportEmployees.map((employee) => `<th>${esc(employee)}</th>`).join("");
  const reportRows = reportEmployees.length
    ? weekGroups
        .map((group) =>
          `${group.days
            .map((day) => {
              const info = dayInfo(day);
              const dayCells = reportEmployees
                .map((employee) => {
                  const entry = data[day]?.[employee];
                  if (!canSeeEntry(employee, entry) || (config.location && entry.location !== config.location) || hoursForEntry(entry) <= 0) return "<td></td>";
                  return `<td>${esc(reportShiftText(entry))}</td>`;
                })
                .join("");
              return `<tr class="${info.isRedDay ? "report-red-day" : ""}"><td></td><td class="${info.isRedDay ? "report-red-day-cell" : ""}">${esc(reportDayName(day))}</td><td class="${info.isRedDay ? "report-red-day-cell" : ""}">${esc(reportDateLabel(day))}</td>${dayCells}</tr>`;
            })
            .join("")}${reportWeekTotalRow(group, reportEmployees, config, data)}`,
        )
        .join("")
    : "";
  const totalRow = reportPeriodTotalRow(reportEmployees, weekGroups, config, data, periodLabel);

  return `
    <article class="print-report">
      <header>
        <h1>Dgtech foods Oy</h1>
        <h2>${esc(config.title)}</h2>
        <p>${config.location ? esc(config.location) : "All restaurants"} · ${esc(periodLabel)}</p>
      </header>
      <table class="matrix-report">
        <thead>
          <tr><th></th><th>Days</th><th>Dates</th>${employeeHead}</tr>
        </thead>
        <tbody>${reportRows || `<tr><td colspan="${reportEmployees.length + 3}">No employees with worked shifts.</td></tr>`}${reportRows ? totalRow : ""}</tbody>
      </table>
      <footer class="report-footer">
        <p>© 2026 Dgtech foods oy. All Rights Reserved.</p>
        <p>Developed by Dgtech Oy</p>
      </footer>
    </article>
  `;
}

function reportWeekTotalRow(group, employees, config, data) {
  const cells = employees
    .map((employee) => {
      const total = group.days.reduce((sum, day) => {
        const entry = data[day]?.[employee];
        if (!canSeeEntry(employee, entry) || (config.location && entry.location !== config.location)) return sum;
        return sum + hoursForEntry(entry);
      }, 0);
      return `<td>${formatNumber(total)}</td>`;
    })
    .join("");
  return `<tr class="report-total-row"><td></td><td>Total</td><td></td>${cells}</tr>`;
}

function reportPeriodTotalRow(employees, weekGroups, config, data, periodLabel) {
  const allDays = weekGroups.flatMap((group) => group.days);
  const cells = employees
    .map((employee) => {
      const total = allDays.reduce((sum, day) => {
        const entry = data[day]?.[employee];
        if (!canSeeEntry(employee, entry) || (config.location && entry.location !== config.location)) return sum;
        return sum + hoursForEntry(entry);
      }, 0);
      return `<td>${formatNumber(total)}</td>`;
    })
    .join("");
  return `<tr class="report-total-row report-period-row"><td></td><td>${esc(periodLabel)}</td><td></td>${cells}</tr>`;
}

function reportShiftText(entry) {
  if (entry.shift === "Sick leave") return `Sick leave(${entry.paidShift || entry.publishedShift || "paid shift"})`;
  if (entry.location === "Ylöjärvi") return `${entry.shift}(Ylo)`;
  if (entry.location && entry.location !== "Koivistonkylä") return `${entry.shift}(${entry.location})`;
  return entry.shift;
}

function reportDayName(day) {
  return new Date(state.year, state.month, day).toLocaleDateString("en-US", { weekday: "long" });
}

function reportDateLabel(day) {
  return new Date(state.year, state.month, day).toLocaleDateString("en-US", { day: "numeric", month: "short" }).replace(" ", "-");
}

function reportWeekGroups(days) {
  const selected = new Set(days.map(String));
  return duplicateBlocks("week", state.year, state.month)
    .map((block) => ({
      week: dayInfo(block.dates.find((date) => date.getFullYear() === state.year && date.getMonth() === state.month)?.getDate() ?? 1).isoWeek,
      days: block.dates
        .filter((date) => date.getFullYear() === state.year && date.getMonth() === state.month)
        .map((date) => date.getDate())
        .filter((day) => selected.has(String(day))),
    }))
    .filter((group) => group.days.length);
}

function renderReportPreview() {
  el.reportPreview.innerHTML = buildReportHtml();
  const type = state.report.type;
  setReportControl("reportEmployee", type === "employee" && isEmployer());
  setReportControl("reportLocation", type === "restaurant" && isEmployer());
  setReportControl("reportWeek", type === "week");
  setReportControl("reportThreeWeek", type === "threeWeeks");
}

function setReportControl(id, visible) {
  const control = document.querySelector(`#${id}`);
  const label = document.querySelector(`label[for="${id}"]`);
  control.hidden = !visible;
  label.hidden = !visible;
}

function openReportWindow() {
  const html = buildReportHtml();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    toast("Allow popups to open PDF view");
    return;
  }
  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Dgtech foods Oy report</title>
        <link rel="stylesheet" href="./styles.css">
      </head>
      <body class="print-body">
        ${html}
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

function render() {
  syncAuthRole();
  renderAuth();
  if (!currentUser()) return;
  normalizeMonthData();
  if (isEmployee() && !["schedule", "reports"].includes(state.view)) state.view = "schedule";
  document.body.classList.toggle("employee-mode", isEmployee());
  renderSelectors();
  renderShell();
  renderSchedule();
  renderEmployeeSummary();
  renderLocationSummary();
  renderWeeks();
  renderSettings();
  renderReportPreview();
  publishButtonState();
  document.querySelectorAll(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${state.view}View`));
}

function updateEntry(target) {
  const day = target.dataset.day;
  const employee = decodeURIComponent(target.dataset.employee);
  const field = target.dataset.field;
  if (!day || !employee || !field) return;
  const entry = ensureMonth()[day][employee];
  if (!canEditEntry(employee, entry, field)) return;
  if (field === "shift") {
    const nextValue = normalizeShift(target.value);
    if (isEmployee() && !["", "00:00-00:00", "Wish OFF"].includes(nextValue)) {
      target.value = entry.shift;
      toast("Employees can only request Wish OFF before publishing");
      return;
    }
    if (!isValidShift(nextValue)) {
      target.classList.add("invalid");
      toast("Use HH:MM-HH:MM, OFF, Wish OFF, or Sick leave");
      return;
    }
    if (nextValue === "Sick leave" && entry.shift !== "Sick leave") {
      entry.paidShift = entry.publishedShift || (hoursFromShift(entry.shift) > 0 ? entry.shift : "");
    }
    if (nextValue !== "Sick leave") entry.paidShift = "";
    entry[field] = nextValue || "00:00-00:00";
    if (isEmployer() && entry.published && entry.shift !== "Sick leave") entry.publishedShift = entry.shift;
  } else {
    entry[field] = field === "comment" ? target.value.trim() : target.value;
  }
  if (isEmployee()) saveEmployeeEntryRequest(day, employee, entry);
  saveState();
  render();
}

function saveEmployeeEntryRequest(day, employee, entry) {
  if (!serverReady) return;
  apiRequest("employeeRequest", {
    day,
    employee,
    shift: entry.shift,
    comment: entry.comment,
    year: state.year,
    month: state.month,
  }).catch((error) => toast(error.message));
}

function saveEmployeeWishRequest(day, employee) {
  if (!isEmployee()) return;
  const entry = ensureMonth()[day]?.[employee];
  if (!entry || entry.published || employee !== state.activeEmployee) return;
  const comment = document.querySelector(`[data-request-comment="${CSS.escape(String(day))}"]`)?.value.trim() ?? "";
  entry.shift = "Wish OFF";
  entry.comment = comment;
  employeeRequestDay = "";
  saveEmployeeEntryRequest(day, employee, entry);
  saveState(true);
  render();
  toast("Wish OFF requested");
}

function togglePublish(day, employee) {
  if (!isEmployer()) return;
  const entry = ensureMonth()[day]?.[employee];
  if (!entry) return;
  entry.published = !entry.published;
  entry.publishedShift = entry.published ? entry.shift : "";
  if (entry.shift === "Sick leave" && entry.published && !entry.paidShift) entry.paidShift = entry.publishedShift;
  saveState(true);
  render();
}

function publishVisibleMonth() {
  if (!isEmployer()) return;
  const data = ensureMonth();
  for (let day = 1; day <= daysInMonth(); day += 1) {
    for (const employee of state.employees) {
      const entry = data[day]?.[employee];
      if (!entry) continue;
      entry.published = true;
      entry.publishedShift = entry.shift;
      if (entry.shift === "Sick leave" && !entry.paidShift) entry.paidShift = entry.publishedShift;
    }
  }
  logHistory(`Published ${monthNames[state.month]} ${state.year}`);
  saveState(true);
  render();
  toast("Month published to employees");
}

function publishButtonState() {
  const button = document.querySelector("#publishMonth");
  if (!button) return;
  button.hidden = !isEmployer();
}

function seedMaySample() {
  if (!isEmployer()) return;
  state.year = 2026;
  state.month = 4;
  const data = {};
  const shiftRotation = ["09:00-17:00", "13:00-18:00", "17:00-23:00", "09:00-14:00", "09:00-17:00", "13:00-18:00", "OFF", "09:00-14:00"];
  for (let day = 1; day <= 31; day += 1) {
    data[day] = {};
    state.employees.forEach((employee, index) => {
      const shift = shiftRotation[(day + index - 1) % shiftRotation.length];
      data[day][employee] = {
        shift,
        location: shift === "OFF" ? state.locations[0] : state.locations[(day + index) % state.locations.length],
        comment: "",
        published: false,
        publishedShift: "",
        paidShift: "",
      };
    });
  }
  state.months[monthKey(2026, 4)] = data;
  logHistory("Loaded May sample");
  saveState(true);
  render();
}

function blankMonth() {
  if (!isEmployer()) return;
  const data = {};
  for (let day = 1; day <= daysInMonth(); day += 1) {
    data[day] = {};
    for (const employee of state.employees) {
      data[day][employee] = { shift: "00:00-00:00", location: state.locations[0] ?? "", comment: "", published: false, publishedShift: "", paidShift: "" };
    }
  }
  state.months[monthKey()] = data;
  logHistory(`Blanked ${monthNames[state.month]} ${state.year}`);
  saveState(true);
  render();
}

function manualSave() {
  if (isEmployer()) logHistory(`Saved ${monthNames[state.month]} ${state.year}`);
  saveState(true);
  renderSettings();
}

function duplicateShifts() {
  if (!isEmployer()) return;
  const duplicate = state.duplicate;
  const sourceBlocks = duplicateBlocks(duplicate.period, state.year, state.month);
  const targetYear = Number(duplicate.targetYear);
  const targetMonth = Number(duplicate.targetMonth);
  const targetBlocks = duplicateBlocks(duplicate.period, targetYear, targetMonth);
  const sourceBlock = sourceBlocks.find((block) => block.value === duplicate.fromBlock) ?? sourceBlocks[0];
  const targetBlock = targetBlocks.find((block) => block.value === duplicate.targetBlock) ?? targetBlocks[0];
  if (!sourceBlock || !targetBlock) {
    toast("Choose source and target period");
    return;
  }
  const copyLength = Math.min(sourceBlock.dates.length, targetBlock.dates.length);
  for (let index = 0; index < copyLength; index += 1) {
    const sourceDate = sourceBlock.dates[index];
    const targetDate = targetBlock.dates[index];
    const sourceDayData = dataForDate(sourceDate);
    const targetData = ensureMonth(targetDate.getFullYear(), targetDate.getMonth());
    const targetDay = targetDate.getDate();
    targetData[targetDay] ??= {};
    for (const employee of state.employees) {
      targetData[targetDay][employee] = copyEntry(sourceDayData?.[employee]);
    }
  }
  logHistory(`Duplicated ${duplicate.period} to ${monthNames[targetMonth]} ${targetYear}`);
  state.year = targetYear;
  state.month = targetMonth;
  saveState(true);
  render();
  toast(`Duplicated ${copyLength} days`);
}

function monthBefore(year = state.year, month = state.month) {
  const date = new Date(year, month - 1, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function dataForDate(date) {
  const monthData = ensureMonth(date.getFullYear(), date.getMonth());
  return monthData[date.getDate()];
}

function copyEntry(entry) {
  return {
    shift: entry?.shift || "00:00-00:00",
    location: entry?.location || state.locations[0] || "",
    comment: entry?.comment || "",
    published: false,
    publishedShift: "",
    paidShift: "",
  };
}

function duplicateRecentDays(dayCount, label, targetValue = "") {
  if (!isEmployer()) return;
  const period = dayCount === 21 ? "threeWeeks" : "week";
  const targetBlocks = duplicateBlocks(period, state.year, state.month);
  const targetBlock = targetBlocks.find((block) => block.value === targetValue) ?? targetBlocks[0];
  const targetDates = targetBlock?.dates ?? dateRange(new Date(state.year, state.month, 1), Math.min(dayCount, daysInMonth()));
  const sourceStart = addDays(targetDates[0], -dayCount);
  for (let offset = 0; offset < targetDates.length; offset += 1) {
    const sourceDate = addDays(sourceStart, offset);
    const targetDate = targetDates[offset];
    const targetData = ensureMonth(targetDate.getFullYear(), targetDate.getMonth());
    const targetDay = targetDate.getDate();
    targetData[targetDay] ??= {};
    const sourceDayData = dataForDate(sourceDate);
    for (const employee of state.employees) {
      targetData[targetDay][employee] = copyEntry(sourceDayData?.[employee]);
    }
  }
  logHistory(`Copied ${label} into ${targetBlock?.label ?? "current period"}`);
  saveState(true);
  render();
  toast(`Copied ${label}`);
}

function duplicateLastMonth() {
  if (!isEmployer()) return;
  const previous = monthBefore();
  const sourceData = ensureMonth(previous.year, previous.month);
  const targetData = ensureMonth(state.year, state.month);
  const copyLength = Math.min(daysInSpecificMonth(previous.year, previous.month), daysInMonth());
  for (let day = 1; day <= copyLength; day += 1) {
    targetData[day] ??= {};
    for (const employee of state.employees) {
      targetData[day][employee] = copyEntry(sourceData[day]?.[employee]);
    }
  }
  logHistory(`Copied last month into ${monthNames[state.month]} ${state.year}`);
  saveState(true);
  render();
  toast("Copied last month");
}

function addEmployee() {
  if (!isEmployer()) return;
  const name = el.newEmployee.value.trim();
  if (!name || state.employees.includes(name)) return;
  state.employees.push(name);
  for (const month of Object.values(state.months)) {
    for (const day of Object.values(month)) {
      day[name] = { shift: "00:00-00:00", location: state.locations[0] ?? "", comment: "", published: false, publishedShift: "", paidShift: "" };
    }
  }
  el.newEmployee.value = "";
  saveState(true);
  render();
}

function addLocation() {
  if (!isEmployer()) return;
  const name = el.newLocation.value.trim();
  if (!name || state.locations.includes(name)) return;
  state.locations.push(name);
  el.newLocation.value = "";
  saveState(true);
  render();
}

function accountNameTaken(username, email, exceptId = "") {
  const normalizedUsername = normalizeLogin(username);
  const normalizedEmail = normalizeLogin(email);
  return [...state.auth.employers, ...state.auth.employees].some(
    (account) => account.id !== exceptId && (normalizeLogin(account.username) === normalizedUsername || normalizeLogin(account.email) === normalizedEmail),
  );
}

function addEmployer() {
  if (!isEmployer()) return;
  if (state.auth.employers.length >= 4) {
    toast("Maximum 4 employer IDs");
    return;
  }
  const name = el.newEmployerName.value.trim();
  const email = el.newEmployerEmail.value.trim();
  const username = el.newEmployerUsername.value.trim();
  const password = el.newEmployerPassword.value;
  if (!name || !email || !username || !password) {
    toast("Fill all employer fields");
    return;
  }
  if (accountNameTaken(username, email)) {
    toast("Email or username already exists");
    return;
  }
  if (serverReady) {
    apiRequest("addEmployer", { name, email, username, password })
      .then(() => {
        el.newEmployerName.value = "";
        el.newEmployerEmail.value = "";
        el.newEmployerUsername.value = "";
        el.newEmployerPassword.value = "";
        toast("Saved");
        render();
      })
      .catch((error) => toast(error.message));
    return;
  }
  state.auth.employers.push({
    id: createId("employer"),
    name,
    email,
    username,
    passwordHash: passwordHash(password),
  });
  el.newEmployerName.value = "";
  el.newEmployerEmail.value = "";
  el.newEmployerUsername.value = "";
  el.newEmployerPassword.value = "";
  saveState(true);
  render();
}

function createInvite(employeeName) {
  if (!isEmployer()) return;
  if (!state.employees.includes(employeeName)) return;
  if (serverReady) {
    apiRequest("createInvite", { employeeName })
      .then((data) => {
        render();
        window.prompt("Employee login link", inviteLink(data.invite.token));
      })
      .catch((error) => toast(error.message));
    return;
  }
  state.auth.invites = state.auth.invites.filter((invite) => invite.employeeName !== employeeName || invite.used);
  const invite = {
    token: createId("invite"),
    employeeName,
    createdAt: new Date().toISOString(),
    used: false,
  };
  state.auth.invites.push(invite);
  saveState(true);
  render();
  window.prompt("Employee login link", inviteLink(invite.token));
}

function saveEmployer(id, row) {
  if (!isEmployer()) return;
  const account = state.auth.employers.find((item) => item.id === id);
  if (!account) return;
  const name = row.querySelector(`[data-edit-employer-name="${id}"]`)?.value.trim() ?? "";
  const email = row.querySelector(`[data-edit-employer-email="${id}"]`)?.value.trim() ?? "";
  const username = row.querySelector(`[data-edit-employer-username="${id}"]`)?.value.trim() ?? "";
  if (!name || !email || !username) {
    toast("Employer fields cannot be empty");
    return;
  }
  if (accountNameTaken(username, email, id)) {
    toast("Email or username already exists");
    return;
  }
  if (serverReady) {
    apiRequest("saveEmployer", { id, name, email, username })
      .then(() => render())
      .catch((error) => toast(error.message));
    return;
  }
  Object.assign(account, { name, email, username });
  saveState(true);
  render();
}

function removeEmployer(id) {
  if (!isEmployer()) return;
  if (state.auth.employers.length <= 1) {
    toast("Keep at least one employer ID");
    return;
  }
  if (serverReady) {
    apiRequest("removeEmployer", { id })
      .then(() => {
        if (state.auth.session?.id === id) {
          sessionToken = "";
          localStorage.removeItem(sessionKey);
        }
        render();
      })
      .catch((error) => toast(error.message));
    return;
  }
  state.auth.employers = state.auth.employers.filter((account) => account.id !== id);
  if (state.auth.session?.id === id) state.auth.session = null;
  saveState(true);
  render();
}

function renameEmployee(oldName, newName) {
  if (!isEmployer()) return;
  const clean = newName.trim();
  if (!clean || clean === oldName || state.employees.includes(clean)) return;
  state.employees = state.employees.map((name) => (name === oldName ? clean : name));
  if (state.activeEmployee === oldName) state.activeEmployee = clean;
  if (state.report.employee === oldName) state.report.employee = clean;
  for (const month of Object.values(state.months)) {
    for (const day of Object.values(month)) {
      if (day[oldName]) {
        day[clean] = day[oldName];
        delete day[oldName];
      }
    }
  }
  saveState(true);
  render();
}

function renameLocation(oldName, newName) {
  if (!isEmployer()) return;
  const clean = newName.trim();
  if (!clean || clean === oldName || state.locations.includes(clean)) return;
  state.locations = state.locations.map((name) => (name === oldName ? clean : name));
  if (state.report.location === oldName) state.report.location = clean;
  for (const month of Object.values(state.months)) {
    for (const day of Object.values(month)) {
      for (const entry of Object.values(day)) {
        if (entry.location === oldName) entry.location = clean;
      }
    }
  }
  saveState(true);
  render();
}

function exportData() {
  if (!isEmployer()) return;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dgtech-shiftplanner-${state.year}-${String(state.month + 1).padStart(2, "0")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!isEmployer()) return;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".xlsx")) {
    try {
      const result = await importExcelSchedule(file);
      logHistory(`Imported Excel ${file.name}`);
      saveState(true);
      render();
      toast(`Imported ${result.days} days and ${result.shifts} shifts`);
    } catch (error) {
      toast(error.message || "Could not import Excel");
    }
    return;
  }
  try {
    const imported = JSON.parse(await file.text());
    state = mergeLoadedState(imported);
    logHistory(`Imported JSON ${file.name}`);
    saveState(true);
    render();
  } catch {
    toast("Could not import file");
  }
}

async function importExcelSchedule(file) {
  const entries = await unzipXlsx(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(textFromEntry(entries, "xl/sharedStrings.xml", ""));
  const sheetNames = parseWorkbookSheets(textFromEntry(entries, "xl/workbook.xml"), textFromEntry(entries, "xl/_rels/workbook.xml.rels"));
  const worksheets = sheetNames.length ? sheetNames : [{ name: "Sheet1", path: "xl/worksheets/sheet1.xml" }];
  const fallbackYear = importedYearHint(`${file.name} ${worksheets.map((sheet) => sheet.name).join(" ")}`);
  const fallbackMonth = importedMonthHint(file.name);
  const importedEmployees = new Set();
  const importedDays = new Set();
  let shiftsImported = 0;

  for (const sheet of worksheets) {
    if (!entries.has(sheet.path)) continue;
    const rows = parseSheetRows(textFromEntry(entries, sheet.path), sharedStrings);
    let activeNames = [];
    let activeCols = [];
    let activeDateCol = 2;
    const sheetYear = importedYearHint(sheet.name) || fallbackYear;
    const sheetMonth = importedMonthHint(`${sheet.name} ${rows.slice(0, 6).flat().join(" ")}`) ?? fallbackMonth ?? state.month;

    for (const row of rows) {
      const dateIndex = row.findIndex((value) => /^(dates?|date)$/i.test(String(value ?? "").trim()));
      if (dateIndex >= 0) {
        activeNames = [];
        activeCols = [];
        activeDateCol = dateIndex;
        for (let col = dateIndex + 1; col < Math.max(row.length, dateIndex + 32); col += 1) {
          const name = normalizeImportedEmployee(row[col]);
          if (!name) continue;
          const employee = findOrCreateImportedEmployee(name);
          activeNames.push(employee);
          activeCols.push(col);
          importedEmployees.add(employee);
        }
        continue;
      }

      const date = excelDate(row[activeDateCol], sheetYear, sheetMonth);
      if (!date || !activeNames.length) continue;
      const year = date.getFullYear();
      const month = date.getMonth();
      if (year < 2026 || year > 2030) continue;
      const monthData = ensureMonth(year, month);
      const day = date.getDate();
      monthData[day] ??= {};
      for (let index = 0; index < activeCols.length; index += 1) {
        const employee = activeNames[index];
        const parsed = parseImportedShift(row[activeCols[index]]);
        if (!parsed) continue;
        monthData[day][employee] = importedEntry(parsed);
        if (hoursFromShift(parsed.shift) > 0) shiftsImported += 1;
      }
      importedDays.add(`${year}-${month}-${day}`);
      state.year = year;
      state.month = month;
    }
  }
  normalizeMonthData();
  if (!importedDays.size || !importedEmployees.size) throw new Error("No readable Excel schedule found");
  return { shifts: shiftsImported, employees: importedEmployees.size, days: importedDays.size };
}

function importedEntry(parsed) {
  const hasShift = parsed.shift !== "00:00-00:00";
  return {
    shift: parsed.shift,
    location: parsed.location,
    comment: "",
    published: hasShift,
    publishedShift: hasShift ? parsed.shift : "",
    paidShift: "",
  };
}

function normalizeCell(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedLetters(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function normalizeImportedEmployee(value) {
  const clean = String(value ?? "").trim();
  if (!clean || /date|day|total|shift/i.test(clean)) return "";
  return clean.replace(/\s+/g, " ");
}

function firstNameKey(value) {
  return normalizeCell(value).split(/\s+/)[0];
}

function employeeInitialKey(value, length = 4) {
  return normalizedLetters(firstNameKey(value)).slice(0, length);
}

function findOrCreateImportedEmployee(name) {
  const key = firstNameKey(name);
  const initialKey = employeeInitialKey(name);
  const existing = state.employees.find((employee) => firstNameKey(employee) === key || employeeInitialKey(employee) === initialKey);
  if (existing) return existing;
  state.employees.push(name);
  for (const month of Object.values(state.months)) {
    for (const day of Object.values(month)) {
      day[name] = { shift: "00:00-00:00", location: state.locations[0] ?? "", comment: "", published: false, publishedShift: "", paidShift: "" };
    }
  }
  return name;
}

function parseImportedShift(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { shift: "00:00-00:00", location: "Koivistonkylä" };
  if (/sick/i.test(raw) && !/\d{1,2}/.test(raw)) return { shift: "Sick leave", location: "Koivistonkylä" };
  if (/wish/i.test(raw) && !/\d{1,2}/.test(raw)) return { shift: "Wish OFF", location: "Koivistonkylä" };
  if (/off/i.test(raw) && !/\d{1,2}/.test(raw)) return { shift: "OFF", location: "Koivistonkylä" };
  const location = importedLocation(raw);
  if (!state.locations.includes(location)) state.locations.push(location);
  const match = raw.match(/(\d{1,2})(?::?(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    if (/sick/i.test(raw)) return { shift: "Sick leave", location };
    if (/wish/i.test(raw)) return { shift: "Wish OFF", location };
    if (/off|wish/i.test(raw)) return { shift: "OFF", location };
    return null;
  }
  const startHour = match[1].padStart(2, "0");
  const startMinute = match[2] ?? "00";
  const endHour = match[3].padStart(2, "0");
  const endMinute = match[4] ?? "00";
  const shift = `${startHour}:${startMinute}-${endHour}:${endMinute}`;
  if (!isValidShift(shift)) return null;
  return { shift, location };
}

function isYloLocation(value) {
  return normalizedLetters(value).includes("ylo");
}

function importedLocation(value) {
  const letters = normalizedLetters(value);
  if (letters.includes("ylo") || letters.includes("ylojarvi")) return "Ylöjärvi";
  if (letters.includes("koi") || letters.includes("koiviston") || letters.includes("koivisto")) return "Koivistonkylä";
  const match = state.locations.find((location) => letters.includes(normalizedLetters(location).slice(0, 3)));
  return match || "Koivistonkylä";
}

function excelDate(value, fallbackYear = state.year, fallbackMonth = state.month) {
  if (value instanceof Date) return value;
  const serial = Number(value);
  if (Number.isFinite(serial) && serial >= 30000) return new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isFinite(serial) && serial >= 1 && serial <= 31 && Number.isInteger(serial) && fallbackMonth !== null) {
    return new Date(Number(fallbackYear || state.year), fallbackMonth, serial);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const monthPattern = monthNames.map((name) => name.slice(0, 3)).join("|");
  const monthNameMatch = raw.match(new RegExp(`(\\d{1,2})[.\\-/ ]*(${monthPattern})[a-z]*[.\\-/ ]*(\\d{4})?`, "i"));
  if (monthNameMatch) {
    const month = monthNames.findIndex((name) => name.toLowerCase().startsWith(monthNameMatch[2].toLowerCase().slice(0, 3)));
    const year = Number(monthNameMatch[3] || fallbackYear || state.year);
    return month >= 0 ? new Date(year, month, Number(monthNameMatch[1])) : null;
  }
  const numericMatch = raw.match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/);
  if (numericMatch) {
    const yearPart = numericMatch[3] ? Number(numericMatch[3]) : Number(fallbackYear || state.year);
    const year = yearPart < 100 ? 2000 + yearPart : yearPart;
    return new Date(year, Number(numericMatch[2]) - 1, Number(numericMatch[1]));
  }
  return null;
}

function importedYearHint(value) {
  const match = String(value ?? "").match(/\b(20[2-3]\d)\b/);
  return match ? Number(match[1]) : state.year;
}

function importedMonthHint(value) {
  const text = String(value ?? "").toLowerCase();
  const index = monthNames.findIndex((name) => {
    const full = name.toLowerCase();
    const short = full.slice(0, 3);
    return new RegExp(`\\b${full}\\b|\\b${short}\\b`).test(text);
  });
  return index >= 0 ? index : null;
}

async function unzipXlsx(buffer) {
  if (!("DecompressionStream" in window)) throw new Error("Excel import needs a modern browser");
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("Could not read Excel file");
  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  let pointer = centralOffset;
  for (let item = 0; item < entryCount; item += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const fileNameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pointer + 46, pointer + 46 + fileNameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.set(name, method === 0 ? compressed : await inflateRaw(compressed));
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function textFromEntry(entries, path, fallback = null) {
  const bytes = entries.get(path);
  if (!bytes) {
    if (fallback !== null) return fallback;
    throw new Error(`Excel file is missing ${path}`);
  }
  return new TextDecoder().decode(bytes);
}

function decodeXml(value = "") {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((text) => text[1]).join("")),
  );
}

function parseWorkbookSheets(xml, relsXml = "") {
  const relationshipPaths = Object.fromEntries(
    [...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [match[1], workbookTargetPath(match[2])]),
  );
  return [...xml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)].map((match) => ({
    name: decodeXml(match[1]),
    path: relationshipPaths[match[2]] || `xl/worksheets/sheet${match[2].replace(/\D/g, "")}.xml`,
  }));
}

function workbookTargetPath(target) {
  const clean = String(target ?? "").replace(/^\/+/, "");
  return clean.startsWith("xl/") ? clean : `xl/${clean}`;
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      let value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      if (type === "s") value = sharedStrings[Number(value)] ?? value;
      if (type === "inlineStr") value = decodeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((text) => text[1]).join(""));
      row[columnIndex(ref)] = value;
    }
    rows[Number(rowMatch[1]) - 1] = row;
  }
  return rows.filter(Boolean);
}

function columnIndex(ref) {
  const letters = ref.match(/[A-Z]+/)?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function createFirstEmployer(event) {
  event.preventDefault();
  const name = el.setupName.value.trim();
  const email = el.setupEmail.value.trim();
  const username = el.setupUsername.value.trim();
  const password = el.setupPassword.value;
  if (!name || !email || !username || !password) {
    toast("Fill all setup fields");
    return;
  }
  if (serverReady || location.protocol.startsWith("http")) {
    apiRequest("setupEmployer", { name, email, username, password })
      .then(() => {
        toast("Saved");
        render();
      })
      .catch((error) => toast(error.message));
    return;
  }
  const account = {
    id: createId("employer"),
    name,
    email,
    username,
    passwordHash: passwordHash(password),
  };
  state.auth.employers = [account];
  state.auth.session = { type: "employer", id: account.id };
  saveState(true);
  render();
}

function login(event) {
  event.preventDefault();
  const loginValue = normalizeLogin(el.loginUser.value);
  const hash = passwordHash(el.loginPassword.value);
  if (serverReady || location.protocol.startsWith("http")) {
    apiRequest("login", { login: el.loginUser.value, password: el.loginPassword.value })
      .then(() => {
        el.loginPassword.value = "";
        render();
      })
      .catch((error) => toast(error.message));
    return;
  }
  const employer = state.auth.employers.find((account) => [account.email, account.username].map(normalizeLogin).includes(loginValue) && account.passwordHash === hash);
  const employee = state.auth.employees.find((account) => [account.email, account.username].map(normalizeLogin).includes(loginValue) && account.passwordHash === hash);
  const account = employer ?? employee;
  if (!account) {
    toast("Login details not found");
    return;
  }
  state.auth.session = { type: employer ? "employer" : "employee", id: account.id };
  el.loginPassword.value = "";
  saveState();
  render();
}

function createEmployeeLogin(event) {
  event.preventDefault();
  const invite = inviteFromHash();
  if (!invite) {
    toast("Invite link expired");
    render();
    return;
  }
  const email = el.inviteEmail.value.trim();
  const username = el.inviteUsername.value.trim();
  const password = el.invitePassword.value;
  if (!email || !username || !password) {
    toast("Fill all login fields");
    return;
  }
  if (serverReady || location.protocol.startsWith("http")) {
    apiRequest("createEmployeeLogin", { inviteToken: invite.token, email, username, password })
      .then(() => {
        window.location.hash = "";
        toast("Saved");
        render();
      })
      .catch((error) => toast(error.message));
    return;
  }
  if (accountNameTaken(username, email)) {
    toast("Email or username already exists");
    return;
  }
  const existing = state.auth.employees.find((account) => account.employeeName === invite.employeeName);
  const account = {
    id: existing?.id ?? createId("employee"),
    employeeName: invite.employeeName,
    email,
    username,
    passwordHash: passwordHash(password),
  };
  state.auth.employees = state.auth.employees.filter((item) => item.employeeName !== invite.employeeName);
  state.auth.employees.push(account);
  invite.used = true;
  state.auth.session = { type: "employee", id: account.id };
  window.location.hash = "";
  saveState(true);
  render();
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.setTimeout(() => el.toast.classList.remove("show"), 1600);
}

document.addEventListener("change", (event) => {
  if (event.target === el.yearSelect) {
    state.year = Number(event.target.value);
    saveState();
    render();
    return;
  }
  if (event.target === el.monthSelect) {
    state.month = Number(event.target.value);
    saveState();
    render();
    return;
  }
  if ([el.reportType, el.reportEmployee, el.reportLocation, el.reportWeek, el.reportThreeWeek].includes(event.target)) {
    state.report.type = el.reportType.value;
    state.report.employee = el.reportEmployee.value;
    state.report.location = el.reportLocation.value;
    state.report.week = el.reportWeek.value;
    state.report.threeWeek = el.reportThreeWeek.value;
    saveState();
    render();
    return;
  }
  if ([el.duplicatePeriod, el.duplicateFromBlock, el.duplicateYear, el.duplicateMonth, el.duplicateToBlock].includes(event.target)) {
    state.duplicate.period = el.duplicatePeriod.value;
    state.duplicate.fromBlock = el.duplicateFromBlock.value;
    state.duplicate.targetYear = Number(el.duplicateYear.value);
    state.duplicate.targetMonth = Number(el.duplicateMonth.value);
    state.duplicate.targetBlock = el.duplicateToBlock.value;
    saveState();
    renderSettings();
    return;
  }
  if ([el.quickTargetWeek, el.quickTargetThreeWeeks].includes(event.target)) {
    state.quickDuplicate.targetWeek = el.quickTargetWeek.value;
    state.quickDuplicate.targetThreeWeeks = el.quickTargetThreeWeeks.value;
    saveState();
    return;
  }
  if (event.target.matches("[data-field]")) {
    updateEntry(event.target);
    return;
  }
  if (event.target === document.querySelector("#importData") && event.target.files[0]) {
    importData(event.target.files[0]);
  }
});

document.addEventListener("input", (event) => {
  if (event.target === el.employeeFilter) renderSchedule();
  if (event.target.matches('input[data-field="shift"]')) {
    const day = event.target.dataset.day;
    const employee = decodeURIComponent(event.target.dataset.employee);
    const entry = ensureMonth()[day]?.[employee];
    if (!entry || !canEditEntry(employee, entry, "shift")) return;
    const valid = isValidShift(event.target.value);
    event.target.classList.toggle("invalid", !valid);
    const normalized = normalizeShift(event.target.value);
    const canLiveSave = isEmployer() || ["Wish OFF", "00:00-00:00"].includes(normalized);
    if (valid && canLiveSave && (nonWorkingShifts.includes(normalized) || /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(normalized))) {
      if (normalized === "Sick leave" && entry.shift !== "Sick leave") {
        entry.paidShift = entry.publishedShift || (hoursFromShift(entry.shift) > 0 ? entry.shift : "");
      }
      if (normalized !== "Sick leave") entry.paidShift = "";
      entry.shift = normalized || "00:00-00:00";
      if (isEmployer() && entry.published && entry.shift !== "Sick leave") entry.publishedShift = entry.shift;
      saveState();
      renderShell();
      renderEmployeeSummary();
      renderLocationSummary();
      renderWeeks();
    }
  }
});

document.addEventListener("focusout", (event) => {
  if (event.target.matches('[data-field="shift"], [data-field="comment"]')) {
    const target = event.target;
    window.setTimeout(() => {
      if (target.isConnected && !target.readOnly) updateEntry(target);
    }, 0);
  }
});

document.addEventListener("click", (event) => {
  if (!currentUser()) return;

  const publishButton = event.target.closest("[data-publish-day]");
  if (publishButton) {
    const employee = decodeURIComponent(publishButton.dataset.publishEmployee);
    togglePublish(publishButton.dataset.publishDay, employee);
    return;
  }

  const requestButton = event.target.closest("[data-request-day]");
  if (requestButton) {
    employeeRequestDay = String(requestButton.dataset.requestDay);
    renderSchedule();
    return;
  }

  const saveRequestButton = event.target.closest("[data-save-request]");
  if (saveRequestButton) {
    saveEmployeeWishRequest(saveRequestButton.dataset.saveRequest, decodeURIComponent(saveRequestButton.dataset.requestEmployee));
    return;
  }

  const nav = event.target.closest(".nav-tab");
  if (nav) {
    if (isEmployee() && !["schedule", "reports"].includes(nav.dataset.view)) return;
    state.view = nav.dataset.view;
    saveState();
    render();
    return;
  }

  if (!isEmployer()) return;

  const removeEmployee = event.target.dataset.removeEmployee ? decodeURIComponent(event.target.dataset.removeEmployee) : "";
  if (removeEmployee && state.employees.length > 1) {
    state.employees = state.employees.filter((name) => name !== removeEmployee);
    for (const month of Object.values(state.months)) {
      for (const day of Object.values(month)) delete day[removeEmployee];
    }
    saveState(true);
    render();
    return;
  }

  const saveEmployee = event.target.dataset.saveEmployee ? decodeURIComponent(event.target.dataset.saveEmployee) : "";
  if (saveEmployee) {
    const input = event.target.closest(".editor-row")?.querySelector("[data-edit-employee]");
    renameEmployee(saveEmployee, input?.value ?? "");
    return;
  }

  const removeLocation = event.target.dataset.removeLocation ? decodeURIComponent(event.target.dataset.removeLocation) : "";
  if (removeLocation && state.locations.length > 1) {
    const replacement = state.locations.find((name) => name !== removeLocation);
    state.locations = state.locations.filter((name) => name !== removeLocation);
    for (const month of Object.values(state.months)) {
      for (const day of Object.values(month)) {
        for (const entry of Object.values(day)) {
          if (entry.location === removeLocation) entry.location = replacement;
        }
      }
    }
    saveState(true);
    render();
    return;
  }

  const saveLocation = event.target.dataset.saveLocation ? decodeURIComponent(event.target.dataset.saveLocation) : "";
  if (saveLocation) {
    const input = event.target.closest(".editor-row")?.querySelector("[data-edit-location]");
    renameLocation(saveLocation, input?.value ?? "");
    return;
  }

  const inviteEmployee = event.target.dataset.createInvite ? decodeURIComponent(event.target.dataset.createInvite) : "";
  if (inviteEmployee) {
    createInvite(inviteEmployee);
    return;
  }

  const saveEmployerId = event.target.dataset.saveEmployer ?? "";
  if (saveEmployerId) {
    saveEmployer(saveEmployerId, event.target.closest(".editor-row"));
    return;
  }

  const removeEmployerId = event.target.dataset.removeEmployer ?? "";
  if (removeEmployerId) {
    removeEmployer(removeEmployerId);
  }
});

document.querySelector("#saveNow").addEventListener("click", manualSave);
document.querySelector("#printPage").addEventListener("click", () => window.print());
document.querySelector("#seedMay").addEventListener("click", seedMaySample);
document.querySelector("#blankMonth").addEventListener("click", blankMonth);
document.querySelector("#exportData").addEventListener("click", exportData);
document.querySelector("#addEmployee").addEventListener("click", addEmployee);
document.querySelector("#addLocation").addEventListener("click", addLocation);
document.querySelector("#addEmployer").addEventListener("click", addEmployer);
document.querySelector("#openReport").addEventListener("click", openReportWindow);
el.copyLastWeek.addEventListener("click", () => duplicateRecentDays(7, "last week", state.quickDuplicate.targetWeek));
el.copyLastThreeWeeks.addEventListener("click", () => duplicateRecentDays(21, "last 3 weeks", state.quickDuplicate.targetThreeWeeks));
el.copyLastMonth.addEventListener("click", duplicateLastMonth);
document.querySelector("#publishMonth").addEventListener("click", publishVisibleMonth);
el.duplicateShifts.addEventListener("click", duplicateShifts);
el.setupForm.addEventListener("submit", createFirstEmployer);
el.loginForm.addEventListener("submit", login);
el.inviteForm.addEventListener("submit", createEmployeeLogin);
el.logoutButton.addEventListener("click", () => {
  if (serverReady && sessionToken) {
    apiRequest("logout")
      .catch(() => {})
      .finally(() => {
        sessionToken = "";
        localStorage.removeItem(sessionKey);
        state.auth.session = null;
        saveState();
        render();
      });
    return;
  }
  state.auth.session = null;
  saveState();
  render();
});
window.addEventListener("hashchange", render);

async function bootstrap() {
  render();
  if (!location.protocol.startsWith("http")) {
    bootstrapping = false;
    if (!hadSavedState && isEmployer()) seedMaySample();
    render();
    return;
  }
  try {
    await apiRequest("bootstrap", { inviteToken: inviteTokenFromHash() });
  } catch (error) {
    toast("Backend unavailable. Using local browser mode.");
  } finally {
    bootstrapping = false;
    render();
  }
}

bootstrap();
