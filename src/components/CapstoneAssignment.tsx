import { useEffect } from 'react';
import { Award, FileText, Clock, Users, Briefcase, ExternalLink, Paperclip, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCapstoneAssignment } from '@/hooks/useCapstoneAssignment';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CapstoneAssignmentProps {
  stepTitle: string;
  discipline: string;
  syllabusUrls?: string[];
}

export const CapstoneAssignment = ({ stepTitle, discipline, syllabusUrls = [] }: CapstoneAssignmentProps) => {
  const { assignment, isLoading, error, fetchAssignment } = useCapstoneAssignment();

  useEffect(() => {
    // Auto-load on mount
    fetchAssignment(stepTitle, discipline, syllabusUrls);
  }, [stepTitle, discipline]);

  const getSourceBadgeColor = (tier: string) => {
    switch (tier) {
      case 'extraction':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'oer_search':
        return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20';
      case 'bok_synthesis':
        return 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getFormatIcon = (format: string) => {
    const lower = format.toLowerCase();
    if (lower.includes('code')) return '💻';
    if (lower.includes('pdf') || lower.includes('essay')) return '📄';
    if (lower.includes('image')) return '🖼️';
    return '📝';
  };

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-[hsl(var(--gold))]" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load capstone assignment: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => fetchAssignment(stepTitle, discipline, syllabusUrls, true)}
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-[hsl(var(--gold))] flex-shrink-0" />
              <h3 className="text-xl font-semibold">🎯 Drill: {assignment.assignmentName}</h3>
            </div>
            <Badge className={`${getSourceBadgeColor(assignment.sourceTier)} flex items-center gap-1.5 px-3 py-1`}>
              {assignment.sourceTier === 'bok_synthesis' && '✨'}
              Source: {assignment.sourceLabel}
              {assignment.sourceUrl && (
                <a 
                  href={assignment.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </Badge>
          </div>
        </div>

        {/* Scenario Box */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Why This Matters:</strong> {assignment.scenario}
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Assignment Instructions
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            {assignment.instructions.map((instruction, idx) => (
              <li key={idx} className="text-sm leading-relaxed pl-2">
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        {/* Resource Attachments */}
        {assignment.resourceAttachments && assignment.resourceAttachments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Resource Attachments
            </h4>
            <div className="space-y-2">
              {assignment.resourceAttachments.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {resource.title}
                  {resource.pageRef && (
                    <span className="text-xs text-muted-foreground">({resource.pageRef})</span>
                  )}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Role & Audience (for Bok-synthesized assignments) */}
        {(assignment.role || assignment.audience) && (
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            {assignment.role && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline">{assignment.role}</Badge>
              </div>
            )}
            {assignment.audience && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Audience:</span>
                <Badge variant="outline">{assignment.audience}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Deliverable Specs Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{getFormatIcon(assignment.deliverableFormat)}</span>
              <span className="font-medium">{assignment.deliverableFormat}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Est. Time: {assignment.estimatedTime}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
