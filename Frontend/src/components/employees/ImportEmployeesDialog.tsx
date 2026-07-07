import { useRef, useState } from 'react';
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { employeeService, BulkImportResult } from '@/services/employeeService';

interface ImportEmployeesDialogProps {
  onImported: () => void;
}

export default function ImportEmployeesDialog({ onImported }: ImportEmployeesDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await employeeService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modele_import_employes.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de télécharger le modèle.', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setResult(null);
    try {
      const data = await employeeService.importEmployees(selectedFile);
      setResult(data);
      if (data.created > 0) {
        toast({ title: 'Import terminé', description: `${data.created} employé(s) créé(s).` });
        onImported();
      }
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'importer le fichier. Vérifiez son format.", variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
          <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
          Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des employés en masse</DialogTitle>
          <DialogDescription>
            Déposez un fichier CSV ou XLSX. Chaque ligne valide crée un compte et une fiche employé ; les
            lignes en erreur sont détaillées ci-dessous sans bloquer les autres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Télécharger le modèle CSV
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
          />

          {result && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                {result.created} employé(s) créé(s) sur {result.total_rows} ligne(s)
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} ligne(s) en erreur
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {result.errors.map((error) => (
                      <li key={error.row}>
                        Ligne {error.row} ({error.email || 'sans email'}) — {error.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <Button onClick={handleImport} disabled={!selectedFile || isImporting} className="gap-2">
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
