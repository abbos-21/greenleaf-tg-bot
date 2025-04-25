const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.category.create({
    data: {
      name: "Baby products",
      products: {
        create: [
          {
            name: "Baby product 1",
            description: "The first baby product",
            image: "baby-product-1.jpg",
          },
          {
            name: "Baby product 2",
            description: "The second baby product",
            image: "baby-product-2.jpg",
          },
        ],
      },
    },
  });

  await prisma.category.create({
    data: {
      name: "Cosmetics",
      products: {
        create: [
          {
            name: "Cosmetic 1",
            description: "The first cosmetic",
            image: "cosmetic-1.jpg",
          },
          {
            name: "Cosmetic 2",
            description: "The second cosmetic",
            image: "cosmetic-2.jpg",
          },
        ],
      },
    },
  });

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
