import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EmailVerificationPage from "../EmailVerificationPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));

const mockedApiPost = vi.mocked(api.post);

function renderWithEmailState(email?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/verify-email", state: email ? { email } : undefined }]}>
      <Routes>
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillOtpCode(code: string) {
  const otpInputs = screen
    .getAllByRole("textbox")
    .filter((input) => input.getAttribute("maxlength") === "1");
  code.split("").forEach((digit, index) => {
    fireEvent.change(otpInputs[index], { target: { value: digit } });
  });
}

describe("EmailVerificationPage", () => {
  beforeEach(() => {
    mockedApiPost.mockClear();
    sessionStorage.clear();
  });

  it("envoie l'email ET le code lors de la vérification OTP", async () => {
    renderWithEmailState("candidate@test.com");
    fillOtpCode("123456");
    fireEvent.click(screen.getByRole("button", { name: /vérifier mon email/i }));

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith("/auth/verify-otp/", {
        email: "candidate@test.com",
        code: "123456",
      });
    });
  });

  it("envoie l'email lors du renvoi du code", async () => {
    renderWithEmailState("candidate@test.com");
    fireEvent.click(screen.getByRole("button", { name: /renvoyer le code/i }));

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith("/auth/resend-otp/", {
        email: "candidate@test.com",
      });
    });
  });

  it("retrouve l'email depuis sessionStorage après un rafraîchissement", async () => {
    sessionStorage.setItem("smart_hr_pending_verification_email", "refresh@test.com");
    renderWithEmailState(undefined);
    fillOtpCode("654321");
    fireEvent.click(screen.getByRole("button", { name: /vérifier mon email/i }));

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith("/auth/verify-otp/", {
        email: "refresh@test.com",
        code: "654321",
      });
    });
  });

  it("affiche un champ email si aucun email n'est connu", () => {
    renderWithEmailState(undefined);
    expect(screen.getByLabelText(/votre adresse email/i)).toBeInTheDocument();
  });

  it("persiste l'email saisi manuellement dans sessionStorage", () => {
    renderWithEmailState(undefined);
    fireEvent.change(screen.getByLabelText(/votre adresse email/i), {
      target: { value: "manuel@test.com" },
    });

    expect(sessionStorage.getItem("smart_hr_pending_verification_email")).toBe("manuel@test.com");
  });

  it("bloque la vérification sans email et affiche un message", async () => {
    renderWithEmailState(undefined);
    fillOtpCode("123456");
    fireEvent.click(screen.getByRole("button", { name: /vérifier mon email/i }));

    expect(await screen.findByText(/veuillez saisir votre adresse email/i)).toBeInTheDocument();
    expect(mockedApiPost).not.toHaveBeenCalled();
  });
});
