import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Upload,
  CheckCircle,
  Send
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormData {
  nom: string;
  email: string;
  telephone: string;
  lettreMotivation: string;
  cv: File | null;
}

const ApplyPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    telephone: '',
    lettreMotivation: '',
    cv: null
  });

  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Mock job offer data
  const jobOffer = {
    id: jobId,
    title: 'Développeur Backend Django',
    department: 'Département IT',
    location: 'Dakar, Sénégal',
    salaryRange: '800 000 - 1 200 000 FCFA',
    description: 'Nous recherchons un développeur Backend Django expérimenté pour rejoindre notre équipe technique. Vous travaillerez sur le développement et la maintenance de notre plateforme SIRH Smart-HR.',
    requirements: [
      'Minimum 3 ans d\'expérience avec Django et Python',
      'Maîtrise de PostgreSQL et des bases de données relationnelles',
      'Connaissance des API REST et Django REST Framework',
      'Expérience avec Docker et CI/CD',
      'Bon niveau de français et d\'anglais technique'
    ]
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (file.type !== 'application/pdf') {
        alert('Veuillez sélectionner un fichier PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 5 MB');
        return;
      }
      setFormData(prev => ({ ...prev, cv: file }));
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.nom || !formData.email || !formData.telephone || !formData.lettreMotivation || !formData.cv) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/recruitment/tracking');
      }, 3000);
    }, 1500);
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Candidature envoyée avec succès !
            </h2>
            <p className="text-muted-foreground mb-2">
              Merci pour votre candidature à {jobOffer.title}
            </p>
            <p className="text-sm text-muted-foreground">
              Vous allez être redirigé vers le suivi de votre candidature...
            </p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Job Offer Details */}
          <Card className="mb-8">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {jobOffer.title}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{jobOffer.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{jobOffer.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>{jobOffer.salaryRange}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Description du poste
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {jobOffer.description}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Compétences requises
                </h3>
                <ul className="space-y-2">
                  {jobOffer.requirements.map((req, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{req}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Application Form */}
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Formulaire de candidature
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      placeholder="Moussa Diop"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="moussa.diop@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="+221 77 123 45 67"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Lettre de motivation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="lettreMotivation"
                    value={formData.lettreMotivation}
                    onChange={handleInputChange}
                    rows={8}
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                    placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CV (PDF, max 5 MB) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="cv-upload"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                    <label
                      htmlFor="cv-upload"
                      className="flex items-center justify-center gap-3 w-full px-4 py-8 bg-card border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors group"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="text-center">
                        {fileName ? (
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {fileName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cliquez pour changer
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Cliquez pour télécharger votre CV
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Format PDF uniquement, maximum 5 MB
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/recruitment/jobs')}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Soumettre ma candidature
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ApplyPage;
