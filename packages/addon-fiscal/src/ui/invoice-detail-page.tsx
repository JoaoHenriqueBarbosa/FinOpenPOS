"use client";

import {
	type AddonPageProps,
	useAddonServices,
} from "@finopenpos/addon-kit/ui";
import { Badge } from "@finopenpos/ui/components/badge";
import { Button } from "@finopenpos/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finopenpos/ui/components/card";
import { Skeleton } from "@finopenpos/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@finopenpos/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	ChevronDownIcon,
	CodeXmlIcon,
	FileDownIcon,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFiscalTRPC } from "./trpc";
import { invoiceStatusBadgeVariant } from "./utils";

export default function InvoiceDetailPage({ params }: AddonPageProps) {
	const invoiceId = Number.parseInt(params.id);
	const trpc = useFiscalTRPC();
	const { formatCurrency } = useAddonServices();
	const { data: invoice, isLoading } = useQuery(
		trpc.fiscal.get.queryOptions({ id: invoiceId }),
	) as { data: any; isLoading: boolean };
	const t = useTranslations("fiscal");
	const tc = useTranslations("common");
	const locale = useLocale();
	const [xmlOpen, setXmlOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="max-w-4xl space-y-6">
				<Skeleton className="h-8 w-48" />
				<Card>
					<CardContent className="space-y-4 p-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-6 w-full" />
						))}
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!invoice) {
		return <div className="text-muted-foreground">{t("noInvoices")}</div>;
	}

	return (
		<div className="max-w-4xl space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/admin/fiscal">
					<Button variant="ghost" size="icon">
						<ArrowLeftIcon className="h-4 w-4" />
					</Button>
				</Link>
				<h1 className="font-bold text-2xl">{t("details")}</h1>
			</div>

			{/* General Info */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>
							{invoice.model === 65 ? t("nfce") : t("nfe")} #{invoice.series}-
							{String(invoice.number).padStart(9, "0")}
						</CardTitle>
						<Badge variant={invoiceStatusBadgeVariant(invoice.status)}>
							{invoice.status}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-muted-foreground">{t("accessKey")}</dt>
							<dd className="break-all font-mono text-xs">
								{invoice.access_key || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">{t("protocolNumber")}</dt>
							<dd>{invoice.protocol_number || "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">{t("issuedAt")}</dt>
							<dd>
								{invoice.issued_at
									? new Date(invoice.issued_at).toLocaleString()
									: "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">{t("authorizedAt")}</dt>
							<dd>
								{invoice.authorized_at
									? new Date(invoice.authorized_at).toLocaleString()
									: "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">{t("recipient")}</dt>
							<dd>
								{invoice.recipient_name || "—"}{" "}
								{invoice.recipient_tax_id
									? `(${invoice.recipient_tax_id})`
									: ""}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">{tc("total")}</dt>
							<dd className="font-bold text-lg">
								{formatCurrency(invoice.total_amount, locale)}
							</dd>
						</div>
						{invoice.is_contingency && (
							<>
								<div>
									<dt className="text-muted-foreground">
										{t("contingencyType")}
									</dt>
									<dd>
										<Badge variant="secondary">
											{invoice.contingency_type}
										</Badge>
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">
										{t("contingencyReason")}
									</dt>
									<dd>{invoice.contingency_reason || "—"}</dd>
								</div>
							</>
						)}
						{invoice.status_code && (
							<div>
								<dt className="text-muted-foreground">{t("statusCode")}</dt>
								<dd>
									{invoice.status_code} — {invoice.status_message}
								</dd>
							</div>
						)}
					</dl>
				</CardContent>
			</Card>

			{/* Items */}
			{invoice.items && invoice.items.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("items")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>#</TableHead>
										<TableHead>{tc("description")}</TableHead>
										<TableHead className="hidden sm:table-cell">NCM</TableHead>
										<TableHead className="hidden sm:table-cell">CFOP</TableHead>
										<TableHead>Qty</TableHead>
										<TableHead>{tc("price")}</TableHead>
										<TableHead>{tc("total")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoice.items.map((item: any) => (
										<TableRow key={item.id}>
											<TableCell>{item.item_number}</TableCell>
											<TableCell className="font-medium">
												{item.description}
											</TableCell>
											<TableCell className="hidden font-mono text-xs sm:table-cell">
												{item.ncm}
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												{item.cfop}
											</TableCell>
											<TableCell>{(item.quantity / 1000).toFixed(3)}</TableCell>
											<TableCell>
												{formatCurrency(item.unit_price, locale)}
											</TableCell>
											<TableCell>
												{formatCurrency(item.total_price, locale)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Events */}
			{invoice.events && invoice.events.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("events")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{invoice.events.map((event: any) => (
								<div
									key={event.id}
									className="flex items-center justify-between border-b pb-3 last:border-0"
								>
									<div>
										<p className="font-medium">{event.event_type}</p>
										<p className="text-muted-foreground text-sm">
											{event.reason}
										</p>
									</div>
									<div className="text-right text-sm">
										{event.protocol_number && (
											<p className="font-mono">{event.protocol_number}</p>
										)}
										<p className="text-muted-foreground">
											{event.created_at
												? new Date(event.created_at).toLocaleString()
												: ""}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* XML Viewer */}
			{invoice.request_xml && (
				<Card>
					<CardHeader>
						<button
							className="flex w-full items-center justify-between"
							onClick={() => setXmlOpen(!xmlOpen)}
						>
							<CardTitle className="flex items-center gap-2">
								<CodeXmlIcon className="h-5 w-5" />
								{t("xmlViewer")}
							</CardTitle>
							<ChevronDownIcon
								className={`h-5 w-5 transition-transform ${xmlOpen ? "rotate-180" : ""}`}
							/>
						</button>
					</CardHeader>
					{xmlOpen && (
						<CardContent>
							<pre className="max-h-96 overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-4 font-mono text-xs">
								{invoice.request_xml}
							</pre>
						</CardContent>
					)}
				</Card>
			)}
		</div>
	);
}
