import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { listServices } from "../app/lib/service-service";

async function main() {
    const result = await listServices();
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
