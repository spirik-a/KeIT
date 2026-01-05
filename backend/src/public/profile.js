const token = localStorage.getItem("token");

if (!token) {
  alert("Не авторизовано");
  location.href = "/";
}

const profileDiv =
  document.getElementById("profile");
const upgradeBlock = document.getElementById(
  "upgrade-block"
);
const improvedBlock = document.getElementById(
  "improved-block"
);
const upgradeBtn =
  document.getElementById("upgradeBtn");

/* ===== LOAD PROFILE ===== */
fetch("/users/me", {
  headers: {
    Authorization: "Bearer " + token,
  },
})
  .then((r) => r.json())
  .then((user) => {
    profileDiv.innerHTML = `
    <p><b>Імʼя:</b> ${user.name}</p>
    <p><b>Нік:</b> ${user.username}</p>
    <p><b>Роль:</b> ${user.role}</p>
    <p><b>Баланс:</b> ${user.balance}</p>
  `;

    if (user.role === "basic") {
      upgradeBlock.style.display = "block";
    }

    if (user.role === "improved") {
      improvedBlock.style.display = "block";
    }
  });

/* ===== UPGRADE ===== */
upgradeBtn?.addEventListener("click", () => {
  fetch("/upgrade", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
      } else {
        alert("Роль Improved активована");
        location.reload();
      }
    });
});
