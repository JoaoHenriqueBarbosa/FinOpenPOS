import { defineAddonUI } from "@finopenpos/addon-kit/ui";
import { ReceiptTextIcon, SettingsIcon } from "lucide-react";
import InvoiceDetailPage from "./invoice-detail-page";
import InvoicesPage from "./invoices-page";
import FiscalSettingsPage from "./settings-page";

/** Contribuições de UI do addon fiscal (nav + páginas sob /admin). */
export const fiscalAddonUI = defineAddonUI({
	addonId: "fiscal",
	nav: [
		{ href: "/admin/fiscal", labelKey: "invoices", icon: ReceiptTextIcon },
		{
			href: "/admin/fiscal/settings",
			labelKey: "fiscalSettings",
			icon: SettingsIcon,
		},
	],
	pages: [
		{ pattern: "fiscal", component: InvoicesPage },
		{ pattern: "fiscal/settings", component: FiscalSettingsPage },
		{ pattern: "fiscal/:id", component: InvoiceDetailPage },
	],
});
