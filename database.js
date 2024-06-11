const { initializeDatabase } = require("./databaseManager");


initializeDatabase((err) => {
  if (err) {
    console.error("Failed to initialize the database", err);
  } else {
    console.log("Database has been initialized successfully.");
  }
});