import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export const WhatsAppButton = ({ 
  phoneNumber, 
  message, 
  variant = "outline",
  size = "sm",
  className,
  children 
}: WhatsAppButtonProps) => {
  const handleClick = () => {
    // Remove any non-numeric characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Format message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open in new window
    window.open(whatsappUrl, '_blank');
    
    toast.success("Opening WhatsApp...");
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleClick}
      className={cn("gap-2", className)}
    >
      <MessageCircle className="h-4 w-4" />
      {children || "WhatsApp"}
    </Button>
  );
};
