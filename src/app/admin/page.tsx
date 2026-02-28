"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartTooltipContent,
  ChartTooltip,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Area,
  AreaChart,
  Cell,
  Label,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

/** Format cents integer as currency string. */
function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Page() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [cashFlow, setCashFlow] = useState<{ date: string; amount: number }[]>(
    []
  );
  const [revenueByCategory, setRevenueByCategory] = useState<
    Record<string, number>
  >({});
  const [expensesByCategory, setExpensesByCategory] = useState<
    Record<string, number>
  >({});
  const [profitMargin, setProfitMargin] = useState<
    { date: string; margin: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          revenueRes,
          expensesRes,
          profitRes,
          cashFlowRes,
          revenueByCategoryRes,
          expensesByCategoryRes,
          profitMarginRes,
        ] = await Promise.all([
          fetch("/api/admin/revenue/total"),
          fetch("/api/admin/expenses/total"),
          fetch("/api/admin/profit/total"),
          fetch("/api/admin/cashflow"),
          fetch("/api/admin/revenue/category"),
          fetch("/api/admin/expenses/category"),
          fetch("/api/admin/profit/margin"),
        ]);

        const revenue = await revenueRes.json();
        const expenses = await expensesRes.json();
        const profit = await profitRes.json();
        const cashFlowData = await cashFlowRes.json();
        const revenueByCategoryData = await revenueByCategoryRes.json();
        const expensesByCategoryData = await expensesByCategoryRes.json();
        const profitMarginData = await profitMarginRes.json();

        setTotalRevenue(revenue.totalRevenue ?? 0);
        setTotalExpenses(expenses.totalExpenses ?? 0);
        setTotalProfit(profit.totalProfit ?? 0);
        setCashFlow(
          cashFlowData.cashFlow
            ? Object.entries(cashFlowData.cashFlow).map(([date, amount]) => ({
                date,
                amount: Number(amount),
              }))
            : []
        );
        setRevenueByCategory(revenueByCategoryData.revenueByCategory ?? {});
        setExpensesByCategory(expensesByCategoryData.expensesByCategory ?? {});
        setProfitMargin(profitMarginData.profitMargin ?? []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profitIsPositive = totalProfit >= 0;

  return (
    <div className="grid flex-1 items-start gap-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed income transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed expense transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            {profitIsPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${profitIsPositive ? "text-emerald-600" : "text-red-600"}`}
            >
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue from selling minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Category - Donut */}
        <RevenuePieChart data={revenueByCategory} />

        {/* Expenses by Category - Donut */}
        <ExpensesPieChart data={expensesByCategory} />

        {/* Profit Margin - Bar */}
        <ProfitMarginChart data={profitMargin} />

        {/* Cash Flow - Area */}
        <CashFlowChart data={cashFlow} />
      </div>
    </div>
  );
}

function RevenuePieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  const chartData = entries.map(([category, value], i) => ({
    category,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([category], i) => [
      category,
      {
        label: category.charAt(0).toUpperCase() + category.slice(1),
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    ])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Revenue by Category</CardTitle>
        <CardDescription>
          Breakdown of income across categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState message="No revenue data yet" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="category"
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="category"
                innerRadius={60}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-bold"
                          >
                            {formatCurrency(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="category" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ExpensesPieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  const chartData = entries.map(([category, value], i) => ({
    category,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([category], i) => [
      category,
      {
        label: category.charAt(0).toUpperCase() + category.slice(1),
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    ])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Expenses by Category</CardTitle>
        <CardDescription>
          Breakdown of expenses across categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState message="No expense data yet" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="category"
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="category"
                innerRadius={60}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-bold"
                          >
                            {formatCurrency(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="category" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ProfitMarginChart({
  data,
}: {
  data: { date: string; margin: number }[];
}) {
  const chartConfig = {
    margin: {
      label: "Margin %",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Profit Margin</CardTitle>
        <CardDescription>Daily profit margin percentage</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No profit margin data yet" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={formatShortDate}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={50}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatShortDate(String(label))}
                    formatter={(value) => `${value}%`}
                  />
                }
              />
              <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={
                      entry.margin >= 0
                        ? "hsl(var(--chart-2))"
                        : "hsl(var(--chart-5))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CashFlowChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Cash Flow</CardTitle>
        <CardDescription>Daily transaction volume</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No cash flow data yet" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatShortDate}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatShortDate(String(label))}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <defs>
                <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="amount"
                type="monotone"
                fill="url(#fillAmount)"
                stroke="var(--color-amount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
