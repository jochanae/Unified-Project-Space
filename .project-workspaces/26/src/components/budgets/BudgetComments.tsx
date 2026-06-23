import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Reply, Trash2, Edit2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    profile_image_url: string | null;
  };
  replies?: Comment[];
}

interface BudgetCommentsProps {
  budgetId: string;
}

const BudgetComments = ({ budgetId }: BudgetCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    setupRealtimeSubscription();
  }, [budgetId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_comments")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", userIds);

        const commentsWithProfiles = data.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id),
        }));

        // Build tree structure
        const topLevel = commentsWithProfiles.filter((c) => !c.parent_id);
        const withReplies = topLevel.map((comment) => ({
          ...comment,
          replies: commentsWithProfiles.filter((c) => c.parent_id === comment.id),
        }));

        setComments(withReplies);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`budget-comments-${budgetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_comments", filter: `budget_id=eq.${budgetId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async (parentId?: string) => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("budget_comments").insert({
        budget_id: budgetId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      });

      if (error) throw error;

      // Log activity
      await supabase.from("budget_activity").insert({
        budget_id: budgetId,
        user_id: user.id,
        activity_type: "comment_added",
        description: parentId ? "Replied to a comment" : "Added a comment",
      });

      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from("budget_comments")
        .update({ content: editContent.trim() })
        .eq("id", commentId);

      if (error) throw error;
      setEditingId(null);
      setEditContent("");
      toast.success("Comment updated");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("budget_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const getInitials = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (profile?.email) return profile.email[0].toUpperCase();
    return "?";
  };

  const getName = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return profile?.email || "Unknown";
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-8 border-l-2 pl-4" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profile?.profile_image_url || undefined} />
          <AvatarFallback className="text-xs">{getInitials(comment.profile)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{getName(comment.profile)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>

          {editingId === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditComment(comment.id)}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{comment.content}</p>
          )}

          {!editingId && (
            <div className="flex gap-2 mt-2">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    setReplyContent("");
                  }}
                  className="h-7 text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              {user?.id === comment.user_id && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="h-7 text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-7 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSubmitComment(comment.id)} disabled={submitting}>
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment input */}
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">You</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
            />
            <Button 
              size="sm" 
              onClick={() => handleSubmitComment()} 
              disabled={submitting || !newComment.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Post
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4 pt-4 border-t">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No comments yet. Start the conversation!
            </p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetComments;