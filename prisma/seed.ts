import bcrypt from "bcryptjs";

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  console.log("Seeding started...");

  // =========================
  // USERS
  // =========================

  const adminPassword = await bcrypt.hash("admin123", 10);

  
  // =========================
// BULK USERS
// =========================

for (let i = 1; i <= 10; i++) {
  await prisma.user.create({
    data: {
      name: `Staff ${i}`,
      email: `staff${i}@gmail.com`,
      password: adminPassword,
      role: "STAFF",
    },
  });
}

// =========================
// BULK CATEGORIES
// =========================

const categoryIds: number[] = [];

for (let i = 1; i <= 10; i++) {
  const category = await prisma.category.create({
    data: {
      name: `Category ${i}`,
      description: `Description for category ${i}`,
    },
  });

  categoryIds.push(category.id);
}

// =========================
// BULK PRODUCTS
// =========================

const productIds: number[] = [];

for (let i = 1; i <= 10; i++) {
  const product = await prisma.product.create({
    data: {
      name: `Product ${i}`,
      sku: `SKU00${i}`,
      barcode: `BAR00${i}`,
      description: `Description for product ${i}`,

      price: 100 + i * 10,
      costPrice: 80 + i * 5,

      stockQty: 50 + i,
      lowStockLimit: 5,

      categoryId: categoryIds[i % categoryIds.length],
    },
  });

  productIds.push(product.id);
}

// =========================
// BULK CUSTOMERS
// =========================

const customerIds: number[] = [];

for (let i = 1; i <= 10; i++) {
  const customer = await prisma.customer.create({
    data: {
      name: `Customer ${i}`,
      phone: `99999999${i}`,
      email: `customer${i}@gmail.com`,
      address: `Address ${i}`,
    },
  });

  customerIds.push(customer.id);
}

// =========================
// BULK ORDERS
// =========================

for (let i = 1; i <= 10; i++) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD10${i}`,

      customerId: customerIds[i - 1],

      userId: 1,

      subtotal: 1000 + i * 100,
      tax: 50,
      discount: 20,
      totalAmount: 1030 + i * 100,

      paymentMethod: "CASH",

      status: "CONFIRMED",
    },
  });

  // =========================
  // ORDER ITEMS
  // =========================

  await prisma.orderItem.create({
    data: {
      orderId: order.id,

      productId: productIds[i - 1],

      productName: `Product ${i}`,

      quantity: 2,

      price: 100 + i * 10,

      total: 200 + i * 20,
    },
  });

  // =========================
  // INVOICE
  // =========================

  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV10${i}`,
      orderId: order.id,
      pdfUrl: `/invoices/invoice${i}.pdf`,
    },
  });

  // =========================
  // STOCK MOVEMENT
  // =========================

  await prisma.stockMovement.create({
    data: {
      productId: productIds[i - 1],

      type: "SALE",

      quantity: 2,

      previousStock: 60,

      newStock: 58,

      note: `Bulk sale ${i}`,

      createdBy: 1,
    },
  });

  // =========================
  // ACTIVITY LOG
  // =========================

  await prisma.activityLog.create({
    data: {
      userId: 1,

      action: `Created Order ${i}`,

      entityType: "Order",

      entityId: order.id,
    },
  });
}

// =========================
// AI LOGS
// =========================

for (let i = 1; i <= 10; i++) {
  await prisma.aiLog.create({
    data: {
      featureType: "SALES_SUMMARY",

      prompt: `Generate report ${i}`,

      response: `Sales report response ${i}`,
    },
  });
}

  console.log("Seeding completed successfully");
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });