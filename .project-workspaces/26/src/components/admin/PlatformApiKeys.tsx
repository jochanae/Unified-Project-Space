import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PlatformApiKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const { data } = await supabase.from("platform_api_keys").select("*").order("service_name");
    if (data) setKeys(data);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium text-white">API Integrations</h3>
        <Button className="gap-2"><Key className="h-4 w-4" /> Add API Key</Button>
      </div>
      
      {/* Common integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: "Plaid", desc: "Bank account linking", configured: true },
          { name: "OpenAI", desc: "AI-powered features", configured: true },
          { name: "Resend", desc: "Email notifications", configured: true },
          { name: "Stripe", desc: "Payment processing", configured: false },
        ].map((integration) => (
          <Card key={integration.name} className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Key className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">{integration.name}</h3>
                <p className="text-white/60 text-sm">{integration.desc}</p>
              </div>
              {integration.configured ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 gap-1">
                  <CheckCircle className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 gap-1">
                  <XCircle className="h-3 w-3" /> Not Set
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom keys from database */}
      {keys.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white/60 text-sm">Custom API Keys</h4>
          {keys.map((key) => (
            <Card key={key.id} className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex items-center gap-3">
                <Key className="h-4 w-4 text-white/40" />
                <span className="text-white flex-1">{key.service_name}</span>
                {key.is_configured ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-400" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
