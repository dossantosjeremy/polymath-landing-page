import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importDisciplinesFromCSV } from "@/scripts/importDisciplines";
import { Upload } from "lucide-react";

export const DisciplineImporter = () => {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await importDisciplinesFromCSV(text);

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.count} disciplines successfully!`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "Failed to import disciplines. Please try again."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "An error occurred during import."
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6">
      <label htmlFor="csv-upload">
        <Button
          disabled={importing}
          className="rounded-full h-14 px-6 shadow-lg gap-2"
          asChild
        >
          <span>
            <Upload className="h-5 w-5" />
            {importing ? "Importing..." : "Import Disciplines CSV"}
          </span>
        </Button>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={importing}
        />
      </label>
    </div>
  );
};
