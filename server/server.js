const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const {
  client,
  createUser,
  fetchUsers,
  createProduct,
  fetchProducts,
  createUserProduct,
  fetchUserProducts,
  destroyUserProduct,
  subtractUserProductQuantity,
} = require("./db");

const server = express();
client.connect();

server.use(express.json());
server.use(morgan("dev"));
server.use(cors());

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`server is listening on port ${port}`));

server.post("/api/user", async (req, res, next) => {
  try {
    const user = await createUser(
      req.body.username,
      req.body.password,
      req.body.is_admin,
      req.body.name,
      req.body.email_address,
      req.body.mailing_address,
      req.body.phone_number,
      req.body.billing_address
    );
    res.status(201).send(user);
  } catch (error) {
    next(error);
  }
});

server.get("/api/users", async (req, res, next) => {
  try {
    const users = await fetchUsers();
    res.send(users);
  } catch (error) {
    next(error);
  }
});

server.post("/api/product", async (req, res, next) => {
  try {
    const product = await createProduct(
      req.body.description,
      req.body.img_url,
      req.body.price
    );
    res.status(201).send(product);
  } catch (error) {
    next(error);
  }
});

server.get("/api/products", async (req, res, next) => {
  try {
    const products = await fetchProducts();
    res.send(products);
  } catch (error) {
    next(error);
  }
});

server.post("/api/user/:user_id/:product_id", async (req, res, next) => {
  try {
    const product = await createUserProduct(
      req.params.user_id,
      req.params.product_id,
      req.body.quantity
    );
    res.status(201).send(product);
  } catch (error) {
    next(error);
  }
});

server.get("/api/user/:user_id/products", async (req, res, next) => {
  try {
    const userProducts = await fetchUserProducts(req.params.user_id);
    res.send(userProducts);
  } catch (error) {
    next(error);
  }
});

server.delete("/api/user/:user_id/:id", async (req, res, next) => {
  try {
    await destroyUserProduct(req.params.id, req.params.user_id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

server.patch("/api/user/:user_id/:id", async (req, res, next) => {
  try {
    const product = await subtractUserProductQuantity(
      req.params.id,
      req.params.user_id,
      req.body.quantity
    );
    res.status(201).send(product);
  } catch (error) {
    next(error);
  }
});
