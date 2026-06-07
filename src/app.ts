import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";

// Rotas
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import tecnicoRoutes from "./routes/tecnico.routes";
import pedidoRoutes from "./routes/pedido.routes";
import orcamentoRoutes from "./routes/orcamento.routes";
import chatRoutes from "./routes/chat.routes";
import financeRoutes from "./routes/finance.routes";
import notifRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import seedRoutes from "./routes/seed.routes";

const app = express();

// ─── Middlewares globais ──────────────────────────────────

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Rotas da API ─────────────────────────────────────────

app.use("/v1/auth", authRoutes);
app.use("/v1/users", userRoutes);
app.use("/v1/technicians", tecnicoRoutes);
app.use("/v1/orders", pedidoRoutes);
app.use("/v1/budgets", orcamentoRoutes);
app.use("/v1/conversations", chatRoutes);
app.use("/v1/finance", financeRoutes);
app.use("/v1/notifications", notifRoutes);
app.use("/v1/admin", adminRoutes);
app.use("/seed", seedRoutes);

// ─── Handler de rota não encontrada ───────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Rota não encontrada" });
});

// ─── Handler de erros globais ──────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Erro:", err.message);
  res.status(500).json({ success: false, message: "Erro interno do servidor" });
});

export default app;
