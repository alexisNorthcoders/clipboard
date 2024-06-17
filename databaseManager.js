const sqlite3 = require("sqlite3").verbose();

async function initializeDatabase(callback) {
  const db = new sqlite3.Database("./DB/database.sqlite", (err) => {
    if (err) {
      console.error("Error opening database", err.message);
      if (callback) callback(err);
      return;
    }

    db.serialize(() => {
      db.run("DROP TABLE IF EXISTS users", function (err) {
        if (err) {
          console.error("Error dropping users table", err.message);
          if (callback) callback(err);
          return;
        }
        db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT)", function (err) {
          if (err) {
            console.error("Error creating users table", err.message);
            if (callback) callback(err);
            return;
          }

          if (callback) callback(null);
        });
      });
      db.run("DROP TABLE IF EXISTS UserFiles ", function (err) {
        if (err) {
          console.error("Error dropping UserFiles table", err.message);
          if (callback) callback(err);
          return;
        }
        db.run("CREATE TABLE IF NOT EXISTS UserFiles (userId TEXT, filePath TEXT, PRIMARY KEY (userId, filePath))", function (err) {
          if (err) {
            console.error("Error creating UserFiles table", err.message);
            if (callback) callback(err);
            return;
          }

          if (callback) callback(null);
        });
      });
    });
  });
}

module.exports = { initializeDatabase };
