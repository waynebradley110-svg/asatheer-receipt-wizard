import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2 } from "lucide-react";
import JsBarcode from "jsbarcode";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DigitalMemberCardProps {
  memberId: string;
  memberName: string;
  phone: string;
  zone: string;
  expiryDate: string;
  barcode: string;
  paymentAmount?: number;
}

export const DigitalMemberCard = ({
  memberId,
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
    // Generate barcode
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcode, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 0,
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
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
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

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `member-card-${memberId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success("Card downloaded successfully!");
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error("Failed to download card");
    }
  };

  const shareOnWhatsApp = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

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
              text: `Member ID: ${memberId}\nName: ${memberName}`,
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
      console.error('Error sharing card:', error);
      toast.error("Failed to share card");
    }
  };

  return (
    <div className="space-y-4">
      {/* Digital Card - Optimized for phone screens (portrait) */}
      <div 
        ref={cardRef} 
        className="mx-auto bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: '400px', minHeight: '600px' }}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center">
          <h2 className="text-2xl font-bold tracking-wide">ASATHEER SPORTS ACADEMY</h2>
          <p className="text-sm opacity-90 mt-1">Member Digital Card</p>
        </div>

        {/* Member Details */}
        <div className="p-6 space-y-4">
          <div className="bg-background/50 backdrop-blur rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium text-muted-foreground">Member ID</span>
              <span className="text-lg font-bold text-primary">{memberId}</span>
            </div>

            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium text-muted-foreground">Full Name</span>
              <span className="font-semibold">{memberName}</span>
            </div>

            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium text-muted-foreground">Phone</span>
              <span className="font-semibold">{phone}</span>
            </div>

            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium text-muted-foreground">Zone</span>
              <span className="font-semibold">{formatZoneName(zone)}</span>
            </div>

            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium text-muted-foreground">Expires On</span>
              <span className="font-semibold text-destructive">
                {new Date(expiryDate).toLocaleDateString('en-GB')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Amount Paid</span>
              <span className="font-bold text-green-600 text-lg">
                {paymentAmount.toFixed(2)} AED
              </span>
            </div>
          </div>

          {/* Barcode Section - Perfectly Centered */}
          <div className="bg-white p-6 rounded-lg flex flex-col items-center justify-center">
            <svg ref={barcodeRef} className="mx-auto"></svg>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-secondary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Please present this card for gym access
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button onClick={downloadCard} variant="default" size="lg" className="gap-2">
          <Download className="h-5 w-5" />
          Download Card
        </Button>
        <Button onClick={shareOnWhatsApp} variant="outline" size="lg" className="gap-2">
          <Share2 className="h-5 w-5" />
          Share on WhatsApp
        </Button>
      </div>
    </div>
  );
};
