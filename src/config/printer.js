// config/printer.js
const ThermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;
require("dotenv").config();

class PrinterConfig {
  constructor() {
    this.printer = null;
    this.isConfigured = false;
    this.testMode = process.env.TEST_MODE === "true";
  }

  initialize() {
    try {
      // Se estiver em modo de teste, não inicializa impressora real
      if (this.testMode) {
        console.log("🧪 Modo de teste ativado - impressões serão simuladas");
        this.isConfigured = true;
        this.printer = this.createMockPrinter();
        return this.printer;
      }

      const printerTypes = {
        EPSON: Types.EPSON,
        STAR: Types.STAR,
        DARUMA: Types.DARUMA,
        DIEBOLD: Types.DIEBOLD,
        BEMATECH: Types.BEMATECH,
      };

      const printerType = printerTypes[process.env.PRINTER_TYPE] || Types.EPSON;
      let printerInterface = process.env.PRINTER_INTERFACE || "printer";

      if (printerInterface === "printer") {
        printerInterface = `printer:${process.env.PRINTER_NAME}`;
      }

      this.printer = new ThermalPrinter({
        type: printerType,
        interface: printerInterface,
        characterSet: "BRAZIL",
        removeSpecialCharacters: false,
        width: parseInt(process.env.PRINTER_WIDTH) || 48,
        options: {
          timeout: 5000,
        },
      });

      this.isConfigured = true;
      console.log("✅ Impressora configurada:", process.env.PRINTER_NAME);

      return this.printer;
    } catch (error) {
      console.error("❌ Erro ao configurar impressora:", error.message);
      this.isConfigured = false;
      throw error;
    }
  }

  createMockPrinter() {
    // Cria um objeto mock que simula a impressora
    const mockContent = [];

    return {
      // Alinhamento
      alignCenter: () => mockContent.push("[ALIGN_CENTER]"),
      alignLeft: () => mockContent.push("[ALIGN_LEFT]"),
      alignRight: () => mockContent.push("[ALIGN_RIGHT]"),

      // Formatação de texto
      bold: (enabled) => mockContent.push(`[BOLD_${enabled ? "ON" : "OFF"}]`),
      underline: (enabled) =>
        mockContent.push(`[UNDERLINE_${enabled ? "ON" : "OFF"}]`),
      underlineThick: (enabled) =>
        mockContent.push(`[UNDERLINE_THICK_${enabled ? "ON" : "OFF"}]`),
      invert: (enabled) =>
        mockContent.push(`[INVERT_${enabled ? "ON" : "OFF"}]`),
      setTextSize: (height, width) =>
        mockContent.push(`[TEXT_SIZE_${height}x${width}]`),
      setTextNormal: () => mockContent.push("[TEXT_NORMAL]"),
      setTextDoubleHeight: () => mockContent.push("[TEXT_DOUBLE_HEIGHT]"),
      setTextDoubleWidth: () => mockContent.push("[TEXT_DOUBLE_WIDTH]"),
      setTextQuadArea: () => mockContent.push("[TEXT_QUAD_AREA]"),

      // Impressão
      println: (text = "") => {
        mockContent.push(text);
        console.log("📄", text);
      },
      print: (text) => {
        mockContent.push(text);
        console.log("📄", text);
      },
      printImage: (path) => mockContent.push(`[IMAGE: ${path}]`),
      printImageBuffer: (buffer) => mockContent.push("[IMAGE_BUFFER]"),

      // Linhas e espaços
      drawLine: () => {
        const line = "-".repeat(48);
        mockContent.push(line);
        console.log("📄", line);
      },
      newLine: () => {
        mockContent.push("");
        console.log("📄");
      },

      // Códigos de barras e QR
      printQR: (data, settings) => mockContent.push(`[QR_CODE: ${data}]`),
      code128: (data, settings) => mockContent.push(`[BARCODE_128: ${data}]`),

      // Tabela
      tableCustom: (data) => {
        mockContent.push("[TABLE]");
        console.log("📄 [TABLE]", data);
      },

      // Controle
      cut: () => mockContent.push("[CUT]"),
      partialCut: () => mockContent.push("[PARTIAL_CUT]"),
      beep: () => mockContent.push("[BEEP]"),
      openCashDrawer: () => mockContent.push("[OPEN_DRAWER]"),

      // Executar e limpar
      execute: async () => {
        console.log("\n🖨️  SIMULAÇÃO DE IMPRESSÃO:");
        console.log("═".repeat(50));
        mockContent.forEach((line) => console.log(line));
        console.log("═".repeat(50));
        console.log("✅ Impressão simulada com sucesso!\n");
        return Promise.resolve();
      },
      clear: () => {
        mockContent.length = 0;
      },

      // Outros métodos úteis
      raw: (buffer) => mockContent.push("[RAW_DATA]"),
      setCharacterSet: (set) => mockContent.push(`[CHARSET: ${set}]`),
      isPrinterConnected: () => Promise.resolve(true),
      getWidth: () => 48,
      getText: () => mockContent.join("\n"),
      getBuffer: () => Buffer.from(mockContent.join("\n")),
      getContent: () => [...mockContent],
    };
  }

  async testConnection() {
    if (!this.isConfigured) {
      throw new Error("Impressora não configurada");
    }

    try {
      this.printer.alignCenter();
      this.printer.bold(true);
      this.printer.println("TESTE DE IMPRESSAO");
      this.printer.bold(false);
      this.printer.drawLine();
      this.printer.println(`Data: ${new Date().toLocaleString("pt-BR")}`);
      this.printer.println("Impressora funcionando corretamente!");
      this.printer.cut();

      await this.printer.execute();
      console.log("✅ Teste de impressão enviado");
      return true;
    } catch (error) {
      console.error("❌ Erro no teste:", error.message);
      throw error;
    }
  }

  getPrinter() {
    if (!this.isConfigured) {
      this.initialize();
    }
    return this.printer;
  }
}

module.exports = new PrinterConfig();
