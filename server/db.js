const pg = require("pg");
const uuid = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "safe";

const connection = {
  connectionString:
    process.env.DATABASE_URL || "postgres://localhost/career_sim_block37",
  ssl: { rejectUnauthorized: false },
};

const client = new pg.Client(
  process.env.DATABASE_URL
    ? connection
    : "postgres://localhost/career_sim_block37"
);

async function createTables() {
  const SQL = `
    DROP TABLE IF EXISTS user_products;
    DROP TABLE IF EXISTS order_products;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;

    CREATE TABLE products(
      id UUID PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      img_url VARCHAR(255) NOT NULL,
      price FLOAT NOT NULL,
      quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0)
    );

    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT false,
      name VARCHAR(255) NOT NULL,
      email_address VARCHAR(255),
      mailing_address VARCHAR(255) NOT NULL,
      phone_number VARCHAR(255),
      billing_address VARCHAR(255)
    );

    CREATE TABLE user_products(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      product_id UUID REFERENCES products(id) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      CONSTRAINT unique_user_id_product_id UNIQUE (user_id, product_id)
    );

    CREATE TABLE orders(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      order_date DATE NOT NULL
    );

    CREATE TABLE order_products(
      id UUID PRIMARY KEY,
      order_id UUID REFERENCES orders(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      product_id UUID REFERENCES products(id) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price FLOAT NOT NULL,
      CONSTRAINT order_id_product_id UNIQUE (order_id, product_id)
    );
  `;

  await client.query(SQL);
}

async function createUser(
  username,
  password,
  is_admin,
  name,
  email_address,
  mailing_address,
  phone_number,
  billing_address
) {
  const SQL = `INSERT INTO users(id, username, password, is_admin, name, email_address, mailing_address, phone_number, billing_address) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`;
  const hashedPassword = await bcrypt.hash(password, 10);
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    hashedPassword,
    is_admin,
    name,
    email_address,
    mailing_address,
    phone_number,
    billing_address,
  ]);
  return response.rows[0];
}

async function destroyUser(id) {
  const SQL = `DELETE FROM users WHERE id = $1;`;
  await client.query(SQL, [id]);
}

async function fetchUsers() {
  const SQL = `SELECT  * from users;`;
  const response = await client.query(SQL);
  return response.rows;
}

async function fetchUser(id) {
  const SQL = `SELECT * from users WHERE id = $1`;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
}

async function createProduct(description, img_url, price, quantity_available) {
  const SQL = `INSERT INTO products(id, description, img_url, price, quantity_available) VALUES($1, $2, $3, $4, $5) RETURNING *;`;
  const response = await client.query(SQL, [
    uuid.v4(),
    description,
    img_url,
    price,
    quantity_available,
  ]);
  return response.rows[0];
}

async function modifyProduct(
  id,
  description,
  img_url,
  price,
  quantity_available
) {
  const SQL = `UPDATE products SET description = $2, img_url = $3, price = $4, quantity_available = $5 WHERE id = $1 RETURNING *;`;
  const response = await client.query(SQL, [
    id,
    description,
    img_url,
    price,
    quantity_available,
  ]);
  return response.rows[0];
}

async function destroyProduct(id) {
  const SQL = `DELETE FROM products WHERE id = $1;`;
  await client.query(SQL, [id]);
}

async function fetchProducts() {
  const SQL = `SELECT  * from products;`;
  const response = await client.query(SQL);
  return response.rows;
}

async function fetchAvailableProducts() {
  const SQL = `SELECT  * from products WHERE quantity_available > 0;`;
  const response = await client.query(SQL);
  return response.rows;
}

async function fetchProduct(id) {
  const SQL = `SELECT  * from products WHERE id = $1 AND quantity_available > 0`;
  const response = await client.query(SQL, [id]);
  const product = response.rows[0];
  if (!product) {
    const error = new Error("Out of stock");
    error.status = 404;
    throw error;
  }
  return product;
}

async function createUserProduct(user_id, product_id, quantity) {
  const SQL = `INSERT INTO user_products(id, user_id, product_id, quantity) VALUES($1, $2, $3, $4) RETURNING *;`;
  const response = await client.query(SQL, [
    uuid.v4(),
    user_id,
    product_id,
    quantity,
  ]);
  return response.rows[0];
}

async function fetchUserProducts(user_id) {
  const SQL = `SELECT  * from user_products WHERE user_id = $1;`;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
}

async function destroyUserProduct(id, user_id) {
  const SQL = `DELETE FROM user_products WHERE id = $1 AND user_id = $2;`;
  await client.query(SQL, [id, user_id]);
}

async function subtractUserProductQuantity(id, user_id, quantity) {
  const SQL = `UPDATE user_products SET quantity = quantity - $3 WHERE id = $1 AND user_id = $2 AND quantity >= $3 RETURNING *;`;
  const response = await client.query(SQL, [id, user_id, quantity]);
  return response.rows[0];
}

async function addUserProductQuantity(id, user_id, quantity) {
  const SQL = `UPDATE user_products SET quantity = quantity + $3 WHERE id = $1 AND user_id = $2 RETURNING *;`;
  const response = await client.query(SQL, [id, user_id, quantity]);
  return response.rows[0];
}

async function checkoutOrder(user_id, order_date) {
  const SQL = `INSERT INTO orders(id, user_id, order_date) VALUES($1, $2, $3) RETURNING *;`;
  const response = await client.query(SQL, [uuid.v4(), user_id, order_date]);
  return response.rows[0];
}

async function checkoutProducts(order_id, user_id, product_id, quantity) {
  const SQL = `INSERT INTO order_products(id, order_id, user_id, product_id, quantity, unit_price) SELECT $1, $2, $3, $4, $5, price FROM products WHERE id = $4 RETURNING *;`;
  const response = await client.query(SQL, [
    uuid.v4(),
    order_id,
    user_id,
    product_id,
    quantity,
  ]);
  return response.rows[0];
}

async function checkoutProductQuantity(id, quantity_available) {
  const SQL = `UPDATE products SET quantity_available = quantity_available - $2 WHERE id = $1 RETURNING *;`;
  const response = await client.query(SQL, [id, quantity_available]);

  if (!response.rows[0] || response.rows[0].quantity_available < 0) {
    throw new Error(`Not enough stock for product ID ${id}`);
  }

  return response.rows[0];
}

async function destroyAllUserProducts(user_id) {
  const SQL = `DELETE FROM user_products WHERE user_id = $1;`;
  await client.query(SQL, [user_id]);
}

async function fetchOrders(user_id) {
  const SQL = `SELECT * from orders WHERE user_id = $1;`;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
}

async function fetchOrderProducts(order_id, user_id) {
  const SQL = `SELECT * from order_products WHERE order_id = $1 AND user_id = $2;`;
  const response = await client.query(SQL, [order_id, user_id]);
  return response.rows[0];
}

const authenticate = async (username, password) => {
  const SQL = `SELECT id, password FROM users WHERE username = $1;`;
  const response = await client.query(SQL, [username]);
  const user = response.rows[0];

  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      return { id: user.id };
    }
  }

  return null;
};

const findUserByToken = async (token) => {
  //verify the token
  const { id } = await jwt.verify(token, JWT_SECRET);

  const SQL = `SELECT * FROM users WHERE id = $1`;

  const response = await client.query(SQL, [id]);

  return response.rows[0];
};

const signToken = async (user_id) => {
  return jwt.sign({ id: user_id }, JWT_SECRET);
};

module.exports = {
  client,
  createTables,
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
  findUserByToken,
  authenticate,
  signToken,
};
