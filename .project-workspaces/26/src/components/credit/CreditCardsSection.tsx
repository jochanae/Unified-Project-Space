import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Building2, 
  Briefcase, 
  Shield,
  Star, 
  ExternalLink, 
  Heart,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface CreditProduct {
  id: string;
  name: string;
  issuer: string;
  product_type: string;
  apr_range: string | null;
  annual_fee: number;
  rewards_description: string | null;
  affiliate_url: string | null;
  rating: number | null;
  is_featured: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'credit_card': return <CreditCard className="h-5 w-5" />;
    case 'personal_loan': return <Building2 className="h-5 w-5" />;
    case 'secured_card': return <Shield className="h-5 w-5" />;
    case 'business_card': return <Briefcase className="h-5 w-5" />;
    case 'kids_product': return <Star className="h-5 w-5" />;
    case 'banking_account': return <Building2 className="h-5 w-5" />;
    default: return <CreditCard className="h-5 w-5" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'credit_card': return 'Credit Card';
    case 'personal_loan': return 'Personal Loan';
    case 'secured_card': return 'Secured Card';
    case 'business_card': return 'Business Card';
    case 'kids_product': return 'Kids Product';
    case 'banking_account': return 'Banking Account';
    default: return type;
  }
};

const CreditCardsSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_products')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    // For now, use localStorage - could be moved to database later
    const saved = localStorage.getItem(`credit_favorites_${user?.id}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const toggleFavorite = (productId: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }
    
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(newFavorites);
    localStorage.setItem(`credit_favorites_${user.id}`, JSON.stringify(newFavorites));
    toast.success(favorites.includes(productId) ? 'Removed from favorites' : 'Added to favorites');
  };

  const filteredProducts = products.filter(product => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'favorites') return favorites.includes(product.id);
    if (activeFilter === 'featured') return product.is_featured;
    return product.product_type === activeFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Recommended Products
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse curated financial products and find the right one for you
          </p>
        </CardHeader>
        <CardContent>
          {/* Filter Tabs */}
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 bg-muted/50">
              <TabsTrigger value="all" className="text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">All</TabsTrigger>
              <TabsTrigger value="featured" className="text-sm gap-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                Featured
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-sm gap-1 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">
                <Heart className="h-3.5 w-3.5" />
                My Favorites
              </TabsTrigger>
              <TabsTrigger value="credit_card" className="text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">Credit Cards</TabsTrigger>
              <TabsTrigger value="secured_card" className="text-sm data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Secured</TabsTrigger>
              <TabsTrigger value="business_card" className="text-sm data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">Business</TabsTrigger>
              <TabsTrigger value="personal_loan" className="text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Loans</TabsTrigger>
              <TabsTrigger value="banking_account" className="text-sm data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">Banking</TabsTrigger>
              <TabsTrigger value="kids_product" className="text-sm data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">Kids</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {activeFilter === 'favorites' ? (
                <div>
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No favorites saved yet</p>
                  <p className="text-sm mt-1">Click the heart icon on cards to save them</p>
                </div>
              ) : (
                <div>
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No products available in this category</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/20 relative">
                    {/* Favorite Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                    >
                      <Heart 
                        className={`h-4 w-4 transition-colors ${
                          favorites.includes(product.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-muted-foreground'
                        }`} 
                      />
                    </Button>

                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-start gap-3 mb-3 pr-8">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                          {getTypeIcon(product.product_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {product.is_featured && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground mt-1">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">{product.issuer}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3 flex-grow">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(product.product_type)}
                        </Badge>
                        
                        {product.rewards_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.rewards_description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          {product.apr_range && (
                            <span className="text-muted-foreground">APR: {product.apr_range}</span>
                          )}
                          <span className="text-foreground font-medium">
                            {product.annual_fee === 0 ? 'No Annual Fee' : `$${product.annual_fee}/yr`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        {product.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-muted-foreground">{product.rating}</span>
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          className="gap-1.5 ml-auto"
                          onClick={() => {
                            if (product.affiliate_url) {
                              window.open(product.affiliate_url, '_blank');
                            } else {
                              toast.info('Application link coming soon');
                            }
                          }}
                        >
                          Apply Now
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6 text-center">
            * Approval and terms subject to issuer's review. CoinsBloom may receive compensation for referrals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditCardsSection;
