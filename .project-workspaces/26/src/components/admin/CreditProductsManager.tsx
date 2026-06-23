import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, CreditCard, Star, Trash2, Edit2, Landmark, PiggyBank, Baby, TrendingUp, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AddCreditProductModal from "./modals/AddCreditProductModal";

const CATEGORIES = [
  { id: "all", label: "All", icon: CreditCard },
  { id: "credit_cards", label: "Credit Cards", icon: CreditCard },
  { id: "loans", label: "Loans", icon: Landmark },
  { id: "banking", label: "Banking", icon: PiggyBank },
  { id: "kids", label: "Kids", icon: Baby },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "insurance", label: "Insurance", icon: Shield },
];

export default function CreditProductsManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("credit_products").select("*").order("display_order");
    if (data) setProducts(data);
    setLoading(false);
  };

  const toggleActive = async (id: string, status: boolean) => {
    await supabase.from("credit_products").update({ is_active: !status }).eq("id", id);
    setProducts(products.map((p) => (p.id === id ? { ...p, is_active: !status } : p)));
    toast.success("Updated");
  };

  const toggleFeatured = async (id: string, status: boolean) => {
    await supabase.from("credit_products").update({ is_featured: !status }).eq("id", id);
    setProducts(products.map((p) => (p.id === id ? { ...p, is_featured: !status } : p)));
    toast.success("Updated");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("credit_products").delete().eq("id", id);
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Deleted");
  };

  const openEdit = (product: any) => {
    setEditData(product);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditData(null);
    setShowModal(true);
  };

  const filteredProducts = activeCategory === "all" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return products.length;
    return products.filter(p => p.category === categoryId).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Credit Products</h3>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const Icon = cat.icon;
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cat.label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="space-y-2">
            {loading ? (
              <div className="text-white/60 text-center py-8">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-white/60 text-center py-8">
                No products in this category
                <Button variant="link" onClick={openAdd} className="block mx-auto mt-2">
                  Add one now
                </Button>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card key={product.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Thumbnail */}
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="h-12 w-18 min-w-[72px] object-cover rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="h-12 w-18 min-w-[72px] bg-white/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-medium truncate">{product.name}</h3>
                        {product.is_featured && (
                          <Badge className="bg-amber-500/20 text-amber-400 shrink-0">
                            <Star className="h-3 w-3 mr-1" />Featured
                          </Badge>
                        )}
                        {!product.is_active && (
                          <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-white/60 text-sm truncate">
                        {product.issuer} • {product.apr_range || "N/A"} • ${product.annual_fee}/yr
                      </p>
                      {product.affiliate_url && (
                        <p className="text-emerald-400/60 text-xs flex items-center gap-1 mt-0.5">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{product.affiliate_url}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEdit(product)}
                        className="text-white/60 hover:text-white h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleFeatured(product.id, product.is_featured)} 
                        className={product.is_featured ? "text-amber-400" : "text-white/40"}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Switch 
                        checked={product.is_active} 
                        onCheckedChange={() => toggleActive(product.id, product.is_active)} 
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-400 hover:text-red-300 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddCreditProductModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={fetchProducts}
        editData={editData}
      />
    </div>
  );
}