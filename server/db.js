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
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;

    CREATE TABLE products(
      id UUID PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      img_url VARCHAR(255) NOT NULL,
      price FLOAT NOT NULL
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
      quantity INTEGER NOT NULL CHECK (quantity >= 0)
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
};

async function fetchUsers() {
  const SQL = `SELECT  * from users;`;
  const response = await client.query(SQL);
  return response.rows;
}

async function createProduct(description, img_url, price) {
  const SQL = `INSERT INTO products(id, description, img_url, price) VALUES($1, $2, $3, $4) RETURNING *;`;
  const response = await client.query(SQL, [uuid.v4(), description, img_url, price]);
  return response.rows[0];
};

async function fetchProducts() {
  const SQL = `SELECT  * from products;`;
  const response = await client.query(SQL);
  return response.rows;
}

async function createUserProduct(user_id, product_id, quantity) {
  const SQL = `INSERT INTO user_products(id, user_id, product_id, quantity) VALUES($1, $2, $3, $4) RETURNING *;`;
  const response = await client.query(SQL, [uuid.v4(), user_id, product_id, quantity]);
  return response.rows[0];
};

async function fetchUserProducts(user_id) {
  const SQL = `SELECT  * from user_products WHERE user_id = $1;`;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
}

async function destroyUserProduct(id, user_id) {
  const SQL = `DELETE FROM user_products WHERE id = $1 AND user_id = $2;`;
  await client.query(SQL, [id, user_id,]);
};

async function subtractUserProductQuantity(id, user_id, quantity) {
  const SQL = `UPDATE user_products SET quantity = quantity - $3 WHERE id = $1 AND user_id = $2 AND quantity >= $3 RETURNING *;`;
  const response = await client.query(SQL, [id, user_id, quantity]);
  return response.rows[0];
}

const authenticate = async (username, password) => {
  const SQL = `SELECT id, password FROM users WHERE username = $1;`;

  const response = await client.query(SQL, [username]);

  //check that the password matches
  const match_password = await bcrypt.compare(
    password,
    response.rows[0]?.password
  );

  //check that a user exists
  if (match_password) {
    //create token
    return await signToken(response.rows[0].id);
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
  fetchUsers,
  createProduct,
  fetchProducts,
  createUserProduct,
  fetchUserProducts,
  destroyUserProduct,
  subtractUserProductQuantity,
  findUserByToken,
  authenticate,
  signToken,
};
