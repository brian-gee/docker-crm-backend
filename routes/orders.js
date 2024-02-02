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

    try {
      // Insert the order into the database
      const orderResult = await pool.query(
        "INSERT INTO orders (amount, status, client_id) VALUES ($1, $2, $3) RETURNING *",
        [amount, status, client_id]
      );
      const orderId = orderResult.rows[0].id;

      if (req.files && req.files.length > 0) {
        // Process each uploaded file asynchronously
        const moveFilesPromises = req.files.map((file, index) => {
          return new Promise((resolve, reject) => {
            const finalDir = path.join(
              __dirname,
              "../orderImages",
              orderId.toString()
            );
            if (!fs.existsSync(finalDir)) {
              console.log(`Creating directory: ${finalDir}`);
              fs.mkdirSync(finalDir, { recursive: true });
            }

            console.log(
              `Does directory exist after creation? ${fs.existsSync(finalDir)}`
            );

            const finalFilename = `Image-${index + 1}-${file.originalname}`;
            const finalPath = path.join(finalDir, finalFilename);

            console.log(`Copying file from ${file.path} to ${finalPath}`);

            fs.copyFile(file.path, finalPath, (err) => {
              if (err) {
                console.error(`Error copying file: ${err}`);
                reject(err);
              } else {
                // Now delete the original file
                fs.unlink(file.path, (unlinkErr) => {
                  if (unlinkErr) {
                    console.error(`Error deleting original file: ${unlinkErr}`);
                    reject(unlinkErr);
                  } else {
                    resolve(path.join(orderId.toString(), finalFilename));
                  }
                });
              }
            });
          });
        });

        Promise.all(moveFilesPromises)
          .then(async (imagePaths) => {
            // Update the database with the paths of the uploaded images
            await pool.query(
              "UPDATE orders SET picture_urls = $1 WHERE id = $2",
              [imagePaths, orderId]
            );

            res.status(201).json({
              message: "Order and images added successfully",
              orderId: orderId,
              imagePaths: imagePaths,
            });
          })
          .catch((error) => {
            // If there's an error in moving the files
            res
              .status(500)
              .send("Error while processing images: " + error.message);
          });
      } else {
        // If no files were uploaded but the order was created
        res.status(201).json({
          message: "Order added successfully, but no images were uploaded.",
          orderId: orderId,
        });
      }
    } catch (error) {
      // If there's an error in inserting the order or any other operation
      console.error(
        `Error while adding a new order and images: ${error.message}`
      ); // Additional logging
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
