import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ThanksPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const [confettiShown, setConfettiShown] = useState(false);

  useEffect(() => {
    setConfettiShown(true);
    document.title = 'Thank you — Order Confirmed';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-lg w-full p-8 text-center space-y-6 backdrop-blur-xl border-primary/20">
        <div className="flex justify-center">
          <div className={`rounded-full bg-primary/10 p-4 transition-all duration-700 ${confettiShown ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Order confirmed</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. A receipt has been sent to your email.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          {pageId && (
            <Button asChild variant="outline">
              <Link to={`/p/${pageId}`}>
                Return to page <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
