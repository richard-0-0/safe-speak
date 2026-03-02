"""
SafeSpeak — PDF Report Generation Service
Renders abuse reports as styled PDFs using WeasyPrint.
"""
import logging
from datetime import datetime
from weasyprint import HTML

logger = logging.getLogger(__name__)


def _build_report_html(
    report_data: dict,
    flagged_messages: list[dict],
    llm_summary: str,
    user_names: dict[str, str] | None = None,
) -> str:
    """Build a styled HTML document for the SOS abuse report."""

    date_range = report_data.get("dateRange", {})
    start_date = date_range.get("start", "N/A")
    end_date = date_range.get("end", "N/A")
    total_messages = report_data.get("messageCount", 0)
    flagged_count = report_data.get("flaggedCount", 0)
    generated_at = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

    # Build the evidence table rows
    evidence_rows = ""
    for idx, msg in enumerate(flagged_messages, 1):
        flag_details = msg.get("flagDetails", {})
        label = flag_details.get("label", "unknown") if isinstance(flag_details, dict) else "unknown"
        confidence = flag_details.get("confidence", 0) if isinstance(flag_details, dict) else 0
        content = msg.get("content", "")
        timestamp = msg.get("timestamp", "N/A")
        sender_uid = msg.get("senderId", "Unknown")
        sender = (user_names or {}).get(sender_uid, sender_uid[:8] + "...")

        label_color = {
            "hate_speech": "#F43F5E",
            "threat": "#EF4444",
            "offensive": "#F59E0B",
            "flagged": "#F59E0B",
            "clean": "#10B981",
        }.get(label, "#6B7280")

        # Normalize "flagged" to "offensive" for display
        display_label = "offensive" if label == "flagged" else label

        # Status tags for deleted/edited messages
        status_tag = ""
        if msg.get("deleted"):
            status_tag = '<span style="background: #DC2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 4px;">SENT &amp; DELETED</span>'
        if msg.get("edited"):
            original = msg.get("originalContent", "")
            status_tag += f'<span style="background: #3B82F6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 4px;">EDITED</span>'
            if original:
                content = f'{content} <br><span style="color: #9CA3AF; font-size: 11px;">(Original: "{original}")</span>'

        evidence_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px;">{idx}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px;">{timestamp}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px;">{sender}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; max-width: 250px; word-wrap: break-word;">{content}</td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">
                <span style="background: {label_color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                    {display_label.upper().replace('_', ' ')}
                </span>
                {status_tag}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; text-align: center;">{confidence:.0%}</td>
        </tr>"""

    # Count by category (read from flagDetails.label)
    def _get_label(m):
        fd = m.get("flagDetails", {})
        return fd.get("label", "unknown") if isinstance(fd, dict) else "unknown"

    hate_count = sum(1 for m in flagged_messages if _get_label(m) == "hate_speech")
    threat_count = sum(1 for m in flagged_messages if _get_label(m) == "threat")
    offensive_count = sum(1 for m in flagged_messages if _get_label(m) in ("offensive", "flagged"))

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1F2937;
            line-height: 1.6;
            font-size: 14px;
        }}
        .cover {{
            text-align: center;
            padding: 80px 0 40px;
            border-bottom: 3px solid #0A0F1E;
            margin-bottom: 40px;
        }}
        .cover h1 {{
            font-size: 32px;
            color: #0A0F1E;
            margin-bottom: 8px;
            letter-spacing: 2px;
        }}
        .cover .subtitle {{
            font-size: 18px;
            color: #F43F5E;
            font-weight: 600;
            margin-bottom: 24px;
        }}
        .cover .meta {{
            font-size: 13px;
            color: #6B7280;
        }}
        .section-title {{
            font-size: 20px;
            color: #0A0F1E;
            border-bottom: 2px solid #00D4FF;
            padding-bottom: 8px;
            margin-top: 32px;
            margin-bottom: 16px;
        }}
        .stats-grid {{
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
        }}
        .stat-card {{
            flex: 1;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .stat-card .number {{
            font-size: 28px;
            font-weight: 700;
            color: #0A0F1E;
        }}
        .stat-card .label {{
            font-size: 12px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .summary-box {{
            background: #F0F9FF;
            border-left: 4px solid #00D4FF;
            padding: 16px 20px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 24px;
            white-space: pre-wrap;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }}
        th {{
            background: #0A0F1E;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .disclaimer {{
            margin-top: 40px;
            padding: 16px;
            background: #FFF7ED;
            border: 1px solid #FDBA74;
            border-radius: 8px;
            font-size: 11px;
            color: #9A3412;
        }}
        .footer {{
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 16px;
        }}
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover">
        <h1>🛡️ SAFESPEAK</h1>
        <div class="subtitle">Abuse Incident Report</div>
        <div class="meta">
            Generated: {generated_at}<br>
            Report Period: {start_date} — {end_date}<br>
            Report ID: {report_data.get('id', 'N/A')}
        </div>
    </div>

    <!-- Statistics -->
    <h2 class="section-title">📊 Report Statistics</h2>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="number">{total_messages}</div>
            <div class="label">Total Messages</div>
        </div>
        <div class="stat-card">
            <div class="number" style="color: #F43F5E;">{flagged_count}</div>
            <div class="label">Flagged Messages</div>
        </div>
        <div class="stat-card">
            <div class="number" style="color: #F43F5E;">{hate_count}</div>
            <div class="label">Hate Speech</div>
        </div>
        <div class="stat-card">
            <div class="number" style="color: #EF4444;">{threat_count}</div>
            <div class="label">Threats</div>
        </div>
        <div class="stat-card">
            <div class="number" style="color: #F59E0B;">{offensive_count}</div>
            <div class="label">Offensive</div>
        </div>
    </div>

    <!-- AI Summary -->
    <h2 class="section-title">🤖 AI Analysis Summary</h2>
    <div class="summary-box">{llm_summary}</div>

    <!-- Evidence Table -->
    <h2 class="section-title">📋 Flagged Message Evidence</h2>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Sender</th>
                <th>Content</th>
                <th>Classification</th>
                <th>Confidence</th>
            </tr>
        </thead>
        <tbody>
            {evidence_rows if evidence_rows else '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #9CA3AF;">No flagged messages found in the selected date range.</td></tr>'}
        </tbody>
    </table>

    <!-- Disclaimer -->
    <div class="disclaimer">
        <strong>⚠️ Important Disclaimer:</strong> This report was generated automatically by SafeSpeak's
        AI-powered detection system. Classification results are based on machine learning models and
        may contain inaccuracies. This report should be reviewed by a qualified human before being
        submitted to authorities, platforms, or legal proceedings. SafeSpeak does not provide legal advice.
        <br><br>
        <strong>How to use this report:</strong> This document can be shared with platform administrators,
        law enforcement, or support organizations as supporting evidence of online harassment.
        For legal proceedings, consult with a licensed attorney in your jurisdiction.
    </div>

    <!-- Footer -->
    <div class="footer">
        SafeSpeak — AI-Powered Safety for Online Communication<br>
        This report expires 24 hours after generation.
    </div>
</body>
</html>"""

    return html


def render_report_pdf(
    report_data: dict,
    flagged_messages: list[dict],
    llm_summary: str,
    user_names: dict[str, str] | None = None,
) -> bytes:
    """
    Render a complete SOS abuse report as a PDF.

    Args:
        report_data: Report metadata (id, dateRange, counts).
        flagged_messages: List of flagged message dicts with content, label, confidence.
        llm_summary: LLM-generated narrative summary of the abuse pattern.

    Returns:
        PDF file content as bytes.
    """
    html_content = _build_report_html(report_data, flagged_messages, llm_summary, user_names)

    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
        logger.info(
            "[PDF] Report rendered: %d bytes, %d flagged messages",
            len(pdf_bytes),
            len(flagged_messages),
        )
        return pdf_bytes

    except Exception as exc:
        logger.error("[PDF] Rendering failed: %s", exc)
        raise
