import { motion } from 'framer-motion';
import { User, Mail, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/**
 * Page Mon Profil — Informations personnelles
 */
export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    RH: 'Responsable RH',
    EMPLOYEE: 'Employé',
    CANDIDATE: 'Candidat',
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Mon profil"
          description="Vos informations personnelles et préférences"
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {user.first_name[0]}
                  {user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {user.first_name} {user.last_name}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {roleLabels[user.role] ?? user.role}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rôle</p>
                <p className="font-medium">{roleLabels[user.role] ?? user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
  );
}
