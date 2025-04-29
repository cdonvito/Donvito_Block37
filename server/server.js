const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const {
  client,
  createUser,
  destroyUser,
  fetchUsers,
  fetchUser,
  createProduct,
  modifyProduct,
  destroyProduct,
  fetchProducts,
  fetchAvailableProducts,
  fetchProduct,
  createUserProduct,
  fetchUserProducts,
  destroyUserProduct,
  subtractUserProductQuantity,
  addUserProductQuantity,
  checkoutOrder,
  checkoutProducts,
  checkoutProductQuantity,
  destroyAllUserProducts,
  fetchOrders,
  fetchOrderProducts,
  authenticate,
  findUserByToken,
  signToken,
} = require("./db");

const server = express();
client.connect();

server.use(express.json());
server.use(morgan("dev"));
server.use(cors());

//check to see if user exists by token
server.use(async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (token) {
      const user = await findUserByToken(token);

      if (!user || !user.id) {
        next({
          name: "Authorization Header Error",
          message: "Authorization token malformed",
        });
        return;
      } else {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`server is listening on port ${port}`));

//Register a new user
server.post("/api/auth/register", async (req, res, next) => {
  try {
    const user = await createUser(
      req.body?.username,
      req.body?.password,
      req.body.is_admin,
      req.body.name,
      req.body.email_address,
      req.body.mailing_address,
      req.body.phone_number,
      req.body.billing_address
    );
    const token = await signToken(user.id);
    res.status(201).send({ token });
  } catch (error) {
    next(error);
  }
});

//Log in existing user
server.post("/api/auth/login", async (req, res, next) => {
  try {
    const user = await authenticate(req.body?.username, req.body?.password);
    if (!user) {
      return res.status(401).send({ message: "Invalid credentials" });
    }
    const token = await signToken(user.id);
    res.status(200).send({ token });
  } catch (error) {
    next(error);
  }
});

//delete a user
server.delete("/api/user", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    await destroyUser(req.user.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

//get all users if admin user
server.get("/api/users", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    if (req.user.is_admin != true) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const users = await fetchUsers();
    res.send(users);
  } catch (error) {
    next(error);
  }
});

//get current user if logged in
server.get("/api/users/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const users = await fetchUser(req.user.id);
    res.send(users);
  } catch (error) {
    next(error);
  }
});

//create new product if admin user
server.post("/api/product", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    if (req.user.is_admin != true) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const product = await createProduct(
      req.body.description,
      req.body.img_url,
      req.body.price,
      req.body.quantity_available
    );
    res.status(201).send(product);
  } catch (error) {
    next(error);
  }
});

// modify a product if admin user
server.patch("/api/product/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    if (req.user.is_admin != true) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const product = await modifyProduct(
      req.params.id,
      req.body.description,
      req.body.img_url,
      req.body.price,
      req.body.quantity_available
    );
    res.send(product);
  } catch (error) {
    next(error);
  }
});

//delete a product if admin user
server.delete("/api/product/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    if (req.user.is_admin != true) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    await destroyProduct(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// get all products if admin user
server.get("/api/products/all", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    if (req.user.is_admin != true) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const products = await fetchProducts();
    res.send(products);
  } catch (error) {
    next(error);
  }
});

// get all products available
server.get("/api/products/available", async (req, res, next) => {
  try {
    const products = await fetchAvailableProducts();
    res.send(products);
  } catch (error) {
    next(error);
  }
});

// get single product
server.get("/api/product/:id", async (req, res, next) => {
  try {
    const product = await fetchProduct(req.params.id);
    res.send(product);
  } catch (error) {
    next(error);
  }
});

// create userProduct for current user
server.post("/api/user/userProduct", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const product = await createUserProduct(
      req.user.id,
      req.body.product_id,
      req.body.quantity
    );
    res.status(201).send(product);
  } catch (error) {
    next(error);
  }
});

// get all userProducts for current user
server.get("/api/user/userProducts", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const userProducts = await fetchUserProducts(req.user.id);
    res.send(userProducts);
  } catch (error) {
    next(error);
  }
});

// delete userProduct for current user
server.delete("/api/user/userProduct/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    await destroyUserProduct(req.params.id, req.user.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// subtract quantity from a userProduct for the current user
server.patch("/api/user/userProduct/subtract/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const product = await subtractUserProductQuantity(
      req.params.id,
      req.user.id,
      req.body.quantity
    );
    res.send(product);
  } catch (error) {
    next(error);
  }
});

// add quantity from a userProduct for the current user
server.patch("/api/user/userProduct/add/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const product = await addUserProductQuantity(
      req.params.id,
      req.user.id,
      req.body.quantity
    );
    res.send(product);
  } catch (error) {
    next(error);
  }
});

// user checkout
server.post("/api/user/checkout", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }

    const userProducts = await fetchUserProducts(req.user.id);

    if (!Array.isArray(userProducts) || userProducts.length === 0) {
      return res
        .status(400)
        .send({ message: "Products must be a non-empty array" });
    }

    const order_date = new Date();

    // Step 1: Create a new order
    const order = await checkoutOrder(req.user.id, order_date);

    // Step 2: Insert all products tied to the order & update product quantity
    const checkoutResults = await Promise.all(
      userProducts.map(async (item) => {
        const orderProduct = await checkoutProducts(
          order.id,
          req.user.id,
          item.product_id,
          item.quantity,
        );
        await checkoutProductQuantity(item.product_id, item.quantity);
        return orderProduct;
      })
    );

    // Step 3: Clear user's cart
    await destroyAllUserProducts(req.user.id);

    res.status(201).send({
      orderId: order.id,
      products: checkoutResults,
      message: "Checkout successful",
    });
  } catch (error) {
    next(error);
  }
});

server.get("/api/user/orders", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const userOrders = await fetchOrders(req.user.id);
    res.send(userOrders);
  } catch (error) {
    next(error);
  }
});

server.get("/api/user/order/summary", async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .send({ message: "You must be logged in to do that" });
    }
    const orderSummary = await fetchOrderProducts(req.body.order_id, req.user.id);
    res.send(orderSummary);
  } catch (error) {
    next(error);
  }
});

server.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message || err });
});
