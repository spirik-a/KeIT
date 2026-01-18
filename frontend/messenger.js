// ===== перевірка авторизації =====
const token = localStorage.getItem("token");

if (!token) {
  alert("Будь ласка, увійдіть у систему");
  window.location.href = "/frontend/login.html";
}

// ===== елементи UI =====
const contactsList =
  document.getElementById("contacts");
const messagesBox =
  document.getElementById("messages");
const sendBtn =
  document.getElementById("sendBtn");
const messageInput = document.getElementById(
  "messageInput"
);

// ===== тимчасово (поки без бекенду) =====
const demoContacts = [
  { id: "1", name: "Andrii" },
  { id: "2", name: "Test User" },
];

// ===== показ контактів =====
demoContacts.forEach((c) => {
  const div = document.createElement("div");
  div.className = "contact";
  div.textContent = c.name;
  div.onclick = () => openChat(c);
  contactsList.appendChild(div);
});

function openChat(contact) {
  messagesBox.innerHTML = `<div class="system">Чат з ${contact.name}</div>`;
}

// ===== надсилання повідомлення (поки локально) =====
sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const msg = document.createElement("div");
  msg.className = "message me";
  msg.textContent = text;
  messagesBox.appendChild(msg);

  messageInput.value = "";
};
