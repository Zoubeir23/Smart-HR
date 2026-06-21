import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Bell, ClipboardList, Megaphone,
  Plus, Pencil, Trash2, Search, Check, X, Eye, EyeOff,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { communicationService, type InternalMessagePayload } from '@/services/communicationService';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type MessageType = 'memo' | 'note_service' | 'order' | 'circular';
type TargetAudience = 'all' | 'rh' | 'admin' | 'employee';

interface InternalMessageRecord {
  id: number;
  message_type: MessageType;
  message_type_display: string;
  title: string;
  content: string;
  category: string;
  target_audience: TargetAudience;
  target_audience_display: string;
  author: number | null;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

interface MessageForm {
  message_type: MessageType;
  title: string;
  content: string;
  category: string;
  target_audience: TargetAudience;
  is_published: boolean;
  published_at: string;
}

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: MessageForm = {
  message_type: 'memo',
  title: '',
  content: '',
  category: '',
  target_audience: 'all',
  is_published: false,
  published_at: today,
};

const MESSAGE_TYPE_CONFIG: Record<MessageType, { label: string; icon: typeof FileText; className: string }> = {
  memo:         { label: 'Mémorandum',       icon: Bell,          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  note_service: { label: 'Note de service',  icon: FileText,      className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200' },
  order:        { label: "Ordre de service", icon: ClipboardList, className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' },
  circular:     { label: 'Circulaire',       icon: Megaphone,     className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

function truncate(text: string, maxLength = 80): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export default function CommunicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<InternalMessageRecord | null>(null);
  const [form, setForm] = useState<MessageForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<InternalMessageRecord | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['communication', filterType, searchText],
    queryFn: () =>
      communicationService.getAll({
        ...(filterType !== 'all' && { message_type: filterType }),
        ...(searchText && { search: searchText }),
      }),
  });

  const records: InternalMessageRecord[] = data?.results ?? data ?? [];
  const { pageItems: pagedRecords, currentPage, setCurrentPage, totalPages } = usePagination(records);

  // KPIs
  const countByType = (type: MessageType) => records.filter((r) => r.message_type === type).length;
  const publishedCount = records.filter((r) => r.is_published).length;
  const draftCount = records.length - publishedCount;

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['communication'] });

  const createMutation = useMutation({
    mutationFn: communicationService.create,
    onSuccess: () => { toast({ title: 'Message créé' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<InternalMessagePayload> }) =>
      communicationService.update(id, payload),
    onSuccess: () => { toast({ title: 'Message mis à jour' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: communicationService.delete,
    onSuccess: () => { toast({ title: 'Message supprimé' }); invalidate(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      communicationService.update(id, {
        is_published,
        ...(is_published ? { published_at: today } : {}),
      }),
    onSuccess: (_, { is_published }) => {
      toast({ title: is_published ? 'Message publié' : 'Message dépublié' });
      invalidate();
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(record: InternalMessageRecord) {
    setEditTarget(record);
    setForm({
      message_type:   record.message_type,
      title:          record.title,
      content:        record.content,
      category:       record.category ?? '',
      target_audience: record.target_audience,
      is_published:   record.is_published,
      published_at:   record.published_at ?? today,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    const payload: InternalMessagePayload = {
      message_type:    form.message_type,
      title:           form.title.trim(),
      content:         form.content.trim(),
      category:        form.category.trim(),
      target_audience: form.target_audience,
      is_published:    form.is_published,
      published_at:    form.is_published ? form.published_at || today : null,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const canSubmit =
    form.title.trim().length > 0 &&
    form.content.trim().length > 0;

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────
  const kpiCards = [
    { label: 'Mémorandums',      type: 'memo'         as MessageType, icon: Bell },
    { label: 'Notes de service', type: 'note_service' as MessageType, icon: FileText },
    { label: 'Ordres de service',type: 'order'        as MessageType, icon: ClipboardList },
    { label: 'Circulaires',      type: 'circular'     as MessageType, icon: Megaphone },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Communication Interne</h1>
            <p className="text-sm text-muted-foreground">
              Mémorandums, notes et ordres de service à l'intention du personnel
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau message
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map(({ label, type, icon: Icon }) => (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', MESSAGE_TYPE_CONFIG[type].className)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{countByType(type)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats badges */}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              {publishedCount} publié{publishedCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              {draftCount} brouillon{draftCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, contenu ou rubrique…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="memo">Mémorandums</SelectItem>
              <SelectItem value="note_service">Notes de service</SelectItem>
              <SelectItem value="order">Ordres de service</SelectItem>
              <SelectItem value="circular">Circulaires</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Rubrique</TableHead>
                <TableHead>Destinataires</TableHead>
                <TableHead>Date publication</TableHead>
                <TableHead>Auteur</TableHead>
                {canEdit && <TableHead>Statut</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : pagedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    Aucun message trouvé
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map((record) => {
                  const config = MESSAGE_TYPE_CONFIG[record.message_type];
                  const Icon = config.icon;
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge className={cn('gap-1.5 font-medium', config.className)}>
                          <Icon className="h-3 w-3" />
                          {record.message_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="font-medium leading-snug">{record.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {truncate(record.content)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {record.category ? (
                          <Badge variant="outline" className="text-xs">{record.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record.target_audience_display}</TableCell>
                      <TableCell className="text-sm">{formatDate(record.published_at ?? record.created_at)}</TableCell>
                      <TableCell className="text-sm">{record.author_name}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Switch
                            checked={record.is_published}
                            onCheckedChange={(checked) =>
                              togglePublishMutation.mutate({ id: record.id, is_published: checked })
                            }
                            aria-label="Publier"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewRecord(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(record)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Create / Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editTarget ? 'Modifier le message' : 'Nouveau message interne'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select
                    value={form.message_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, message_type: v as MessageType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="memo">Mémorandum</SelectItem>
                      <SelectItem value="note_service">Note de service</SelectItem>
                      <SelectItem value="order">Ordre de service</SelectItem>
                      <SelectItem value="circular">Circulaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Destinataires *</Label>
                  <Select
                    value={form.target_audience}
                    onValueChange={(v) => setForm((f) => ({ ...f, target_audience: v as TargetAudience }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout le personnel</SelectItem>
                      <SelectItem value="rh">Équipe RH</SelectItem>
                      <SelectItem value="admin">Administration</SelectItem>
                      <SelectItem value="employee">Employés uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msg-title">Titre *</Label>
                <Input
                  id="msg-title"
                  placeholder="Objet du message"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msg-category">Rubrique</Label>
                <Input
                  id="msg-category"
                  placeholder="Ex : Ponctualité, Sécurité, RH…"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msg-content">Contenu *</Label>
                <Textarea
                  id="msg-content"
                  placeholder="Corps du message…"
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Publier maintenant</p>
                  <p className="text-xs text-muted-foreground">
                    Les destinataires pourront voir ce message immédiatement
                  </p>
                </div>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_published: checked }))}
                />
              </div>

              {form.is_published && (
                <div className="space-y-1.5">
                  <Label htmlFor="msg-pub-date">Date de publication</Label>
                  <Input
                    id="msg-pub-date"
                    type="date"
                    value={form.published_at}
                    onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeForm}>
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isMutating}>
                <Check className="mr-2 h-4 w-4" />
                {editTarget ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog (lecture) */}
        <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
          <DialogContent className="max-w-2xl">
            {viewRecord && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('gap-1.5', MESSAGE_TYPE_CONFIG[viewRecord.message_type].className)}>
                      {(() => { const Icon = MESSAGE_TYPE_CONFIG[viewRecord.message_type].icon; return <Icon className="h-3 w-3" />; })()}
                      {viewRecord.message_type_display}
                    </Badge>
                    {viewRecord.category && (
                      <Badge variant="outline" className="text-xs">{viewRecord.category}</Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">{viewRecord.title}</DialogTitle>
                  <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                    <p>Destinataires : <strong>{viewRecord.target_audience_display}</strong></p>
                    <p>
                      Publié le {formatDate(viewRecord.published_at ?? viewRecord.created_at)} par {viewRecord.author_name}
                    </p>
                  </div>
                </DialogHeader>
                <div className="border-t pt-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{viewRecord.content}</p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le message sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
