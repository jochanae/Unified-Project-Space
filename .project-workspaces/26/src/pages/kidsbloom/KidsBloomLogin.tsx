import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, AtSign, HelpCircle, ArrowLeft, Check, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";
import { useKidsSession } from "@/hooks/useKidsSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type LoginStep = "username" | "password";
type ResetStep = "question" | "success";

const SECURITY_QUESTIONS_PLAYFUL: Record<string, string> = {
  pet: "🐾 What's your pet's name?",
  color: "🌈 What's your favorite color?",
  food: "🍕 What's your favorite food?",
  superhero: "🦸 Who's your favorite superhero?",
  place: "🏖️ What's your favorite place?",
};

const SECURITY_QUESTIONS_MODERN: Record<string, string> = {
  pet: "What is your pet's name?",
  color: "What is your favorite color?",
  food: "What is your favorite food?",
  superhero: "Who is your favorite superhero?",
  place: "What is your favorite place?",
};

export default function KidsBloomLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: sessionLoading } = useKidsSession();
  const [step, setStep] = useState<LoginStep>("username");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [kidProfile, setKidProfile] = useState<any>(null);
  
  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("question");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate("/kidsbloom/dashboard");
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  // Determine variant based on profile age tier
  const isPlayful = !kidProfile || kidProfile.age_tier === "under_10";
  const securityQuestions = isPlayful ? SECURITY_QUESTIONS_PLAYFUL : SECURITY_QUESTIONS_MODERN;

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      toast.error("Please enter your username");
      return;
    }

    setIsLoading(true);
    try {
      // Use secure backend function for username lookup
      const { data, error } = await supabase.functions.invoke('kids-auth', {
        body: {
          action: 'lookup',
          username: username.trim(),
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.exists) {
        if (data?.error?.includes("Too many attempts")) {
          toast.error(data.error);
        } else {
          toast.error(isPlayful ? "We couldn't find that username. Check your spelling!" : "Username not found");
        }
        setIsLoading(false);
        return;
      }

      // Store minimal profile data from secure lookup
      setKidProfile(data.profile);
      setStep("password");
    } catch (error: any) {
      console.error("Lookup error:", error);
      toast.error("Something went wrong. Try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    // Prevent duplicate submissions
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Use ONLY the email from the backend lookup - no guessing
      const loginEmail = kidProfile?.login_email;
      
      if (!loginEmail) {
        console.error("No login_email returned from backend for username:", username);
        toast.error("Account configuration error. Please contact support.");
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError || !authData?.user) {
        console.error("Kids login failed:", authError?.message);
        if (authError?.message?.includes("Invalid login credentials")) {
          toast.error(isPlayful ? "Oops! Wrong password. Try again!" : "Incorrect password");
        } else {
          toast.error(authError?.message || "Login failed. Please try again.");
        }
        setPassword("");
        setIsLoading(false);
        return;
      }

      // Fetch the full profile
      const { data: profileData, error: profileError } = await supabase
        .from("kids_profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch failed:", profileError);
        toast.error("Couldn't load your profile. Please try again.");
        await supabase.auth.signOut({ scope: "local" });
        setIsLoading(false);
        return;
      }

      await login(profileData);
      toast.success(isPlayful ? "Welcome back! 🎉" : "Login successful");
      navigate("/kidsbloom/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Something went wrong. Try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setResetStep("question");
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const handleSecurityAnswerSubmit = async () => {
    if (!securityAnswer.trim()) {
      toast.error("Please enter your answer");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    if (!/[a-zA-Z]/.test(newPassword)) {
      toast.error("Password must include at least one letter");
      return;
    }
    
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must include at least one number");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    setIsResetting(true);
      try {
        // Sign out any existing session first (LOCAL only)
        await supabase.auth.signOut({ scope: "local" });

      // Use secure backend function for password reset (with rate limiting)
      const { data, error } = await supabase.functions.invoke("kids-auth", {
        body: {
          action: "reset-password",
          username: username.toLowerCase().trim(),
          securityAnswer: securityAnswer.trim(),
          newPassword: newPassword,
        },
      });

      // `invoke` returns a `FunctionsHttpError` for non-2xx responses (like 422),
      // so we need to pull the JSON payload out of the error instead of throwing it.
      const parseKidsAuthErrorPayload = (err: any): any | null => {
        const body = err?.context?.body;

        if (body && typeof body === "object") return body;
        if (typeof body === "string") {
          try {
            return JSON.parse(body);
          } catch {
            // ignore
          }
        }

        const msg = err?.message;
        if (typeof msg === "string") {
          const jsonStart = msg.indexOf("{");
          if (jsonStart !== -1) {
            try {
              return JSON.parse(msg.slice(jsonStart));
            } catch {
              // ignore
            }
          }
        }

        return null;
      };

      let payload: any = data;

      if (error) {
        console.error("Password reset edge function error:", error);
        payload = parseKidsAuthErrorPayload(error) ?? payload;

        // If we still couldn't parse a payload, fall back to generic handling
        if (!payload) throw error;
      }

      if (!payload?.success) {
        if (payload?.error?.includes("Too many attempts")) {
          toast.error(payload.error);
        } else if (payload?.error === "Incorrect security answer") {
          toast.error(isPlayful ? "That's not right. Try again!" : "Incorrect answer");
          setSecurityAnswer("");
        } else if (payload?.reason === "weak_password") {
          // Show the specific weak password error from the backend
          toast.error(
            isPlayful
              ? "That password isn't strong enough! Try mixing in different letters and numbers."
              : "Password is too weak or has been found in data breaches. Please choose a different password."
          );
          setNewPassword("");
          setConfirmNewPassword("");
        } else {
          throw new Error(payload?.error || "Password reset failed");
        }
        setIsResetting(false);
        return;
      }
      
      // Update the password field so user can immediately log in with new password
      setPassword(newPassword);
      
      toast.success(isPlayful ? "Password changed! 🎉" : "Password updated successfully");
      setResetStep("success");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(isPlayful ? "Oops! Something went wrong. Try again!" : "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetComplete = () => {
    setShowForgotPassword(false);
    setPassword("");
  };

  const getDisplayName = () => {
    if (kidProfile?.first_name) {
      return kidProfile.first_name;
    }
    return kidProfile?.display_name || kidProfile?.username || "Friend";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-gray-50 to-emerald-50 dark:from-slate-900 dark:via-gray-900 dark:to-emerald-950">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/kidsbloom")}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <KidsBloomLogo size="md" variant="modern" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {step === "username" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md w-full space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shadow-md"
            >
              <span className="text-3xl">👋</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-emerald-700">
              Welcome Back!
            </h1>
            <p className="text-slate-600">
              Enter your username to sign in
            </p>

            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label className="text-emerald-700">
                  <AtSign className="inline h-4 w-4 mr-1" /> Username
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
                  className="h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <Button
              onClick={handleUsernameSubmit}
              disabled={!username.trim() || isLoading}
              className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
            >
              {isLoading ? "Looking..." : "Continue"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/kidsbloom/signup"
                className="font-semibold text-emerald-600 hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </motion.div>
        )}

        {step === "password" && kidProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md w-full space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-300 flex items-center justify-center text-3xl shadow-md overflow-hidden"
            >
              {kidProfile.avatar_url && (kidProfile.avatar_url.startsWith("http://") || kidProfile.avatar_url.startsWith("https://")) ? (
                <img
                  src={kidProfile.avatar_url}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{kidProfile.avatar_emoji || "😊"}</span>
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-emerald-700">
              Hi {getDisplayName()}!
            </h2>
            <p className="text-slate-600">
              Enter your password to continue
            </p>

            <div className="space-y-2 text-left">
              <Label className="text-emerald-700">
                <Lock className="inline h-4 w-4 mr-1" /> Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  className="h-14 text-lg pr-12 bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-emerald-500 hover:bg-emerald-100"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handlePasswordSubmit}
              disabled={!password || isLoading}
              className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
            >
              {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={handleForgotPassword}
                className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Forgot password?
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("username");
                  setPassword("");
                  setKidProfile(null);
                  setUsername("");
                }}
                className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use a different username
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="bg-white dark:bg-slate-800 border-emerald-100 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Lock className="h-5 w-5" />
              Reset Password
            </DialogTitle>
          </DialogHeader>

          <DialogDescription asChild>
            <div className="space-y-4 pt-2">
              {resetStep === "question" && kidProfile?.security_question && (
                <>
                  <p className="text-slate-600 dark:text-slate-300">
                    Answer your security question to reset your password.
                  </p>
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium text-lg text-emerald-800 dark:text-emerald-300">
                      {securityQuestions[kidProfile.security_question] || kidProfile.security_question}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-emerald-700 dark:text-emerald-400">Your Answer</Label>
                    <Input
                      type="text"
                      placeholder="Type your answer..."
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="bg-white border-emerald-200 dark:bg-slate-900 dark:border-slate-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-emerald-700 dark:text-emerald-400">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white border-emerald-200 dark:bg-slate-900 dark:border-slate-700 text-gray-900 dark:text-white pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-emerald-500 hover:bg-emerald-100"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">
                          Must be 8+ characters with letters and numbers
                        </p>
                        {newPassword.length < 8 && (
                          <p className="text-red-500 text-xs">✗ At least 8 characters</p>
                        )}
                        {newPassword.length >= 8 && !/[a-zA-Z]/.test(newPassword) && (
                          <p className="text-red-500 text-xs">✗ Include at least one letter</p>
                        )}
                        {newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && !/[0-9]/.test(newPassword) && (
                          <p className="text-red-500 text-xs">✗ Include at least one number</p>
                        )}
                        {newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && (
                          <p className="text-emerald-500 text-xs">✓ Password looks good!</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-emerald-700 dark:text-emerald-400">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmNewPassword ? "text" : "password"}
                        placeholder="Confirm new password..."
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="bg-white border-emerald-200 dark:bg-slate-900 dark:border-slate-700 text-gray-900 dark:text-white pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-emerald-500 hover:bg-emerald-100"
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                      <p className="text-red-500 text-xs">✗ Passwords don't match</p>
                    )}
                  </div>
                  <Button 
                    onClick={handleSecurityAnswerSubmit}
                    disabled={!securityAnswer.trim() || !newPassword || !confirmNewPassword || isResetting}
                    className="w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white"
                  >
                    {isResetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </>
              )}

              {resetStep === "success" && (
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-100 dark:bg-emerald-500/20"
                  >
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Password updated. You can now sign in with your new password.
                  </p>
                  <Button 
                    onClick={handleResetComplete}
                    className="w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
