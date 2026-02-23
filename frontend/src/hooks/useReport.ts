// ── SafeSpeak — Report Status Polling Hook ──────────────────────────
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useReportStatus(jobId: string | null) {
    return useQuery({
        queryKey: ['report-status', jobId],
        queryFn: () => api.get(`/api/reports/status/${jobId}`).then((r) => r.data),
        enabled: !!jobId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === 'complete' || data?.status === 'failed') return false;
            return 3000; // Poll every 3 seconds
        },
    });
}
