import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Prevent multiple Prisma instances in development (hot reload) and production (serverless)
const prisma = global.prismaGlobal ?? new PrismaClient();

// Store in global to reuse across hot reloads in development and serverless function invocations
if (!global.prismaGlobal) {
  global.prismaGlobal = prisma;
}

export default prisma;




