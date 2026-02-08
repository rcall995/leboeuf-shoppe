'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ReportsViewProps {
  revenueByDay: { date: string; revenue: number }[];
  topCustomers: { name: string; revenue: number }[];
  statusDistribution: { status: string; count: number }[];
  topProducts: { name: string; weight: number }[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    fulfillmentRate: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  weighed: '#6366f1',
  packed: '#06b6d4',
  out_for_delivery: '#f97316',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

const CHART_COLOR = '#18181b';
const CHART_COLOR_LIGHT = '#18181b40';

const DATE_RANGES = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
];

export function ReportsView({
  revenueByDay,
  topCustomers,
  statusDistribution,
  topProducts,
  summary,
}: ReportsViewProps) {
  const [range, setRange] = useState('all');

  const filteredRevenue = useMemo(() => {
    if (range === 'all') return revenueByDay;
    const now = new Date();
    let cutoff: Date;
    switch (range) {
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '12m':
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return revenueByDay;
    }
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return revenueByDay.filter((d) => d.date >= cutoffStr);
  }, [revenueByDay, range]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Business analytics and performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{summary.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">${summary.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold">${summary.averageOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Fulfillment Rate</p>
                <p className="text-2xl font-bold">{summary.fulfillmentRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Revenue Over Time</CardTitle>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {filteredRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    const date = new Date(d + 'T12:00:00');
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Revenue']}
                  labelFormatter={(label) => {
                    const date = new Date(label + 'T12:00:00');
                    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_COLOR}
                  fill={CHART_COLOR_LIGHT}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">No revenue data for this period</p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCustomers} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill={CHART_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">No customer data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ payload }) => {
                        const s = payload?.status ?? '';
                        return `${s.replace('_', ' ')} (${payload?.count ?? 0})`;
                      }}
                    >
                      {statusDistribution.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, String(name ?? '').replace('_', ' ')]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Products by Weight (lb)</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} lb`} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(2)} lb`, 'Weight']} />
                <Bar dataKey="weight" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">No product data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
