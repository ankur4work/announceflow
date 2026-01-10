import prisma from "../app/db.server";

async function main() {
    try {
        const sessionCount = await prisma.session.count();
        const shopCount = await prisma.shop.count();
        const subscriberCount = await prisma.emailSubscriber.count();

        console.log("--- DATABASE STATS ---");
        console.log("Sessions:", sessionCount);
        console.log("Shops:", shopCount);
        console.log("EmailSubscribers:", subscriberCount);
        console.log("----------------------");
    } catch (err) {
        console.error("Database query failed:", err);
    }
}

main().finally(() => prisma.$disconnect());
