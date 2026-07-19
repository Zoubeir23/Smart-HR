import { FileText, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeeDocument {
  id: number;
  name: string;
  document_type: string;
  file: string;
  created_at: string;
}

interface EmployeeDocumentsCardProps {
  documents: EmployeeDocument[];
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (documentId: number) => void;
}

export function EmployeeDocumentsCard({ documents, onUpload, onDelete }: EmployeeDocumentsCardProps) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Archivage électronique (GED)
        </CardTitle>
        <label className="cursor-pointer">
          <input type="file" className="sr-only" onChange={onUpload} />
          <Button variant="outline" size="sm" className="gap-1 pointer-events-none">
            <Upload className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </label>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun document archivé.</p>
        )}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
