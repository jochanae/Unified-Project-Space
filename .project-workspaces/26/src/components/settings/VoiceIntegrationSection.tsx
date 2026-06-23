import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageSquare, Mic, Smartphone, Phone, Check, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneVerificationModal } from "@/components/dashboard/cards/PhoneVerificationModal";

const BLOOM_SMS_NUMBER_E164 = "+18884119298";
const BLOOM_SMS_NUMBER_DISPLAY = "+1 (888) 411-9298";

export function VoiceIntegrationSection() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPhoneStatus();
    }
  }, [user]);

  const fetchPhoneStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('phone_number, phone_verified')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setPhoneNumber(data.phone_number);
      setIsPhoneVerified(data.phone_verified || false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Voice &amp; Text Commands</h2>
        <p className="text-muted-foreground mt-1">
          The free method is simple: send an SMS to CoinsBloom. Voice assistants help
          only on devices that can send texts.
        </p>
      </header>

      <main className="space-y-6">
        {/* SMS - Primary Method */}
        <section aria-labelledby="sms-logging">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <MessageSquare className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle
                    id="sms-logging"
                    className="text-lg flex items-center gap-2"
                  >
                    SMS Logging
                    <Badge variant="secondary">Free</Badge>
                  </CardTitle>
                  <CardDescription>
                    Save the CoinsBloom number as a contact and text your expense.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg p-4 border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-2">
                  Text your transactions to:
                </p>
                <p className="text-xl font-mono font-semibold">
                  {BLOOM_SMS_NUMBER_DISPLAY}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Example text:
                  <span className="ml-2 font-mono bg-muted px-2 py-1 rounded">
                    Spent $20 on groceries
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Voice works where the assistant can send SMS (usually your phone
                  or watch). Smart speakers without phone/SMS capability may not
                  be able to send the text.
                </p>
              </div>

              {/* Two steps required section with phone linking */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
                <p className="font-medium text-foreground">
                  ⚠️ Two steps required for SMS logging
                </p>
                
                {/* Step 1: Link phone number */}
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Link your phone number</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      So CoinsBloom knows who's texting
                    </p>
                    {isPhoneVerified ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">{phoneNumber}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowPhoneModal(true)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : phoneNumber ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowPhoneModal(true)}
                      >
                        <Phone className="h-3 w-3 mr-2" />
                        Verify Phone
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowPhoneModal(true)}
                      >
                        <Phone className="h-3 w-3 mr-2" />
                        Add Phone Number
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 2: Save contact */}
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                    2
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Save CoinsBloom's number as a contact</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Save <span className="font-mono">{BLOOM_SMS_NUMBER_DISPLAY}</span> as "CoinsBloom" in your phone contacts. This lets your voice assistant know where to text.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Voice Assistant Instructions */}
        <section aria-labelledby="voice-howto">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <Mic className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle id="voice-howto" className="text-lg">
                    How to Use Voice (Free)
                  </CardTitle>
                  <CardDescription>
                    You're not triggering an "integration" — you're just using
                    voice to send the SMS.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="google">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://www.gstatic.com/images/branding/product/2x/assistant_48dp.png"
                        alt="Google Assistant logo"
                        className="h-5 w-5"
                        loading="lazy"
                      />
                      Google Assistant (Android phone)
                      <Badge variant="secondary" className="text-xs">
                        Phone only
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">What works:</p>
                      <p className="text-muted-foreground mt-1">
                        Your Android phone can send SMS, so Google Assistant on
                        your phone can message CoinsBloom.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-foreground">
                        One-time setup:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                        <li>
                          Link your phone number above (Step 1).
                        </li>
                        <li>
                          Save {BLOOM_SMS_NUMBER_DISPLAY} as "CoinsBloom" in your phone contacts.
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="font-medium text-foreground mb-2">
                        Say this:
                      </p>
                      <div className="space-y-2 text-muted-foreground">
                        <p>
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            Hey Google, text CoinsBloom spent 20 dollars on coffee
                          </span>
                        </p>
                        <p className="text-xs">
                          (CoinsBloom is the contact name you saved for
                          {" "}
                          <span className="font-mono">{BLOOM_SMS_NUMBER_E164}</span>
                          .)
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">
                        Why it may not work on Google Home / Nest speakers:
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Those speakers typically don't have SMS capability, and
                        Google's text-messaging features are primarily available
                        on phones/watches.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="alexa">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Amazon_Alexa_App_Logo.png"
                        alt="Amazon Alexa logo"
                        className="h-5 w-5 rounded"
                        loading="lazy"
                      />
                      Alexa / Echo
                      <Badge variant="secondary" className="text-xs">
                        Phone linked
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">How it works:</p>
                      <p className="text-muted-foreground mt-1">
                        Alexa can send a message using your phone/Alexa
                        Communications. If your Echo doesn't offer messaging in
                        your region, you can still do this from the Alexa app on
                        your phone.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-foreground">
                        One-time setup:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                        <li>
                          Link your phone number above (Step 1).
                        </li>
                        <li>
                          Save {BLOOM_SMS_NUMBER_DISPLAY} as "CoinsBloom" in your
                          phone contacts.
                        </li>
                        <li>
                          In the Alexa app, enable calling/messaging (sometimes
                          shown as "Communication").
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="font-medium text-foreground mb-2">Say this:</p>
                      <p className="text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          Alexa, send a message to CoinsBloom: spent 30 dollars on gas
                        </span>
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="siri">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Apple_Siri_iOS_14.svg"
                        alt="Apple Siri logo"
                        className="h-5 w-5"
                        loading="lazy"
                      />
                      Siri (iPhone, Apple Watch)
                      <Badge variant="secondary" className="text-xs">
                        Works
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">What works:</p>
                      <p className="text-muted-foreground mt-1">
                        Siri can text CoinsBloom from iPhone and Apple Watch.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-foreground">
                        One-time setup:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                        <li>
                          Link your phone number above (Step 1).
                        </li>
                        <li>
                          Save {BLOOM_SMS_NUMBER_DISPLAY} as "CoinsBloom" in Contacts.
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="font-medium text-foreground mb-2">Say this:</p>
                      <p className="text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          Hey Siri, text CoinsBloom spent 15 dollars on lunch
                        </span>
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="samsung">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/2/21/Samsung_logo.svg"
                        alt="Samsung logo"
                        className="h-5 w-5"
                        loading="lazy"
                      />
                      Samsung / Galaxy Watch (Wear OS)
                      <Badge variant="secondary" className="text-xs">
                        Works
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">What works:</p>
                      <p className="text-muted-foreground mt-1">
                        Samsung Galaxy Watch and Wear OS watches connected to your phone can send SMS via Google Assistant or Bixby.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-foreground">
                        One-time setup:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                        <li>
                          Link your phone number above (Step 1).
                        </li>
                        <li>
                          Save {BLOOM_SMS_NUMBER_DISPLAY} as "CoinsBloom" in your phone contacts.
                        </li>
                        <li>
                          Make sure your watch is connected to your phone.
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="font-medium text-foreground mb-2">Say this:</p>
                      <div className="space-y-2 text-muted-foreground">
                        <p>
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            Hey Google, text CoinsBloom spent 25 dollars on parking
                          </span>
                        </p>
                        <p className="text-xs">or with Bixby:</p>
                        <p>
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            Hi Bixby, send a text to CoinsBloom spent 25 dollars on parking
                          </span>
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Examples */}
        <section aria-labelledby="examples">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle id="examples" className="text-lg">
                What Message Should I Send?
              </CardTitle>
              <CardDescription>
                Just send the transaction in plain English — no special keywords.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {[
                  "Spent $45 on groceries",
                  "Paid 120 for electric bill",
                  "Got gas for 35 dollars",
                  "Coffee 5 bucks",
                  "Received 500 paycheck",
                  "Dinner with friends $80",
                ].map((example, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono bg-muted px-2 py-1 rounded">
                      {example}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        open={showPhoneModal}
        onOpenChange={setShowPhoneModal}
        currentPhone={phoneNumber}
        isVerified={isPhoneVerified}
        onVerified={() => {
          setShowPhoneModal(false);
          fetchPhoneStatus();
        }}
      />
    </div>
  );
}
