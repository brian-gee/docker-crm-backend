const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("../db/authMiddleware");

// GET all orders
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM orders");
    res.json(rows);
  } catch (error) {
    res.status(500).send("Error while retrieving orders");
  }
});

// GET a single order by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).send("Order not found");
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while retrieving order");
  }
});

// POST a new order
router.post("/", authenticateToken, async (req, res) => {
  const { amount, status, client_id } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO orders (amount, status, client_id) VALUES ($1, $2, $3) RETURNING *",
      [amount, status, client_id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while adding a new order");
  }
});

// DELETE an order
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM orders WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res.status(404).send("Order not found");
    }
    res.status(204).send("Order deleted");
  } catch (error) {
    res.status(500).send("Error while deleting order");
  }
});

// PUT to update an order
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount, status, client_id } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE orders SET amount = $1, status = $2, client_id = $3 WHERE id = $4 RETURNING *",
      [amount, status, client_id, id]
    );
    if (rows.length === 0) {
      return res.status(404).send("Order not found");
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).send("Error while updating order");
  }
});

module.exports = router;
