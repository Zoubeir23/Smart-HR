import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { User, Palette, Bell, Shield, Mail, Phone, Moon, Sun, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

type SettingsSection = 'profil' | 'apparence' | 'notifications' | 'securite';

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionItem[] = [
  { id: 'profil', label: 'Mon Profil', icon: <User className="h-4 w-4" /> },
  { id: 'apparence', label: 'Apparence', icon: <Palette className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'securite', label: 'Sécurité', icon: <Shield className="h-4 w-4" /> },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RH: 'Responsable RH',
  EMPLOYEE: 'Employé',
  CANDIDATE: 'Candidat',
};

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profil');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [churnAlerts, setChurnAlerts] = useState(true);

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    tel: user?.tel ?? '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleProfileSave = async () => {
    if (!profileForm.first_name || !profileForm.last_name) {
      toast.error('Le prénom et le nom sont obligatoires.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUser({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        tel: profileForm.tel,
      });
      toast.success('Profil mis à jour avec succès.');
    } catch {
      toast.error('Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Mot de passe mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { old_password?: string[]; new_password2?: string[] } } };
      const detail =
        err.response?.data?.old_password?.[0] ||
        err.response?.data?.new_password2?.[0] ||
        'Erreur lors de la mise à jour du mot de passe.';
      toast.error(detail);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userInitials = user
    ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`
    : 'U';

  const renderSection = () => {
    switch (activeSection) {
      case 'profil':
        return (
          <motion.div
            key="profil"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-border shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-foreground">Mon Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {user?.first_name} {user?.last_name}
                    </h3>
                    <Badge className="bg-secondary/10 text-primary mt-1">
                      {user?.role ? roleLabels[user.role] || user.role : 'Utilisateur'}
                    </Badge>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first-name">Prénom</Label>
                      <Input
                        id="first-name"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last-name">Nom</Label>
                      <Input
                        id="last-name"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Adresse email
                      </div>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Téléphone
                      </div>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileForm.tel}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, tel: e.target.value }))}
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Input
                      id="role"
                      value={user?.role ? roleLabels[user.role] || user.role : ''}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-primary text-primary-foreground"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'apparence':
        return (
          <motion.div
            key="apparence"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-border shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-foreground">Apparence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Sun className="h-5 w-5 text-warning" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">Mode sombre</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === 'dark'
                          ? 'Le mode sombre est activé'
                          : 'Le mode clair est activé'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Le thème s'applique automatiquement à l'ensemble de l'application.
                    Votre préférence est sauvegardée localement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-border shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-foreground">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Notifications par email</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir les notifications importantes par email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Notifications push</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications push dans le navigateur
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Alertes churn</p>
                      <p className="text-sm text-muted-foreground">
                        Être alerté lorsqu'un employé présente un risque élevé de départ
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={churnAlerts}
                    onCheckedChange={setChurnAlerts}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'securite':
        return (
          <motion.div
            key="securite"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-border shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-foreground">Sécurité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Modifiez votre mot de passe pour sécuriser votre compte.
                </p>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Mot de passe actuel</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe actuel"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Entrez un nouveau mot de passe"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez le nouveau mot de passe"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-primary text-primary-foreground"
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre profil et les préférences de l'application
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="border border-border shadow-sm rounded-lg">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {section.icon}
                      {section.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {renderSection()}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
