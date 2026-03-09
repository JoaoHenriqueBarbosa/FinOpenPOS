import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
