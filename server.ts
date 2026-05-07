import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

dotenv.config();

const razorpay = process.env.RAZORPAY_KEY_ID
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    })
  : null;

// Configure Multer for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/upload-multiple", upload.array("images", 10), (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const imageUrls = files.map(file => `/uploads/${file.filename}`);
      res.json({ imageUrls });
    } catch (error: any) {
      console.error("Upload multiple error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-razorpay-order", async (req, res) => {
    try {
      const { amount, bookingId } = req.body;

      if (!razorpay) {
        return res.status(500).json({ error: "Razorpay keys not configured" });
      }

      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${bookingId}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      if (isAuthentic) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, message: "Signature verification failed" });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
