import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const services = await prisma.service.findMany({
        include: {
            business: true
        }
    });
    console.log(JSON.stringify(services, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
