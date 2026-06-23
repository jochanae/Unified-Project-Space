import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  title: string;
  specialty: string;
  bio: string;
  avatar_url: string | null;
  website_url: string | null;
  years_experience: number | null;
  certifications: string | null;
  linkedin_url: string | null;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

const specialtyLabels: Record<string, string> = {
  financial_advisor: "Financial Advisor",
  tax_professional: "Tax Professional",
  credit_counselor: "Credit Counselor",
  debt_specialist: "Debt Specialist",
  investment_advisor: "Investment Advisor",
  insurance_agent: "Insurance Agent",
  real_estate: "Real Estate Agent",
  estate_planning: "Estate Planning",
};

export const ProfessionalApplicationsManager = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from("professional_applications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp || !user) return;
    setProcessing(true);

    try {
      // Create professional from application
      const { error: createError } = await supabase
        .from("professionals")
        .insert({
          name: selectedApp.full_name,
          contact_email: selectedApp.email,
          title: selectedApp.title,
          specialty: selectedApp.specialty,
          bio: selectedApp.bio,
          avatar_url: selectedApp.avatar_url,
          website_url: selectedApp.website_url,
          is_active: true,
          is_verified: false,
          is_featured: false,
          rating: 0,
          review_count: 0,
        });

      if (createError) throw createError;

      // Update application status
      const { error: updateError } = await supabase
        .from("professional_applications")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedApp.id);

      if (updateError) throw updateError;

      toast.success(`${selectedApp.full_name} has been approved and added as a professional!`);
      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast.error(error.message || "Failed to approve application");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedApp || !user) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("professional_applications")
        .update({
          status: "denied",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      toast.success("Application denied");
      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      console.error("Error denying application:", error);
      toast.error(error.message || "Failed to deny application");
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter(
    (app) =>
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "denied", "all"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredApplications.length} application{filteredApplications.length !== 1 ? "s" : ""} found
      </div>

      <div className="grid gap-4">
        {filteredApplications.map((app) => (
          <Card
            key={app.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              setSelectedApp(app);
              setAdminNotes(app.admin_notes || "");
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={app.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                    {app.full_name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{app.full_name}</h3>
                    {getStatusBadge(app.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{app.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {specialtyLabels[app.specialty] || app.specialty}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {format(new Date(app.submitted_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredApplications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No applications found
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>Application Details</DialogTitle>
                <DialogDescription>
                  Review and take action on this professional application
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Applicant Info */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedApp.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xl">
                      {selectedApp.full_name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{selectedApp.full_name}</h3>
                      {getStatusBadge(selectedApp.status)}
                    </div>
                    <p className="text-muted-foreground">{selectedApp.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {specialtyLabels[selectedApp.specialty] || selectedApp.specialty}
                    </p>
                    {selectedApp.years_experience && (
                      <p className="text-sm text-muted-foreground">
                        {selectedApp.years_experience} years experience
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4">
                  <a
                    href={`mailto:${selectedApp.email}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {selectedApp.email}
                  </a>
                  {selectedApp.phone && (
                    <a
                      href={`tel:${selectedApp.phone}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {selectedApp.phone}
                    </a>
                  )}
                  {selectedApp.website_url && (
                    <a
                      href={selectedApp.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedApp.linkedin_url && (
                    <a
                      href={selectedApp.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <h4 className="font-medium mb-2">Professional Bio</h4>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {selectedApp.bio}
                  </p>
                </div>

                {/* Certifications */}
                {selectedApp.certifications && (
                  <div>
                    <h4 className="font-medium mb-2">Certifications & Licenses</h4>
                    <p className="text-muted-foreground text-sm">
                      {selectedApp.certifications}
                    </p>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedApp.status === "pending" && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes (optional)</h4>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this application..."
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                {/* Existing Admin Notes Display */}
                {selectedApp.status !== "pending" && selectedApp.admin_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <p className="text-muted-foreground text-sm bg-muted p-3 rounded-lg">
                      {selectedApp.admin_notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedApp.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleDeny}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Deny
                    </Button>
                    <Button
                      onClick={handleApprove}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
