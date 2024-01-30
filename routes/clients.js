const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("../db/authMiddleware");

// GET all clients
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clients");
    res.json(rows);
  } catch (error) {
    res.status(500).send("Error while retrieving clients");
  }
});

// GET a single client by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query("SELECT * FROM clients WHERE id = $1", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).send("Client not found");
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while retrieving client");
  }
});

// POST a new client
router.post("/", authenticateToken, async (req, res) => {
  const { first_name, last_name, phone, email, address, city, zip, company } =
    req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO clients (first_name, last_name, phone, email, address, city, zip, company) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [first_name, last_name, phone, email, address, city, zip, company]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while adding a new client");
  }
});

// DELETE a client
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM clients WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res.status(404).send("Client not found");
    }
    res.status(204).send("Client deleted");
  } catch (error) {
    res.status(500).send("Error while deleting client");
  }
});

// PUT to update a client
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone, email, address, city, zip, company } =
    req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE clients SET first_name = $1, last_name = $2, phone = $3, email = $4, address = $5, city = $6, zip = $7, company = $8 WHERE id = $9 RETURNING *",
      [first_name, last_name, phone, email, address, city, zip, company, id]
    );
    if (rows.length === 0) {
      return res.status(404).send("Client not found");
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while updating client");
  }
});

module.exports = router;
