require('dotenv').config();

function admin(req, res, next) {
  const { password } = req.body;

  if (password === process.env.PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
}
module.exports = { admin };
