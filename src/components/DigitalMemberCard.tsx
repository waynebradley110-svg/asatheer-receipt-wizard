import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, Zap } from "lucide-react";
import JsBarcode from "jsbarcode";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DigitalMemberCardProps {
  memberId: string;
  memberUuid: string; // The actual UUID id from the members table
  memberName: string;
  phone: string;
  zone: string;
  expiryDate: string;
  barcode: string;
  paymentAmount?: number;
}

export const DigitalMemberCard = ({
  memberId,
  memberUuid,
  memberName,
  phone,
  zone,
  expiryDate,
  barcode,
  paymentAmount: initialAmount
}: DigitalMemberCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(initialAmount || 0);

  useEffect(() => {
    // Generate barcode for preview card
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcode, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 5,
        fontOptions: "bold",
      });
    }

    // Fetch payment amount if not provided
    if (!initialAmount) {
      fetchPaymentAmount();
    }
  }, [barcode, initialAmount]);

  const fetchPaymentAmount = async () => {
    try {
      const { data } = await supabase
        .from('payment_receipts')
        .select('amount')
        .eq('member_id', memberUuid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setPaymentAmount(Number(data.amount));
      }
    } catch (error) {
      console.error('Error fetching payment amount:', error);
    }
  };

  const formatZoneName = (zoneValue: string) => {
    const zoneMap: { [key: string]: string } = {
      gym: "Gym",
      ladies_gym: "Ladies Gym",
      pt: "Personal Training",
      crossfit: "CrossFit",
      football_court: "Football Court",
      football_student: "Football Student Zone",
      swimming: "Swimming",
      paddle_court: "Paddle Court",
    };
    return zoneMap[zoneValue] || zoneValue;
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;

    const loadingToast = toast.loading("Generating card...");

    try {
      // Get the download card element
      const downloadCard = document.getElementById('download-card');
      
      if (!downloadCard) {
        throw new Error("Download card element not found");
      }

      // Get the barcode container in the download card
      const downloadBarcodeContainer = downloadCard.querySelector('.barcode-container');
      
      if (!downloadBarcodeContainer) {
        throw new Error("Barcode container not found");
      }

      // Clear any existing SVG
      downloadBarcodeContainer.innerHTML = '';
      
      // Create a new SVG for the barcode
      const barcodeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      downloadBarcodeContainer.appendChild(barcodeSvg);
      
      // Generate barcode at full size
      JsBarcode(barcodeSvg, barcode, {
        format: "CODE128",
        width: 4,
        height: 120,
        displayValue: true,
        fontSize: 32,
        margin: 10,
        fontOptions: "bold",
      });

      // Wait longer for DOM to fully render the barcode
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(downloadCard, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 1080,
        height: 1350,
        windowWidth: 1080,
        windowHeight: 1350,
      });

      toast.dismiss(loadingToast);
      
      // Verify canvas has content
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      
      const link = document.createElement('a');
      link.download = `member-card-${memberId}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast.success("Card downloaded successfully!");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error downloading card:', error);
      toast.error(`Failed to download card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const shareOnWhatsApp = async () => {
    if (!cardRef.current) return;

    const loadingToast = toast.loading("Generating card for sharing...");

    try {
      // Get the download card element
      const downloadCard = document.getElementById('download-card');
      
      if (!downloadCard) {
        throw new Error("Download card element not found");
      }

      // Get the barcode container in the download card
      const downloadBarcodeContainer = downloadCard.querySelector('.barcode-container');
      
      if (!downloadBarcodeContainer) {
        throw new Error("Barcode container not found");
      }

      // Clear any existing SVG
      downloadBarcodeContainer.innerHTML = '';
      
      // Create a new SVG for the barcode
      const barcodeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      downloadBarcodeContainer.appendChild(barcodeSvg);
      
      // Generate barcode at full size
      JsBarcode(barcodeSvg, barcode, {
        format: "CODE128",
        width: 4,
        height: 120,
        displayValue: true,
        fontSize: 32,
        margin: 10,
        fontOptions: "bold",
      });

      // Wait longer for DOM to fully render the barcode
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(downloadCard, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 1080,
        height: 1350,
        windowWidth: 1080,
        windowHeight: 1350,
      });

      toast.dismiss(loadingToast);

      // WhatsApp message template
      const whatsappMessage = `Hello ${memberName}, here is your Asatheer membership card. Member ID: ${memberId}. Amount paid: AED ${paymentAmount.toFixed(2)}. Expires: ${new Date(expiryDate).toLocaleDateString('en-GB')}. Present this on arrival. ⚡️`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }

        const file = new File([blob], `member-card-${memberId}.png`, { type: 'image/png' });

        // Check if Web Share API is available (mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Asatheer Sports Academy Member Card',
              text: whatsappMessage,
            });
            toast.success("Shared successfully!");
          } catch (shareError) {
            if ((shareError as Error).name !== 'AbortError') {
              console.error('Share error:', shareError);
              toast.error("Failed to share");
            }
          }
        } else {
          // Fallback: Download and show WhatsApp web instructions
          const link = document.createElement('a');
          link.download = `member-card-${memberId}.png`;
          link.href = URL.createObjectURL(blob);
          link.click();
          
          toast.info("Card downloaded! Please share it manually on WhatsApp");
        }
      }, 'image/png');
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error sharing card:', error);
      toast.error(`Failed to share card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Action Buttons - Moved to top for better visibility */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={downloadCard} variant="default" size="default" className="gap-2">
          <Download className="h-4 w-4" />
          Download Card
        </Button>
        <Button onClick={shareOnWhatsApp} variant="outline" size="default" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share on WhatsApp
        </Button>
      </div>

      {/* Card Preview - Scaled down for viewing, but full size for download */}
      <div className="overflow-x-auto">
        <div 
          ref={cardRef} 
          className="mx-auto bg-white rounded-lg shadow-xl overflow-hidden border border-primary/20"
          style={{ 
            width: '360px', 
            height: '450px',
            transformOrigin: 'top center'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-3 text-center relative">
            <div className="absolute top-2 left-2">
              <Zap className="h-3 w-3 text-yellow-300 fill-yellow-300" />
            </div>
            <h1 className="text-sm font-bold tracking-wide mb-1">ASATHEER SPORTS ACADEMY</h1>
            <p className="text-[10px] opacity-90 font-medium">MEMBER IDENTIFICATION CARD</p>
          </div>

          {/* Member Details */}
          <div className="p-3 space-y-2">
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 border border-border">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-muted-foreground min-w-[85px]">Member ID:</span>
                <span className="font-bold text-primary">{memberId}</span>
              </div>

              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-muted-foreground min-w-[85px]">Full Name:</span>
                <span className="font-semibold text-foreground">{memberName}</span>
              </div>

              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-muted-foreground min-w-[85px]">Phone Number:</span>
                <span className="font-semibold text-foreground">{phone}</span>
              </div>

              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-muted-foreground min-w-[85px]">Zone:</span>
                <span className="font-semibold text-foreground">{formatZoneName(zone)}</span>
              </div>

              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-muted-foreground min-w-[85px]">Expires On:</span>
                <span className="font-semibold text-destructive">
                  {new Date(expiryDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2.5 border border-green-200 dark:border-green-800">
              <div className="text-center space-y-0.5">
                <div className="text-[10px] font-semibold text-muted-foreground">Amount Paid</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-500">AED {paymentAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Barcode Section */}
            <div className="bg-white dark:bg-background p-2 rounded-lg flex flex-col items-center justify-center border border-border">
              <svg 
                ref={barcodeRef} 
                className="w-full"
                style={{ maxHeight: '80px' }}
              ></svg>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted/30 p-2 text-center border-t border-border">
            <p className="text-[10px] text-muted-foreground font-medium">
              Please present this card for access
            </p>
          </div>
        </div>
      </div>

      {/* Hidden full-size card for download (1080×1350px) - positioned off-screen for proper rendering */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0', pointerEvents: 'none' }}>
        <div 
          id="download-card"
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{ width: '1080px', height: '1350px', border: '6px solid #3b82f6' }}
        >
          {/* Header - Solid color instead of gradient */}
          <div className="text-white p-12 text-center relative" style={{ backgroundColor: '#2563eb' }}>
            <div className="absolute top-8 left-8">
              <Zap className="h-12 w-12 text-yellow-300 fill-yellow-300" />
            </div>
            <h1 className="text-5xl font-bold tracking-wide mb-3">ASATHEER SPORTS ACADEMY</h1>
            <p className="text-xl opacity-90 font-medium">MEMBER IDENTIFICATION CARD</p>
          </div>

          {/* Member Details Section */}
          <div className="p-12 space-y-8">
            <div className="rounded-2xl p-10 space-y-6" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="grid grid-cols-1 gap-5">
                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold min-w-[280px]" style={{ color: '#374151' }}>Member ID:</span>
                  <span className="text-3xl font-bold" style={{ color: '#2563eb' }}>{memberId}</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold min-w-[280px]" style={{ color: '#374151' }}>Full Name:</span>
                  <span className="text-3xl font-semibold" style={{ color: '#111827' }}>{memberName}</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold min-w-[280px]" style={{ color: '#374151' }}>Phone Number:</span>
                  <span className="text-3xl font-semibold" style={{ color: '#111827' }}>{phone}</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold min-w-[280px]" style={{ color: '#374151' }}>Zone:</span>
                  <span className="text-3xl font-semibold" style={{ color: '#111827' }}>{formatZoneName(zone)}</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold min-w-[280px]" style={{ color: '#374151' }}>Expires On:</span>
                  <span className="text-3xl font-semibold" style={{ color: '#dc2626' }}>
                    {new Date(expiryDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Section - Solid color */}
            <div className="rounded-2xl p-10" style={{ backgroundColor: '#d1fae5', border: '2px solid #86efac' }}>
              <div className="text-center space-y-3">
                <div className="text-2xl font-semibold" style={{ color: '#374151' }}>Amount Paid</div>
                <div className="text-6xl font-bold" style={{ color: '#16a34a' }}>AED {paymentAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Barcode Section */}
            <div className="bg-white p-10 rounded-2xl flex flex-col items-center justify-center barcode-container" style={{ border: '2px solid #d1d5db', minHeight: '180px' }}>
              {/* Barcode will be generated here during download */}
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 text-center" style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #d1d5db' }}>
            <p className="text-2xl font-medium" style={{ color: '#4b5563' }}>
              Please present this card for access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
