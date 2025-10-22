import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, QrCode } from "lucide-react";

interface MemberCardProps {
  member: {
    member_id: string;
    full_name: string;
    barcode: string;
    phone_number: string;
    member_services?: Array<{
      zone: string;
      expiry_date: string;
      is_active: boolean;
    }>;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, member.barcode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [member.barcode]);

  const activeService = member.member_services?.find(
    (s) => new Date(s.expiry_date) >= new Date() && s.is_active
  );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member Card - ${member.full_name}</title>
          <style>
            @page { 
              size: auto; 
              margin: 15mm; 
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Arial', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
            }
            .card {
              width: 380px;
              border: 3px solid #1a56db;
              border-radius: 16px;
              padding: 24px;
              background: white;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 3px solid #1a56db;
            }
            .logo {
              font-size: 22px;
              font-weight: 900;
              color: #1a56db;
              margin-bottom: 5px;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .label {
              color: #6b7280;
              font-size: 13px;
              font-weight: 500;
            }
            .value {
              font-weight: 700;
              font-size: 13px;
              color: #111827;
            }
            .barcode-container {
              margin-top: 24px;
              text-align: center;
              padding: 20px;
              background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
              border-radius: 12px;
              border: 2px dashed #cbd5e1;
            }
            .barcode-label {
              font-size: 10px;
              color: #9ca3af;
              font-weight: 600;
              letter-spacing: 1.5px;
              margin-bottom: 8px;
            }
            @media print {
              body { 
                padding: 0; 
                background: white;
              }
              .card { 
                box-shadow: none;
                border-color: #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">⚡ ASATHEER SPORTS ACADEMY</div>
              <div class="subtitle">Member Identification Card</div>
            </div>
            <div class="info-row">
              <span class="label">Member ID</span>
              <span class="value">${member.member_id}</span>
            </div>
            <div class="info-row">
              <span class="label">Full Name</span>
              <span class="value">${member.full_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Phone Number</span>
              <span class="value">${member.phone_number}</span>
            </div>
            ${activeService ? `
            <div class="info-row">
              <span class="label">Zone</span>
              <span class="value">${activeService.zone.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Expires On</span>
              <span class="value">${new Date(activeService.expiry_date).toLocaleDateString('en-GB')}</span>
            </div>
            ` : ''}
            <div class="barcode-container">
              <div class="barcode-label">SCAN BARCODE FOR ACCESS</div>
              <svg id="barcode-svg"></svg>
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            try {
              JsBarcode("#barcode-svg", "${member.barcode}", {
                format: "CODE128",
                width: 2,
                height: 70,
                displayValue: true,
                fontSize: 14,
                margin: 5,
                background: "transparent"
              });
            } catch (error) {
              console.error("Barcode generation error:", error);
            }
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-2" />
          View Card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Member Card</DialogTitle>
        </DialogHeader>
        
        <div id="printable-card">
          <div className="card" style={{ border: '2px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div className="header" style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #e5e7eb' }}>
              <div className="title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                ASATHEER SPORTS ACADEMY
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Membership Card</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span className="label" style={{ color: '#6b7280', fontSize: '13px' }}>Member ID:</span>
                <span className="value" style={{ fontWeight: '600', fontSize: '13px' }}>{member.member_id}</span>
              </div>
              <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span className="label" style={{ color: '#6b7280', fontSize: '13px' }}>Name:</span>
                <span className="value" style={{ fontWeight: '600', fontSize: '13px' }}>{member.full_name}</span>
              </div>
              <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span className="label" style={{ color: '#6b7280', fontSize: '13px' }}>Phone:</span>
                <span className="value" style={{ fontWeight: '600', fontSize: '13px' }}>{member.phone_number}</span>
              </div>
              {activeService && (
                <>
                  <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span className="label" style={{ color: '#6b7280', fontSize: '13px' }}>Zone:</span>
                    <span className="value" style={{ fontWeight: '600', fontSize: '13px', textTransform: 'capitalize' }}>
                      {activeService.zone.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span className="label" style={{ color: '#6b7280', fontSize: '13px' }}>Expires:</span>
                    <span className="value" style={{ fontWeight: '600', fontSize: '13px' }}>
                      {new Date(activeService.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="barcode-container" style={{ marginTop: '20px', textAlign: 'center', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
              <svg ref={barcodeRef}></svg>
            </div>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full" size="lg">
          <Printer className="h-4 w-4 mr-2" />
          Print Card
        </Button>
      </DialogContent>
    </Dialog>
  );
}
