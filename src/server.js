require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const methodOverride = require("method-override");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Configure image upload directory
const uploadDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed")),
});

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Home page
app.get("/", async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { products: true },
  });
  res.render("index", { categories });
});

// Create category
app.post("/categories", async (req, res) => {
  const name = req.body.name;
  if (name?.trim()) {
    await prisma.category.create({ data: { name } });
  }
  res.redirect("/");
});

// Create product with image
app.post("/products", upload.single("image"), async (req, res) => {
  const { name, description, categoryId } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : "";

  if (name && description && categoryId && image) {
    await prisma.product.create({
      data: {
        name,
        description,
        image,
        categoryId: parseInt(categoryId),
      },
    });
  }
  res.redirect("/");
});

// Update product image
app.post("/products/:id/image", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.redirect("/");

  const imagePath = `/uploads/${file.filename}`;

  await prisma.product.update({
    where: { id: parseInt(id) },
    data: { image: imagePath },
  });

  res.redirect("/");
});

// Update product info
app.put("/products/:id", async (req, res) => {
  const { name, description } = req.body;
  const id = parseInt(req.params.id);

  await prisma.product.update({
    where: { id },
    data: { name, description },
  });

  res.redirect("/");
});

// Delete product
app.delete("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.product.delete({
    where: { id },
  });

  res.redirect("/");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
