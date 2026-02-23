// ── SafeSpeak — Date Range Picker (SOS Report Modal) ────────────────
import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, FileText, X, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { ReportStatus } from './ReportStatus';

interface DateRangePickerProps {
    conversationId: string;
    onClose: () => void;
}

export function DateRangePicker({ conversationId, onClose }: DateRangePickerProps) {
    const today = new Date();
    const [startDate, setStartDate] = useState(format(subDays(today, 7), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
    const [isGenerating, setIsGenerating] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await api.post('/api/reports/generate', {
                conversationId,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
            });

            setJobId(response.data.jobId);
        } catch (err) {
            setError('Failed to start report generation. Please try again.');
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-card p-6 w-full max-w-md animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-flag-rose/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-flag-rose" />
                    </div>
                    <div>
                        <h3 className="text-lg font-display font-semibold text-white">
                            Generate SOS Report
                        </h3>
                        <p className="text-white/40 text-xs">
                            Create a formal abuse report for the selected period
                        </p>
                    </div>
                </div>

                {!jobId ? (
                    <>
                        {/* Date Range Inputs */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input-field"
                                    max={endDate}
                                />
                            </div>

                            <div>
                                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input-field"
                                    min={startDate}
                                    max={format(today, 'yyyy-MM-dd')}
                                />
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="p-3 rounded-lg bg-accent-teal/5 border border-accent-teal/10 mb-6">
                            <p className="text-white/50 text-xs leading-relaxed">
                                This report will include all flagged messages in the selected period, along with
                                an AI-generated summary of the abuse pattern. The PDF will be available for download
                                within ~30 seconds.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-lg bg-flag-rose/10 border border-flag-rose/20 mb-4">
                                <p className="text-flag-rose text-sm">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="btn-danger w-full flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    Generate Report
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <ReportStatus jobId={jobId} onClose={onClose} />
                )}
            </div>
        </div>
    );
}
