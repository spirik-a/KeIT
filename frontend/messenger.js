const token = localStorage.getItem("token");

if (!token) {
  location.href = "/";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token,
};

const contactsEl =
  document.getElementById("contacts");
const messagesEl =
  document.getElementById("messages");
const form = document.getElementById("form");
const textInput = document.getElementById("text");

let currentContact = null;

async function loadContacts() {
  const res = await fetch("/contacts", {
    headers,
  });
  const data = await res.json();

  contactsEl.innerHTML = "";

  data.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.nickname;
    li.onclick = () => openChat(u.id);
    contactsEl.appendChild(li);
  });
}

async function openChat(userId) {
  currentContact = userId;
  messagesEl.innerHTML = "";

  const res = await fetch(`/messages/${userId}`, {
    headers,
  });
  const data = await res.json();

  data.forEach((m) => {
    const div = document.createElement("div");
    div.textContent = m.text;
    messagesEl.appendChild(div);
  });
}

form.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentContact) return;

  await fetch("/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: currentContact,
      text: textInput.value,
    }),
  });

  textInput.value = "";
  openChat(currentContact);
};

loadContacts();
