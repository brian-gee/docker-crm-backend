require("dotenv").config();
require("./db/dbInit");
const express = require("express");
const cors = require("cors");
const clientsRoutes = require("./routes/clients");
const ordersRoutes = require("./routes/orders");
const app = express();

app.use(cors());
app.use(express.json()); // To parse JSON bodies
const port = 3000;

app.use("/clients", clientsRoutes);
app.use("/orders", ordersRoutes);

app.get("/", async (req, res) => {
  res.send("Welcome to the API");
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});