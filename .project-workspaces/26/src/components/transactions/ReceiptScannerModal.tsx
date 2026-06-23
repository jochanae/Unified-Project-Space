import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, X, Check, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReceiptScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Transaction {
  id: string;
  title: string;
  merchant: string | null;
  amount: number;
  category: string;
  transaction_date: string;
  type: string;
}

export function ReceiptScannerModal({ open, onOpenChange }: ReceiptScannerModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch recent transactions
  useEffect(() => {
    if (showTransactionPicker && user) {
      fetchTransactions();
    }
  }, [showTransactionPicker, user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Unable to access camera. Please use upload instead.");
      setMode("upload");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Handle mode changes
  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open, mode]);

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload receipt to storage
  const uploadReceipt = async (transactionId: string) => {
    if (!capturedImage || !user) return;
    
    setUploading(true);
    
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${transactionId}_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update transaction with storage path (private bucket)
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ receipt_url: fileName })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      toast.success("Receipt attached successfully!");
      handleClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setShowTransactionPicker(false);
    setSearchQuery("");
    setMode("camera");
    onOpenChange(false);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => 
    t.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format currency
  const formatAmount = (amount: number, type: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Math.abs(amount));
    
    return type === "expense" ? `-${formatted}` : formatted;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Category icon mapping
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      food: "🍔",
      transportation: "🚗",
      shopping: "🛒",
      entertainment: "🎬",
      utilities: "💡",
      healthcare: "🏥",
      education: "📚",
      other: "📦"
    };
    return icons[category?.toLowerCase()] || "📦";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Receipt Scanner
          </DialogTitle>
        </DialogHeader>

        {!showTransactionPicker ? (
          <div className="flex-1 flex flex-col p-4 pt-0">
            {/* Camera / Upload Toggle */}
            <div className="flex rounded-full bg-muted p-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode("camera");
                  setCapturedImage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
                  mode === "camera"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera className="h-4 w-4" />
                Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("upload");
                  stopCamera();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
                  mode === "upload"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
            </div>

            {/* Tip text */}
            <p className="text-xs text-muted-foreground text-center mb-3">
              For best camera experience on Android, use Chrome browser.
            </p>

            {/* Camera/Image Preview */}
            <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden mb-4">
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured receipt" 
                  className="w-full h-full object-cover"
                />
              ) : mode === "camera" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                </div>
              )}
              
              {/* Clear captured image button */}
              {capturedImage && (
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    if (mode === "camera") startCamera();
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Capture/Continue Button */}
            {capturedImage ? (
              <Button 
                onClick={() => setShowTransactionPicker(true)}
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 text-white font-medium"
              >
                <Check className="h-5 w-5 mr-2" />
                Continue to Select Transaction
              </Button>
            ) : mode === "camera" ? (
              <Button 
                onClick={capturePhoto}
                disabled={!cameraActive}
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 text-white font-medium"
              >
                <Camera className="h-5 w-5 mr-2" />
                📸 Capture Receipt
              </Button>
            ) : (
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 text-white font-medium"
              >
                <Upload className="h-5 w-5 mr-2" />
                Select Receipt Image
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center mt-3">
              Position receipt flat and ensure good lighting for best results
            </p>
          </div>
        ) : (
          /* Transaction Picker */
          <div className="flex-1 flex flex-col p-4 pt-0 min-h-0">
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-lg font-semibold text-center mb-2">Select Transaction</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Pick a transaction to add a receipt to
              </p>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, category, or merchant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-2 border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Transactions List */}
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-2 pb-4">
                {filteredTransactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => uploadReceipt(transaction.id)}
                    disabled={uploading}
                    className="w-full p-4 bg-card rounded-xl border hover:border-primary hover:shadow-md transition-all text-left disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {getCategoryIcon(transaction.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{transaction.title || transaction.merchant || "Untitled"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {transaction.category || "Other"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(transaction.transaction_date)}
                          </span>
                        </div>
                      </div>
                      <span className={`font-semibold ${
                        transaction.type === "expense" ? "text-red-500" : "text-green-500"
                      }`}>
                        {formatAmount(transaction.amount, transaction.type)}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => setShowTransactionPicker(false)}
              className="flex-shrink-0 mt-4"
            >
              Back to Camera
            </Button>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Uploading receipt...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
