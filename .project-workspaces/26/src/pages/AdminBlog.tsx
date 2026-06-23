import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface BlogFormData {
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  is_published: boolean;
}

const emptyForm: BlogFormData = {
  title: "", excerpt: "", content: "", cover_image_url: "",
  category: "general", is_published: false,
};

const AdminBlog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormData>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: BlogFormData) => {
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const payload = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt || null,
        content: formData.content,
        cover_image_url: formData.cover_image_url || null,
        author_name: "CoinsBloom Team",
        category: formData.category,
        tags: [],
        meta_title: formData.title,
        meta_description: formData.excerpt || null,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success(editingId ? "Post updated!" : "Post created!");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Post deleted");
    },
  });

  const openEdit = (post: any) => {
    setEditingId(post.id);
    setForm({
      title: post.title, excerpt: post.excerpt || "",
      content: post.content, cover_image_url: post.cover_image_url || "",
      category: post.category, is_published: post.is_published,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Blog Manager</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/blog" target="_blank"><Eye className="h-4 w-4 mr-1" /> View Blog</Link>
          </Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Post</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Post" : "New Post"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <Label>Short Summary</Label>
                  <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} placeholder="A brief summary shown on the blog listing..." />
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} required placeholder="Write your blog post here..." />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. budgeting, saving, kids" />
                </div>
                <div>
                  <Label>Cover Image URL</Label>
                  <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                  <Label>Published</Label>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Post" : "Create Post"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading posts...</p>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${post.is_published ? "bg-green-500" : "bg-yellow-500"}`} />
                    <h3 className="font-medium truncate">{post.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{post.slug} · {post.category} · {format(new Date(post.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(post.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No blog posts yet. Click "New Post" to get started.</p>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
