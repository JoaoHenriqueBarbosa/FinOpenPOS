import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https" as const,
				hostname: "avatars.githubusercontent.com",
			},
		],
	},
};

export default withNextIntl(nextConfig);
