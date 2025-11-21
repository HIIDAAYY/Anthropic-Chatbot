'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Message {
  content: string;
  createdAt: string;
}

interface ConversationMetadata {
  redirectReason: string;
  notificationSentAt: string;
  userMood?: string;
}

interface Customer {
  name: string;
  phoneNumber: string;
}

interface Conversation {
  id: string;
  customer: Customer;
  messages: Message[];
  metadata: ConversationMetadata | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const key = searchParams.get('key');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!key) {
      setError('Missing admin key. Please provide ?key=xxx parameter.');
      setLoading(false);
      return;
    }

    fetch(`/api/admin/conversations?key=${key}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Unauthorized or failed to fetch');
        }
        return res.json();
      })
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [key, refreshTrigger]);

  const handleResolve = async (conversationId: string) => {
    const notes = prompt('Masukkan catatan resolusi (apa yang sudah dilakukan untuk handle issue ini):');
    if (!notes) return;

    const resolvedBy = prompt('Nama Anda:') || 'admin';

    try {
      const res = await fetch(
        `/api/admin/conversation/${conversationId}/resolve?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolvedBy, notes }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to resolve conversation');
      }

      alert('✅ Conversation berhasil di-resolve!');
      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      alert('❌ Gagal resolve conversation: ' + error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            /admin/conversations?key=your-admin-key
          </code>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard - Conversations Pending
          </h1>
          <p className="text-gray-600 mt-2">
            {conversations.length} conversation(s) membutuhkan perhatian Anda
          </p>
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Empty State */}
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Tidak ada conversations pending
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Semua conversations sudah di-handle dengan baik! 🎉
            </p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mood
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {conv.customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {conv.customer.phoneNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {conv.messages[0]?.content || 'No message'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs">
                          {conv.metadata?.redirectReason || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            conv.metadata?.userMood === 'frustrated'
                              ? 'bg-red-100 text-red-800'
                              : conv.metadata?.userMood === 'neutral'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {conv.metadata?.userMood || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(conv.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleResolve(conv.id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          ✅ Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
