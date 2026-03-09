const REPO = "JoaoHenriqueBarbosa/FinOpenPOS";

export interface GitHubStats {
	stars: number;
	contributors: number;
	forks: number;
	license: string;
}

export interface Contributor {
	login: string;
	avatarUrl: string;
	profileUrl: string;
	contributions: number;
}

export async function getGitHubStats(): Promise<GitHubStats> {
	try {
		const res = await fetch(`https://api.github.com/repos/${REPO}`, {
			next: { revalidate: 3600 },
			headers: { Accept: "application/vnd.github.v3+json" },
		});
		if (!res.ok) return { stars: 0, contributors: 0, forks: 0, license: "MIT" };
		const data = await res.json();

		// Get contributor count
		const contribRes = await fetch(
			`https://api.github.com/repos/${REPO}/contributors?per_page=1&anon=true`,
			{
				next: { revalidate: 3600 },
				headers: { Accept: "application/vnd.github.v3+json" },
			},
		);
		// Parse contributor count from Link header
		let contributorCount = 1;
		const linkHeader = contribRes.headers.get("Link");
		if (linkHeader) {
			const match = linkHeader.match(/page=(\d+)>; rel="last"/);
			if (match) contributorCount = Number.parseInt(match[1], 10);
		}

		return {
			stars: data.stargazers_count ?? 0,
			contributors: contributorCount,
			forks: data.forks_count ?? 0,
			license: data.license?.spdx_id ?? "MIT",
		};
	} catch {
		return { stars: 0, contributors: 0, forks: 0, license: "MIT" };
	}
}

export async function getContributors(): Promise<Contributor[]> {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${REPO}/contributors?per_page=12`,
			{
				next: { revalidate: 3600 },
				headers: { Accept: "application/vnd.github.v3+json" },
			},
		);
		if (!res.ok) return [];
		const data = await res.json();
		return data.map((c: Record<string, unknown>) => ({
			login: c.login,
			avatarUrl: c.avatar_url,
			profileUrl: c.html_url,
			contributions: c.contributions,
		}));
	} catch {
		return [];
	}
}
