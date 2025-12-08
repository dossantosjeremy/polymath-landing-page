import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeCheckProps {
  question: string;
  onUnderstand: () => void;
  onNeedMore: () => void;
  className?: string;
}

export function KnowledgeCheck({ 
  question, 
  onUnderstand, 
  onNeedMore,
  className 
}: KnowledgeCheckProps) {
  const [answered, setAnswered] = useState<'understand' | 'need_more' | null>(null);

  const handleUnderstand = () => {
    setAnswered('understand');
    onUnderstand();
  };

  const handleNeedMore = () => {
    setAnswered('need_more');
    onNeedMore();
  };

  if (answered === 'understand') {
    return (
      <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Great! You've mastered this concept. Ready to move on.
          </span>
        </CardContent>
      </Card>
    );
  }

  if (answered === 'need_more') {
    return (
      <Card className={cn("border-primary/30 bg-primary/5", className)}>
        <CardContent className="py-4 flex items-center gap-3">
          <ChevronDown className="h-5 w-5 text-primary animate-bounce" />
          <span className="text-sm text-primary font-medium">
            No problem! Check out the supplemental resources below for more clarity.
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-dashed border-2 border-muted-foreground/30", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Verify Your Understanding</h4>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{question}</p>
        <div className="flex gap-3">
          <Button 
            onClick={handleUnderstand}
            size="sm"
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            I understand this
          </Button>
          <Button 
            onClick={handleNeedMore}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            I need more explanation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
