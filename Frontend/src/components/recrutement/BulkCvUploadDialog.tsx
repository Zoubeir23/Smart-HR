import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { recruitmentService, BulkCvUploadResult } from '@/services/recruitmentService';
import { useToast } from '@/hooks/use-toast';

interface BulkCvUploadDialogProps {
  jobOfferId: number;
  jobOfferTitle: string;
}

export default function BulkCvUploadDialog({ jobOfferId, jobOfferTitle }: BulkCvUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<BulkCvUploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: () => recruitmentService.bulkUploadCvs(jobOfferId, files),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['applications-management'] });
      toast({ title: `${data.created} candidat(s) ajouté(s) et scoré(s) par IA.` });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'analyser les CVs.", variant: 'destructive' });
    },
  });

  function resetAndClose() {
    setOpen(false);
    setFiles([]);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Ajouter des CVs (IA)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ajout de CVs en masse — {jobOfferTitle}
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chaque CV est analysé par IA : identité du candidat extraite, compétences détectées, score de
              correspondance calculé, et candidature créée automatiquement sur cette offre.
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-muted/40">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Cliquez pour sélectionner des CVs (PDF)'}
              </span>
              <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} aria-label="Retirer">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.created} candidat(s) sur {result.total_files} ajouté(s) et scoré(s).
            </div>
            {result.errors.length > 0 && (
              <ul className="space-y-1.5">
                {result.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>{error.filename}</strong> : {error.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button onClick={() => uploadMutation.mutate()} disabled={files.length === 0 || uploadMutation.isPending} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {uploadMutation.isPending ? 'Analyse en cours…' : `Analyser ${files.length || ''} CV(s)`}
            </Button>
          ) : (
            <Button onClick={resetAndClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
