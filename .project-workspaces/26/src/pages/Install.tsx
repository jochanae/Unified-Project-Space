import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Check, 
  ArrowLeft, 
  Share, 
  Plus,
  Monitor,
  Apple,
  Sparkles
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Install CoinsBloom App | PWA</title>
        <meta name="description" content="Install CoinsBloom on your device for the best experience. Works offline, loads instantly, and feels like a native app." />
      </Helmet>

      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Install CoinsBloom</h1>
          <p className="text-lg text-muted-foreground">
            Get the full app experience on your device. Works offline and loads instantly!
          </p>
        </div>

        {isInstalled ? (
          <Card className="max-w-md mx-auto bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-green-700 dark:text-green-400">Already Installed!</h2>
              <p className="text-green-600 dark:text-green-500 mb-4">
                CoinsBloom is installed on your device. Open it from your home screen for the best experience.
              </p>
              <Button onClick={() => navigate("/dashboard")} className="bg-green-600 hover:bg-green-700">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Direct Install Button (when available) */}
            {deferredPrompt && (
              <Card className="max-w-md mx-auto bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-8 text-center">
                  <Download className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Install Now</h2>
                  <p className="text-muted-foreground mb-6">
                    Add CoinsBloom to your home screen with one tap
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleInstall}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Install App
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* All Platform Instructions */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold text-center mb-6">Choose Your Device</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* iOS Instructions */}
                <Card className={`${isIOS ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Apple className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold">iPhone / iPad</h3>
                        <p className="text-xs text-muted-foreground">Safari Browser</p>
                      </div>
                    </div>
                    {isIOS && (
                      <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mb-3">Your device</span>
                    )}
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="font-medium">Open in Safari</p>
                          <p className="text-xs text-muted-foreground">Visit coinsbloom.com</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="font-medium">Tap Share button</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Share className="h-3 w-3" /> Bottom of Safari
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="font-medium">"Add to Home Screen"</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Scroll to find it
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                        <p className="font-medium">Tap "Add" to confirm</p>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Android Instructions */}
                <Card className={`${isAndroid ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">Android</h3>
                        <p className="text-xs text-muted-foreground">Chrome Browser</p>
                      </div>
                    </div>
                    {isAndroid && (
                      <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mb-3">Your device</span>
                    )}
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="font-medium">Open in Chrome</p>
                          <p className="text-xs text-muted-foreground">Visit coinsbloom.com</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="font-medium">Tap menu (⋮)</p>
                          <p className="text-xs text-muted-foreground">Top-right in Chrome</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="font-medium">"Install app"</p>
                          <p className="text-xs text-muted-foreground">Or "Add to Home Screen"</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                        <p className="font-medium">Tap "Install"</p>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Desktop Instructions */}
                <Card className={`${!isIOS && !isAndroid ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Monitor className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">Desktop</h3>
                        <p className="text-xs text-muted-foreground">Chrome, Edge, Brave</p>
                      </div>
                    </div>
                    {!isIOS && !isAndroid && (
                      <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mb-3">Your device</span>
                    )}
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="font-medium">Open in browser</p>
                          <p className="text-xs text-muted-foreground">Visit coinsbloom.com</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="font-medium">Look in address bar</p>
                          <p className="text-xs text-muted-foreground">Install icon on right</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="font-medium">Click install icon</p>
                          <p className="text-xs text-muted-foreground">Or use browser menu</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                        <p className="font-medium">Confirm to install</p>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Works Offline</h3>
                  <p className="text-sm text-muted-foreground">Access your finances even without internet</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Instant Loading</h3>
                  <p className="text-sm text-muted-foreground">Lightning-fast performance every time</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Native Feel</h3>
                  <p className="text-sm text-muted-foreground">Full-screen app experience</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Install;
