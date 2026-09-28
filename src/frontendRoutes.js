import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "home", "index.html"));
});

router.get("/dash", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "dash", "index.html"));
});

router.get('/health', (req, res) => {
    res.send('Healthy');
});

export default router;