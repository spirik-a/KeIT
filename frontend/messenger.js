const token = localStorage.getItem("token");
const me = JSON.parse(
  localStorage.getItem("user") || "null"
);

if (!token) {
  location.href = "/frontend/login.html";
}

const meLine = document.getElementById("meLine");
const logoutBtn =
  document.getElementById("logoutBtn");

const addUsername = document.getElementById(
  "addUsername"
);
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
let selectedPeerLabel = "";
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

function setMeLine() {
  if (!me) {
    meLine.textContent = "Невідомий користувач";
    return;
  }
  meLine.textContent = `${me.name} (@${me.username})`;
}

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "/frontend/login.html";
};

addBtn.onclick = async () => {
  addStatus.textContent = "";
  const username = addUsername.value.trim();
  if (!username) {
    addStatus.textContent = "Введіть нік.";
    return;
  }

  const res = await apiJson("/contacts/add", {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    addStatus.textContent =
      res.json?.error ||
      `Помилка (${res.status})`;
    return;
  }

  addStatus.textContent = "Контакт додано.";
  addUsername.value = "";
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
    (c) =>
      `<div class="title">${c.name} (@${
        c.username
      })</div><div class="sub">${
        c.phone || ""
      }</div>`,
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
        ? `${d.peer.username}`
        : d.peer.id;
      const last = d.lastMessage?.text || "";
      return `<div class="title">@${title}</div><div class="sub">${last}</div>`;
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
  selectedPeerLabel = label;
  chatWith.textContent = `Чат з ${label}`;
  lastRenderedCount = 0;
  messagesEl.innerHTML = "";
  // Перерендеримо списки щоб підсвітити active
  refreshContacts();
  refreshDialogs();
  loadConversation(true);
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uk-UA");
  } catch {
    return iso;
  }
}

function renderMessages(list) {
  // щоб не мерехтіло — якщо кількість не змінилась, не перерендерюємо
  if (list.length === lastRenderedCount) return;
  lastRenderedCount = list.length;

  messagesEl.innerHTML = "";
  for (const m of list) {
    const div = document.createElement("div");
    const isMe = m.fromId === me?.id;
    div.className =
      "msg " + (isMe ? "me" : "other");
    div.innerHTML = `
      <div>${escapeHtml(m.text)}</div>
      <div class="time">${formatTime(
        m.createdAt
      )}</div>
    `;
    messagesEl.appendChild(div);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function loadConversation(force = false) {
  if (!selectedPeerId) return;

  const res = await apiJson(
    `/messages/${encodeURIComponent(
      selectedPeerId
    )}`,
    {
      headers: authHeaders(),
    }
  );

  if (!res.ok) return;
  renderMessages(res.json || []);
}

sendBtn.onclick = async () => {
  if (!selectedPeerId) {
    alert("Оберіть контакт або діалог.");
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

  // Після відправки:
  // 1) підвантажити чат
  // 2) оновити контакти (бо авто-додавання)
  // 3) оновити діалоги
  await refreshContacts();
  await refreshDialogs();
  await loadConversation(true);
};

// Enter для відправки
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Polling: раз на 2 секунди
setInterval(() => {
  refreshDialogs();
  refreshContacts();
  loadConversation();
}, 2000);

// init
setMeLine();
refreshContacts();
refreshDialogs();
