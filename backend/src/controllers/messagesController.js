let messages = [];

export function getMessages(req, res) {
  res.json(messages);
}

export function postMessage(req, res) {
  const { user, text } = req.body;

  if (!user || !text) {
    return res
      .status(400)
      .json({ error: "user and text required" });
  }

  const message = {
    user,
    text,
    timestamp: new Date(),
  };

  messages.push(message);
  res.json(message);
}
