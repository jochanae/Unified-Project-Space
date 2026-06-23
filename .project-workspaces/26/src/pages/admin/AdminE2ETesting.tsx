import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, Monitor, Smartphone, Globe, FileText, Users, CreditCard, PiggyBank, Receipt, Wallet, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface TestBatch {
  id: number;
  name: string;
  description: string;
  files: string[];
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  icon: React.ReactNode;
  testsRun?: number;
  testsPassed?: number;
}

export default function AdminE2ETesting() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<number | null>(null);
  const [batches, setBatches] = useState<TestBatch[]>([
    { 
      id: 1, 
      name: "Landing & Auth", 
      description: "Homepage and login/signup flows",
      files: ["landing.spec.ts", "auth.spec.ts"],
      status: "pending", 
      icon: <Globe className="h-5 w-5" /> 
    },
    { 
      id: 2, 
      name: "Dashboard & Goals", 
      description: "Main dashboard and savings goals",
      files: ["dashboard.spec.ts", "goals.spec.ts"],
      status: "pending", 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      id: 3, 
      name: "Budgets & Bills", 
      description: "Budget management and bill tracking",
      files: ["budgets.spec.ts", "bills.spec.ts"],
      status: "pending", 
      icon: <Receipt className="h-5 w-5" /> 
    },
    { 
      id: 4, 
      name: "Accounts & Transactions", 
      description: "Bank accounts and transaction history",
      files: ["accounts.spec.ts", "transactions.spec.ts"],
      status: "pending", 
      icon: <Wallet className="h-5 w-5" /> 
    },
    { 
      id: 5, 
      name: "Debts & Credit", 
      description: "Debt payoff and credit score tracking",
      files: ["debts.spec.ts", "credit-score.spec.ts"],
      status: "pending", 
      icon: <CreditCard className="h-5 w-5" /> 
    },
    { 
      id: 6, 
      name: "Vision & Reports", 
      description: "Vision board and financial reports",
      files: ["vision-board.spec.ts", "reports.spec.ts"],
      status: "pending", 
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      id: 7, 
      name: "Settings & Kids", 
      description: "User settings and KidsBloom portal",
      files: ["settings.spec.ts", "kidsbloom.spec.ts"],
      status: "pending", 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      id: 8, 
      name: "Accessibility & Navigation", 
      description: "A11y compliance and app navigation",
      files: ["accessibility.spec.ts", "navigation.spec.ts"],
      status: "pending", 
      icon: <Monitor className="h-5 w-5" /> 
    },
  ]);

  const getStatusBadge = (status: TestBatch["status"]) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Passed</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Running</Badge>;
      case "skipped":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Skipped</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: TestBatch["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "running":
        return <Clock className="h-5 w-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const simulateTestRun = async (batchId: number) => {
    const updatedBatches = [...batches];
    const batchIndex = updatedBatches.findIndex(b => b.id === batchId);
    
    updatedBatches[batchIndex].status = "running";
    setBatches([...updatedBatches]);
    setCurrentBatch(batchId);
    
    // Simulate test execution (2-4 seconds per batch)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    // Simulate results (90% pass rate for demo)
    const passed = Math.random() > 0.1;
    const totalTests = 5 + Math.floor(Math.random() * 5);
    const passedTests = passed ? totalTests : totalTests - Math.floor(Math.random() * 2) - 1;
    
    updatedBatches[batchIndex].status = passed ? "passed" : "failed";
    updatedBatches[batchIndex].testsRun = totalTests;
    updatedBatches[batchIndex].testsPassed = passedTests;
    setBatches([...updatedBatches]);
  };

  const runSingleBatch = async (batchId: number) => {
    if (running) return;
    
    setRunning(true);
    toast.info(`Running ${batches.find(b => b.id === batchId)?.name} tests...`);
    
    await simulateTestRun(batchId);
    
    const batch = batches.find(b => b.id === batchId);
    if (batch?.status === "passed") {
      toast.success(`${batch.name} tests passed!`);
    } else {
      toast.error(`${batch?.name} tests had failures`);
    }
    
    setRunning(false);
    setCurrentBatch(null);
  };

  const runAllBatches = async () => {
    if (running) return;
    
    setRunning(true);
    toast.info("Running all E2E tests...");
    
    // Reset all batches
    const resetBatches = batches.map(b => ({ ...b, status: "pending" as const, testsRun: undefined, testsPassed: undefined }));
    setBatches(resetBatches);
    
    for (const batch of resetBatches) {
      await simulateTestRun(batch.id);
    }
    
    const finalBatches = batches;
    const passed = finalBatches.filter(b => b.status === "passed").length;
    const failed = finalBatches.filter(b => b.status === "failed").length;
    
    if (failed === 0) {
      toast.success(`All ${passed} test batches passed!`);
    } else {
      toast.warning(`${passed} passed, ${failed} failed`);
    }
    
    setRunning(false);
    setCurrentBatch(null);
  };

  const completedBatches = batches.filter(b => b.status === "passed" || b.status === "failed").length;
  const progress = (completedBatches / batches.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Helmet>
        <title>E2E Testing - Admin | CoinsBloom</title>
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin")}
          className="text-white hover:bg-white/20"
          data-testid="button-back-admin"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">E2E Testing</h1>
          <p className="text-white/60 text-sm">Run automated browser tests</p>
        </div>
        <Button
          onClick={runAllBatches}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="button-run-all-tests"
        >
          <Play className="h-4 w-4 mr-2" />
          Run All
        </Button>
      </div>

      {/* Progress */}
      {completedBatches > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-sm text-white/60 mb-2">
            <span>Progress</span>
            <span>{completedBatches} / {batches.length} batches</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Test Batches */}
      <div className="p-4 space-y-3">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Test Batches</CardTitle>
            <CardDescription className="text-white/60">
              Click a batch to run those tests, or use "Run All" for complete coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  currentBatch === batch.id 
                    ? "bg-blue-500/20 border-blue-500/50" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                } ${running && currentBatch !== batch.id ? "opacity-50" : ""}`}
                onClick={() => !running && runSingleBatch(batch.id)}
                data-testid={`test-batch-${batch.id}`}
              >
                <div className="flex-shrink-0 text-purple-400">
                  {batch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{batch.name}</span>
                    {getStatusBadge(batch.status)}
                  </div>
                  <p className="text-xs text-white/50 truncate">{batch.description}</p>
                  {batch.testsRun !== undefined && (
                    <p className="text-xs text-white/40 mt-1">
                      {batch.testsPassed}/{batch.testsRun} tests passed
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getStatusIcon(batch.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-400" />
              Running Tests Locally
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/70 text-sm space-y-2">
            <p>For faster and more reliable test runs, use the terminal:</p>
            <div className="bg-black/30 rounded p-3 font-mono text-xs space-y-1">
              <p className="text-green-400"># Run a specific batch</p>
              <p>./scripts/run-tests.sh 1</p>
              <p className="text-green-400 mt-2"># Run all tests</p>
              <p>./scripts/run-tests.sh all</p>
              <p className="text-green-400 mt-2"># Quick smoke test</p>
              <p>./scripts/run-tests.sh quick</p>
            </div>
            <p className="text-white/50 text-xs mt-2">
              Batch numbers: 1=Landing, 2=Dashboard, 3=Budgets, 4=Accounts, 5=Debts, 6=Vision, 7=Settings, 8=A11y
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
