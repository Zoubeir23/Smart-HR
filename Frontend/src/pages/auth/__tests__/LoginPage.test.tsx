import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { AuthProvider } from "@/context/AuthContext";

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => () => undefined,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/context/AuthContext")>("@/context/AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
    }),
  };
});

describe("LoginPage", () => {
  // VITE_GOOGLE_CLIENT_ID conditionne l'affichage du bouton Google. Sans valeur
  // explicite, le test dépendrait de la présence d'un fichier .env local : vert
  // sur le poste du développeur, rouge en CI (ou l'inverse).
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id-de-test.apps.googleusercontent.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders login form", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Connexion")).toBeInTheDocument();
    // Ancre le motif : « Se connecter avec Google » correspondrait aussi.
    expect(screen.getByRole("button", { name: /^se connecter$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter avec google/i })).toBeInTheDocument();
  });
});
