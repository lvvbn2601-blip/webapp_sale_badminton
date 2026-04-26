import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { apiLimiter } from "./middlewares/rateLimit";
import { env } from "./config/env";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      // Allows multiple frontend URLs separated by commas (e.g., "http://localhost:3000,https://my-vercel-app.vercel.app")
      const allowedOrigins = env.clientUrl.split(',').map(url => url.trim());
      
      // If CLIENT_URL is set to '*' or origin matches allowed list
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS Blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.get("/", (_req, res) => res.json({ message: "Sportive Badminton API is running" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", routes);
app.use(errorHandler);

export default app;
