import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Building2, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Message sent! We'll get back to you soon.");
    (e.target as HTMLFormElement).reset();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Helmet>
        <title>Contact Us | CoinsBloom</title>
        <meta name="description" content="Get in touch with the CoinsBloom team. We're here to help with questions, support, and partnership inquiries." />
      </Helmet>

      <Navbar />
      
      <main className="flex-grow container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have a question or need help? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Contact Form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Send a Message
              </CardTitle>
              <CardDescription>
                Fill out the form and we'll get back to you within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Name</label>
                    <Input placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input type="email" placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject</label>
                  <Input placeholder="How can we help?" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <Textarea 
                    placeholder="Tell us more about your question or feedback..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  For general inquiries and support:
                </p>
                <a href="mailto:support@coinsbloom.com" className="text-primary hover:underline">
                  support@coinsbloom.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Business Partnerships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  Interested in becoming a partner or have B2B inquiries?
                </p>
                <a href="mailto:partners@coinsbloom.com" className="text-primary hover:underline">
                  partners@coinsbloom.com
                </a>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Looking for Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check out our Help Center for FAQs, tutorials, and guides.
                </p>
                <Button variant="outline" asChild>
                  <a href="/help-center">Visit Help Center</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}