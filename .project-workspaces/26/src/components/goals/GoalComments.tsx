import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Send, MoreVertical, Edit, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    profile_image_url: string | null;
  };
  replies?: Comment[];
}

interface GoalCommentsProps {
  goalId: string;
}

const GoalComments = ({ goalId }: GoalCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
    setupRealtimeSubscription();
  }, [goalId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("goal_comments")
        .select("*")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        // Fetch profiles for all commenters
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", userIds);

        // Organize comments with replies
        const commentsWithProfiles = data.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id),
        }));

        // Separate root comments and replies
        const rootComments = commentsWithProfiles.filter((c) => !c.parent_id);
        const replies = commentsWithProfiles.filter((c) => c.parent_id);

        // Attach replies to their parent comments
        const organizedComments = rootComments.map((root) => ({
          ...root,
          replies: replies.filter((r) => r.parent_id === root.id),
        }));

        setComments(organizedComments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`goal-comments-${goalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_comments", filter: `goal_id=eq.${goalId}` },
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
      const { error } = await supabase.from("goal_comments").insert({
        goal_id: goalId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      });

      if (error) throw error;

      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
        setExpandedReplies((prev) => new Set(prev).add(parentId));
      } else {
        setNewComment("");
      }
      toast.success(parentId ? "Reply added" : "Comment added");
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
        .from("goal_comments")
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
        .from("goal_comments")
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
    return profile?.email || "Unknown User";
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-8 mt-3" : ""}`}>
      <div className={`flex gap-3 ${isReply ? "p-2" : "p-3"} rounded-lg ${isReply ? "bg-muted/30" : "bg-muted/50"}`}>
        <Avatar className={isReply ? "h-8 w-8" : ""}>
          <AvatarImage src={comment.profile?.profile_image_url || undefined} />
          <AvatarFallback>{getInitials(comment.profile)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{getName(comment.profile)}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
            {user?.id === comment.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}

          {!isReply && !editingId && (
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyContent("");
                }}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              {comment.replies && comment.replies.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => toggleReplies(comment.id)}
                >
                  {expandedReplies.has(comment.id) ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="ml-8 mt-2 flex gap-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button
            size="icon"
            onClick={() => handleSubmitComment(comment.id)}
            disabled={!replyContent.trim() || submitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
        <div className="space-y-2">
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
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-12 bg-muted rounded" />
                  </div>
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
          Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button
            size="icon"
            onClick={() => handleSubmitComment()}
            disabled={!newComment.trim() || submitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalComments;
