// ── SafeSpeak — SOS Button Component ────────────────────────────────
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

interface SOSButtonProps {
    conversationId: string;
}

export function SOSButton({ conversationId }: SOSButtonProps) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            {/* SOS Button — pinned to chat header, always accessible */}
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-flag-rose to-flag-red text-white text-sm font-semibold hover:shadow-lg hover:shadow-flag-rose/30 transition-all active:scale-95"
                title="Generate SOS Report"
            >
                <ShieldAlert className="w-4 h-4" />
                SOS
            </button>

            {/* Date Range Picker Modal */}
            {showModal && (
                <DateRangePicker
                    conversationId={conversationId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
