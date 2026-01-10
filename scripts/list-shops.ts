import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const shops = await prisma.shop.findMany({
        select: { shopDomain: true, plan: true }
    });
    console.log(JSON.stringify(shops, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
