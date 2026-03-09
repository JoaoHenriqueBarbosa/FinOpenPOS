import { ApiReference } from "@scalar/nextjs-api-reference";

const basePath = process.env.BASE_PATH || "";

export const GET = ApiReference({
  url: `${basePath}/api/openapi.json`,
  theme: "kepler",
});
