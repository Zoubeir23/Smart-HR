import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Download,
  Trash2,
  Upload,
  Filter,
  Grid,
  List,
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
import { cn } from '@/lib/utils';
import { documentService } from '@/services/documentService';

type DocumentCategory = 'Contrat' | 'Attestation' | 'Fiche de paie' | 'Certificat';

interface Document {
  id: number;
  name: string;
  category: DocumentCategory;
  date: string;
  size: string;
  employee: string;
}

const categoryTabs = ['Tous', 'Contrats', 'Attestations', 'Fiches de paie', 'Certificats'] as const;

const categoryBadgeStyles: Record<DocumentCategory, string> = {
  'Contrat': 'bg-primary/20 text-primary border-primary/30',
  'Attestation': 'bg-success/20 text-success border-success/30',
  'Fiche de paie': 'bg-warning/20 text-warning border-warning/30',
  'Certificat': 'bg-destructive/20 text-destructive border-destructive/30',
};

const tabToCategoryMap: Record<string, DocumentCategory | null> = {
  'Tous': null,
  'Contrats': 'Contrat',
  'Attestations': 'Attestation',
  'Fiches de paie': 'Fiche de paie',
  'Certificats': 'Certificat',
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Tous');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => documentService.getAll() });
  const documents: Document[] = data?.results || data || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.employee.toLowerCase().includes(searchQuery.toLowerCase());

    const mappedCategory = tabToCategoryMap[activeTab];
    const matchesCategory = mappedCategory === null || doc.category === mappedCategory;

    return matchesSearch && matchesCategory;
  });

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
              Gestion des Documents
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gerez et organisez les documents de vos collaborateurs
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground">
            <Upload className="mr-2 h-4 w-4" />
            Ajouter un document
          </Button>
        </div>

        {/* Upload Zone */}
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Glissez-deposez vos fichiers ici
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ou cliquez pour parcourir (PDF, DOC, DOCX - max 10 Mo)
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Parcourir
          </Button>
        </div>

        {/* Search + Category Tabs + View Mode */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {categoryTabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={
                activeTab === tab ? 'bg-primary text-primary-foreground' : ''
              }
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}{' '}
          trouve{filteredDocuments.length > 1 ? 's' : ''}
        </p>

        {/* Documents List View */}
        {viewMode === 'list' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Document</TableHead>
                  <TableHead>Employe</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">
                          {doc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.employee}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={categoryBadgeStyles[doc.category]}
                      >
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.size}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        ) : (
          /* Documents Grid View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="border border-border shadow-sm transition-all hover:border-primary"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {doc.employee}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={categoryBadgeStyles[doc.category]}
                    >
                      {doc.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {doc.size}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(doc.date).toLocaleDateString('fr-FR')}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="mr-1 h-3 w-3" />
                      Telecharger
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Aucun document trouve
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez de modifier vos criteres de recherche
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('Tous');
              }}
            >
              Reinitialiser les filtres
            </Button>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
