import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Clock, BookOpen, X } from "lucide-react";

interface ArticleReaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  author?: string;
  domain?: string;
  content: string;
  url: string;
  readingTime?: string;
}

export function ArticleReaderDialog({
  open,
  onOpenChange,
  title,
  author,
  domain,
  content,
  url,
  readingTime
}: ArticleReaderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-xl font-semibold line-clamp-2 break-words">
                {title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {author && <span>by {author}</span>}
                {domain && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{domain}</span>
                  </>
                )}
                {readingTime && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {readingTime}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Original
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <article className="py-6 max-w-prose mx-auto">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:text-foreground
                prose-p:text-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4
                prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-img:rounded-lg prose-img:shadow-md
                prose-li:text-foreground"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>
        </ScrollArea>
        
        <div className="px-6 py-4 border-t shrink-0 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Reading view • Content may be abridged</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
