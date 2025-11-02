import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import "./PrintableSalesReport.css";

interface Transaction {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  zone: string;
  subscription_plan: string;
  created_at: string;
  cashier_name: string | null;
  member_name?: string;
  cash_amount?: number;
  card_amount?: number;
  notes?: string | null;
  member_notes?: string | null;
  service_notes?: string | null;
}

interface ZoneSummary {
  zone: string;
  revenue: number;
  cash: number;
  card: number;
  online: number;
  salesCount: number;
  transactions: Transaction[];
}

interface PrintableSalesReportProps {
  startDate: Date;
  endDate: Date;
  zoneSummaries: ZoneSummary[];
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalOnline: number;
  reportType: "daily" | "monthly";
}

export const PrintableSalesReport = ({
  startDate,
  endDate,
  zoneSummaries,
  totalRevenue,
  totalCash,
  totalCard,
  totalOnline,
  reportType,
}: PrintableSalesReportProps) => {
  const getReportTitle = () => {
    if (reportType === "daily") {
      return `Daily Sales Report - ${format(startDate, "MMMM dd, yyyy")}`;
    }
    return `Monthly Sales Report - ${format(startDate, "MMMM yyyy")}`;
  };

  return (
    <div className="print-report print-container bg-white text-black p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">ASATHEER SPORT ACADEMY</h1>
        <h2 className="text-xl font-semibold mb-1">{getReportTitle()}</h2>
        <p className="text-sm text-gray-600">
          {reportType === "daily" 
            ? format(startDate, "MMMM dd, yyyy")
            : `${format(startDate, "MMMM dd")} - ${format(endDate, "MMMM dd, yyyy")}`
          }
        </p>
      </div>

      {/* Summary Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded">
        <h3 className="font-bold text-lg mb-3">Summary</h3>
        <div className="space-y-1 text-sm">
          <p><span className="font-semibold">Total Revenue:</span> {totalRevenue.toFixed(2)} AED</p>
          <p><span className="font-semibold">Cash:</span> {totalCash.toFixed(2)} AED</p>
          <p><span className="font-semibold">Card:</span> {totalCard.toFixed(2)} AED</p>
          <p><span className="font-semibold">Online:</span> {totalOnline.toFixed(2)} AED</p>
          <p><span className="font-semibold">Generated:</span> {format(new Date(), "MMM dd, yyyy HH:mm")}</p>
        </div>
      </div>

      {/* Zone Summary Table */}
      <div className="mb-6 break-inside-avoid">
        <h3 className="font-bold text-lg mb-3">Zone Summary</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-bold text-black">Zone</TableHead>
              <TableHead className="font-bold text-black text-right">Revenue (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Cash (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Card (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Online (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zoneSummaries.map((zone) => (
              <TableRow key={zone.zone} className={zone.salesCount === 0 ? "text-gray-400" : ""}>
                <TableCell className="font-medium">{zone.zone}</TableCell>
                <TableCell className="text-right">{zone.revenue.toFixed(2)}</TableCell>
                <TableCell className="text-right">{zone.cash.toFixed(2)}</TableCell>
                <TableCell className="text-right">{zone.card.toFixed(2)}</TableCell>
                <TableCell className="text-right">{zone.online.toFixed(2)}</TableCell>
                <TableCell className="text-right">{zone.salesCount}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-100 font-bold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{totalRevenue.toFixed(2)}</TableCell>
              <TableCell className="text-right">{totalCash.toFixed(2)}</TableCell>
              <TableCell className="text-right">{totalCard.toFixed(2)}</TableCell>
              <TableCell className="text-right">{totalOnline.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {zoneSummaries.reduce((sum, z) => sum + z.salesCount, 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Detailed Transactions by Zone */}
      <div className="space-y-6">
        <h3 className="font-bold text-lg mb-4">Detailed Transactions by Zone</h3>
        {zoneSummaries.map((zone, index) => {
          // Show empty state for zones with no transactions
          if (zone.transactions.length === 0) {
            return (
              <div key={zone.zone} className="break-inside-avoid print-zone-section">
                <h4 className="font-semibold text-base mb-2 bg-gray-100 p-2 rounded">
                  {zone.zone} - 0.00 AED
                </h4>
                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-200">
                  No {zone.zone === "Football Court" ? "rentals" : "sales"} recorded for this period
                </div>
              </div>
            );
          }
          
          return (
            <div key={zone.zone} className="break-inside-avoid print-zone-section">
              <h4 className="font-semibold text-base mb-2 bg-gray-100 p-2 rounded">
                {zone.zone} - {zone.revenue.toFixed(2)} AED ({zone.transactions.length} transactions)
              </h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-black">Item/Service</TableHead>
                    <TableHead className="font-semibold text-black text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-black text-right">Cash</TableHead>
                    <TableHead className="font-semibold text-black text-right">Card</TableHead>
                    <TableHead className="font-semibold text-black">Payment</TableHead>
                    <TableHead className="font-semibold text-black">Member</TableHead>
                    <TableHead className="font-semibold text-black">Cashier</TableHead>
                    <TableHead className="font-semibold text-black">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zone.transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="text-sm">
                      <TableCell>{transaction.subscription_plan}</TableCell>
                      <TableCell className="text-right font-medium">{Number(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {transaction.payment_method === 'mixed' 
                          ? Number(transaction.cash_amount || 0).toFixed(2)
                          : transaction.payment_method === 'cash' 
                            ? Number(transaction.amount).toFixed(2) 
                            : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.payment_method === 'mixed'
                          ? Number(transaction.card_amount || 0).toFixed(2)
                          : transaction.payment_method === 'card'
                            ? Number(transaction.amount).toFixed(2)
                            : '-'
                        }
                      </TableCell>
                      <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                      <TableCell>{transaction.member_name || '-'}</TableCell>
                      <TableCell>{transaction.cashier_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {[
                          transaction.member_notes,
                          transaction.service_notes,
                          transaction.notes
                        ].filter(Boolean).join(' | ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell>Subtotal</TableCell>
                    <TableCell className="text-right">{zone.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{zone.cash.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{zone.card.toFixed(2)}</TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </div>
  );
};
