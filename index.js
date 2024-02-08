require("dotenv").config();
require("./db/dbInit");
const express = require("express");
const cors = require("cors");
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");
const clientsRoutes = require("./routes/clients");
const ordersRoutes = require("./routes/orders");
const app = express();
const path = require("path");
const router = express.Router();

const corsOptions = {
  origin: ["https://fs-crm.vercel.app"],
};

app.use(cors(corsOptions));
app.use(express.json()); // To parse JSON bodies

const port = process.env.PORT || 3000;

app.use("/clients", ClerkExpressRequireAuth(), clientsRoutes);
app.use("/orders", ClerkExpressRequireAuth(), ordersRoutes);

app.use("/orderImages", express.static(path.join(__dirname, "/orderImages")));

app.get("/", async (req, res) => {
  res.send("Welcome to Byte Base :)");
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
