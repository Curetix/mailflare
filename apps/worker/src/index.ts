import { app } from "./api";
import { handleEmail } from "./email";

export default {
    fetch: app.fetch,
    email: handleEmail,
} satisfies ExportedHandler<Env>;
