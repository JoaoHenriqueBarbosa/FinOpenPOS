import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASE_PATH || "",
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || "",
  },
  serverExternalPackages: ["@electric-sql/pglite"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
