// ── SafeSpeak — Report Status Component ─────────────────────────────
import { useReportStatus } from '@/hooks/useReport';
import { Download, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';

interface ReportStatusProps {
    jobId: string;
    onClose: () => void;
}

export function ReportStatus({ jobId, onClose }: ReportStatusProps) {
    const { data, isLoading } = useReportStatus(jobId);

    const status = data?.status || 'queued';
    const downloadUrl = data?.downloadUrl;

    return (
        <div className="space-y-4">
            {/* Status Indicator */}
            <div className="flex flex-col items-center text-center py-4">
                {status === 'queued' || status === 'processing' ? (
                    <>
                        <div className="w-16 h-16 rounded-2xl bg-accent-teal/10 flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 text-accent-teal animate-spin" />
                        </div>
                        <h4 className="text-white font-display font-semibold mb-1">
                            {status === 'queued' ? 'Report Queued' : 'Generating Report...'}
                        </h4>
                        <p className="text-white/40 text-sm">
                            {status === 'queued'
                                ? 'Your report is in the queue. This usually takes less than 30 seconds.'
                                : 'AI is analyzing flagged messages and generating your report...'}
                        </p>

                        {/* Progress bar animation */}
                        <div className="w-full h-1 bg-surface rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-accent-teal to-accent-blue rounded-full animate-shimmer"
                                style={{
                                    width: status === 'queued' ? '30%' : '70%',
                                    backgroundSize: '200% 100%',
                                }}
                            />
                        </div>
                    </>
                ) : status === 'complete' ? (
                    <>
                        <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4 animate-scale-in">
                            <CheckCircle className="w-8 h-8 text-success" />
                        </div>
                        <h4 className="text-white font-display font-semibold mb-1">
                            Report Ready!
                        </h4>
                        <p className="text-white/40 text-sm mb-2">
                            Your SOS abuse report has been generated.
                        </p>
                        {data?.messageCount !== undefined && (
                            <p className="text-white/30 text-xs">
                                {data.messageCount} messages analyzed · {data.flaggedCount} flagged
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-2xl bg-flag-rose/10 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-flag-rose" />
                        </div>
                        <h4 className="text-white font-display font-semibold mb-1">
                            Report Failed
                        </h4>
                        <p className="text-white/40 text-sm">
                            Something went wrong generating your report. Please try again.
                        </p>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                {status === 'complete' && downloadUrl ? (
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </a>
                ) : status === 'failed' ? (
                    <button onClick={onClose} className="btn-secondary w-full">
                        Close & Try Again
                    </button>
                ) : null}
            </div>

            {/* Expiry notice */}
            {status === 'complete' && (
                <p className="text-white/20 text-[10px] text-center">
                    Download link expires in 24 hours
                </p>
            )}
        </div>
    );
}
