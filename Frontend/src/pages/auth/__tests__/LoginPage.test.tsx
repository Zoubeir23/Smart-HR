import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { AuthProvider } from "@/context/AuthContext";

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <button>GoogleLogin</button>,
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
  it("renders login form", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });
});
