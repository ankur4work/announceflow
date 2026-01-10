import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const shops = await prisma.shop.findMany();
    console.log("DB_SHOPS_START");
    console.log(JSON.stringify(shops, null, 2));
    console.log("DB_SHOPS_END");
}
main().catch(console.error).finally(() => prisma.$disconnect());
