const token = localStorage.getItem("token");
let me = JSON.parse(
  localStorage.getItem("user") || "null"
);

if (!token)
  location.href = "/frontend/login.html";

const meLine = document.getElementById("meLine");
const meAvatar =
  document.getElementById("meAvatar");
const meStatus =
  document.getElementById("meStatus");
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
let lastRenderedCount = 0;

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

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString("uk-UA");
  } catch {
    return iso;
  }
}

function avatarUrl(user) {
  return (
    user?.avatarUrl ||
    "/frontend/assets/default-avatar.png"
  );
}

function setMeUI() {
  if (!me) {
    meLine.textContent = "Завантаження...";
    meStatus.textContent = "";
    meAvatar.src =
      "/frontend/assets/default-avatar.png";
    return;
  }
  meLine.textContent = `${me.phone || ""}  •  @${
    me.username || ""
  }`.trim();
  meStatus.textContent =
    me.status || "Статус: (не задано)";
  meAvatar.src = avatarUrl(me);
}

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "/frontend/login.html";
};

meBox.onclick = () =>
  (location.href = "/frontend/profile.html");

async function ensureMe() {
  setMeUI();
  const res = await apiJson("/users/me", {
    headers: authHeaders(),
  });
  if (!res.ok) {
    meLine.textContent = `Помилка профілю: ${
      res.json?.error || res.status
    }`;
    return;
  }
  me = res.json;
  localStorage.setItem(
    "user",
    JSON.stringify(me)
  );
  setMeUI();
}

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

function renderList(
  container,
  items,
  getId,
  render,
  onClick
) {
  container.innerHTML = "";
  for (const item of items) {
    const div = document.createElement("div");
    div.className = "item";
    const id = getId(item);
    if (id === selectedPeerId)
      div.classList.add("active");
    div.innerHTML = render(item);
    div.onclick = () => onClick(item);
    container.appendChild(div);
  }
}

async function refreshContacts() {
  const res = await apiJson("/contacts", {
    headers: authHeaders(),
  });
  if (!res.ok) return;

  const contacts = res.json || [];
  renderList(
    contactsList,
    contacts,
    (c) => c.id,
    (c) => `
      <div class="contactRow">
        <img class="avatar" src="${esc(
          c.avatarUrl ||
            "/frontend/assets/default-avatar.png"
        )}" />
        <div>
          <div class="title">${esc(
            c.name
          )} (@${esc(c.username)})</div>
          <div class="sub">${esc(
            c.phone || ""
          )}</div>
        </div>
      </div>
    `,
    (c) =>
      selectPeer(
        c.id,
        `${c.name} (@${c.username})`
      )
  );
}

async function refreshDialogs() {
  const res = await apiJson("/messages/inbox", {
    headers: authHeaders(),
  });
  if (!res.ok) return;

  const dialogs = res.json || [];
  renderList(
    dialogsList,
    dialogs,
    (d) => d.peer.id,
    (d) => {
      const title = d.peer.username
        ? `@${d.peer.username}`
        : d.peer.id;
      const last = d.lastMessage?.text || "";
      return `<div class="title">${esc(
        title
      )}</div><div class="sub">${esc(
        last
      )}</div>`;
    },
    (d) => {
      const label = d.peer.username
        ? `@${d.peer.username}`
        : d.peer.id;
      selectPeer(d.peer.id, label);
    }
  );
}

function selectPeer(peerId, label) {
  selectedPeerId = peerId;
  chatWith.textContent = `Чат з ${label}`;
  lastRenderedCount = 0;
  messagesEl.innerHTML = "";
  refreshContacts();
  refreshDialogs();
  loadConversation();
}

function renderMessages(list) {
  if (list.length === lastRenderedCount) return;
  lastRenderedCount = list.length;

  messagesEl.innerHTML = "";
  for (const m of list) {
    const div = document.createElement("div");
    const isMe = m.fromId === me?.id;
    div.className =
      "msg " + (isMe ? "me" : "other");
    div.innerHTML = `<div>${esc(
      m.text
    )}</div><div class="time">${esc(
      fmt(m.createdAt)
    )}</div>`;
    messagesEl.appendChild(div);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
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
  renderMessages(res.json || []);
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

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

setInterval(() => {
  refreshDialogs();
  loadConversation();
}, 2000);

// init
ensureMe();
refreshContacts();
refreshDialogs();
