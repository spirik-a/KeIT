const API = "";

function login() {
  const phone =
    document.getElementById("phone").value;

  fetch(API + "/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        location.href = "profile.html";
      } else {
        alert("Ошибка входа");
      }
    });
}

function register() {
  const phone =
    document.getElementById("phone").value;
  const name =
    document.getElementById("name").value;
  const username =
    document.getElementById("username").value;

  fetch(API + "/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      name,
      username,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.id) {
        alert("Регистрация успешна");
        location.href = "index.html";
      } else {
        alert("Ошибка регистрации");
      }
    });
}

function loadProfile() {
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "index.html";
    return;
  }

  fetch(API + "/users/me", {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => r.json())
    .then((data) => {
      document.getElementById(
        "profile"
      ).textContent = JSON.stringify(
        data,
        null,
        2
      );
    });
}

function logout() {
  const token = localStorage.getItem("token");

  fetch(API + "/users/logout", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  }).then(() => {
    localStorage.removeItem("token");
    location.href = "index.html";
  });
}

if (location.pathname.endsWith("profile.html")) {
  loadProfile();
}
