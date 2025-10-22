import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="print-container bg-white text-black p-8">
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
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Zone Summary</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-bold text-black">Zone</TableHead>
              <TableHead className="font-bold text-black text-right">Revenue (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Cash (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Card (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Online (AED)</TableHead>
              <TableHead className="font-bold text-black text-right">Sales Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zoneSummaries.map((zone) => (
              <TableRow key={zone.zone}>
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
        <h3 className="font-bold text-lg">Detailed Transactions by Zone</h3>
        {zoneSummaries.map((zone) => (
          <div key={zone.zone} className="break-inside-avoid">
            <h4 className="font-semibold text-base mb-2 bg-gray-100 p-2 rounded">
              {zone.zone} - {zone.revenue.toFixed(2)} AED ({zone.transactions.length} transactions)
            </h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-black">Type</TableHead>
                  <TableHead className="font-semibold text-black">Item/Service</TableHead>
                  <TableHead className="font-semibold text-black text-right">Amount (AED)</TableHead>
                  <TableHead className="font-semibold text-black text-right">Cash (AED)</TableHead>
                  <TableHead className="font-semibold text-black text-right">Card (AED)</TableHead>
                  <TableHead className="font-semibold text-black">Payment</TableHead>
                  <TableHead className="font-semibold text-black">Member</TableHead>
                  <TableHead className="font-semibold text-black">Cashier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zone.transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="text-sm">
                    <TableCell>Daily Sale</TableCell>
                    <TableCell>{transaction.subscription_plan}</TableCell>
                    <TableCell className="text-right">{Number(transaction.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {transaction.payment_method === 'cash' ? Number(transaction.amount).toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.payment_method === 'card' ? Number(transaction.amount).toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                    <TableCell>{transaction.member_name || '-'}</TableCell>
                    <TableCell>{transaction.cashier_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
};
