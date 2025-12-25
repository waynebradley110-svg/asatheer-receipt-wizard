import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import "./PrintableFootballReport.css";

interface FootballSale {
  id: string;
  sale_date: string;
  description: string;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
}

interface PrintableFootballReportProps {
  startDate: Date;
  endDate: Date;
  sales: FootballSale[];
  totalCash: number;
  totalCard: number;
  totalRevenue: number;
}

export const PrintableFootballReport = ({
  startDate,
  endDate,
  sales,
  totalCash,
  totalCard,
  totalRevenue,
}: PrintableFootballReportProps) => {
  const isSameDay = format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");

  const getDateRangeText = () => {
    if (isSameDay) {
      return format(startDate, "MMMM dd, yyyy");
    }
    return `${format(startDate, "MMMM dd")} - ${format(endDate, "MMMM dd, yyyy")}`;
  };

  return (
    <div className="print-report print-container bg-white text-black p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">ASATHEER SPORT ACADEMY</h1>
        <h2 className="text-xl font-semibold mb-1">⚽ Football Court Sales Report</h2>
        <p className="text-sm text-gray-600">{getDateRangeText()}</p>
      </div>

      {/* Summary Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded">
        <h3 className="font-bold text-lg mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Cash</p>
            <p className="text-xl font-bold text-green-600">{totalCash.toFixed(2)} AED</p>
          </div>
          <div>
            <p className="text-gray-600">Total Card</p>
            <p className="text-xl font-bold text-blue-600">{totalCard.toFixed(2)} AED</p>
          </div>
          <div>
            <p className="text-gray-600">Total Revenue</p>
            <p className="text-xl font-bold text-primary">{totalRevenue.toFixed(2)} AED</p>
          </div>
          <div>
            <p className="text-gray-600">Total Transactions</p>
            <p className="text-xl font-bold">{sales.length}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Generated: {format(new Date(), "MMM dd, yyyy HH:mm")}
        </p>
      </div>

      {/* Detailed Transactions Table */}
      <div className="break-inside-avoid">
        <h3 className="font-bold text-lg mb-3">Detailed Transactions</h3>
        {sales.length === 0 ? (
          <div className="text-center text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-200">
            No sales recorded for this period
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-black">Date</TableHead>
                <TableHead className="font-bold text-black">Description</TableHead>
                <TableHead className="font-bold text-black text-right">Cash (AED)</TableHead>
                <TableHead className="font-bold text-black text-right">Card (AED)</TableHead>
                <TableHead className="font-bold text-black text-right">Total (AED)</TableHead>
                <TableHead className="font-bold text-black">Cashier</TableHead>
                <TableHead className="font-bold text-black">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="text-sm">
                  <TableCell>{format(new Date(sale.sale_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{sale.description}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {Number(sale.cash_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">
                    {Number(sale.card_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {Number(sale.total_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{sale.cashier_name || "-"}</TableCell>
                  <TableCell className="text-xs">{sale.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-gray-100 font-bold">
                <TableCell colSpan={2}>TOTAL</TableCell>
                <TableCell className="text-right text-green-600">{totalCash.toFixed(2)}</TableCell>
                <TableCell className="text-right text-blue-600">{totalCard.toFixed(2)}</TableCell>
                <TableCell className="text-right">{totalRevenue.toFixed(2)}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
