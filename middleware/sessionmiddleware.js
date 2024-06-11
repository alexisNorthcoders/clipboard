const session = require("express-session");

const sessionMiddleware = session({
    secret: process.env.DATABASE_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })

module.exports = { sessionMiddleware };
