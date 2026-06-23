import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, DollarSign, Users, ArrowRight, Check, Calculator, Briefcase, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Refer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("users");
  const [customQuoteOpen, setCustomQuoteOpen] = useState(false);
  const [customQuoteLoading, setCustomQuoteLoading] = useState(false);
  const [customQuoteForm, setCustomQuoteForm] = useState({
    name: "",
    email: "",
    requestedRate: "",
    reason: ""
  });
  
  const isProfessional = selectedTab === "professionals";
  const commissionRate = isProfessional ? 15 : 10;
  const monthlyFee = 99;
  const monthlyCommission = (monthlyFee * commissionRate / 100).toFixed(2);
  const totalEarnings = (parseFloat(monthlyCommission) * 12).toFixed(2);

  const handleStartReferring = () => {
    if (user) {
      navigate("/refer-business");
    } else {
      navigate("/signin?redirect=/refer-business");
    }
  };

  const handleCustomQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomQuoteLoading(true);
    
    try {
      const { error } = await supabase
        .from("custom_quote_requests")
        .insert({
          name: customQuoteForm.name,
          email: customQuoteForm.email,
          requested_rate: customQuoteForm.requestedRate,
          reason: customQuoteForm.reason,
          user_id: user?.id || null
        });

      if (error) throw error;

      toast.success("Quote request submitted! We'll review and get back to you soon.");
      setCustomQuoteOpen(false);
      setCustomQuoteForm({ name: "", email: "", requestedRate: "", reason: "" });
    } catch (error) {
      console.error("Error submitting quote request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setCustomQuoteLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Helmet>
        <title>Refer a Business | Earn Commission | CoinsBloom</title>
        <meta name="description" content="Know a business that could benefit from CoinsBloom? Refer them and earn 10-15% monthly commission for up to 12 months." />
        <link rel="canonical" href="https://coinsbloom.com/refer" />
      </Helmet>

      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container px-4 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Earn by Referring Businesses
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Know a business that could benefit from CoinsBloom's financial wellness platform? 
              Refer them and earn recurring commission for up to 12 months.
            </p>
            <Button size="lg" onClick={handleStartReferring} className="gap-2">
              Start Referring Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </section>

        {/* Commission Rates Section */}
        <section className="container px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-8">Commission Rates</h2>
          
          <div className="max-w-xl mx-auto">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  CoinsBloom Users
                </TabsTrigger>
                <TabsTrigger value="professionals" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Financial Professionals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle>CoinsBloom Users</CardTitle>
                      </div>
                      <CardDescription>
                        For individual CoinsBloom users who refer businesses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <span className="text-5xl font-bold text-primary">10%</span>
                        <p className="text-muted-foreground mt-2">monthly commission</p>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Earn for 12 months per referral</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>No limit on number of referrals</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Track referral status in your dashboard</span>
                        </li>
                      </ul>
                      
                      {/* Custom Quote Request Link */}
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <button 
                          onClick={() => setCustomQuoteOpen(true)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Need a custom rate? Request a quote
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="professionals">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 border-primary/30 bg-primary/5 relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
                      Higher Rate
                    </div>
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <CardTitle>Financial Professionals</CardTitle>
                      </div>
                      <CardDescription>
                        For registered professionals on our platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <span className="text-5xl font-bold text-primary">15%</span>
                        <p className="text-muted-foreground mt-2">monthly commission</p>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Earn for 12 months per referral</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Higher rate for verified professionals</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Professional dashboard with analytics</span>
                        </li>
                      </ul>
                      
                      {/* Custom Quote Request Link */}
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <button 
                          onClick={() => setCustomQuoteOpen(true)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Need a custom rate? Request a quote
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
            
            {/* Custom Quote Dialog - shared between tabs */}
            <Dialog open={customQuoteOpen} onOpenChange={setCustomQuoteOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Custom Commission Rate</DialogTitle>
                  <DialogDescription>
                    Tell us about your referral potential and we'll consider a custom rate for your situation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCustomQuoteSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote-name">Your Name</Label>
                    <Input
                      id="quote-name"
                      value={customQuoteForm.name}
                      onChange={(e) => setCustomQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-email">Email</Label>
                    <Input
                      id="quote-email"
                      type="email"
                      value={customQuoteForm.email}
                      onChange={(e) => setCustomQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-rate">Requested Rate (%)</Label>
                    <Input
                      id="quote-rate"
                      value={customQuoteForm.requestedRate}
                      onChange={(e) => setCustomQuoteForm(prev => ({ ...prev, requestedRate: e.target.value }))}
                      placeholder="e.g., 20%"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-reason">Why should we consider this rate?</Label>
                    <Textarea
                      id="quote-reason"
                      value={customQuoteForm.reason}
                      onChange={(e) => setCustomQuoteForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Tell us about your network, referral potential, or special circumstances..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setCustomQuoteOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={customQuoteLoading} className="flex-1">
                      {customQuoteLoading ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Earnings Calculator */}
        <section className="container px-4 py-16 bg-card/50">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-6">
              <Calculator className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Example Earnings</h2>
            <p className="text-muted-foreground mb-8">
              See what you could earn by referring a business with 10 employees
            </p>

            <Card className="text-left">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">Partner monthly fee (10 seats)</span>
                    <span className="font-semibold">$99/mo</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">Your commission ({commissionRate}%)</span>
                    <span className="font-semibold text-primary">${monthlyCommission}/mo</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">Commission period</span>
                    <span className="font-semibold">12 months</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">Total potential earnings</span>
                    <span className="text-2xl font-bold text-green-600">${totalEarnings}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  * Based on $29 base + $7/seat. {isProfessional ? "You're earning the professional rate!" : "Professionals earn 15% ($14.85/mo = $178.20 total)."}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="container px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Submit Referral",
                description: "Enter the business name, contact info, and estimated team size"
              },
              {
                step: "2", 
                title: "We Reach Out",
                description: "Our team contacts the business and handles the sales process"
              },
              {
                step: "3",
                title: "Earn Commission",
                description: "Once they sign up, you earn monthly commission for 12 months"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-16">
          <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {user 
                ? "Head to your referral dashboard to submit your first business referral."
                : "Sign in or create an account to start submitting referrals and earning commission."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleStartReferring} className="gap-2">
                <DollarSign className="h-5 w-5" />
                {user ? "Go to Referral Dashboard" : "Sign In to Start"}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/partner/signup" className="gap-2">
                  <Building2 className="h-5 w-5" />
                  Or Become a Partner
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Refer;
