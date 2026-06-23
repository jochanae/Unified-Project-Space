import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock, AtSign, AlertCircle, CheckCircle, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CardThemeCarousel } from "@/components/kidsbloom/CardThemeCarousel";
import { AvatarSelector } from "@/components/kidsbloom/AvatarSelector";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";
import { useKidsSession } from "@/hooks/useKidsSession";

type SignupStep = "welcome" | "birthday" | "name" | "username" | "password" | "security" | "avatar" | "card" | "complete";

// Playful questions for kids, professional for teens
const SECURITY_QUESTIONS_PLAYFUL = [
  { id: "pet", label: "🐾 What's your pet's name?", placeholder: "Fluffy" },
  { id: "color", label: "🌈 What's your favorite color?", placeholder: "Blue" },
  { id: "food", label: "🍕 What's your favorite food?", placeholder: "Pizza" },
  { id: "superhero", label: "🦸 Who's your favorite superhero?", placeholder: "Spider-Man" },
  { id: "place", label: "🏖️ What's your favorite place?", placeholder: "The beach" },
];

const SECURITY_QUESTIONS_MODERN = [
  { id: "pet", label: "What is your pet's name?", placeholder: "Enter name" },
  { id: "color", label: "What is your favorite color?", placeholder: "Enter color" },
  { id: "food", label: "What is your favorite food?", placeholder: "Enter food" },
  { id: "superhero", label: "Who is your favorite superhero?", placeholder: "Enter name" },
  { id: "place", label: "What is your favorite place?", placeholder: "Enter place" },
];

interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
  securityQuestion: string;
  securityAnswer: string;
  birthDate: string;
  ageTier: "under_10" | "teen";
  avatarEmoji: string;
  cardThemeId: string;
}

const calculateAgeTier = (birthDate: string): "under_10" | "teen" => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age < 10 ? "under_10" : "teen";
};

export default function KidsBloomSignup() {
  const navigate = useNavigate();
  const { login } = useKidsSession();
  const [step, setStep] = useState<SignupStep>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
    securityQuestion: "",
    securityAnswer: "",
    birthDate: "",
    ageTier: "under_10",
    avatarEmoji: "",
    cardThemeId: "",
  });

  const ageTier = signupData.ageTier;
  const isUnder10 = ageTier === "under_10";
  const securityQuestions = isUnder10 ? SECURITY_QUESTIONS_PLAYFUL : SECURITY_QUESTIONS_MODERN;

  const steps: SignupStep[] = ["welcome", "birthday", "name", "username", "password", "security", "avatar", "card", "complete"];

  const handleNext = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleBirthdaySubmit = () => {
    if (!signupData.birthDate) {
      toast.error("Please enter your birthday");
      return;
    }
    const tier = calculateAgeTier(signupData.birthDate);
    setSignupData({ ...signupData, ageTier: tier });
    handleNext();
  };

  const handleNameSubmit = () => {
    if (!signupData.firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    if (!signupData.lastName.trim()) {
      toast.error("Please enter your last name");
      return;
    }
    handleNext();
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameError("Username can only have letters, numbers, and underscores");
      return false;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("kids_profiles")
        .select("id")
        .ilike("username", username.trim())
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setUsernameError("This username is already taken");
        return false;
      }

      setUsernameError("");
      return true;
    } catch (error) {
      console.error("Username check error:", error);
      setUsernameError("Couldn't check username. Try again!");
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameSubmit = async () => {
    const isAvailable = await checkUsernameAvailability(signupData.username);
    if (isAvailable) {
      handleNext();
    }
  };

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[a-zA-Z]/.test(password)) {
      return "Password must include at least one letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must include at least one number";
    }
    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty12', 'abcd1234', 'password1'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return "Password is too common. Please choose something unique";
    }
    return "";
  };

  const getPasswordStrength = (password: string): { label: string; color: string; percent: number } => {
    if (!password) return { label: "", color: "", percent: 0 };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-zA-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { label: "Weak", color: "bg-red-500", percent: 33 };
    if (score <= 3) return { label: "Medium", color: "bg-yellow-500", percent: 66 };
    return { label: "Strong", color: "bg-emerald-500", percent: 100 };
  };

  const handlePasswordSubmit = () => {
    const error = validatePassword(signupData.password);
    if (error) {
      setPasswordError(error);
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setPasswordError("Passwords don't match!");
      return;
    }
    setPasswordError("");
    handleNext();
  };

  const handleCompleteSignup = async () => {
    setIsLoading(true);
    try {
      const internalEmail = `${signupData.username.toLowerCase().trim()}@kidsbloom.internal`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/kidsbloom/dashboard`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      // Hash the security answer via edge function
      const { data: hashData, error: hashError } = await supabase.functions.invoke('kids-auth', {
        body: { action: 'hash-security-answer', securityAnswer: signupData.securityAnswer }
      });

      if (hashError || !hashData?.hash) {
        throw new Error('Failed to secure account setup');
      }

      const { data: profileData, error: profileError } = await supabase
        .from("kids_profiles")
        .insert({
          user_id: authData.user.id,
          first_name: signupData.firstName.trim(),
          last_name: signupData.lastName.trim(),
          username: signupData.username.toLowerCase().trim(),
          display_name: `${signupData.firstName.trim()} ${signupData.lastName.trim()}`,
          birth_date: signupData.birthDate,
          age_tier: signupData.ageTier,
          avatar_emoji: signupData.avatarEmoji || "😊",
          card_theme_id: signupData.cardThemeId || null,
          security_question: signupData.securityQuestion,
          security_answer_hash: hashData.hash,
          security_answer: null, // Don't store plaintext
        } as any)
        .select()
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        await login(profileData as any);
      }

      setStep("complete");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("This username is already taken. Please choose another.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  const progressSteps = ["birthday", "name", "username", "password", "security", "avatar", "card"];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-gray-50 to-emerald-50 dark:from-slate-900 dark:via-gray-900 dark:to-emerald-950">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {step === "welcome" && (
          <button
            onClick={() => navigate("/kidsbloom")}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}
        {step !== "welcome" && step !== "complete" && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack} 
            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        {step === "complete" && <div />}
        <div className="flex-1" />
        <KidsBloomLogo size="md" variant="modern" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-emerald-700">
                  Welcome to KidsBloom
                </h1>
                <p className="text-lg text-slate-600">
                  Set up your account in a few simple steps
                </p>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "birthday" && (
            <motion.div
              key="birthday"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <h2 className="text-2xl font-bold text-emerald-700">
                Enter your date of birth
              </h2>
              <p className="text-slate-600">
                This helps us personalize your experience
              </p>

              <div className="space-y-2">
                <Input
                  type="date"
                  value={signupData.birthDate}
                  onChange={(e) => setSignupData({ ...signupData, birthDate: e.target.value })}
                  className="h-14 text-lg text-center bg-white border-emerald-200 text-gray-900 focus:border-emerald-500"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <Button
                onClick={handleBirthdaySubmit}
                disabled={!signupData.birthDate}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "name" && (
            <motion.div
              key="name"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shadow-md"
              >
                <span className="text-3xl">👋</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-700">
                Enter your full name
              </h2>
              <p className="text-slate-600">
                This will appear on your wallet card
              </p>

              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label className="text-emerald-700">First Name</Label>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={signupData.firstName}
                    onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                    className="h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-emerald-700">Last Name</Label>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={signupData.lastName}
                    onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                    className="h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  />
                </div>
              </div>

              <Button
                onClick={handleNameSubmit}
                disabled={!signupData.firstName.trim() || !signupData.lastName.trim()}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "username" && (
            <motion.div
              key="username"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                <AtSign className="h-16 w-16 mx-auto text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-700">
                Create your username
              </h2>
              <p className="text-slate-600">
                You'll use this to sign in to your account
              </p>

              <div className="space-y-2 text-left">
                <Label className="text-emerald-700">Username</Label>
                <Input
                  type="text"
                  placeholder="Enter username"
                  value={signupData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setSignupData({ ...signupData, username: value });
                    setUsernameError("");
                  }}
                  className={`h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500 ${usernameError ? "border-red-400" : ""}`}
                />
                {usernameError && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {usernameError}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Only letters, numbers, and underscores. At least 3 characters.
                </p>
              </div>

              <Button
                onClick={handleUsernameSubmit}
                disabled={!signupData.username.trim() || signupData.username.length < 3 || isCheckingUsername}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                {isCheckingUsername ? "Checking..." : "Continue"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "password" && (
            <motion.div
              key="password"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-emerald-100 border-2 border-emerald-500"
              >
                <Lock className="h-10 w-10 text-emerald-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-700">
                Create your password
              </h2>
              <p className="text-slate-600">
                Choose a secure password for your account
              </p>

              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label className="text-emerald-700">Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={signupData.password}
                    onChange={(e) => {
                      setSignupData({ ...signupData, password: e.target.value });
                      setPasswordError("");
                    }}
                    className="h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  />
                  {signupData.password && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${getPasswordStrength(signupData.password).color}`}
                            style={{ width: `${getPasswordStrength(signupData.password).percent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          getPasswordStrength(signupData.password).percent === 100 ? 'text-emerald-600' : 
                          getPasswordStrength(signupData.password).percent === 66 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {getPasswordStrength(signupData.password).label}
                        </span>
                      </div>
                      {validatePassword(signupData.password) && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validatePassword(signupData.password)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-emerald-700">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={signupData.confirmPassword}
                    onChange={(e) => {
                      setSignupData({ ...signupData, confirmPassword: e.target.value });
                      setPasswordError("");
                    }}
                    className="h-14 text-lg bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                  />
                  {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Passwords don't match
                    </p>
                  )}
                </div>
                {passwordError && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Password must be at least 8 characters with letters and numbers
                </p>
              </div>

              <Button
                onClick={handlePasswordSubmit}
                disabled={!signupData.password || !signupData.confirmPassword}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "security" && (
            <motion.div
              key="security"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shadow-md"
              >
                <span className="text-3xl">🔐</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-700">
                Security question
              </h2>
              <p className="text-slate-600">
                This will help you reset your password if needed
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {securityQuestions.map((q) => (
                    <Button
                      key={q.id}
                      type="button"
                      variant={signupData.securityQuestion === q.id ? "default" : "outline"}
                      className={`h-auto py-3 justify-start text-left ${
                        signupData.securityQuestion === q.id
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600"
                          : "border-emerald-200 text-gray-700 hover:bg-emerald-50 bg-white"
                      }`}
                      onClick={() => setSignupData({ ...signupData, securityQuestion: q.id })}
                    >
                      {q.label}
                    </Button>
                  ))}
                </div>

                {signupData.securityQuestion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Input
                      type="text"
                      placeholder={securityQuestions.find(q => q.id === signupData.securityQuestion)?.placeholder || "Your answer"}
                      value={signupData.securityAnswer}
                      onChange={(e) => setSignupData({ ...signupData, securityAnswer: e.target.value })}
                      className="h-14 text-lg text-center bg-white border-emerald-200 text-gray-900 placeholder:text-slate-400 focus:border-emerald-500"
                    />
                  </motion.div>
                )}
              </div>

              <Button
                onClick={handleNext}
                disabled={!signupData.securityQuestion || !signupData.securityAnswer.trim()}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "avatar" && (
            <motion.div
              key="avatar"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <h2 className="text-2xl font-bold text-emerald-700">
                Choose your avatar
              </h2>
              <p className="text-slate-600">
                Select an icon for your profile
              </p>

              <AvatarSelector
                selected={signupData.avatarEmoji}
                onSelect={(emoji) => setSignupData({ ...signupData, avatarEmoji: emoji })}
                variant={isUnder10 ? "playful" : "modern"}
                mode="sheet"
              />

              {signupData.avatarEmoji && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-4xl border-2 border-emerald-300">
                    {signupData.avatarEmoji}
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handleNext}
                disabled={!signupData.avatarEmoji}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === "card" && (
            <motion.div
              key="card"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-lg w-full space-y-6"
            >
              <h2 className="text-2xl font-bold text-emerald-700">
                Select card theme
              </h2>
              <p className="text-slate-600">
                Pick a design for your wallet card
              </p>

              <CardThemeCarousel
                selected={signupData.cardThemeId}
                onSelect={(id) => setSignupData({ ...signupData, cardThemeId: id })}
                variant={isUnder10 ? "playful" : "modern"}
                userName={`${signupData.firstName} ${signupData.lastName}`}
              />

              <Button
                onClick={() => {
                  if (!signupData.cardThemeId) {
                    toast.error("Please select a card theme");
                    return;
                  }
                  handleCompleteSignup();
                }}
                disabled={!signupData.cardThemeId || isLoading}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {isLoading ? "Creating Account..." : "Complete Setup"}
              </Button>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div
              key="complete"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-md w-full space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
              >
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </motion.div>
              <h1 className="text-3xl font-bold text-emerald-700">
                Account Created
              </h1>
              <p className="text-lg text-slate-600">
                Your account is ready!
              </p>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-600">Your username:</p>
                <p className="text-xl font-bold text-emerald-700">@{signupData.username}</p>
              </div>

              <Button
                onClick={() => navigate("/kidsbloom/dashboard")}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      {step !== "welcome" && step !== "complete" && (
        <div className="p-4 flex justify-center gap-2">
          {progressSteps.map((s, i) => {
            const currentIndex = progressSteps.indexOf(step);
            return (
              <motion.div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  i <= currentIndex
                    ? "bg-emerald-500"
                    : "bg-emerald-200"
                }`}
                initial={{ width: 8 }}
                animate={{ width: i === currentIndex ? 24 : 8 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
