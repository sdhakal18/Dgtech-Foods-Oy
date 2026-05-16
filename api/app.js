const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const STORE_KEY = "dgtech-shiftplanner-state";
const LOCAL_FILE = path.join("/tmp", "dgtech-shiftplanner-state.json");

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

function initialState() {
  return {
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
      twoWeek: "",
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
    employees: employeesDefault,
    locations: locationsDefault,
    months: {},
    history: [],
    auth: {
      employers: [],
      employees: [],
      invites: [],
      sessions: [],
    },
  };
}

async function kvRequest(command) {
  const apiUrl = process.env.KV_REST_API_URL || process.env.kv_KV_REST_API_URL || process.env.STORAGE_REST_API_URL;
  const apiToken = process.env.KV_REST_API_TOKEN || process.env.kv_KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN;
  if (!apiUrl || !apiToken) return null;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`KV request failed: ${response.status}`);
  return response.json();
}

async function readStore() {
  const kv = await kvRequest(["GET", STORE_KEY]);
  if (kv) {
    const value = kv.result;
    return value ? normalizeStore(typeof value === "string" ? JSON.parse(value) : value) : initialState();
  }
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch {
    return initialState();
  }
}

async function writeStore(state) {
  const clean = normalizeStore(state);
  const kv = await kvRequest(["SET", STORE_KEY, JSON.stringify(clean)]);
  if (kv) return clean;
  await fs.writeFile(LOCAL_FILE, JSON.stringify(clean, null, 2));
  return clean;
}

function normalizeStore(value) {
  const base = initialState();
  return {
    ...base,
    ...value,
    employees: value?.employees?.length ? value.employees : base.employees,
    locations: value?.locations?.length ? value.locations : base.locations,
    months: value?.months ?? {},
    report: { ...base.report, ...(value?.report ?? {}) },
    duplicate: { ...base.duplicate, ...(value?.duplicate ?? {}) },
    quickDuplicate: { ...base.quickDuplicate, ...(value?.quickDuplicate ?? {}) },
    history: value?.history ?? [],
    auth: {
      employers: value?.auth?.employers ?? [],
      employees: value?.auth?.employees ?? [],
      invites: value?.auth?.invites ?? [],
      sessions: value?.auth?.sessions ?? [],
    },
  };
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashPassword(password, salt).split(":")[1], "hex"));
}

function publicAccount(account) {
  const { passwordHash, ...safe } = account;
  return safe;
}

function publicState(state, user = null, inviteToken = "") {
  const visibleInvites =
    user?.type === "employer"
      ? state.auth.invites
      : state.auth.invites.filter((invite) => invite.token === inviteToken && !invite.used);
  const publicMonths = user?.type === "employee" ? employeeVisibleMonths(state.months, user.employeeName, state.locations[0] ?? "") : state.months;
  return {
    year: state.year,
    month: state.month,
    view: state.view,
    role: user?.type ?? state.role,
    activeEmployee: user?.type === "employee" ? user.employeeName : state.activeEmployee,
    report: state.report,
    duplicate: state.duplicate,
    quickDuplicate: state.quickDuplicate,
    employees: state.employees,
    locations: state.locations,
    months: publicMonths,
    history: state.history,
    auth: {
      employers: state.auth.employers.map(publicAccount),
      employees: state.auth.employees.map(publicAccount),
      invites: visibleInvites,
      session: user ? { type: user.type, id: user.id } : null,
    },
  };
}

function employeeVisibleMonths(months, employeeName, defaultLocation) {
  const result = {};
  for (const [month, days] of Object.entries(months ?? {})) {
    result[month] = {};
    for (const [day, entries] of Object.entries(days ?? {})) {
      result[month][day] = {};
      for (const [employee, entry] of Object.entries(entries ?? {})) {
        const visible = entry?.published || (employee === employeeName && entry?.shift === "Wish OFF");
        result[month][day][employee] = visible
          ? entry
          : { shift: "00:00-00:00", location: entry?.location || defaultLocation, comment: "", published: false, publishedShift: "", paidShift: "" };
      }
    }
  }
  return result;
}

function findUserByToken(state, token) {
  if (!token) return null;
  const session = state.auth.sessions.find((item) => item.token === token);
  if (!session) return null;
  const list = session.type === "employee" ? state.auth.employees : state.auth.employers;
  const user = list.find((item) => item.id === session.id);
  return user ? { ...publicAccount(user), type: session.type } : null;
}

function loginTaken(state, username, email, exceptId = "") {
  const cleanUser = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  return [...state.auth.employers, ...state.auth.employees].some(
    (account) => account.id !== exceptId && (account.username.toLowerCase() === cleanUser || account.email.toLowerCase() === cleanEmail),
  );
}

function cleanText(value) {
  return String(value || "").trim();
}

function requireFields(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!cleanText(value)) {
      const error = new Error(`${name} is required`);
      error.status = 400;
      throw error;
    }
  }
}

function requireEmployer(state, token) {
  const user = findUserByToken(state, token);
  if (user?.type !== "employer") {
    const error = new Error("Employer login required");
    error.status = 403;
    throw error;
  }
  return user;
}

function requireEmployee(state, token) {
  const user = findUserByToken(state, token);
  if (user?.type !== "employee") {
    const error = new Error("Employee login required");
    error.status = 403;
    throw error;
  }
  return user;
}

function sessionFor(state, type, account) {
  const token = id("session");
  state.auth.sessions.push({ token, type, id: account.id, createdAt: new Date().toISOString() });
  return token;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  try {
    const body = await readJson(req);
    const state = await readStore();
    const token = body.token || "";
    const user = findUserByToken(state, token);

    if (body.action === "bootstrap") {
      return send(res, 200, { state: publicState(state, user, body.inviteToken), user, needsSetup: state.auth.employers.length === 0 });
    }

    if (body.action === "setupEmployer") {
      if (state.auth.employers.length > 0) return send(res, 409, { error: "Employer already exists" });
      requireFields({ name: body.name, email: body.email, username: body.username, password: body.password });
      const account = {
        id: id("employer"),
        name: cleanText(body.name),
        email: cleanText(body.email),
        username: cleanText(body.username),
        passwordHash: hashPassword(body.password),
      };
      state.auth.employers.push(account);
      const sessionToken = sessionFor(state, "employer", account);
      await writeStore(state);
      return send(res, 200, { token: sessionToken, state: publicState(state, { ...publicAccount(account), type: "employer" }), user: { ...publicAccount(account), type: "employer" } });
    }

    if (body.action === "login") {
      requireFields({ login: body.login, password: body.password });
      const loginValue = String(body.login || "").trim().toLowerCase();
      const account = [...state.auth.employers.map((a) => ({ ...a, type: "employer" })), ...state.auth.employees.map((a) => ({ ...a, type: "employee" }))].find(
        (item) => [item.email, item.username].map((value) => value.toLowerCase()).includes(loginValue) && verifyPassword(body.password, item.passwordHash),
      );
      if (!account) return send(res, 401, { error: "Login details not found" });
      const sessionToken = sessionFor(state, account.type, account);
      await writeStore(state);
      return send(res, 200, { token: sessionToken, state: publicState(state, { ...publicAccount(account), type: account.type }), user: { ...publicAccount(account), type: account.type } });
    }

    if (body.action === "logout") {
      state.auth.sessions = state.auth.sessions.filter((session) => session.token !== token);
      await writeStore(state);
      return send(res, 200, { ok: true, state: publicState(state) });
    }

    if (body.action === "saveState") {
      requireEmployer(state, token);
      const next = body.state || {};
      state.year = next.year;
      state.month = next.month;
      state.view = next.view;
      state.activeEmployee = next.activeEmployee;
      state.report = next.report;
      state.duplicate = next.duplicate ?? state.duplicate;
      state.quickDuplicate = next.quickDuplicate ?? state.quickDuplicate;
      state.employees = next.employees;
      state.locations = next.locations;
      state.months = next.months;
      state.history = next.history ?? state.history;
      await writeStore(state);
      return send(res, 200, { ok: true, state: publicState(state, user) });
    }

    if (body.action === "employeeRequest") {
      const employee = requireEmployee(state, token);
      const year = Number(body.year);
      const month = Number(body.month);
      const day = String(Number(body.day));
      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(Number(day))) return send(res, 400, { error: "Invalid date" });
      if (body.employee !== employee.employeeName) return send(res, 403, { error: "Employees can only request their own days" });
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      state.months[key] ??= {};
      state.months[key][day] ??= {};
      state.months[key][day][employee.employeeName] ??= { shift: "00:00-00:00", location: state.locations[0] ?? "" };
      const entry = state.months[key][day][employee.employeeName];
      if (entry.published) return send(res, 403, { error: "Published shifts can only be changed by employer" });
      const requestedShift = String(body.shift || "00:00-00:00");
      if (!["Wish OFF", "00:00-00:00"].includes(requestedShift)) return send(res, 400, { error: "Employees can only request Wish OFF before publishing" });
      entry.shift = requestedShift;
      entry.comment = String(body.comment || "").trim().slice(0, 300);
      entry.published = false;
      entry.publishedShift = "";
      entry.paidShift = "";
      state.history = [`${employee.employeeName} requested ${requestedShift} on ${day}.${month + 1}.${year}`, ...(state.history ?? [])].slice(0, 80);
      await writeStore(state);
      return send(res, 200, { ok: true, state: publicState(state, employee) });
    }

    if (body.action === "addEmployer") {
      const employer = requireEmployer(state, token);
      requireFields({ name: body.name, email: body.email, username: body.username, password: body.password });
      if (state.auth.employers.length >= 4) return send(res, 400, { error: "Maximum 4 employer IDs" });
      if (loginTaken(state, body.username, body.email)) return send(res, 409, { error: "Email or username already exists" });
      state.auth.employers.push({ id: id("employer"), name: cleanText(body.name), email: cleanText(body.email), username: cleanText(body.username), passwordHash: hashPassword(body.password) });
      await writeStore(state);
      return send(res, 200, { state: publicState(state, employer) });
    }

    if (body.action === "saveEmployer") {
      const employer = requireEmployer(state, token);
      requireFields({ name: body.name, email: body.email, username: body.username });
      if (loginTaken(state, body.username, body.email, body.id)) return send(res, 409, { error: "Email or username already exists" });
      const account = state.auth.employers.find((item) => item.id === body.id);
      if (!account) return send(res, 404, { error: "Employer not found" });
      Object.assign(account, { name: cleanText(body.name), email: cleanText(body.email), username: cleanText(body.username) });
      await writeStore(state);
      return send(res, 200, { state: publicState(state, employer) });
    }

    if (body.action === "removeEmployer") {
      const employer = requireEmployer(state, token);
      if (state.auth.employers.length <= 1) return send(res, 400, { error: "Keep at least one employer ID" });
      state.auth.employers = state.auth.employers.filter((item) => item.id !== body.id);
      state.auth.sessions = state.auth.sessions.filter((session) => session.id !== body.id);
      await writeStore(state);
      return send(res, 200, { state: publicState(state, employer.id === body.id ? null : employer) });
    }

    if (body.action === "createInvite") {
      const employer = requireEmployer(state, token);
      if (!state.employees.includes(body.employeeName)) return send(res, 404, { error: "Employee not found" });
      state.auth.invites = state.auth.invites.filter((invite) => invite.employeeName !== body.employeeName || invite.used);
      const invite = { token: id("invite"), employeeName: body.employeeName, createdAt: new Date().toISOString(), used: false };
      state.auth.invites.push(invite);
      await writeStore(state);
      return send(res, 200, { invite, state: publicState(state, employer) });
    }

    if (body.action === "createEmployeeLogin") {
      requireFields({ inviteToken: body.inviteToken, email: body.email, username: body.username, password: body.password });
      const invite = state.auth.invites.find((item) => item.token === body.inviteToken && !item.used);
      if (!invite) return send(res, 404, { error: "Invite link expired" });
      if (loginTaken(state, body.username, body.email)) return send(res, 409, { error: "Email or username already exists" });
      state.auth.employees = state.auth.employees.filter((item) => item.employeeName !== invite.employeeName);
      const account = { id: id("employee"), employeeName: invite.employeeName, email: cleanText(body.email), username: cleanText(body.username), passwordHash: hashPassword(body.password) };
      state.auth.employees.push(account);
      invite.used = true;
      const sessionToken = sessionFor(state, "employee", account);
      await writeStore(state);
      return send(res, 200, { token: sessionToken, state: publicState(state, { ...publicAccount(account), type: "employee" }), user: { ...publicAccount(account), type: "employee" } });
    }

    return send(res, 400, { error: "Unknown action" });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Server error" });
  }
};
