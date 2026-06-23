import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Shield, FileText, AlertCircle } from 'lucide-react';

const bureaus = [
  {
    name: 'Experian',
    url: 'https://www.experian.com',
    description: 'Check your Experian credit report and score',
    color: 'from-blue-600 to-blue-700',
    textColor: 'text-blue-400',
  },
  {
    name: 'Equifax',
    url: 'https://www.equifax.com',
    description: 'Access your Equifax credit report',
    color: 'from-red-600 to-red-700',
    textColor: 'text-red-400',
  },
  {
    name: 'TransUnion',
    url: 'https://www.transunion.com',
    description: 'View your TransUnion credit report',
    color: 'from-cyan-600 to-cyan-700',
    textColor: 'text-cyan-400',
  },
];

const resources = [
  {
    name: 'AnnualCreditReport.com',
    url: 'https://www.annualcreditreport.com',
    description: 'Free credit reports from all three bureaus (federally mandated)',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    name: 'Credit Freeze',
    url: 'https://www.usa.gov/credit-freeze',
    description: 'Learn how to freeze your credit for protection',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    name: 'Fraud Alerts',
    url: 'https://www.identitytheft.gov',
    description: 'Report identity theft and get a recovery plan',
    icon: <AlertCircle className="h-5 w-5" />,
  },
];

const CreditBureauLinks = () => {
  return (
    <div className="space-y-6">
      {/* Section Header with Color Accent */}
      <div className="flex items-center gap-3 pb-2 border-b border-blue-500/30">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Credit Resources</h2>
          <p className="text-sm text-muted-foreground">Access bureaus and protect your credit</p>
        </div>
      </div>

      {/* Credit Bureaus */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Credit Bureaus
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bureaus.map((bureau, index) => (
            <motion.div
              key={bureau.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${bureau.color} border-0 text-white overflow-hidden relative group`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <CardContent className="p-5 relative z-10">
                  <h4 className="text-xl font-bold mb-1">{bureau.name}</h4>
                  <p className="text-white/80 text-sm mb-4">{bureau.description}</p>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
                    onClick={() => window.open(bureau.url, '_blank')}
                  >
                    Visit Site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Helpful Resources */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" />
          Helpful Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              <Card 
                className="bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/20 cursor-pointer group"
                onClick={() => window.open(resource.url, '_blank')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      {resource.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {resource.name}
                        <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditBureauLinks;
