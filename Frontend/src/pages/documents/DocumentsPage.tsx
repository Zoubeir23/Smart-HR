import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Download,
  Trash2,
  Upload,
  Grid,
  List,
  Loader2,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { documentService } from '@/services/documentService';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/common/SearchableSelect';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { toast } from 'sonner';

type DocumentType = 'contract' | 'certificate' | 'attestation' | 'id_card' | 'other';

interface ApiDocument {
  id: number;
  employee: number;
  employee_name: string;
  name: string;
  document_type: DocumentType;
  file: string;
  uploaded_by: number | null;
  created_at: string;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contrat',
  certificate: 'Certificat',
  attestation: 'Attestation',
  id_card: "Carte d'identité",
  other: 'Autre',
};

const DOCUMENT_TYPE_BADGE_STYLES: Record<DocumentType, string> = {
  contract: 'bg-primary/20 text-primary border-primary/30',
  certificate: 'bg-destructive/20 text-destructive border-destructive/30',
  attestation: 'bg-success/20 text-success border-success/30',
  id_card: 'bg-warning/20 text-warning border-warning/30',
  other: 'bg-muted text-muted-foreground',
};

const CATEGORY_TABS = [
  { label: 'Tous', value: null },
  { label: 'Contrats', value: 'contract' },
  { label: 'Attestations', value: 'attestation' },
  { label: 'Certificats', value: 'certificate' },
  { label: "Cartes d'identité", value: 'id_card' },
  { label: 'Autres', value: 'other' },
] as const;

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  // Seuls RH/Admin gèrent les documents ; l'employé consulte les siens.
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    document_type: 'other' as DocumentType,
    employee: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.getAll(),
  });
  const documents: ApiDocument[] = data?.results ?? data ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
    enabled: isUploadDialogOpen,
  });
  const employees = employeesData?.results ?? employeesData ?? [];

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentService.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document téléversé avec succès.');
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ name: '', document_type: 'other', employee: '' });
    },
    onError: () => {
      toast.error('Erreur lors du téléversement.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document supprimé.');
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression.');
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!uploadForm.name) {
      setUploadForm((prev) => ({ ...prev, name: file.name.replace(/\.[^.]+$/, '') }));
    }
    setIsUploadDialogOpen(true);
  };

  const handleUploadSubmit = () => {
    if (!selectedFile || !uploadForm.name || !uploadForm.employee) {
      toast.error('Veuillez remplir tous les champs et sélectionner un fichier.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', uploadForm.name);
    formData.append('document_type', uploadForm.document_type);
    formData.append('employee', uploadForm.employee);
    uploadMutation.mutate(formData);
  };

  const handleDownload = (doc: ApiDocument) => {
    if (!doc.file) {
      toast.error('Fichier non disponible.');
      return;
    }
    window.open(doc.file, '_blank');
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.employee_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeTab === null || doc.document_type === activeTab;
    return matchesSearch && matchesCategory;
  });

  const { pageItems: pagedDocuments, currentPage, setCurrentPage, totalPages } = usePagination(filteredDocuments);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {canManage ? 'Gestion des Documents' : 'Mes documents'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {canManage
                ? 'Gérez et organisez les documents de vos collaborateurs'
                : 'Consultez vos documents personnels'}
            </p>
          </div>
          {canManage && (
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => {
                setIsUploadDialogOpen(true);
                setSelectedFile(null);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Ajouter un document
            </Button>
          )}
        </div>

        {/* Upload Drop Zone — réservé RH/Admin */}
        {canManage && (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Glissez-déposez vos fichiers ici
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ou cliquez pour parcourir (PDF, DOC, DOCX — max 10 Mo)
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Parcourir
          </Button>
        </div>
        )}

        {/* Search + View Mode */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.label}
              variant={activeTab === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} trouvé{filteredDocuments.length !== 1 ? 's' : ''}
        </p>

        {/* List View */}
        {viewMode === 'list' ? (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Document</TableHead>
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.employee_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(DOCUMENT_TYPE_BADGE_STYLES[doc.document_type])}>
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(doc.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pagedDocuments.map((doc) => (
              <Card key={doc.id} className="border border-border shadow-sm transition-all hover:border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{doc.employee_name || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className={cn(DOCUMENT_TYPE_BADGE_STYLES[doc.document_type])}>
                      {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(doc)}>
                      <Download className="mr-1 h-3 w-3" />
                      Télécharger
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setDeleteConfirmId(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Aucun document trouvé</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
            <Button className="mt-4" onClick={() => { setSearchQuery(''); setActiveTab(null); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}

        {/* Upload Dialog — réservé RH/Admin */}
        {canManage && (
        <Dialog open={isUploadDialogOpen} onOpenChange={(open) => { if (!open) { setIsUploadDialogOpen(false); setSelectedFile(null); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* File selector */}
              <div className="grid gap-2">
                <Label>Fichier</Label>
                {selectedFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-sm text-foreground">{selectedFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choisir un fichier
                  </Button>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Nom du document</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Contrat CDI 2025"
                />
              </div>

              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={uploadForm.document_type}
                  onValueChange={(value) => setUploadForm((prev) => ({ ...prev, document_type: value as DocumentType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Employé</Label>
                <SearchableSelect
                  value={uploadForm.employee}
                  onChange={(value) => setUploadForm((prev) => ({ ...prev, employee: value }))}
                  placeholder="Sélectionner un employé"
                  searchPlaceholder="Rechercher un employé…"
                  emptyText="Aucun employé trouvé."
                  options={(employees as Array<{ id: number; user: { first_name: string; last_name: string } }>).map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
                  }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsUploadDialogOpen(false); setSelectedFile(null); }}>
                Annuler
              </Button>
              <Button onClick={handleUploadSubmit} disabled={uploadMutation.isPending || !selectedFile}>
                {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Téléverser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}

        {/* Delete Confirmation Dialog — réservé RH/Admin */}
        {canManage && (
        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Supprimer le document</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. Le document sera définitivement supprimé.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
