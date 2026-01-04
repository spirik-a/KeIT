const API = "";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/* ===== ВХІД ===== */
function login() {
  const phone =
    document.getElementById("phone").value;
  const password =
    document.getElementById("password").value;

  if (!phone || !password) {
    alert("Введи номер телефону та пароль");
    return;
  }

  fetch(API + "/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, password }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        location.href = "profile.html";
      } else {
        alert("Невірний телефон або пароль");
      }
    })
    .catch(() =>
      alert("Помилка зʼєднання з сервером")
    );
}

/* ===== РЕЄСТРАЦІЯ ===== */
function register() {
  const phone =
    document.getElementById("phone").value;
  const name =
    document.getElementById("name").value;
  const username =
    document.getElementById("username").value;
  const password =
    document.getElementById("password").value;

  if (!phone || !name || !username || !password) {
    alert("Заповни всі поля");
    return;
  }

  if (!passwordRegex.test(password)) {
    alert(
      "Пароль слабкий. Мінімум 8 символів, великі й малі літери, цифра та спецсимвол"
    );
    return;
  }

  fetch(API + "/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      name,
      username,
      password,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.id) {
        alert(
          "Реєстрація успішна. Тепер увійди."
        );
        location.href = "index.html";
      } else {
        alert("Помилка реєстрації");
      }
    })
    .catch(() =>
      alert("Помилка зʼєднання з сервером")
    );
}

/* ===== ПРОФІЛЬ ===== */
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
    })
    .catch(() =>
      alert("Не вдалося завантажити профіль")
    );
}

/* ===== ВИХІД ===== */
function logout() {
  const token = localStorage.getItem("token");

  fetch(API + "/users/logout", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  }).finally(() => {
    localStorage.removeItem("token");
    location.href = "index.html";
  });
}

/* ===== АВТО ===== */
if (location.pathname.endsWith("profile.html")) {
  loadProfile();
}
