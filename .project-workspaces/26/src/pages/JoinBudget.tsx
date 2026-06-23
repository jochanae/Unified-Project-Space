import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const JoinBudget = () => {
  const navigate = useNavigate();
  const { budgetId } = useParams<{ budgetId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budgetId) {
      fetchBudget();
    }
  }, [budgetId, user]);

  const fetchBudget = async () => {
    try {
      // Fetch budget details
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("id, name, category, amount, period, user_id")
        .eq("id", budgetId)
        .single();

      if (budgetError || !budgetData) {
        setError("Budget not found or invitation has expired");
        setLoading(false);
        return;
      }

      setBudget(budgetData);

      // Check if user is already a member
      if (user) {
        if (budgetData.user_id === user.id) {
          setAlreadyMember(true);
        } else {
          const { data: collaboration } = await supabase
            .from("budget_collaborators")
            .select("id")
            .eq("budget_id", budgetId)
            .eq("user_id", user.id)
            .single();

          if (collaboration) {
            setAlreadyMember(true);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching budget:", err);
      setError("Failed to load budget details");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/budgets/join/${budgetId}`);
      return;
    }

    setJoining(true);
    try {
      // Add as collaborator
      const { error: joinError } = await supabase
        .from("budget_collaborators")
        .insert({
          budget_id: budgetId,
          user_id: user.id,
          role: "viewer",
        });

      if (joinError) {
        if (joinError.code === "23505") {
          toast.error("You're already a member of this budget");
        } else {
          throw joinError;
        }
        return;
      }

      // Log activity
      await supabase.from("budget_activity").insert({
        budget_id: budgetId,
        user_id: user.id,
        activity_type: "collaborator_joined",
        description: "Joined the budget via invite link",
      });

      toast.success("Successfully joined the budget!");
      navigate(`/budgets/${budgetId}`);
    } catch (err) {
      console.error("Error joining budget:", err);
      toast.error("Failed to join budget");
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading budget..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/budgets")}>
              Go to Budgets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Already a Member!</h2>
            <p className="text-muted-foreground mb-6">
              You're already part of "{budget?.name}"
            </p>
            <Button onClick={() => navigate(`/budgets/${budgetId}`)}>
              View Budget
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-4">
      <Helmet>
        <title>Join Budget | CoinsBloom</title>
        <meta name="description" content="Join a collaborative budget on CoinsBloom" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You're Invited!</h1>
            <p className="text-muted-foreground">
              Join this collaborative budget
            </p>
          </div>

          {budget && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-lg mb-2">{budget.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  {budget.category}
                </Badge>
                <Badge variant="secondary">
                  {budget.period}
                </Badge>
                <Badge variant="secondary">
                  ${Number(budget.amount).toLocaleString()} budget
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {!user ? (
              <>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Sign in or create an account to join this budget
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                  onClick={handleJoin}
                >
                  Sign In to Join
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Join Budget
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinBudget;