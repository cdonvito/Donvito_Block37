const {
  client,
  createTables,
  createUser,
  fetchUsers,
  createProduct,
  fetchProducts,
  createUserProduct,
  fetchUserProducts,
} = require("./db");

async function seed() {
  await client.connect();

  await createTables();
  console.log("tables created");

  const [craig, madie, penny, scooby, shovel, hammer, rake] = await Promise.all(
    [
      createUser(
        "craigdonvito",
        "password123",
        true,
        "Craig Donvito",
        "donvitocraig@gmail.com",
        "123 Coding Lane",
        "",
        ""
      ),
      createUser(
        "madiewilson",
        "abc123",
        false,
        "Madie Wilson",
        "test@gmail.com",
        "345 Hacker Way",
        "",
        ""
      ),
      createUser(
        "penny",
        "ruffabc",
        false,
        "Penny",
        "",
        "456 Hacker Way",
        "",
        ""
      ),
      createUser(
        "scooby",
        "123bark",
        false,
        "Scooby",
        "",
        "567 Coding Lane",
        "",
        ""
      ),
      createProduct("shovel", "shovel.jpg", 12),
      createProduct("hammer", "hammer.jpg", 4),
      createProduct("rake", "rake.jpg", 8),
    ]
  );

  console.log("users created");
  console.log(await fetchUsers());

  console.log("products created");
  console.log(await fetchProducts());

  const [user_product] = await Promise.all([
    createUserProduct(craig.id, shovel.id, 3),
    createUserProduct(madie.id, hammer.id, 2),
    createUserProduct(penny.id, rake.id, 1),
    createUserProduct(scooby.id, hammer.id, 4),
  ]);

  console.log("user products created");
  console.log(await fetchUserProducts(craig.id));

  await client.end();
}

seed();
