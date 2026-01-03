'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface SalesOverview {
  totalConversations: number;
  convertedConversations: number;
  conversionRate: number;
  totalRevenue: number;
  averageIntentScore: number;
  promoCodesUsed: number;
  upsellAttempts: number;
  upsellAccepted: number;
  upsellRate: number;
  averageOrderValue: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  dropoffRate: number;
}

interface PromoMetrics {
  topPromoCodes: {
    code: string;
    type: string;
    discountValue: number;
    usageCount: number;
    totalDiscountGiven: number;
    conversionCount: number;
    isActive: boolean;
  }[];
  summary: {
    totalPromos: number;
    activePromos: number;
    totalUsage: number;
  };
}

interface UpsellMetrics {
  byType: {
    type: string;
    attempts: number;
    accepted: number;
    conversionRate: number;
  }[];
  topSuggestions: {
    serviceId: string;
    acceptedCount: number;
  }[];
  totalUpsellRevenue: number;
}

interface ObjectionMetrics {
  objections: {
    objection: string;
    occurrences: number;
    recoveredConversions: number;
    recoveryRate: number;
  }[];
  totalObjectionConversations: number;
  averageRecoveryRate: number;
}

interface ServiceMetric {
  service: string;
  inquiries: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface DashboardData {
  overview: SalesOverview;
  funnel: FunnelStage[];
  promos: PromoMetrics;
  upsells: UpsellMetrics;
  objections: ObjectionMetrics;
  trends: { date: string; conversions: number; revenue: number }[];
  topServices: ServiceMetric[];
  generatedAt: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

export function SalesDashboard() {
  const searchParams = useSearchParams();
  const key = searchParams.get('key');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    if (!key) {
      setError('Missing admin key. Please provide ?key=xxx parameter.');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/admin/sales?key=${key}&range=${dateRange}`, {
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Unauthorized or failed to fetch');
        }
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [key, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatStage = (stage: string) => {
    const stageNames: Record<string, string> = {
      AWARENESS: 'Awareness',
      INTEREST: 'Interest',
      CONSIDERATION: 'Consideration',
      INTENT: 'Intent',
      BOOKING: 'Booking',
      PAYMENT: 'Payment',
      COMPLETED: 'Completed',
    };
    return stageNames[stage] || stage;
  };

  const formatObjection = (objection: string) => {
    const objectionNames: Record<string, string> = {
      price_too_high: 'Harga Terlalu Mahal',
      need_time_to_think: 'Butuh Waktu Pikir',
      fear_of_pain: 'Takut Sakit',
      not_sure_suitable: 'Ragu Cocok',
      comparing_competitors: 'Bandingkan Kompetitor',
      budget_constraint: 'Kendala Budget',
    };
    return objectionNames[objection] || objection;
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Make sure you access the page with correct admin key:
          </p>
          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
            /admin/sales?key=your-admin-key
          </code>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sales Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Klinik Glow Aesthetics - Sales Automation Metrics
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-pink-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Conversations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview.totalConversations}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.overview.conversionRate}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.overview.convertedConversations} bookings
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-pink-600">
                  {formatCurrency(data.overview.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              AOV: {formatCurrency(data.overview.averageOrderValue)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Upsell Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {data.overview.upsellRate}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.overview.upsellAccepted}/{data.overview.upsellAttempts} accepted
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Funnel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Sales Funnel
            </h2>
            <div className="space-y-3">
              {data.funnel.map((stage, index) => {
                const maxCount = Math.max(...data.funnel.map((s) => s.count));
                const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {formatStage(stage.stage)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-semibold">
                          {stage.count}
                        </span>
                        {index > 0 && stage.dropoffRate > 0 && (
                          <span className="text-red-500 text-xs">
                            -{stage.dropoffRate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objection Handling */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Objection Handling Performance
            </h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Recovery Rate</span>
                <span className="text-xl font-bold text-green-600">
                  {data.objections.averageRecoveryRate}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.objections.totalObjectionConversations} conversations with objections
              </p>
            </div>
            <div className="space-y-3">
              {data.objections.objections.slice(0, 5).map((obj) => (
                <div
                  key={obj.objection}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {formatObjection(obj.objection)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {obj.occurrences} occurrences
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        obj.recoveryRate >= 50
                          ? 'text-green-600'
                          : obj.recoveryRate >= 25
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {obj.recoveryRate}%
                    </p>
                    <p className="text-xs text-gray-400">recovery</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Promo Codes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Promo Code Performance
              </h2>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {data.promos.summary.activePromos}/{data.promos.summary.totalPromos} active
                </p>
                <p className="text-xs text-gray-400">
                  {data.promos.summary.totalUsage} total uses
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2">Code</th>
                    <th className="text-center pb-2">Discount</th>
                    <th className="text-center pb-2">Uses</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.promos.topPromoCodes.slice(0, 5).map((promo) => (
                    <tr key={promo.code}>
                      <td className="py-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {promo.code}
                        </code>
                      </td>
                      <td className="py-2 text-center text-sm text-pink-600 font-medium">
                        {promo.discountValue}%
                      </td>
                      <td className="py-2 text-center text-sm text-gray-700">
                        {promo.usageCount}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            promo.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {promo.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.promos.topPromoCodes.length === 0 && (
              <p className="text-center text-gray-400 py-4">
                No promo codes used yet
              </p>
            )}
          </div>

          {/* Upsell Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Upsell Performance
              </h2>
              <p className="text-sm text-pink-600 font-medium">
                +{formatCurrency(data.upsells.totalUpsellRevenue)}
              </p>
            </div>
            <div className="space-y-4">
              {data.upsells.byType.map((type) => (
                <div key={type.type} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        type.conversionRate >= 40
                          ? 'text-green-600'
                          : type.conversionRate >= 20
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {type.conversionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{type.attempts} attempts</span>
                    <span>{type.accepted} accepted</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${type.conversionRate}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.upsells.byType.length === 0 && (
                <p className="text-center text-gray-400 py-4">
                  No upsell attempts yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Services by Conversion
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b">
                  <th className="text-left pb-3">Service</th>
                  <th className="text-center pb-3">Inquiries</th>
                  <th className="text-center pb-3">Conversions</th>
                  <th className="text-center pb-3">Conv. Rate</th>
                  <th className="text-right pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topServices.map((service) => (
                  <tr key={service.service} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">
                      {service.service}
                    </td>
                    <td className="py-3 text-center text-sm text-gray-700">
                      {service.inquiries}
                    </td>
                    <td className="py-3 text-center text-sm text-gray-700">
                      {service.conversions}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`text-sm font-medium ${
                          service.conversionRate >= 50
                            ? 'text-green-600'
                            : service.conversionRate >= 25
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {service.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-pink-600">
                      {formatCurrency(service.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.topServices.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No service data available yet
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          Data generated at:{' '}
          {new Date(data.generatedAt).toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
}
