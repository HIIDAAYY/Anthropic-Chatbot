'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface EscalationAlert {
  handoffId: string;
  conversationId: string;
  reason: string;
  mood: string;
  priority: number;
  timestamp: string;
}

interface EscalationAlertModalProps {
  alert: EscalationAlert | null;
  onDismiss: () => void;
}

export default function EscalationAlertModal({ alert, onDismiss }: EscalationAlertModalProps) {
  const router = useRouter();

  // Web Audio API alert sound — no audio file needed
  useEffect(() => {
    if (!alert) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not supported — silent fallback
    }
  }, [alert]);

  if (!alert) return null;

  const isUrgent = alert.priority >= 3 || alert.mood === 'angry';
  const moodLabel: Record<string, string> = {
    angry: '😡 Marah',
    frustrated: '😤 Frustrasi',
    worried: '😟 Khawatir',
    concerned: '😕 Cemas',
    negative: '😞 Negatif',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Pulsing backdrop */}
      <div className="absolute inset-0 bg-red-950/80 animate-pulse" onClick={onDismiss} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-red-500">
        {/* Header with pinging dot */}
        <div className="flex items-center gap-3 mb-6">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
          </span>
          <h2 className="text-xl font-bold text-red-600 uppercase tracking-wide">
            {isUrgent ? '🚨 Eskalasi Darurat!' : '⚠️ Perlu Penanganan Segera'}
          </h2>
        </div>

        {/* Info cards */}
        <div className="space-y-3 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Mood Terdeteksi AI</p>
            <p className="font-semibold text-amber-700">
              {moodLabel[alert.mood] ?? `😐 ${alert.mood}`}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Alasan Eskalasi</p>
            <p className="text-sm text-gray-800">{alert.reason}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Waktu</p>
            <p className="text-sm text-gray-700">
              {new Date(alert.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-base"
            onClick={() => {
              router.push(`/admin/conversations/${alert.conversationId}`);
              onDismiss();
            }}
          >
            Tangani Sekarang
          </Button>
          <Button variant="outline" onClick={onDismiss} className="px-4">
            Nanti
          </Button>
        </div>
      </div>
    </div>
  );
}
