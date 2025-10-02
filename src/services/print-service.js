// services/printService.js
const printerConfig = require("../config/printer");

class PrintService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  formatCurrency(valueInCents) {
    // Converte de centavos para reais
    const value = valueInCents / 100;
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }

  formatPhone(phone) {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.substr(0, 2)}) ${cleaned.substr(
        2,
        5
      )}-${cleaned.substr(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.substr(0, 2)}) ${cleaned.substr(
        2,
        4
      )}-${cleaned.substr(6)}`;
    }
    return phone;
  }

  getPaymentMethodText(method) {
    const methods = {
      CASH: "Dinheiro",
      CREDIT_CARD: "Cartão de Crédito",
      DEBIT_CARD: "Cartão de Débito",
      CARD: "Cartão",
      PIX: "PIX",
    };
    return methods[method] || "Não informado";
  }

  getPaymentStatusText(status) {
    const statuses = {
      PENDING: "Aguardando",
      PAID: "Pago",
      REJECTED: "Rejeitado",
    };
    return statuses[status] || "Não informado";
  }

  getOrderStatusText(status) {
    const statuses = {
      ACCEPTED: "Aceito",
      PREPARING: "Em preparo",
      IN_TRANSIT: "Em trânsito",
      DELIVERED: "Entregue",
      FINISHED: "Finalizado",
      CANCELLED: "Cancelado",
      WITHDRAWN: "Retirada",
      CONSUME_ON_SITE: "Consumido no local",
    };
    return statuses[status] || "Não informado";
  }

  // DENTRO DA CLASSE PrintService em services/print-service.js

  async printOrderReceipt(receipt) {
    try {
      const printer = printerConfig.getPrinter();
      const printerWidth = printer.getWidth() || 48; // Pega a largura da impressora (padrão 48)

      // --- Função Auxiliar para criar linhas com duas colunas ---
      const createRow = (left, right) => {
        const remainingSpace = printerWidth - left.length - right.length;
        const spaces = " ".repeat(Math.max(0, remainingSpace));
        printer.println(left + spaces + right);
      };

      // ========== CABEÇALHO DA LOJA ==========
      printer.alignCenter();
      printer.setTextSize(1, 1); // Equivalente ao seu .header
      printer.bold(true);
      printer.println(receipt.storeName || "Minha Loja");
      printer.setTextNormal();
      printer.bold(false);
      printer.println(receipt.storePhone || "(11) 0000-0000");
      printer.println(new Date(receipt.createdAt).toLocaleString("pt-BR"));
      printer.newLine();

      // ========== NÚMERO DO PEDIDO ==========
      printer.alignLeft();
      printer.setTextSize(0, 0); // Texto normal
      printer.bold(true);
      createRow("Pedido", `No. ${receipt.orderNumber}`); // Usando a função de linha
      printer.bold(false);
      printer.println("Origem: Online");
      printer.drawLine();

      // ========== DADOS DO CLIENTE ==========
      printer.println(`Cliente: ${receipt.customerName}`);
      printer.println(`Tel: ${this.formatPhone(receipt.customerPhone)}`);
      // Endereço (quebra de linha manual se necessário, mas geralmente cabe)
      const address = `Rua: ${receipt.customerStreet || "N/A"} - No.${
        receipt.customerStreetNumber
      }`;
      printer.println(address);
      printer.drawLine();

      // ========== PRODUTOS ==========
      printer.bold(true);
      printer.println("Produtos");
      printer.bold(false);
      printer.drawLine();

      receipt.orderItems.forEach((item) => {
        const itemTotalPrice = this.formatCurrency(item.quantity * item.price);

        // Monta o nome completo do produto com sabores, etc.
        let productName = item.productName;
        if (
          Array.isArray(item.subFlavorPizzaNames) &&
          item.subFlavorPizzaNames.length > 0
        ) {
          const totalParts = item.subFlavorPizzaNames.length + 1;
          const fraction = `1/${totalParts}`;
          const flavors = item.subFlavorPizzaNames
            .map((name) => `+ ${fraction} ${name}`)
            .join(" ");
          productName += ` ${flavors}`;
        }

        if (item.itemType === "product") {
          // Lógica para quebrar a linha se o nome do produto for muito grande
          const productNameLine = `${item.quantity}x ${productName}`;
          if (productNameLine.length + itemTotalPrice.length > printerWidth) {
            printer.bold(true);
            printer.println(productNameLine);
            printer.alignRight();
            printer.println(itemTotalPrice);
            printer.alignLeft();
            printer.bold(false);
          } else {
            printer.bold(true);
            createRow(productNameLine, itemTotalPrice);
            printer.bold(false);
          }

          if (item.size) printer.println(`  - Tamanho: ${item.size}`);
          if (item.additionalName)
            printer.println(`  - Adicional: ${item.additionalName}`);
        } else if (item.itemType === "combo") {
          printer.bold(true);
          createRow(`${item.quantity}x ${item.comboName}`, itemTotalPrice);
          printer.bold(false);
          item.comboConfiguration.forEach((config) => {
            printer.println(
              `  - ${config.chosenQuantity}x ${config.productName}`
            );
          });
        }
        printer.newLine();
      });

      // ========== OBSERVAÇÕES E TOTAIS ==========
      printer.drawLine();
      if (receipt.orderObs) {
        printer.println(`Obs: ${receipt.orderObs}`);
        printer.drawLine();
      }

      if (receipt.orderDeliveryFee) {
        createRow(
          "Taxa de Entrega",
          this.formatCurrency(receipt.orderDeliveryFee)
        );
      }

      printer.setTextSize(0, 0);
      printer.bold(true);
      createRow("Total", this.formatCurrency(receipt.orderTotalPrice));
      printer.bold(false);

      createRow(
        "Forma de Pagamento",
        this.getPaymentMethodText(receipt.orderPaymentType)
      );

      // Lógica para o Status do Pagamento
      const paymentStatusText = this.getPaymentStatusText(
        receipt.orderPaymentStatus
      );
      if (receipt.orderPaymentStatus === "PAID") {
        printer.newLine();
        printer.alignCenter();
        printer.invert(true); // Fundo preto, letras brancas
        printer.setTextSize(1, 0); // Altura dupla
        printer.println(` ${paymentStatusText} `);
        printer.invert(false);
        printer.setTextNormal();
      } else {
        createRow("Status Pagamento", paymentStatusText);
      }

      // ========== CORTAR PAPEL ==========
      printer.cut();

      await printer.execute();
      printer.clear();
    } catch (error) {
      console.error("Erro na impressão:", error);
      throw error;
    }
  }

  // Adicionar pedido à fila
  async addToQueue(receipt, storeName = null, storePhone = null) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        receipt,
        storeName,
        storePhone,
        resolve,
        reject,
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  // Processar fila de impressão
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      const result = await this.printOrderReceipt(
        job.receipt,
        job.storeName,
        job.storePhone
      );
      job.resolve(result);
    } catch (error) {
      job.reject(error);
    }

    // Processar próximo da fila
    setTimeout(() => this.processQueue(), 1000);
  }
}

module.exports = new PrintService();
