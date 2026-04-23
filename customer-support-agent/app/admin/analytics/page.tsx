'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Users, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics/overview?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = [
        {
            title: 'Total Conversations',
            value: analytics?.metrics?.totalConversations || 0,
            change: '+12%',
            trend: 'up',
            icon: MessageSquare,
            description: 'All conversations in period'
        },
        {
            title: 'AI Resolution Rate',
            value: `${analytics?.metrics?.aiResolutionRate || 100}%`,
            change: '+5%',
            trend: 'up',
            icon: CheckCircle,
            description: 'Resolved without human help'
        },
        {
            title: 'Avg Response Time',
            value: '< 1s',
            change: '-10%',
            trend: 'up',
            icon: Clock,
            description: 'Average AI response time'
        },
        {
            title: 'Active Users',
            value: analytics?.metrics?.activeUsers || 0,
            change: '+8%',
            trend: 'up',
            icon: Users,
            description: 'Unique customers'
        },
    ];

    // Format date labels for chart
    const formatTrendData = (trends: any[]) => {
        if (!trends) return [];
        return trends.map(t => ({
            ...t,
            label: new Date(t.date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
            }),
        }));
    };

    const trendData = formatTrendData(analytics?.trends);
    const topCategories = analytics?.topCategories || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Analytics</h1>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((metric) => (
                            <Card key={metric.title}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {metric.title}
                                    </CardTitle>
                                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{metric.value}</div>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        {metric.trend === 'up' ? (
                                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                                        )}
                                        <span className={metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                                            {metric.change}
                                        </span>
                                        <span className="ml-1">vs previous period</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Performance Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Conversation Trends Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Conversation Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {trendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    fontSize: '13px',
                                                }}
                                                formatter={(value: number, name: string) => {
                                                    const labels: Record<string, string> = {
                                                        conversations: 'Conversations',
                                                        redirected: 'Redirected',
                                                    };
                                                    return [value, labels[name] || name];
                                                }}
                                            />
                                            <Legend
                                                formatter={(value: string) => {
                                                    const labels: Record<string, string> = {
                                                        conversations: 'Conversations',
                                                        redirected: 'Redirected to Human',
                                                    };
                                                    return labels[value] || value;
                                                }}
                                            />
                                            <Bar
                                                dataKey="conversations"
                                                fill="#171717"
                                                radius={[4, 4, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="redirected"
                                                fill="#ef4444"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No conversation data yet</p>
                                            <p className="text-sm">Start chatting to see trends here</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Categories - now using real data */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {topCategories.length > 0 ? (
                                    <div className="space-y-4">
                                        {topCategories.map((cat: any) => (
                                            <div key={cat.name} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span>{cat.name}</span>
                                                    <span className="text-muted-foreground">{cat.count}</span>
                                                </div>
                                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full"
                                                        style={{ width: `${cat.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                                        <p className="text-sm">No category data yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Handoff Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Handoff Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                                    <div className="text-3xl font-bold">{analytics?.metrics?.totalHandoffs || 0}</div>
                                    <div className="text-sm text-muted-foreground">Total Handoffs</div>
                                </div>
                                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                                    <div className="text-3xl font-bold">{analytics?.metrics?.activeHandoffs || 0}</div>
                                    <div className="text-sm text-muted-foreground">Active Handoffs</div>
                                </div>
                                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                                    <div className="text-3xl font-bold">{analytics?.metrics?.aiResolutionRate || 100}%</div>
                                    <div className="text-sm text-muted-foreground">AI Resolution Rate</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
