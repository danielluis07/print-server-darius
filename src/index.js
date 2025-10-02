// index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const printController = require("./controllers/print-controller");
const printerConfig = require("./config/printer");

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ];

    // Permitir requests sem origin (ex: Postman, aplicações desktop)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Não permitido pelo CORS"));
    }
  },
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  if (process.env.DEBUG_MODE === "true") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Rotas
app.get("/", (req, res) => {
  res.json({
    message: "Servidor de impressão está rodando",
    version: "1.0.0",
    endpoints: {
      "POST /print": "Imprimir pedido completo",
      "POST /test": "Testar impressora",
      "GET /status": "Status do servidor",
      "DELETE /queue": "Limpar fila de impressão",
    },
  });
});

// Rotas de impressão
app.post("/print", printController.printOrder);
app.post("/test", printController.testPrinter);
app.get("/status", printController.getStatus);
app.delete("/queue", printController.clearQueue);

// Tratamento de erros
app.use((error, req, res, next) => {
  console.error("Erro:", error);

  if (error.message === "Não permitido pelo CORS") {
    return res.status(403).json({
      success: false,
      error: "Origem não autorizada",
    });
  }

  res.status(500).json({
    success: false,
    error: error.message || "Erro interno do servidor",
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar impressora
    if (process.env.TEST_MODE !== "true") {
      printerConfig.initialize();
      console.log("🖨️  Impressora inicializada");
    } else {
      console.log("⚠️  Modo de teste ativo - impressora não inicializada");
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log("🚀 Servidor de impressão rodando");
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(
        `🔧 Modo Debug: ${
          process.env.DEBUG_MODE === "true" ? "Ativado" : "Desativado"
        }`
      );
      console.log("✅ Pronto para receber requisições de impressão\n");
      console.log("Pressione CTRL+C para parar o servidor");
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

// Tratamento de encerramento gracioso
process.on("SIGINT", () => {
  console.log("\n👋 Encerrando servidor...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Encerrando servidor...");
  process.exit(0);
});

// Iniciar
startServer();
