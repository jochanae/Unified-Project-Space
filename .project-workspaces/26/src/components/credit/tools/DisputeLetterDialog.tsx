import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Check, ChevronRight, Download, Loader2, Share2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useStreamAI } from "./useStreamAI";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DISPUTE_TYPES = [
  { value: "incorrect_balance", label: "Incorrect Balance" },
  { value: "account_not_mine", label: "Account Not Mine" },
  { value: "late_payment_error", label: "Incorrect Late Payment" },
  { value: "duplicate_account", label: "Duplicate Account" },
  { value: "identity_theft", label: "Identity Theft / Fraud" },
  { value: "closed_account_showing_open", label: "Closed Account Showing Open" },
  { value: "incorrect_personal_info", label: "Incorrect Personal Information" },
  { value: "paid_debt_still_showing", label: "Paid Debt Still Showing" },
  { value: "other", label: "Other" },
];

const BUREAUS = [
  { value: "equifax", label: "Equifax", address: "P.O. Box 740256, Atlanta, GA 30374" },
  { value: "experian", label: "Experian", address: "P.O. Box 4500, Allen, TX 75013" },
  { value: "transunion", label: "TransUnion", address: "P.O. Box 2000, Chester, PA 19016" },
];

const TEMPLATES = [
  {
    id: "general",
    title: "General Dispute Letter",
    description: "Standard dispute letter for any credit report error",
  },
  {
    id: "identity_theft",
    title: "Identity Theft Dispute",
    description: "For accounts opened fraudulently in your name",
  },
  {
    id: "late_payment",
    title: "Late Payment Removal Request",
    description: "Request removal of incorrectly reported late payments",
  },
];

interface LetterInfo {
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ssnLast4: string;
  bureau: string;
  accountName: string;
  accountNumber: string;
  disputeReason: string;
}

function buildLetter(templateId: string, info: LetterInfo): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const bureau = BUREAUS.find(b => b.value === info.bureau);
  const bureauName = bureau?.label || info.bureau;
  const bureauAddress = bureau?.address || "";

  const header = `${info.fullName}
${info.address}
${info.city}, ${info.state} ${info.zip}
${today}

${bureauName}
${bureauAddress}`;

  if (templateId === "general") {
    return `${header}

Re: Dispute of Inaccurate Information

Dear Sir/Madam,

I am writing to dispute the following information in my credit report. The items I am disputing are also circled on the attached copy of the report.

Account Name: ${info.accountName}
Account Number: ${info.accountNumber}
Reason for Dispute: ${info.disputeReason}

Under the Fair Credit Reporting Act (FCRA), Section 611, you are required to investigate this dispute within 30 days and correct any inaccurate information.

I am requesting that you investigate this item and correct it as soon as possible.

Please send me an updated copy of my credit report after the investigation is complete.

Sincerely,
${info.fullName}
SSN (last 4 digits): ${info.ssnLast4}

Enclosures: [List supporting documents]`;
  }

  if (templateId === "identity_theft") {
    return `${header}

Re: Identity Theft - Request to Block Fraudulent Information

Dear Sir/Madam,

I am a victim of identity theft. I am writing to request that you block the following fraudulent information from my credit report pursuant to Section 605B of the Fair Credit Reporting Act.

Fraudulent Account: ${info.accountName}
Account Number: ${info.accountNumber}

I did not open this account, and I did not authorize anyone to open this account on my behalf. I have filed an identity theft report with the FTC and a police report.

${info.disputeReason ? `Additional details: ${info.disputeReason}` : ""}

Enclosed are copies of:
- FTC Identity Theft Report
- Police report
- Copy of my government-issued ID
- Proof of address

Please block this information within 4 business days as required by law.

Sincerely,
${info.fullName}
SSN (last 4 digits): ${info.ssnLast4}`;
  }

  // late_payment
  return `${header}

Re: Goodwill Request for Late Payment Removal

Dear ${bureauName},

I am writing regarding my account ${info.accountName} (#${info.accountNumber}). I have been a loyal customer and have maintained a strong payment history.

${info.disputeReason || "A payment was reported as late due to circumstances beyond my control."}

Since then, I have taken corrective actions to ensure timely payments going forward, including setting up automatic payments.

I respectfully request that you consider removing this late payment notation from my credit report as a goodwill gesture. This single mark is significantly impacting my credit score.

Thank you for your time and consideration.

Sincerely,
${info.fullName}
SSN (last 4 digits): ${info.ssnLast4}`;
}

export function DisputeLetterDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<"templates" | "form" | "editor" | "guidance">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [disputeType, setDisputeType] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const { response, isLoading, error, generate } = useStreamAI();

  // Form state
  const [info, setInfo] = useState<LetterInfo>({
    fullName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    ssnLast4: "",
    bureau: "",
    accountName: "",
    accountNumber: "",
    disputeReason: "",
  });

  // Auto-fill from profile
  useEffect(() => {
    if (open && user) {
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
            if (name) {
              setInfo(prev => ({ ...prev, fullName: name }));
            }
          }
        });
    }
  }, [open, user]);

  const updateInfo = (field: keyof LetterInfo, value: string) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setView("form");
  };

  const handleGenerateLetter = () => {
    if (!selectedTemplate) return;
    const letter = buildLetter(selectedTemplate.id, info);
    setEditedContent(letter);
    setView("editor");
  };

  const isFormValid = info.fullName.trim() && info.address.trim() && info.city.trim() && info.state.trim() && info.zip.trim() && info.bureau;

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    toast.success("Letter copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 6;
    let y = margin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(editedContent, pageWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    const filename = selectedTemplate
      ? `${selectedTemplate.id}-dispute-letter.pdf`
      : "dispute-letter.pdf";
    doc.save(filename);
    toast.success("Letter downloaded as PDF");
  };

  const generatePDFBlob = (): Blob => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 6;
    let y = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(editedContent, pageWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    return doc.output("blob");
  };

  const handleShare = async () => {
    const filename = selectedTemplate
      ? `${selectedTemplate.id}-dispute-letter.pdf`
      : "dispute-letter.pdf";

    // Try sharing as a PDF file first (supported on most mobile devices)
    if (navigator.share) {
      try {
        const blob = generatePDFBlob();
        const file = new File([blob], filename, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Dispute Letter",
            text: "Credit report dispute letter",
            files: [file],
          });
          return;
        }

        // Fallback: share as text if file sharing isn't supported
        await navigator.share({
          title: "Dispute Letter",
          text: editedContent,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Sharing failed. Try copying or downloading instead.");
        }
      }
    } else {
      // No Web Share API — fall back to copy
      handleCopy();
      toast.info("Share not supported on this device — letter copied to clipboard instead.");
    }
  };

  const handleGetGuidance = async () => {
    setView("guidance");
    await generate("dispute-guidance", {
      issue_type: disputeType,
      details: disputeDetails,
    });
  };

  const handleClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setView("templates");
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dispute Letter Templates
          </DialogTitle>
        </DialogHeader>

        {view === "templates" && (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* AI Guidance Section */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <h3 className="font-semibold text-sm">Need help? Get AI dispute guidance</h3>
                <div className="space-y-2">
                  <Select value={disputeType} onValueChange={setDisputeType}>
                    <SelectTrigger><SelectValue placeholder="Select dispute type" /></SelectTrigger>
                    <SelectContent>
                      {DISPUTE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Describe the issue briefly..."
                    value={disputeDetails}
                    onChange={e => setDisputeDetails(e.target.value)}
                    rows={2}
                  />
                  <Button size="sm" onClick={handleGetGuidance} disabled={!disputeType} className="w-full">
                    Get AI Guidance
                  </Button>
                </div>
              </div>

              {/* Templates */}
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/30 transition-all"
                  onClick={() => handleSelectTemplate(t)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{t.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {view === "form" && selectedTemplate && (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <p className="text-xs text-muted-foreground">
                Fill in your details below. Your name was auto-filled from your profile.
              </p>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Your Information</h3>
                <div>
                  <Label htmlFor="fullName" className="text-xs">Full Name *</Label>
                  <Input id="fullName" value={info.fullName} onChange={e => updateInfo("fullName", e.target.value)} placeholder="John Doe" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="address" className="text-xs">Street Address *</Label>
                  <Input id="address" value={info.address} onChange={e => updateInfo("address", e.target.value)} placeholder="123 Main St" maxLength={200} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="city" className="text-xs">City *</Label>
                    <Input id="city" value={info.city} onChange={e => updateInfo("city", e.target.value)} placeholder="Atlanta" maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs">State *</Label>
                    <Input id="state" value={info.state} onChange={e => updateInfo("state", e.target.value)} placeholder="GA" maxLength={2} />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-xs">ZIP *</Label>
                    <Input id="zip" value={info.zip} onChange={e => updateInfo("zip", e.target.value)} placeholder="30301" maxLength={10} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ssnLast4" className="text-xs">SSN (last 4 digits)</Label>
                  <Input id="ssnLast4" value={info.ssnLast4} onChange={e => updateInfo("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="XXXX" maxLength={4} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Dispute Details</h3>
                <div>
                  <Label className="text-xs">Credit Bureau *</Label>
                  <Select value={info.bureau} onValueChange={v => updateInfo("bureau", v)}>
                    <SelectTrigger><SelectValue placeholder="Select bureau" /></SelectTrigger>
                    <SelectContent>
                      {BUREAUS.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountName" className="text-xs">Account / Creditor Name</Label>
                  <Input id="accountName" value={info.accountName} onChange={e => updateInfo("accountName", e.target.value)} placeholder="e.g. Chase Visa" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="accountNumber" className="text-xs">Account Number</Label>
                  <Input id="accountNumber" value={info.accountNumber} onChange={e => updateInfo("accountNumber", e.target.value)} placeholder="e.g. XXXX-XXXX-1234" maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="disputeReason" className="text-xs">Reason / Details</Label>
                  <Textarea id="disputeReason" value={info.disputeReason} onChange={e => updateInfo("disputeReason", e.target.value)} placeholder="Describe the error or reason for the dispute..." rows={3} maxLength={500} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setView("templates")} className="flex-1">Back</Button>
                <Button onClick={handleGenerateLetter} disabled={!isFormValid} className="flex-1">Generate Letter</Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {view === "editor" && selectedTemplate && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <p className="text-xs text-muted-foreground">
              Review and edit your letter, then copy, download, or share.
            </p>
            <Textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              className="flex-1 min-h-[300px] font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setView("form")} className="gap-2">
                Back
              </Button>
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        )}

        {view === "guidance" && (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="pr-4">
              {isLoading && !response && (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your dispute...
                </div>
              )}
              {error && (
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">{error}</div>
              )}
              {response && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              )}
              {isLoading && response && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />}
              {!isLoading && (
                <Button variant="outline" onClick={() => setView("templates")} className="mt-4 w-full">
                  Back to Templates
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
