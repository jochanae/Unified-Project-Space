import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Percent, Building2, PiggyBank, ExternalLink, Star, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  highlight: string;
  rating: number;
  icon: React.ReactNode;
  link: string;
  badge?: string;
}

const products: Product[] = [
  {
    id: '1',
    name: 'Capital One Venture X',
    category: 'Travel Credit Card',
    description: 'Earn unlimited 2X miles on every purchase, plus 10X on hotels and rental cars.',
    highlight: '75,000 bonus miles',
    rating: 4.8,
    icon: <CreditCard className="h-6 w-6 text-blue-400" />,
    link: '#',
    badge: 'Best for Travel',
  },
  {
    id: '2',
    name: 'Chase Sapphire Preferred',
    category: 'Rewards Credit Card',
    description: 'Earn 3X points on dining and 2X on travel. Flexible redemption options.',
    highlight: '60,000 bonus points',
    rating: 4.7,
    icon: <CreditCard className="h-6 w-6 text-indigo-400" />,
    link: '#',
  },
  {
    id: '3',
    name: 'Marcus by Goldman Sachs',
    category: 'High-Yield Savings',
    description: 'No fees, no minimums, and competitive APY on your savings.',
    highlight: '4.40% APY',
    rating: 4.6,
    icon: <PiggyBank className="h-6 w-6 text-emerald-400" />,
    link: '#',
    badge: 'Top APY',
  },
  {
    id: '4',
    name: 'SoFi Personal Loan',
    category: 'Personal Loan',
    description: 'Low rates with no fees. Borrow $5K-$100K with flexible terms.',
    highlight: 'From 8.99% APR',
    rating: 4.5,
    icon: <Building2 className="h-6 w-6 text-purple-400" />,
    link: '#',
  },
  {
    id: '5',
    name: 'Discover it Cash Back',
    category: 'Cash Back Card',
    description: '5% cash back on rotating categories, 1% on all other purchases.',
    highlight: 'Cash back match first year',
    rating: 4.6,
    icon: <Percent className="h-6 w-6 text-orange-400" />,
    link: '#',
    badge: 'No Annual Fee',
  },
];

const ProductRecommendations = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended Products
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Personalized recommendations based on your credit profile
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/20">
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      {product.icon}
                    </div>
                    {product.badge && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                        {product.badge}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                  
                  <p className="text-sm text-muted-foreground mb-3 flex-grow">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-primary">{product.highlight}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-muted-foreground">{product.rating}</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Learn More
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          * These are example products. Actual availability and terms may vary based on your creditworthiness.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductRecommendations;
