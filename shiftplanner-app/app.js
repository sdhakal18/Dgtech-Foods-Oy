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
const shifts = ["00:00-00:00", "09:00-14:00", "09:00-17:00", "13:00-18:00", "17:00-23:00", "OFF"];
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
  employeeEditor: document.querySelector("#employeeEditor"),
  locationEditor: document.querySelector("#locationEditor"),
  employerEditor: document.querySelector("#employerEditor"),
  inviteEditor: document.querySelector("#inviteEditor"),
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
    }
    for (const employee of Object.keys(data[day])) {
      if (!state.employees.includes(employee)) delete data[day][employee];
    }
  }
}

function hoursFromShift(shift) {
  const normalized = normalizeShift(shift);
  if (!normalized || normalized === "OFF" || normalized === "00:00-00:00") return 0;
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
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");
}

function isValidShift(value) {
  const normalized = normalizeShift(value);
  if (normalized === "" || normalized === "OFF") return true;
  return /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(normalized);
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

function duplicateBlocks(period, year, month) {
  const count = daysInSpecificMonth(year, month);
  if (period === "month") return [{ label: "Full month", value: "month", days: Array.from({ length: count }, (_, index) => index + 1) }];
  if (period === "threeWeeks") {
    return [
      { label: "Days 1-21", value: "1", days: Array.from({ length: Math.min(21, count) }, (_, index) => index + 1) },
      { label: `Days 22-${count}`, value: "2", days: count >= 22 ? Array.from({ length: count - 21 }, (_, index) => index + 22) : [] },
    ].filter((block) => block.days.length);
  }
  const blocks = [];
  for (let start = 1, block = 1; start <= count; start += 7, block += 1) {
    const end = Math.min(count, start + 6);
    blocks.push({ label: `Week ${block}: days ${start}-${end}`, value: String(block), days: Array.from({ length: end - start + 1 }, (_, index) => start + index) });
  }
  return blocks;
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
      if (selectedLocation && entry.location !== selectedLocation) continue;
      const hours = hoursFromShift(entry.shift);
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
  const data = ensureMonth();
  const filter = el.employeeFilter.value.trim().toLowerCase();
  const employees = visibleEmployees().filter((employee) => employee.toLowerCase().includes(filter));
  const rows = [];
  rows.push(`<table><thead><tr><th>Date</th><th>Day</th>${employees.map((e) => `<th>${esc(e)}</th>`).join("")}<th>Daily Hours</th></tr></thead><tbody>`);

  for (let day = 1; day <= daysInMonth(); day += 1) {
    const info = dayInfo(day);
    const total = employees.reduce((sum, employee) => sum + hoursFromShift(data[day][employee].shift), 0);
    const redClass = info.isRedDay ? " red-day-row" : "";
    const redTitle = info.holidayName || (info.isSunday ? "Sunday" : "");
    rows.push(`<tr class="${redClass.trim()}" title="${esc(redTitle)}"><td class="date-cell ${info.isRedDay ? "red-day-cell" : ""}">${day}</td><td class="day-cell ${info.isRedDay ? "red-day-cell" : ""}">${dayLabel(info)}</td>`);
    for (const employee of employees) {
      const entry = data[day][employee];
      rows.push(`<td>${shiftSelect(day, employee, entry.shift)}</td>`);
    }
    rows.push(`<td class="daily-total">${formatNumber(total)}</td></tr>`);
    rows.push(`<tr class="${redClass.trim()}" title="${esc(redTitle)}"><td class="${info.isRedDay ? "red-day-cell" : ""}"></td><td class="restaurant-label ${info.isRedDay ? "red-day-cell" : ""}">Restaurant</td>`);
    for (const employee of employees) {
      const entry = data[day][employee];
      rows.push(`<td>${locationSelect(day, employee, entry.location)}</td>`);
    }
    rows.push(`<td class="daily-total"></td></tr>`);
  }

  rows.push("</tbody></table>");
  el.scheduleTable.innerHTML = rows.join("");
}

function shiftSelect(day, employee, value) {
  const locked = isEmployer() ? "" : "readonly";
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

function locationSelect(day, employee, value) {
  const locked = isEmployer() ? "" : "disabled";
  return `
    <select class="location-select ${classForLocation(value)}" data-day="${day}" data-employee="${encodeURIComponent(employee)}" data-field="location" ${locked}>
      ${state.locations.map((location) => `<option value="${esc(location)}" ${location === value ? "selected" : ""}>${esc(location)}</option>`).join("")}
    </select>
  `;
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
      const hours = hoursFromShift(entry.shift);
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
      if (config.location && entry.location !== config.location) return false;
      return hoursFromShift(entry.shift) > 0;
    }),
  );
  const reportEmployees = visibleEmployees.length ? visibleEmployees : [];
  const stats = getStats({ employees: reportEmployees, days: config.days, location: config.location });
  const rows = [];
  for (const day of config.days) {
    const visibleRows = [];
    for (const employee of reportEmployees) {
      const entry = data[day][employee];
      const hours = hoursFromShift(entry.shift);
      if (config.location && entry.location !== config.location) continue;
      if (hours <= 0) continue;
      visibleRows.push({ employee, ...entry, hours });
    }
    for (const row of visibleRows) {
      const info = dayInfo(day);
      rows.push(`
        <tr class="${info.isRedDay ? "report-red-day" : ""}">
          <td class="${info.isRedDay ? "report-red-day-cell" : ""}">${day}</td>
          <td class="${info.isRedDay ? "report-red-day-cell" : ""}">${dayLabel(info)}</td>
          <td class="report-name-cell">${esc(row.employee)}</td>
          <td>${esc(row.shift)}</td>
          <td>${esc(row.location)}</td>
          <td>${formatNumber(row.hours)}</td>
        </tr>
      `);
    }
  }

  const employeeRows = reportEmployees
    .map((employee) => {
      const stat = stats.employeeStats[employee];
      return `<tr><td>${esc(employee)}</td>${state.locations.map((loc) => `<td>${formatNumber(stat?.byLocation[loc] ?? 0)}</td>`).join("")}<td>${formatNumber(stat?.total ?? 0)}</td><td>${stat?.days ?? 0}</td></tr>`;
    })
    .join("");

  return `
    <article class="print-report">
      <header>
        <h1>Dgtech foods Oy</h1>
        <h2>${esc(config.title)}</h2>
        <p>${esc(config.type)} report generated from shift planner</p>
      </header>
      <section class="report-kpis">
        <div><span>Total hours</span><strong>${formatNumber(stats.total)}</strong></div>
        <div><span>Working shifts</span><strong>${stats.shiftsWorked}</strong></div>
        ${state.locations.map((loc) => `<div><span>${esc(loc)}</span><strong>${formatNumber(stats.locationStats[loc]?.total ?? 0)}</strong></div>`).join("")}
      </section>
      <h3>Worked shifts</h3>
      <table>
        <thead><tr><th>Date</th><th>Day</th><th>Employee</th><th>Shift</th><th>Restaurant</th><th>Hours</th></tr></thead>
        <tbody>${rows.join("") || `<tr><td colspan="6">No worked shifts in this report period.</td></tr>`}</tbody>
      </table>
      <h3>Employee totals</h3>
      <table>
        <thead><tr><th>Employee</th>${state.locations.map((loc) => `<th>${esc(loc)}</th>`).join("")}<th>Total</th><th>Days</th></tr></thead>
        <tbody>${employeeRows || `<tr><td colspan="${state.locations.length + 3}">No employees with worked shifts.</td></tr>`}</tbody>
      </table>
    </article>
  `;
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
  document.querySelectorAll(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${state.view}View`));
}

function updateEntry(target) {
  if (!isEmployer()) return;
  const day = target.dataset.day;
  const employee = decodeURIComponent(target.dataset.employee);
  const field = target.dataset.field;
  if (!day || !employee || !field) return;
  if (field === "shift") {
    const nextValue = normalizeShift(target.value);
    if (!isValidShift(nextValue)) {
      target.classList.add("invalid");
      toast("Use HH:MM-HH:MM or OFF");
      return;
    }
    ensureMonth()[day][employee][field] = nextValue || "00:00-00:00";
  } else {
    ensureMonth()[day][employee][field] = target.value;
  }
  saveState();
  render();
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
      };
    });
  }
  state.months[monthKey(2026, 4)] = data;
  saveState(true);
  render();
}

function blankMonth() {
  if (!isEmployer()) return;
  const data = {};
  for (let day = 1; day <= daysInMonth(); day += 1) {
    data[day] = {};
    for (const employee of state.employees) {
      data[day][employee] = { shift: "00:00-00:00", location: state.locations[0] ?? "" };
    }
  }
  state.months[monthKey()] = data;
  saveState(true);
  render();
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
  const sourceData = ensureMonth(state.year, state.month);
  const targetData = ensureMonth(targetYear, targetMonth);
  const copyLength = Math.min(sourceBlock.days.length, targetBlock.days.length);
  for (let index = 0; index < copyLength; index += 1) {
    const sourceDay = sourceBlock.days[index];
    const targetDay = targetBlock.days[index];
    targetData[targetDay] ??= {};
    for (const employee of state.employees) {
      const sourceEntry = sourceData[sourceDay]?.[employee] ?? { shift: "00:00-00:00", location: state.locations[0] ?? "" };
      targetData[targetDay][employee] = { shift: sourceEntry.shift, location: sourceEntry.location };
    }
  }
  state.year = targetYear;
  state.month = targetMonth;
  saveState(true);
  render();
  toast(`Duplicated ${copyLength} days`);
}

function addEmployee() {
  if (!isEmployer()) return;
  const name = el.newEmployee.value.trim();
  if (!name || state.employees.includes(name)) return;
  state.employees.push(name);
  for (const month of Object.values(state.months)) {
    for (const day of Object.values(month)) {
      day[name] = { shift: "00:00-00:00", location: state.locations[0] ?? "" };
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

function importData(file) {
  if (!isEmployer()) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = {
        ...structuredClone(initialState),
        ...imported,
        employees: imported.employees?.length ? imported.employees : employeesDefault,
        locations: imported.locations?.length ? imported.locations : locationsDefault,
        months: imported.months ?? {},
      };
      saveState(true);
      render();
    } catch {
      toast("Could not import file");
    }
  };
  reader.readAsText(file);
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
    if (!isEmployer()) return;
    const valid = isValidShift(event.target.value);
    event.target.classList.toggle("invalid", !valid);
    const normalized = normalizeShift(event.target.value);
    if (valid && (normalized === "OFF" || /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(normalized))) {
      const day = event.target.dataset.day;
      const employee = decodeURIComponent(event.target.dataset.employee);
      ensureMonth()[day][employee].shift = normalized;
      saveState();
      renderShell();
      renderEmployeeSummary();
      renderLocationSummary();
      renderWeeks();
    }
  }
});

document.addEventListener("focusout", (event) => {
  if (event.target.matches('input[data-field="shift"]')) {
    const target = event.target;
    window.setTimeout(() => {
      if (target.isConnected && !target.readOnly) updateEntry(target);
    }, 0);
  }
});

document.addEventListener("click", (event) => {
  if (!currentUser()) return;

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

document.querySelector("#saveNow").addEventListener("click", () => saveState(true));
document.querySelector("#printPage").addEventListener("click", () => window.print());
document.querySelector("#seedMay").addEventListener("click", seedMaySample);
document.querySelector("#blankMonth").addEventListener("click", blankMonth);
document.querySelector("#exportData").addEventListener("click", exportData);
document.querySelector("#addEmployee").addEventListener("click", addEmployee);
document.querySelector("#addLocation").addEventListener("click", addLocation);
document.querySelector("#addEmployer").addEventListener("click", addEmployer);
document.querySelector("#openReport").addEventListener("click", openReportWindow);
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
