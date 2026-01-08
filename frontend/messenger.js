const token = localStorage.getItem("token");

if (!token) {
  alert("Не авторизовано");
  location.href = "/login.html";
}

let activeContactId = null;

const contactsEl =
  document.getElementById("contacts");
const messagesEl =
  document.getElementById("messages");
const headerEl =
  document.getElementById("chatHeader");
const inputEl = document.getElementById(
  "messageInput"
);
const sendBtn =
  document.getElementById("sendBtn");

/* ЗАВАНТАЖЕННЯ КОНТАКТІВ */
fetch("/contacts", {
  headers: {
    Authorization: "Bearer " + token,
  },
})
  .then((r) => r.json())
  .then((contacts) => {
    contactsEl.innerHTML = "";
    contacts.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c.name;
      li.onclick = () => openChat(c);
      contactsEl.appendChild(li);
    });
  });

/* ВІДКРИТТЯ ЧАТУ */
function openChat(contact) {
  activeContactId = contact.contactUserId;
  headerEl.textContent = contact.name;
  messagesEl.innerHTML = "";

  fetch("/messages/" + activeContactId, {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((r) => r.json())
    .then(renderMessages);
}

/* РЕНДЕР ПОВІДОМЛЕНЬ */
function renderMessages(messages) {
  messagesEl.innerHTML = "";
  messages.forEach((m) => {
    const div = document.createElement("div");
    div.className =
      "message " +
      (m.from === getMyId() ? "me" : "");
    div.textContent = m.text;
    messagesEl.appendChild(div);
  });
}

/* НАДСИЛАННЯ */
sendBtn.onclick = () => {
  if (!activeContactId || !inputEl.value) return;

  fetch("/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      to: activeContactId,
      text: inputEl.value,
    }),
  })
    .then((r) => r.json())
    .then((msg) => {
      inputEl.value = "";
      renderMessages(
        [...messagesEl.children].map((e) => e),
        msg
      );
      openChat({
        contactUserId: activeContactId,
        name: headerEl.textContent,
      });
    });
};

/* ОТРИМАННЯ ID СЕБЕ */
function getMyId() {
  const payload = JSON.parse(
    atob(token.split(".")[1] || "")
  );
  return payload.id || payload.userId;
}
