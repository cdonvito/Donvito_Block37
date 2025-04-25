const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const {
  client,
  createUser,
  createProduct,
  createUserProduct,
  destroyUserProduct,
  subtractUserProductQuantity
} = require("./db")

const server = express();
client.connect();

server.use(express.json());
server.use(morgan("dev"));
server.use(cors());

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`server is listening on port ${port}`));

