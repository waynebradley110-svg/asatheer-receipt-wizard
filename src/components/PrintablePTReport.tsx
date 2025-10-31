import { format } from "date-fns";
import "./PrintablePTReport.css";

interface PTSession {
  id: string;
  member_name: string;
  phone_number: string;
  subscription_plan: string;
  amount: number;
  payment_method: string;
  created_at: string;
  member_notes?: string | null;
  service_notes?: string | null;
}

interface CoachSummary {
  coachName: string;
  totalAmount: number;
  sessionCount: number;
  sessions: PTSession[];
}

interface PrintablePTReportProps {
  startDate: Date;
  endDate: Date;
  coachSummaries: CoachSummary[];
  totalRevenue: number;
  totalCoaches: number;
  totalSessions: number;
  reportType: "daily" | "monthly";
}

export const PrintablePTReport = ({
  startDate,
  endDate,
  coachSummaries,
  totalRevenue,
  totalCoaches,
  totalSessions,
  reportType,
}: PrintablePTReportProps) => {
  const dateRangeText = reportType === "daily"
    ? format(startDate, "MMMM dd, yyyy")
    : `${format(startDate, "MMMM dd")} - ${format(endDate, "dd, yyyy")}`;

  return (
    <div className="printable-pt-report">
      {/* Header */}
      <div className="report-header">
        <h1>ASATHEER SPORT ACADEMY</h1>
        <h2>PT COACH COMMISSION REPORT</h2>
        <p className="date-range">{dateRangeText}</p>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <table className="summary-table">
          <tbody>
            <tr>
              <td className="summary-label">Total PT Revenue:</td>
              <td className="summary-value">AED {totalRevenue.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="summary-label">Number of Coaches:</td>
              <td className="summary-value">{totalCoaches}</td>
            </tr>
            <tr>
              <td className="summary-label">Total Sessions:</td>
              <td className="summary-value">{totalSessions}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Coach Details */}
      {coachSummaries.length > 0 ? (
        <div className="coaches-section">
          {coachSummaries.map((coach, index) => (
            <div key={coach.coachName} className="coach-section">
              <div className="coach-header">
                <h3>COACH: {coach.coachName.toUpperCase()}</h3>
                <div className="coach-summary">
                  <span>{coach.sessionCount} sessions</span>
                  <span className="coach-total">Total: AED {coach.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th className="amount-col">Amount</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {coach.sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.member_name}</td>
                      <td>{session.subscription_plan.replace(/_/g, ' ')}</td>
                      <td className="amount-col">{session.amount.toFixed(2)}</td>
                      <td>{format(new Date(session.created_at), "MMM dd, yyyy")}</td>
                      <td className="notes-col">
                        {[session.member_notes, session.service_notes]
                          .filter(Boolean)
                          .join(' | ') || '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td colSpan={2} className="subtotal-label">Coach Subtotal:</td>
                    <td className="amount-col subtotal-amount">
                      {coach.totalAmount.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data">
          <p>No PT sessions found for the selected date range</p>
        </div>
      )}

      {/* Grand Total */}
      <div className="grand-total">
        <span className="grand-total-label">GRAND TOTAL:</span>
        <span className="grand-total-amount">AED {totalRevenue.toFixed(2)}</span>
      </div>

      {/* Footer */}
      <div className="report-footer">
        <p>Generated on {format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</p>
      </div>
    </div>
  );
};