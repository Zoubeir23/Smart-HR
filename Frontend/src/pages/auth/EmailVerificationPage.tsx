import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const OTP_LENGTH = 6;
const PENDING_VERIFICATION_EMAIL_STORAGE_KEY = 'smart_hr_pending_verification_email';

interface LocationState {
  email?: string;
}

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // L'email vient de la navigation (inscription), avec repli sur sessionStorage
  // pour survivre à un rafraîchissement de la page (le state React Router est perdu).
  const emailFromNavigation = (location.state as LocationState)?.email ?? '';
  const [email, setEmail] = useState<string>(() => {
    if (emailFromNavigation) {
      sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY, emailFromNavigation);
      return emailFromNavigation;
    }
    return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY) ?? '';
  });

  // Si aucun email n'a pu être retrouvé (accès direct à la page), on affiche
  // un champ pour que l'utilisateur le saisisse lui-même.
  const [emailWasProvided] = useState<boolean>(() => email !== '');

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setErrorMessage('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedText) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    pastedText.split('').forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);
    inputRefs.current[Math.min(pastedText.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setErrorMessage('Veuillez saisir les 6 chiffres du code.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Veuillez saisir votre adresse email ci-dessus.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await api.post('/auth/verify-otp/', { email: email.trim(), code });
      sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY);
      setIsVerified(true);
      setSuccessMessage('Email vérifié avec succès ! Redirection...');
      setTimeout(() => navigate('/login', {
        state: { message: 'Email vérifié ! Vous pouvez maintenant vous connecter.' }
      }), 2000);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response
      ) {
        const responseData = error.response.data as Record<string, string>;
        setErrorMessage(responseData.detail || 'Code incorrect ou expiré.');
      } else {
        setErrorMessage('Erreur de connexion. Réessayez.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email.trim()) {
      setErrorMessage('Veuillez saisir votre adresse email ci-dessus.');
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.post('/auth/resend-otp/', { email: email.trim() });
      setSuccessMessage('Un nouveau code a été envoyé à votre adresse email.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response
      ) {
        const responseData = error.response.data as Record<string, string>;
        setErrorMessage(responseData.detail || 'Impossible de renvoyer le code.');
      } else {
        setErrorMessage('Erreur de connexion. Réessayez.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-purple-500/5 to-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Logo size="lg" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Vérifiez votre email
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-sm"
          >
            Un code à 6 chiffres a été envoyé à{' '}
            {email ? (
              <span className="font-semibold text-foreground">{email}</span>
            ) : (
              'votre adresse email'
            )}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-8 rounded-2xl shadow-xl"
        >
          {isVerified ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 dark:text-green-400 font-semibold text-lg">{successMessage}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {errorMessage && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {!emailWasProvided && (
                <div>
                  <label htmlFor="verification-email" className="block text-sm font-medium text-foreground mb-2">
                    Votre adresse email
                  </label>
                  <input
                    id="verification-email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors text-sm"
                  />
                </div>
              )}

              {/* OTP input boxes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-4 text-center">
                  Saisissez le code de vérification
                </label>
                <div className="flex justify-center gap-3">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-11 h-14 text-center text-xl font-bold rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Ce code expire dans 10 minutes
                </p>
              </div>

              <Button
                onClick={handleVerify}
                disabled={isSubmitting || digits.join('').length < OTP_LENGTH}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Vérifier mon email
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Vous n'avez pas reçu le code ?</p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-primary text-sm font-semibold hover:underline flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending ? 'Envoi en cours...' : 'Renvoyer le code'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;
