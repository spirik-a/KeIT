import crypto from "crypto";

const users = [];

function generateId() {
  return crypto.randomUUID();
}

export function registerUser(req, res) {
  const { phone, name, username } = req.body;

  if (!phone || !name) {
    return res
      .status(400)
      .json({ error: "phone and name required" });
  }

  const exists = users.find(
    (u) => u.phone === phone
  );
  if (exists) {
    return res
      .status(409)
      .json({ error: "user already exists" });
  }

  const user = {
    id: generateId(),
    phone,
    name,
    username: username || null,
    role: "basic",
    balance: 0,
    createdAt: new Date(),
  };

  users.push(user);
  res.json(user);
}

export function getProfile(req, res) {
  const { id } = req.params;
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res
      .status(404)
      .json({ error: "user not found" });
  }

  res.json(user);
}

export function updateProfile(req, res) {
  const { id } = req.params;
  const { name, username } = req.body;

  const user = users.find((u) => u.id === id);
  if (!user) {
    return res
      .status(404)
      .json({ error: "user not found" });
  }

  if (name) user.name = name;
  if (username) user.username = username;

  res.json(user);
}
