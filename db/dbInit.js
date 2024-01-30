const fs = require("fs");
const path = require("path");
const pool = require("./index"); // Assuming index.js is your database connection setup

async function createTables() {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            phone VARCHAR(50),
            email VARCHAR(255),
            address VARCHAR(255),
            city VARCHAR(255),
            zip VARCHAR(50),
            company VARCHAR(255)
        );
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            amount DECIMAL,
            status VARCHAR(50),
            client_id INTEGER REFERENCES clients(id)
        );
    `);
}

async function importData() {
  const filePath = path.join(__dirname, "./clients.json"); // Adjust the path to your JSON file
  const fileExists = fs.existsSync(filePath);
  if (!fileExists) {
    console.log("No data file found for import.");
    return;
  }

  const clientsData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const client of clientsData) {
    const { rows } = await pool.query(
      "SELECT * FROM clients WHERE email = $1",
      [client.email]
    );
    if (rows.length === 0) {
      await pool.query(
        "INSERT INTO clients (first_name, last_name, phone, email, address, city, zip, company) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          client.first_name,
          client.last_name,
          client.phone,
          client.email,
          client.address,
          client.city,
          client.zip,
          client.company,
        ]
      );
    }
  }
  console.log("Data import completed.");
}

async function init() {
  try {
    await createTables();
    await importData();
    console.log("Database initialization complete.");
  } catch (err) {
    console.error("Error during database initialization:", err);
    process.exit(1);
  }
}

init();
