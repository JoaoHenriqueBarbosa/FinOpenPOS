/** Map invoice status to badge variant for consistent styling. */
export function invoiceStatusBadgeVariant(status: string) {
  switch (status) {
    case "authorized": return "default" as const;
    case "pending": case "contingency": return "secondary" as const;
    case "rejected": case "cancelled": case "denied": return "destructive" as const;
    default: return "outline" as const;
  }
}
