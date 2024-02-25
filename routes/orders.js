const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../db");

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
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT orders.*, clients.first_name || ' ' || clients.last_name AS name
      FROM orders
      JOIN clients ON orders.client_id = clients.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).send("Error while retrieving orders");
  }
});

// GET a single order by ID
router.get("/:id", async (req, res) => {
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
router.post("/", upload.array("orderImages"), async (req, res) => {
  const { amount, status, client_id, description } = req.body;

  try {
    // Insert the order into the database
    const orderResult = await pool.query(
      "INSERT INTO orders (amount, status, client_id, description) VALUES ($1, $2, $3, $4) RETURNING *",
      [amount, status, client_id, description],
    );
    const orderId = orderResult.rows[0].id;

    if (req.files && req.files.length > 0) {
      // Process each uploaded file asynchronously
      const moveFilesPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          const finalDir = path.join(
            __dirname,
            "../orderImages",
            orderId.toString(),
          );
          if (!fs.existsSync(finalDir)) {
            console.log(`Creating directory: ${finalDir}`);
            fs.mkdirSync(finalDir, { recursive: true });
          }

          const finalFilename = `Image-${index + 1}-${file.originalname}`;
          const finalPath = path.join(finalDir, finalFilename);

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
            [imagePaths, orderId],
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
      `Error while adding a new order and images: ${error.message}`,
    ); // Additional logging
    res
      .status(500)
      .send("Error while adding a new order and images: " + error.message);
  }
});

// DELETE an order and associated images
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // First, select the order to retrieve the image paths
    const orderRes = await pool.query(
      "SELECT picture_urls FROM orders WHERE id = $1",
      [id],
    );
    if (orderRes.rowCount === 0) {
      return res.status(404).send("Order not found");
    }

    // Delete the order
    const deleteRes = await pool.query("DELETE FROM orders WHERE id = $1", [
      id,
    ]);
    if (deleteRes.rowCount === 0) {
      return res.status(404).send("Order not found");
    }

    // Delete the associated images and directory
    const images = orderRes.rows[0].picture_urls;
    if (images && images.length > 0) {
      const orderImagesDir = path.join(
        __dirname,
        "../orderImages",
        id.toString(),
      );
      if (fs.existsSync(orderImagesDir)) {
        // Use a recursive option to delete non-empty directories
        fs.rmSync(orderImagesDir, { recursive: true });
        console.log(`Deleted directory: ${orderImagesDir}`);
      }
    }

    res.status(204).send("Order and associated images deleted");
  } catch (error) {
    console.error(`Error while deleting order and images: ${error.message}`);
    res.status(500).send("Error while deleting order and images");
  }
});

// PUT to update an order and add new images
router.put("/:id", upload.array("orderImages"), async (req, res) => {
  const { id } = req.params;
  const { amount, status, client_id } = req.body;
  try {
    // Update order details in the database
    const orderUpdateRes = await pool.query(
      "UPDATE orders SET amount = $1, status = $2, client_id = $3 WHERE id = $4 RETURNING *",
      [amount, status, client_id, id],
    );
    if (orderUpdateRes.rowCount === 0) {
      return res.status(404).send("Order not found");
    }

    let order = orderUpdateRes.rows[0];

    // Handle new image upload
    if (req.files && req.files.length > 0) {
      const newImagesPaths = req.files.map((file, index) => {
        const finalFilename = `Image-${order.picture_urls.length + index + 1}-${
          file.originalname
        }`;
        const finalPath = path.join(
          __dirname,
          "../orderImages",
          id.toString(),
          finalFilename,
        );
        fs.copyFileSync(file.path, finalPath); // Copy the file to the final path
        fs.unlinkSync(file.path); // Delete the temp file
        return path.join(id.toString(), finalFilename); // Return the relative path
      });

      // Combine old image paths with new ones
      const updatedImagePaths = order.picture_urls.concat(newImagesPaths);

      // Update the order's picture_urls with new image paths
      const imageUpdateRes = await pool.query(
        "UPDATE orders SET picture_urls = $1 WHERE id = $2 RETURNING *",
        [updatedImagePaths, id],
      );
      order = imageUpdateRes.rows[0]; // Update the order object with new image paths
    }

    res.json({
      message: "Order and images updated successfully",
      order: order,
    });
  } catch (error) {
    console.error(`Error while updating order and images: ${error.message}`);
    res.status(500).send("Error while updating order and images");
  }
});

module.exports = router;
