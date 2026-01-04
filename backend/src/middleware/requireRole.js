export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(500)
        .json({ error: "User context missing" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: "Недостатньо прав доступу",
        requiredRole: role,
        yourRole: req.user.role,
      });
    }

    next();
  };
}
