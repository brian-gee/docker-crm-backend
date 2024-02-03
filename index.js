require("dotenv").config();
require("./db/dbInit");
const express = require("express");
const cors = require("cors");
const clientsRoutes = require("./routes/clients");
const ordersRoutes = require("./routes/orders");
const app = express();
const path = require("path");
const corsOptions = {
  origin: [
    "2600:1700:1dc0:5c30:2c8c:7d96:bfa:f822:3000",
    "https://fs-crm.vercel.app/",
  ],
};

app.use(cors(corsOptions));

app.use(express.json()); // To parse JSON bodies
const port = 3000;

app.use("/clients", clientsRoutes);
app.use("/orders", ordersRoutes);

app.use("/orderImages", express.static(path.join(__dirname, "/orderImages")));

app.get("/", async (req, res) => {
  res.send("Welcome to the API");
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
