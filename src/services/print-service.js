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

  async printOrderReceipt(receipt, storeName = null, storePhone = null) {
    try {
      const printer = printerConfig.getPrinter();

      // ========== CABEÇALHO DA LOJA ==========
      printer.alignCenter();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.println(storeName || "Nome da Loja");
      printer.bold(false);
      printer.setTextNormal();
      printer.println(storePhone || "(11) 0000-0000");
      printer.println("");

      // ========== NÚMERO DO PEDIDO ==========
      printer.alignLeft();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.print("Pedido");
      printer.alignRight();
      printer.println(`No. ${receipt.orderNumber}`);
      printer.setTextNormal();
      printer.bold(false);

      // Origem
      printer.alignLeft();
      printer.println("Origem: Online");

      // Linha tracejada
      printer.drawLine();

      // ========== DADOS DO CLIENTE ==========
      printer.println(`Cliente: ${receipt.customerName}`);
      printer.println(`Tel: ${this.formatPhone(receipt.customerPhone)}`);

      // Endereço completo em uma linha
      let addressLine = `Rua: ${receipt.customerStreet || "N/A"} - No.${
        receipt.customerStreetNumber
      }`;
      if (receipt.customerComplement) {
        addressLine += ` - Complemento: ${receipt.customerComplement}`;
      }
      addressLine += ` - ${receipt.customerNeighborhood || "N/A"} - ${
        receipt.customerCity || "N/A"
      } - ${receipt.customerState || "N/A"}`;
      printer.println(addressLine);

      // ========== PRODUTOS ==========
      printer.drawLine();
      printer.bold(true);
      printer.println("Produtos");
      printer.bold(false);
      printer.drawLine();

      // Iterar pelos itens
      receipt.orderItems.forEach((item) => {
        if (item.itemType === "product") {
          // ===== PRODUTO NORMAL =====
          printer.bold(true);

          // Nome do produto com sabores de pizza se houver
          let productName = item.productName;
          if (item.subFlavorPizzaNames && item.subFlavorPizzaNames.length > 0) {
            const totalParts = item.subFlavorPizzaNames.length + 1;
            const fraction = `1/${totalParts}`;
            const flavors = item.subFlavorPizzaNames
              .map((name) => `+ ${fraction} ${name}`)
              .join(" ");
            productName += ` ${flavors}`;
          }

          // Imprimir nome do produto
          const priceTotal = this.formatCurrency(item.quantity * item.price);
          const nameWidth = printer.width - priceTotal.length - 2;

          // Se o nome for muito grande, quebra em múltiplas linhas
          if (productName.length > nameWidth) {
            printer.println(productName);
            printer.alignRight();
            printer.println(priceTotal);
            printer.alignLeft();
          } else {
            // Nome e preço na mesma linha
            printer.print(productName.padEnd(nameWidth));
            printer.println(priceTotal);
          }
          printer.bold(false);

          // Detalhes do item (tamanho, adicionais)
          if (item.size) {
            printer.println(`  - Tamanho: ${item.size}`);
          }

          if (item.additionalName) {
            let additionalText = `  - Adicional: ${item.additionalName}`;
            if (item.additionalGroupName) {
              additionalText += ` (${item.additionalGroupName})`;
            }
            printer.println(additionalText);
          }

          // Quantidade x Preço unitário
          printer.println(
            `  ${item.quantity}x ${this.formatCurrency(item.price)}`
          );
          printer.println("");
        } else if (item.itemType === "combo") {
          // ===== COMBO =====
          printer.bold(true);

          // Nome do combo com preço total alinhado à direita
          const comboTotal = this.formatCurrency(item.quantity * item.price);
          const comboNameWidth = printer.width - comboTotal.length - 2;

          if (item.comboName.length > comboNameWidth) {
            printer.println(item.comboName);
            printer.alignRight();
            printer.println(comboTotal);
            printer.alignLeft();
          } else {
            printer.print(item.comboName.padEnd(comboNameWidth));
            printer.println(comboTotal);
          }
          printer.bold(false);

          // Itens do combo
          if (item.comboConfiguration && item.comboConfiguration.length > 0) {
            item.comboConfiguration.forEach((configItem) => {
              // Item do combo
              let itemText = `    ${configItem.chosenQuantity}x ${configItem.productName}`;

              // Sabores adicionais do item do combo
              if (
                configItem.additionalFlavorNames &&
                configItem.additionalFlavorNames.length > 0
              ) {
                const totalParts = configItem.additionalFlavorNames.length + 1;
                const fraction = `1/${totalParts}`;
                const flavors = configItem.additionalFlavorNames
                  .map((name) => `+ ${fraction} ${name}`)
                  .join(" ");
                itemText += ` ${flavors}`;
              }

              printer.println(itemText);

              // Tamanho do item do combo
              if (configItem.size) {
                printer.println(`      - Tamanho: ${configItem.size}`);
              }

              // Adicionais do item do combo
              if (
                configItem.selectedAdditionals &&
                configItem.selectedAdditionals.length > 0
              ) {
                configItem.selectedAdditionals.forEach((additional) => {
                  printer.println(`      - Adicional: ${additional.name}`);
                });
              }
            });
          }

          // Quantidade x Preço unitário do combo
          printer.println(
            `    ${item.quantity}x ${this.formatCurrency(item.price)}`
          );
          printer.println("");
        }
      });

      // ========== OBSERVAÇÕES ==========
      printer.drawLine();
      printer.println(`Obs: ${receipt.orderObs || "Nenhuma"}`);

      // ========== TOTAIS E PAGAMENTO ==========
      printer.drawLine();

      // Total
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.print("Total");
      printer.alignRight();
      printer.println(this.formatCurrency(receipt.orderTotalPrice));
      printer.setTextNormal();
      printer.bold(false);
      printer.alignLeft();

      // Taxa de entrega (se houver)
      if (receipt.orderDeliveryFee && receipt.orderDeliveryFee > 0) {
        printer.print("Taxa de Entrega");
        printer.alignRight();
        printer.println(this.formatCurrency(receipt.orderDeliveryFee));
        printer.alignLeft();
      }

      // Forma de pagamento
      printer.print("Forma de Pagamento");
      printer.alignRight();
      printer.println(this.getPaymentMethodText(receipt.orderPaymentType));
      printer.alignLeft();

      // Status do pedido
      printer.print("Status do Pedido");
      printer.alignRight();
      printer.println(this.getOrderStatusText(receipt.orderStatus));
      printer.alignLeft();

      // Status do pagamento
      printer.print("Status do Pagamento");
      printer.alignRight();
      printer.println(this.getPaymentStatusText(receipt.orderPaymentStatus));
      printer.alignLeft();

      // ========== CORTAR PAPEL ==========
      printer.cut();

      // Executar impressão
      const success = await printer.execute();
      printer.clear();

      return success;
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
