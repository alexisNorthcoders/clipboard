const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./DB/database.sqlite");

console.log("Clearing and recreating database...");
db.serialize(() => {
  db.run("DROP TABLE IF EXISTS users", function (err) {
    if (err) {
      console.error("Error dropping users table", err.message);
      return;
    }
    console.log("Users table dropped.");

    db.run(
      "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT)",
      function (err) {
        if (err) {
          console.error("Error creating users table", err.message);
          return;
        }
        console.log("Users table created.");
      }
    );
  });
});
