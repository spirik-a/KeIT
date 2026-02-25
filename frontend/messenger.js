const token = localStorage.getItem("token");
let me = JSON.parse(
  localStorage.getItem("user") || "null"
);
if (!token)
  location.href = "/frontend/login.html";

const STATUS_LABEL = {
  ready: "Готовий до розмови",
  busy: "Зайнятий",
  angry: "Без настрою / сердитий",
};

const meLine = document.getElementById("meLine");
const meAvatar =
  document.getElementById("meAvatar");
const meStatus =
  document.getElementById("meStatus");
const meStatusDot = document.getElementById(
  "meStatusDot"
);
const meOnlineDot = document.getElementById(
  "meOnlineDot"
);
const meBox = document.getElementById("meBox");
const logoutBtn =
  document.getElementById("logoutBtn");

const addUsernameOrPhone =
  document.getElementById("addUsernameOrPhone");
const addBtn = document.getElementById("addBtn");
const addStatus =
  document.getElementById("addStatus");

const contactsList = document.getElementById(
  "contactsList"
);
const dialogsList = document.getElementById(
  "dialogsList"
);

const chatWith =
  document.getElementById("chatWith");
const messagesEl =
  document.getElementById("messages");

const msgInput =
  document.getElementById("msgInput");
const sendBtn =
  document.getElementById("sendBtn");

let selectedPeerId = null;

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: "Bearer " + token,
  };
}

async function apiJson(url, options = {}) {
  const r = await fetch(url, options);
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    ok: r.ok,
    status: r.status,
    json,
    text,
  };
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function avatarUrl(user) {
  return (
    user?.avatarUrl ||
    "/frontend/assets/default-avatar.png"
  );
}
function statusKey(user) {
  return user?.statusKey || "ready";
}
function statusText(user) {
  return (
    STATUS_LABEL[statusKey(user)] ||
    STATUS_LABEL.ready
  );
}

function setMeUI() {
  if (!me) return;
  meLine.textContent = `${me.phone || ""} • @${
    me.username || ""
  }`.trim();
  meStatus.textContent = `Статус: ${statusText(
    me
  )}`;
  meAvatar.src = avatarUrl(me);

  // статус крапка
  meStatusDot.className = `dot status ${statusKey(
    me
  )}`;
  // online крапка (для себе завжди зелена, бо ти на сторінці)
  meOnlineDot.className = `dot online`;
}

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "/frontend/login.html";
};
meBox.onclick = () =>
  (location.href = "/frontend/profile.html");

async function ping() {
  await fetch("/users/ping", {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => {});
}

async function ensureMe() {
  const res = await apiJson("/users/me", {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  me = res.json;
  localStorage.setItem(
    "user",
    JSON.stringify(me)
  );
  setMeUI();
}

function avatarBlock(u) {
  const sk = statusKey(u);
  const onlineClass = u?.isOnline
    ? "online"
    : "offline";
  return `
    <div class="avatarWrap small">
      <img class="avatarImg" src="${esc(
        avatarUrl(u)
      )}" />
      <span class="dot status ${esc(sk)}"></span>
      <span class="dot ${onlineClass}"></span>
    </div>
  `;
}

async function refreshContacts() {
  const res = await apiJson("/contacts", {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const contacts = res.json || [];

  contactsList.innerHTML = "";
  for (const c of contacts) {
    const div = document.createElement("div");
    div.className = "item";
    if (c.id === selectedPeerId)
      div.classList.add("active");

    div.innerHTML = `
      <div class="contactRow">
        ${avatarBlock(c)}
        <div>
          <div class="title">${esc(
            c.name
          )} (@${esc(c.username)})</div>
          <div class="sub">${esc(
            c.phone || ""
          )} • ${esc(statusText(c))}${
      c.isOnline ? " • онлайн" : ""
    }</div>
        </div>
      </div>
    `;

    div.onclick = () =>
      selectPeer(
        c.id,
        `${c.name} (@${c.username})`
      );
    contactsList.appendChild(div);
  }
}

async function refreshDialogs() {
  const res = await apiJson("/messages/inbox", {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const dialogs = res.json || [];

  dialogsList.innerHTML = "";
  for (const d of dialogs) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="title">@${esc(
      d.peer.username || d.peer.id
    )}</div><div class="sub">${esc(
      d.lastMessage?.text || ""
    )}</div>`;
    div.onclick = () =>
      selectPeer(
        d.peer.id,
        `@${d.peer.username || d.peer.id}`
      );
    dialogsList.appendChild(div);
  }
}

function selectPeer(peerId, label) {
  selectedPeerId = peerId;
  chatWith.textContent = `Чат з ${label}`;
  loadConversation();
  refreshContacts();
}

async function loadConversation() {
  if (!selectedPeerId) return;
  const res = await apiJson(
    `/messages/${encodeURIComponent(
      selectedPeerId
    )}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return;
  const list = res.json || [];

  messagesEl.innerHTML = "";
  for (const m of list) {
    const div = document.createElement("div");
    const isMe = m.fromId === me?.id;
    div.className =
      "msg " + (isMe ? "me" : "other");
    div.innerHTML = `<div>${esc(
      m.text
    )}</div><div class="time">${esc(
      m.createdAt
    )}</div>`;
    messagesEl.appendChild(div);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

sendBtn.onclick = async () => {
  if (!selectedPeerId) {
    alert("Оберіть контакт.");
    return;
  }
  const text = msgInput.value.trim();
  if (!text) return;

  const res = await apiJson("/messages", {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      to: selectedPeerId,
      text,
    }),
  });

  if (!res.ok) {
    alert(
      res.json?.error || `Помилка (${res.status})`
    );
    return;
  }

  msgInput.value = "";
  await refreshDialogs();
  await loadConversation();
};

addBtn.onclick = async () => {
  addStatus.textContent = "";
  const value = addUsernameOrPhone.value.trim();
  if (!value) {
    addStatus.textContent =
      "Введіть номер або нік.";
    return;
  }

  const isPhone =
    value.startsWith("+") ||
    /^\d{7,15}$/.test(
      value.replaceAll(/\s/g, "")
    );
  const payload = isPhone
    ? { phone: value }
    : { username: value };

  const res = await apiJson("/contacts/add", {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    addStatus.textContent =
      res.json?.error ||
      `Помилка (${res.status})`;
    return;
  }

  addStatus.textContent = "Контакт додано ✅";
  addUsernameOrPhone.value = "";
  await refreshContacts();
};

(async function init() {
  await ensureMe();
  await refreshContacts();
  await refreshDialogs();
  await ping();

  setInterval(async () => {
    await ping();
    await ensureMe();
    await refreshContacts();
    await refreshDialogs();
    await loadConversation();
  }, 15000);
})();
