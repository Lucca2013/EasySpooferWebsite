import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import frontendRoutes from "./frontendRoutes.js";
import apiRoutes from "./apiRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname, "../templates")));
app.use("/", frontendRoutes)
app.use("/api", apiRoutes)

export default app;