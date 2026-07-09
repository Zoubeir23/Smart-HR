import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PenLine, Eraser, Plus, X, Check, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import {
  signatureService, type Signature, type SignatureRequest, type SignatureRequestStatus,
} from '@/services/documentService';
import { documentService } from '@/services/documentService';
import { employeeService } from '@/services/employeeService';

interface SignaturesTabProps {
  canManage: boolean;
}

interface DocumentOption {
  id: number;
  name: string;
  employee_name: string;
}

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

const STATUS_BADGE_STYLES: Record<SignatureRequestStatus, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  signed: 'bg-success/20 text-success border-success/30',
  declined: 'bg-destructive/10 text-destructive border-destructive/30',
};

function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  function getContext() {
    const canvas = canvasRef.current;
    return canvas?.getContext('2d') ?? null;
  }

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = getPosition(event);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    isDrawing.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full max-w-md touch-none rounded-lg border border-border bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleClear}>
          <Eraser className="h-3.5 w-3.5" />
          Effacer
        </Button>
        <Button size="sm" className="gap-1.5" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
          Enregistrer ma signature
        </Button>
      </div>
    </div>
  );
}

export default function SignaturesTab({ canManage }: SignaturesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedSignatory, setSelectedSignatory] = useState('');

  const { data: mySignature, isLoading: isLoadingSignature } = useQuery({
    queryKey: ['signature', 'me'],
    queryFn: signatureService.getMine,
  });

  const { data: requestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['signature-requests'],
    queryFn: signatureService.getAllRequests,
  });
  const requests: SignatureRequest[] = requestsData?.results ?? requestsData ?? [];

  const { data: documentsData } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: () => documentService.getAll(),
    enabled: canManage,
  });
  const documents: DocumentOption[] = documentsData?.results ?? documentsData ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll(),
    enabled: canManage,
  });
  const employees: EmployeeOption[] = employeesData?.results ?? employeesData ?? [];

  const saveMutation = useMutation({
    mutationFn: signatureService.saveMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature', 'me'] });
      toast({ title: 'Signature enregistrée' });
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible d'enregistrer la signature.", variant: 'destructive' }),
  });

  const createRequestMutation = useMutation({
    mutationFn: signatureService.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      toast({ title: 'Demande de signature envoyée' });
      setShowRequestForm(false);
      setSelectedDocument('');
      setSelectedSignatory('');
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible d'envoyer la demande.", variant: 'destructive' }),
  });

  const signMutation = useMutation({
    mutationFn: signatureService.sign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      toast({ title: 'Document signé' });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Impossible de signer — avez-vous déposé votre signature ci-dessus ?";
      toast({ title: 'Erreur', description, variant: 'destructive' });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => signatureService.decline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      toast({ title: 'Demande refusée' });
    },
  });

  const documentOptions = documents.map((d) => ({ value: String(d.id), label: `${d.name} (${d.employee_name})` }));
  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.user_full_name }));

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Ma signature électronique</p>
          </div>
          {isLoadingSignature ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : mySignature ? (
            <div className="space-y-2">
              <img src={mySignature.image_data} alt="Signature enregistrée" className="h-24 rounded-lg border border-border bg-white p-2" />
              <p className="text-xs text-muted-foreground">Vous pouvez la remplacer en dessinant une nouvelle signature ci-dessous.</p>
              <SignaturePad onSave={(dataUrl) => saveMutation.mutate(dataUrl)} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Dessinez votre signature pour pouvoir signer des documents.</p>
              <SignaturePad onSave={(dataUrl) => saveMutation.mutate(dataUrl)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Demandes de signature de documents</p>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowRequestForm((prev) => !prev)}>
            {showRequestForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showRequestForm ? 'Annuler' : 'Nouvelle demande'}
          </Button>
        )}
      </div>

      {showRequestForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Document</Label>
              <SearchableSelect options={documentOptions} value={selectedDocument} onChange={setSelectedDocument} placeholder="Choisir un document" />
            </div>
            <div className="space-y-1">
              <Label>Signataire</Label>
              <SearchableSelect options={employeeOptions} value={selectedSignatory} onChange={setSelectedSignatory} placeholder="Choisir un signataire" />
            </div>
            <Button
              size="sm"
              disabled={!selectedDocument || !selectedSignatory || createRequestMutation.isPending}
              onClick={() => createRequestMutation.mutate({ document: Number(selectedDocument), signatory: Number(selectedSignatory) })}
            >
              Envoyer la demande
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoadingRequests && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoadingRequests && requests.length === 0 && !showRequestForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <PenLine className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune demande de signature.</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="border border-border">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{request.document_name}</p>
                <p className="text-xs text-muted-foreground">
                  Demandé par {request.requested_by_name} · Signataire : {request.signatory_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_BADGE_STYLES[request.status]}>
                  {request.status_display}
                </Badge>
                {request.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => signMutation.mutate(request.id)}
                      disabled={signMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Signer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => declineMutation.mutate(request.id)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Refuser
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
