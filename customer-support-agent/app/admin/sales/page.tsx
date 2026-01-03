import { Suspense } from 'react';
import { SalesDashboard } from './dashboard';

export const dynamic = 'force-dynamic';

export default function SalesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SalesDashboard />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading sales analytics...</p>
      </div>
    </div>
  );
}
