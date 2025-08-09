const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const sessionMiddleware = session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './DB', concurrentDB: true }),
  secret: process.env.DATABASE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  },
})

module.exports = { sessionMiddleware };
