const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const authenticateToken = require("../db/authMiddleware");

// Configure multer for image storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, "../tempUploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique file name to avoid conflicts; adjust as needed
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

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
router.post(
  "/",
  authenticateToken,
  upload.array("orderImages"),
  async (req, res) => {
    const { amount, status, client_id } = req.body;
    let imagePaths = [];

    try {
      // Insert the order into the database
      const orderResult = await pool.query(
        "INSERT INTO orders (amount, status, client_id) VALUES ($1, $2, $3) RETURNING *",
        [amount, status, client_id]
      );
      const orderId = orderResult.rows[0].id;

      // Initialize an array to collect image paths
      let imagePaths = [];

      // Process each uploaded file
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          const finalDir = path.join(
            __dirname,
            "../orderImages",
            orderId.toString()
          );
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
          }
          const finalFilename = `Image-${index + 1}-${file.originalname}`;
          const finalPath = path.join(finalDir, finalFilename);

          // Move the file to the final destination with the new name
          fs.renameSync(file.path, finalPath);

          // Collect the path for database update
          // Adjust this path as necessary based on how you want to store it
          imagePaths.push(path.join(orderId.toString(), finalFilename));
        });

        // Update the database with the paths of the uploaded images
        await pool.query("UPDATE orders SET picture_urls = $1 WHERE id = $2", [
          imagePaths,
          orderId,
        ]);
      }

      res.status(201).json({
        message: "Order and images added successfully",
        orderId: orderId,
        imagePaths: imagePaths, // This now reflects the stored paths in the database
      });
    } catch (error) {
      res
        .status(500)
        .send("Error while adding a new order and images: " + error.message);
    }
  }
);

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
