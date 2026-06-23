import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Sparkles, HelpCircle, RotateCcw, Info } from "lucide-react";
import { PinInput } from "../PinInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearningVaultProps {
  kidId: string;
  balance: number;
  variant?: "playful" | "modern";
  onUnlock?: () => void;
  onLock?: () => void;
}

// Emoji hints for each digit (0-9)
const digitEmojis: Record<number, string[]> = {
  0: ["🥚", "⭕", "🍩", "🔵"],
  1: ["☝️", "🥇", "🦄", "🕐"],
  2: ["✌️", "🥈", "👀", "🦆"],
  3: ["🔱", "🥉", "🍀", "🐱"],
  4: ["🍀", "🐕", "🚗", "📦"],
  5: ["✋", "⭐", "🖐️", "🏠"],
  6: ["🎲", "🐜", "🍎", "🎸"],
  7: ["🌈", "🎱", "📅", "🍫"],
  8: ["🎱", "🐙", "🕷️", "♾️"],
  9: ["🎈", "🐱", "⛳", "🦎"],
};

const getRandomEmoji = (digit: number): string => {
  const emojis = digitEmojis[digit];
  return emojis[Math.floor(Math.random() * emojis.length)];
};

type VaultState = "locked" | "unlocked" | "setup" | "hint-setup";

export const LearningVault = ({ 
  kidId, 
  balance, 
  variant = "playful",
  onUnlock,
  onLock 
}: LearningVaultProps) => {
  const [vaultState, setVaultState] = useState<VaultState>("locked");
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [savedHints, setSavedHints] = useState<string[]>([]);
  const [setupPin, setSetupPin] = useState("");
  const [selectedHints, setSelectedHints] = useState<string[]>(["", "", "", ""]);
  const [attempts, setAttempts] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isPlayful = variant === "playful";
  const maxAttempts = 3;

  // Load saved vault PIN from localStorage (for learning purposes, not secure)
  useEffect(() => {
    const loadVaultData = () => {
      const stored = localStorage.getItem(`vault_${kidId}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setSavedPin(data.pin);
          setSavedHints(data.hints || []);
          setVaultState("locked");
        } catch {
          setVaultState("setup");
        }
      } else {
        setVaultState("setup");
      }
      setIsLoading(false);
    };
    loadVaultData();
  }, [kidId]);

  const handlePinSubmit = () => {
    if (pin === savedPin) {
      setVaultState("unlocked");
      setAttempts(0);
      setShowHints(false);
      setPin("");
      onUnlock?.();
      toast.success(isPlayful ? "🎉 You unlocked it!" : "Vault unlocked!");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setAttempts(prev => prev + 1);
      setPin("");
      
      if (attempts + 1 >= maxAttempts) {
        setShowHints(true);
      }
      
      toast.error(isPlayful ? "Oops! Try again!" : "Incorrect PIN");
    }
  };

  const handleSetupComplete = () => {
    if (setupPin.length !== 4) {
      toast.error("Please enter 4 numbers");
      return;
    }
    
    // Generate hints for each digit
    const hints = setupPin.split("").map(d => getRandomEmoji(parseInt(d)));
    setSelectedHints(hints);
    setVaultState("hint-setup");
  };

  const handleHintSetupComplete = () => {
    const vaultData = {
      pin: setupPin,
      hints: selectedHints,
    };
    localStorage.setItem(`vault_${kidId}`, JSON.stringify(vaultData));
    setSavedPin(setupPin);
    setSavedHints(selectedHints);
    setVaultState("locked");
    setSetupPin("");
    toast.success(isPlayful ? "🔐 Your vault is ready!" : "Vault PIN set!");
  };

  const handleRevealPin = () => {
    toast.info(
      isPlayful 
        ? `That's okay! Your secret code is: ${savedPin}` 
        : `Your PIN is: ${savedPin}`,
      { duration: 5000 }
    );
    setAttempts(0);
    setShowHints(false);
  };

  const handleResetVault = () => {
    localStorage.removeItem(`vault_${kidId}`);
    setSavedPin(null);
    setSavedHints([]);
    setVaultState("setup");
    setSetupPin("");
    setPin("");
    setAttempts(0);
    setShowHints(false);
    toast.success("Vault reset!");
  };

  const handleLock = () => {
    setVaultState("locked");
    setPin("");
    onLock?.();
  };

  if (isLoading) {
    return (
      <div className={`rounded-2xl p-6 ${isPlayful ? "bg-gradient-to-br from-amber-100 to-yellow-200" : "bg-gradient-to-br from-slate-100 to-slate-200"}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // Setup flow - entering PIN for first time
  if (vaultState === "setup") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-6 ${
          isPlayful 
            ? "bg-gradient-to-br from-amber-100 to-yellow-200 border-4 border-amber-300" 
            : "bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300"
        }`}
      >
        <div className="text-center mb-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <Lock className={`h-12 w-12 mx-auto mb-2 ${isPlayful ? "text-amber-600" : "text-slate-600"}`} />
          </motion.div>
          <h3 className={`text-xl font-bold ${isPlayful ? "text-amber-800" : "text-slate-800"}`}>
            {isPlayful ? "🔐 Create Your Secret Code!" : "Set Your Vault PIN"}
          </h3>
          <p className={`text-sm mt-1 ${isPlayful ? "text-amber-700" : "text-slate-600"}`}>
            {isPlayful ? "Pick 4 numbers only you know!" : "Choose a 4-digit PIN to protect your vault"}
          </p>
        </div>

        <PinInput 
          value={setupPin} 
          onChange={setSetupPin} 
          variant={variant}
          showReveal={true}
        />

        <Button
          onClick={handleSetupComplete}
          disabled={setupPin.length !== 4}
          className={`w-full mt-4 ${
            isPlayful 
              ? "bg-amber-500 hover:bg-amber-600 text-white" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {isPlayful ? "✨ Set My Code!" : "Set PIN"}
        </Button>
      </motion.div>
    );
  }

  // Hint setup - show the generated hints
  if (vaultState === "hint-setup") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-6 ${
          isPlayful 
            ? "bg-gradient-to-br from-amber-100 to-yellow-200 border-4 border-amber-300" 
            : "bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300"
        }`}
      >
        <div className="text-center mb-4">
          <Sparkles className={`h-10 w-10 mx-auto mb-2 ${isPlayful ? "text-amber-600" : "text-emerald-600"}`} />
          <h3 className={`text-xl font-bold ${isPlayful ? "text-amber-800" : "text-slate-800"}`}>
            {isPlayful ? "🎯 Remember These Hints!" : "Your PIN Hints"}
          </h3>
          <p className={`text-sm mt-1 ${isPlayful ? "text-amber-700" : "text-slate-600"}`}>
            {isPlayful ? "These pictures will help you remember!" : "These will help if you forget"}
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {selectedHints.map((hint, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.15, type: "spring" }}
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                isPlayful 
                  ? "bg-white border-2 border-amber-400 shadow-lg" 
                  : "bg-white border border-slate-300"
              }`}
            >
              {hint}
            </motion.div>
          ))}
        </div>

        <p className={`text-center text-xs mb-4 ${isPlayful ? "text-amber-600" : "text-slate-500"}`}>
          {isPlayful 
            ? `Your code: ${setupPin.split("").join(" - ")}` 
            : `PIN: ${setupPin}`}
        </p>

        <Button
          onClick={handleHintSetupComplete}
          className={`w-full ${
            isPlayful 
              ? "bg-amber-500 hover:bg-amber-600 text-white" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {isPlayful ? "👍 Got It!" : "Confirm"}
        </Button>
      </motion.div>
    );
  }

  // Locked state - enter PIN to unlock
  if (vaultState === "locked") {
    return (
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        className={`rounded-2xl p-6 ${
          isPlayful 
            ? "bg-gradient-to-br from-amber-100 to-yellow-200 border-4 border-amber-300" 
            : "bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300"
        }`}
      >
        <div className="text-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Lock className={`h-10 w-10 mx-auto mb-2 ${isPlayful ? "text-amber-600" : "text-slate-600"}`} />
          </motion.div>
          <h3 className={`text-xl font-bold ${isPlayful ? "text-amber-800" : "text-slate-800"}`}>
            {isPlayful ? "🔒 Unlock Your Vault!" : "Enter PIN"}
          </h3>
          <p className={`text-sm mt-1 ${isPlayful ? "text-amber-700" : "text-slate-600"}`}>
            {isPlayful ? "Enter your secret code to see your money!" : "Enter your PIN to view balance"}
          </p>
        </div>

        {/* Show hints after failed attempts */}
        <AnimatePresence>
          {showHints && savedHints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <p className={`text-center text-sm mb-2 ${isPlayful ? "text-amber-700" : "text-slate-600"}`}>
                {isPlayful ? "💡 Here are your hints!" : "Your hints:"}
              </p>
              <div className="flex justify-center gap-2">
                {savedHints.map((hint, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      isPlayful 
                        ? "bg-white border-2 border-amber-300" 
                        : "bg-white border border-slate-300"
                    }`}
                  >
                    {hint}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PinInput 
          value={pin} 
          onChange={(newPin) => {
            setPin(newPin);
            if (newPin.length === 4) {
              setTimeout(() => {
                if (newPin === savedPin) {
                  setVaultState("unlocked");
                  setAttempts(0);
                  setShowHints(false);
                  setPin("");
                  onUnlock?.();
                  toast.success(isPlayful ? "🎉 You unlocked it!" : "Vault unlocked!");
                } else {
                  setShake(true);
                  setTimeout(() => setShake(false), 500);
                  setAttempts(prev => prev + 1);
                  setPin("");
                  
                  if (attempts + 1 >= maxAttempts) {
                    setShowHints(true);
                  }
                  
                  toast.error(isPlayful ? "Oops! Try again!" : "Incorrect PIN");
                }
              }, 200);
            }
          }} 
          variant={variant}
          showReveal={false}
        />

        {/* Help button after showing hints */}
        {showHints && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center gap-2 mt-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevealPin}
              className={isPlayful ? "text-amber-700 font-semibold" : "text-slate-700 font-semibold"}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              {isPlayful ? "I need help!" : "Reveal PIN"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetVault}
              className={isPlayful ? "text-amber-700 font-semibold" : "text-slate-700 font-semibold"}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {isPlayful ? "Start Over" : "Reset"}
            </Button>
          </motion.div>
        )}

        {attempts > 0 && !showHints && (
          <p className={`text-center text-xs mt-3 font-medium ${isPlayful ? "text-amber-600" : "text-slate-600"}`}>
            {isPlayful 
              ? `${maxAttempts - attempts} tries left before hints appear!` 
              : `${maxAttempts - attempts} attempts remaining`}
          </p>
        )}
      </motion.div>
    );
  }

  // Unlocked state - show balance!
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl p-6 ${
        isPlayful 
          ? "bg-gradient-to-br from-green-100 to-emerald-200 border-4 border-green-300" 
          : "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300"
      }`}
    >
      <div className="text-center">
        <motion.div
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring" }}
        >
          <Unlock className={`h-10 w-10 mx-auto mb-2 ${isPlayful ? "text-green-600" : "text-emerald-600"}`} />
        </motion.div>
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <h3 className={`text-lg font-bold mb-1 ${isPlayful ? "text-green-800" : "text-emerald-800"}`}>
            {isPlayful ? "🎉 You Did It!" : "Vault Unlocked"}
          </h3>
          
          <div className={`text-4xl font-bold mb-4 ${isPlayful ? "text-green-700" : "text-emerald-700"}`}>
            ${balance.toFixed(2)}
          </div>
          
          <p className={`text-sm mb-4 ${isPlayful ? "text-green-600" : "text-emerald-600"}`}>
            {isPlayful ? "This is how much money you have!" : "Your current balance"}
          </p>
        </motion.div>

        <Button
          variant="outline"
          onClick={handleLock}
          className={`${
            isPlayful 
              ? "border-green-400 text-green-700 hover:bg-green-50" 
              : "border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <Lock className="h-4 w-4 mr-2" />
          {isPlayful ? "Lock It Up!" : "Lock Vault"}
        </Button>
        
        {/* Educational note about security */}
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-left ${
          isPlayful 
            ? "bg-amber-50 border border-amber-200" 
            : "bg-slate-50 border border-slate-200"
        }`}>
          <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isPlayful ? "text-amber-600" : "text-slate-500"}`} />
          <p className={`text-xs ${isPlayful ? "text-amber-700" : "text-slate-600"}`}>
            {isPlayful 
              ? "🔒 Fun Fact: Real banks NEVER store your PIN in your browser! This vault is just for practice learning." 
              : "Learning Note: Real banks never store PINs client-side. This is an educational simulation only."}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
