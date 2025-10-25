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
    // Generate barcode with larger dimensions for WhatsApp
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcode, {
        format: "CODE128",
        width: 4,
        height: 120,
        displayValue: true,
        fontSize: 32,
        margin: 10,
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
        scale: 3,
        logging: false,
        useCORS: true,
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
        scale: 3,
        logging: false,
        useCORS: true,
      });

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
      console.error('Error sharing card:', error);
      toast.error("Failed to share card");
    }
  };

  return (
    <div className="space-y-4">
      {/* Digital Card - Optimized for WhatsApp (1080×1350px) */}
      <div 
        ref={cardRef} 
        className="mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-500"
        style={{ width: '1080px', height: '1350px' }}
      >
        {/* Header with Bolt Icon */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-12 text-center relative">
          <div className="absolute top-8 left-8">
            <Zap className="h-12 w-12 text-yellow-300 fill-yellow-300" />
          </div>
          <h1 className="text-5xl font-bold tracking-wide mb-3">ASATHEER SPORTS ACADEMY</h1>
          <p className="text-xl text-blue-100 font-medium">MEMBER IDENTIFICATION CARD</p>
        </div>

        {/* Member Details Section */}
        <div className="p-12 space-y-8">
          <div className="bg-gray-50 rounded-2xl p-10 space-y-6 border border-gray-200">
            <div className="grid grid-cols-1 gap-5">
              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-700 min-w-[280px]">Member ID:</span>
                <span className="text-3xl font-bold text-blue-600">{memberId}</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-700 min-w-[280px]">Full Name:</span>
                <span className="text-3xl font-semibold text-gray-900">{memberName}</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-700 min-w-[280px]">Phone Number:</span>
                <span className="text-3xl font-semibold text-gray-900">{phone}</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-700 min-w-[280px]">Zone:</span>
                <span className="text-3xl font-semibold text-gray-900">{formatZoneName(zone)}</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-gray-700 min-w-[280px]">Expires On:</span>
                <span className="text-3xl font-semibold text-red-600">
                  {new Date(expiryDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-10 border-2 border-green-200">
            <div className="text-center space-y-3">
              <div className="text-2xl font-semibold text-gray-700">Amount Paid</div>
              <div className="text-6xl font-bold text-green-600">AED {paymentAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Barcode Section - Centered and Prominent */}
          <div className="bg-white p-10 rounded-2xl flex flex-col items-center justify-center border-2 border-gray-300">
            <svg 
              ref={barcodeRef} 
              className="mx-auto" 
              style={{ width: '70%', maxWidth: '756px' }}
            ></svg>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-8 text-center border-t-2 border-gray-300">
          <p className="text-2xl text-gray-600 font-medium">
            Please present this card for access
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
