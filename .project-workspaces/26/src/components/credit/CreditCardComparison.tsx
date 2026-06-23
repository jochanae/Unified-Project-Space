import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CreditCard, 
  Star, 
  Check, 
  X, 
  Gift, 
  Plane, 
  ShoppingBag, 
  Fuel,
  DollarSign,
  Percent,
  Calendar,
  Award
} from "lucide-react";

interface CreditCardOffer {
  id: string;
  name: string;
  issuer: string;
  type: "cashback" | "travel" | "balance_transfer" | "student" | "business";
  annualFee: number;
  apr: { min: number; max: number };
  introApr?: { rate: number; duration: number };
  signupBonus?: string;
  rewardsRate: string;
  creditScoreRequired: "excellent" | "good" | "fair" | "poor";
  features: string[];
  pros: string[];
  cons: string[];
  rating: number;
}

const sampleCards: CreditCardOffer[] = [
  {
    id: "1",
    name: "Cash Rewards Elite",
    issuer: "Premier Bank",
    type: "cashback",
    annualFee: 0,
    apr: { min: 18.24, max: 28.24 },
    introApr: { rate: 0, duration: 15 },
    signupBonus: "$200 after $500 spend in 3 months",
    rewardsRate: "3% dining, 2% grocery, 1% everything else",
    creditScoreRequired: "good",
    features: ["No foreign transaction fees", "Cell phone protection", "Extended warranty"],
    pros: ["No annual fee", "Great intro APR", "Solid rewards"],
    cons: ["Rewards cap on categories", "No travel perks"],
    rating: 4.5,
  },
  {
    id: "2",
    name: "Travel Premium Card",
    issuer: "Voyager Bank",
    type: "travel",
    annualFee: 95,
    apr: { min: 20.99, max: 27.99 },
    signupBonus: "60,000 points after $4,000 spend in 3 months",
    rewardsRate: "5x travel, 3x dining, 1x everything else",
    creditScoreRequired: "excellent",
    features: ["Airport lounge access", "TSA PreCheck credit", "Trip insurance", "No foreign fees"],
    pros: ["Excellent travel perks", "High rewards on travel", "Lounge access"],
    cons: ["Annual fee", "High spend for bonus"],
    rating: 4.8,
  },
  {
    id: "3",
    name: "Balance Transfer Pro",
    issuer: "Freedom Financial",
    type: "balance_transfer",
    annualFee: 0,
    apr: { min: 15.99, max: 25.99 },
    introApr: { rate: 0, duration: 21 },
    rewardsRate: "1.5% on all purchases",
    creditScoreRequired: "good",
    features: ["0% balance transfer for 21 months", "No balance transfer fee for 60 days"],
    pros: ["Long 0% intro period", "No annual fee", "Simple rewards"],
    cons: ["Lower ongoing rewards", "Balance transfer fee after intro"],
    rating: 4.2,
  },
  {
    id: "4",
    name: "Everyday Cash Card",
    issuer: "Community Credit",
    type: "cashback",
    annualFee: 0,
    apr: { min: 16.99, max: 26.99 },
    signupBonus: "$150 after $500 spend in 3 months",
    rewardsRate: "5% rotating categories, 1% everything else",
    creditScoreRequired: "fair",
    features: ["Quarterly bonus categories", "Free FICO score", "Fraud protection"],
    pros: ["High category rewards", "Easy to qualify", "No annual fee"],
    cons: ["Must activate categories", "Rewards cap"],
    rating: 4.0,
  },
];

const typeIcons = {
  cashback: DollarSign,
  travel: Plane,
  balance_transfer: Percent,
  student: Award,
  business: ShoppingBag,
};

const typeColors = {
  cashback: "bg-emerald-500/20 text-emerald-400",
  travel: "bg-blue-500/20 text-blue-400",
  balance_transfer: "bg-purple-500/20 text-purple-400",
  student: "bg-amber-500/20 text-amber-400",
  business: "bg-rose-500/20 text-rose-400",
};

export const CreditCardComparison = () => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : prev.length < 3 
          ? [...prev, cardId]
          : prev
    );
  };

  const filteredCards = filterType === "all" 
    ? sampleCards 
    : sampleCards.filter(card => card.type === filterType);

  const comparedCards = sampleCards.filter(card => selectedCards.includes(card.id));

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {["all", "cashback", "travel", "balance_transfer"].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type)}
            className="capitalize"
          >
            {type === "all" ? "All Cards" : type.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Card Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map((card) => {
          const TypeIcon = typeIcons[card.type];
          const isSelected = selectedCards.includes(card.id);
          
          return (
            <motion.div
              key={card.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleCardSelection(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeColors[card.type]}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{card.name}</h3>
                        <p className="text-sm text-muted-foreground">{card.issuer}</p>
                      </div>
                    </div>
                    <Checkbox checked={isSelected} />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Annual Fee</p>
                      <p className="font-medium">
                        {card.annualFee === 0 ? "No Fee" : `$${card.annualFee}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">APR</p>
                      <p className="font-medium">{card.apr.min}% - {card.apr.max}%</p>
                    </div>
                  </div>

                  {card.signupBonus && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{card.signupBonus}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(card.rating) 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-muted"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">{card.rating}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Compare Button */}
      {selectedCards.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Button 
            size="lg"
            onClick={() => setShowComparison(true)}
            className="gap-2"
          >
            <CreditCard className="h-5 w-5" />
            Compare {selectedCards.length} Cards
          </Button>
        </motion.div>
      )}

      {/* Comparison Table */}
      <AnimatePresence>
        {showComparison && comparedCards.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Card Comparison
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Feature</th>
                        {comparedCards.map((card) => (
                          <th key={card.id} className="text-left py-3 px-2 font-semibold">
                            {card.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Annual Fee</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2 font-medium">
                            {card.annualFee === 0 ? (
                              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">No Fee</Badge>
                            ) : (
                              `$${card.annualFee}`
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Regular APR</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2">{card.apr.min}% - {card.apr.max}%</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Intro APR</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2">
                            {card.introApr ? (
                              <span className="text-emerald-400">{card.introApr.rate}% for {card.introApr.duration} mo</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Rewards</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2 text-sm">{card.rewardsRate}</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Sign-up Bonus</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2 text-sm">
                            {card.signupBonus || <span className="text-muted-foreground">None</span>}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Credit Required</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2 capitalize">{card.creditScoreRequired}</td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-2 text-muted-foreground">Pros</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2">
                            <ul className="space-y-1">
                              {card.pros.map((pro, i) => (
                                <li key={i} className="flex items-center gap-1 text-sm">
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-muted-foreground">Cons</td>
                        {comparedCards.map((card) => (
                          <td key={card.id} className="py-3 px-2">
                            <ul className="space-y-1">
                              {card.cons.map((con, i) => (
                                <li key={i} className="flex items-center gap-1 text-sm">
                                  <X className="h-3 w-3 text-rose-400" />
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCards.length === 0 && (
        <p className="text-center text-muted-foreground">
          Select 2-3 cards to compare them side by side
        </p>
      )}
    </div>
  );
};
