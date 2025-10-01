// controllers/printController.js
const printService = require("../services/print-service");
const printerConfig = require("../config/printer");

class PrintController {
  // Imprimir pedido completo
  async printOrder(req, res) {
    try {
      const { orderReceipt } = req.body;

      if (!orderReceipt) {
        return res.status(400).json({
          success: false,
          error: "Dados do pedido não fornecidos",
        });
      }

      if (!orderReceipt.orderNumber) {
        return res.status(400).json({
          success: false,
          error: "Número do pedido é obrigatório",
        });
      }

      if (!orderReceipt.orderItems || orderReceipt.orderItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Pedido deve conter pelo menos um item",
        });
      }

      // ✅ Simplificado - removido o segundo parâmetro "full"
      await printService.addToQueue(orderReceipt);

      console.log(
        `✅ Pedido #${orderReceipt.orderNumber} enviado para impressão`
      );

      return res.json({
        success: true,
        message: "Pedido enviado para impressão",
        orderNumber: orderReceipt.orderNumber,
      });
    } catch (error) {
      console.error("❌ Erro ao imprimir:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  // Testar impressora
  async testPrinter(req, res) {
    try {
      await printerConfig.testConnection();

      return res.json({
        success: true,
        message: "Teste de impressão enviado com sucesso",
        printer: process.env.PRINTER_NAME,
      });
    } catch (error) {
      console.error("❌ Erro no teste:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Status do servidor
  async getStatus(req, res) {
    try {
      return res.json({
        success: true,
        status: "online",
        printer: {
          name: process.env.PRINTER_NAME,
          type: process.env.PRINTER_TYPE,
          configured: printerConfig.isConfigured,
        },
        queue: {
          pending: printService.queue.length,
          processing: printService.isProcessing,
        },
        server: {
          port: process.env.PORT,
          version: "1.0.0",
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Limpar fila
  async clearQueue(req, res) {
    try {
      const queueLength = printService.queue.length;
      printService.queue = [];

      return res.json({
        success: true,
        message: `${queueLength} trabalhos removidos da fila`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new PrintController();
