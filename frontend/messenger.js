const token = localStorage.getItem("token");
if (!token) {
  alert("Спочатку увійдіть");
  location.href = "/frontend/login.html";
}

const headersAuth = {
  Authorization: "Bearer " + token,
};

const contactsEl =
  document.getElementById("contacts");
const messagesEl =
  document.getElementById("messages");
const chatTitleEl =
  document.getElementById("chatTitle");
const messageInput = document.getElementById(
  "messageInput"
);
const sendBtn =
  document.getElementById("sendBtn");

const addUsername = document.getElementById(
  "addUsername"
);
const addBtn = document.getElementById("addBtn");

let activeContactId = null;

async function loadContacts() {
  const r = await fetch("/contacts", {
    headers: headersAuth,
  });
  const list = await r.json();

  contactsEl.innerHTML = "";
  list.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.username
      ? `${u.name} (@${u.username})`
      : u.name;
    li.onclick = () => openChat(u.id, u.name);
    contactsEl.appendChild(li);
  });
}

async function openChat(userId, name) {
  activeContactId = userId;
  chatTitleEl.textContent = name;

  const r = await fetch("/messages/" + userId, {
    headers: headersAuth,
  });
  const msgs = await r.json();

  renderMessages(msgs);
}

function renderMessages(msgs) {
  messagesEl.innerHTML = "";
  msgs.forEach((m) => {
    const div = document.createElement("div");
    div.className = "message";
    div.textContent = m.text;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

sendBtn.onclick = async () => {
  const text = messageInput.value.trim();
  if (!activeContactId || !text) return;

  const r = await fetch("/messages", {
    method: "POST",
    headers: {
      ...headersAuth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: activeContactId,
      text,
    }),
  });

  const msg = await r.json();
  if (msg.error) return alert(msg.error);

  messageInput.value = "";
  // перезавантажуємо діалог
  openChat(
    activeContactId,
    chatTitleEl.textContent
  );
  // контакти теж можуть оновитись (автододавання)
  loadContacts();
};

addBtn.onclick = async () => {
  const username = addUsername.value.trim();
  if (!username) return;

  const r = await fetch("/contacts/add", {
    method: "POST",
    headers: {
      ...headersAuth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const data = await r.json();
  if (data.error) return alert(data.error);

  addUsername.value = "";
  loadContacts();
};

// старт
loadContacts();
