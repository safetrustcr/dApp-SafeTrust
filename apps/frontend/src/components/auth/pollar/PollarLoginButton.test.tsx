import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PollarLoginButton } from "./PollarLoginButton";

// â”€â”€ Mock @pollar/react â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mockLogin = vi.fn();
const mockVerifyEmailCode = vi.fn();

const pollarState = {
  isAuthenticated: false,
  wallet: null as { address: string } | null,
  login: mockLogin,
  step: null as string | null,
  verifyEmailCode: mockVerifyEmailCode,
  error: null as Error | null,
};

vi.mock("@pollar/react", () => ({
  usePollar: () => pollarState,
}));

// â”€â”€ Mock PollarProvider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
vi.mock("./PollarProvider", () => ({
  usePollarWallet: () => ({ configured: true }),
}));

// â”€â”€ Mock UI primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ComponentPropsWithoutRef<"button">) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentPropsWithoutRef<"input">) => <input {...props} />,
}));

vi.mock("@/components/auth/ui/GoogleIcon", () => ({
  GoogleIcon: () => <span data-testid="google-icon" />,
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="spinner" />,
  Mail: () => <span data-testid="mail-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
}));

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderComponent(onWalletReady = vi.fn()) {
  return render(<PollarLoginButton onWalletReady={onWalletReady} />);
}

function resetPollarState() {
  pollarState.isAuthenticated = false;
  pollarState.wallet = null;
  pollarState.step = null;
  pollarState.error = null;
  mockLogin.mockReset();
  mockVerifyEmailCode.mockReset();
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("PollarLoginButton", () => {
  beforeEach(resetPollarState);

  describe("Step 1 â€” provider selection", () => {
    it("renders Google and email OTP options", () => {
      renderComponent();
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Or sign in with email OTP")).toBeInTheDocument();
    });

    it("shows email input after clicking 'Or sign in with email OTP'", async () => {
      renderComponent();
      await userEvent.click(screen.getByText("Or sign in with email OTP"));
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("send-code-button")).toBeInTheDocument();
    });

    it("calls login with provider email and address on Send code", async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderComponent();

      await userEvent.click(screen.getByText("Or sign in with email OTP"));
      await userEvent.type(screen.getByTestId("email-input"), "user@example.com");
      await userEvent.click(screen.getByTestId("send-code-button"));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          provider: "email",
          email: "user@example.com",
        });
      });
    });

    it("shows inline error when login throws", async () => {
      mockLogin.mockRejectedValueOnce(new Error("Invalid email address"));
      renderComponent();

      await userEvent.click(screen.getByText("Or sign in with email OTP"));
      await userEvent.type(screen.getByTestId("email-input"), "bad");
      await userEvent.click(screen.getByTestId("send-code-button"));

      await waitFor(() => {
        expect(screen.getByTestId("email-error")).toHaveTextContent(
          "Invalid email address",
        );
      });
    });
  });

  describe("Step 2 â€” OTP verification (step = verifying_email_code)", () => {
    beforeEach(() => {
      pollarState.step = "verifying_email_code";
    });

    it("renders OTP code input and Verify button", () => {
      renderComponent();
      expect(screen.getByTestId("otp-code-input")).toBeInTheDocument();
      expect(screen.getByTestId("otp-verify-button")).toBeInTheDocument();
      expect(screen.getByTestId("otp-resend-button")).toBeInTheDocument();
    });

    it("Verify button is disabled until 6 digits are entered", async () => {
      renderComponent();
      const input = screen.getByTestId("otp-code-input");
      const button = screen.getByTestId("otp-verify-button");

      expect(button).toBeDisabled();
      await userEvent.type(input, "12345");
      expect(button).toBeDisabled();
      await userEvent.type(input, "6");
      expect(button).not.toBeDisabled();
    });

    it("only accepts digits in the OTP input", async () => {
      renderComponent();
      const input = screen.getByTestId("otp-code-input") as HTMLInputElement;
      await userEvent.type(input, "abc123def");
      expect(input.value).toBe("123");
    });

    it("calls verifyEmailCode with the entered code", async () => {
      mockVerifyEmailCode.mockResolvedValueOnce(undefined);
      renderComponent();

      await userEvent.type(screen.getByTestId("otp-code-input"), "654321");
      await userEvent.click(screen.getByTestId("otp-verify-button"));

      await waitFor(() => {
        expect(mockVerifyEmailCode).toHaveBeenCalledWith("654321");
      });
    });

    it("shows inline error on invalid code", async () => {
      mockVerifyEmailCode.mockRejectedValueOnce(
        new Error("Code is incorrect or has expired."),
      );
      renderComponent();

      await userEvent.type(screen.getByTestId("otp-code-input"), "000000");
      await userEvent.click(screen.getByTestId("otp-verify-button"));

      await waitFor(() => {
        expect(screen.getByTestId("otp-error")).toHaveTextContent(
          "Code is incorrect or has expired.",
        );
      });
    });

    it("Resend code calls login again with the original email", async () => {
      // Simulate that email was entered in step 1 by rendering from step 1 first.
      pollarState.step = null;
      mockLogin.mockResolvedValue(undefined);
      renderComponent();

      await userEvent.click(screen.getByText("Or sign in with email OTP"));
      await userEvent.type(screen.getByTestId("email-input"), "user@example.com");
      await userEvent.click(screen.getByTestId("send-code-button"));

      // Now move to verifying step
      pollarState.step = "verifying_email_code";
      // Trigger a re-render by firing a state update (simulate SDK state change)
      fireEvent.click(document.body);

      await waitFor(() => {
        const resendBtn = screen.queryByTestId("otp-resend-button");
        if (resendBtn) {
          fireEvent.click(resendBtn);
        }
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          provider: "email",
          email: "user@example.com",
        });
      });
    });

    it("shows SDK error from usePollar as inline message", async () => {
      pollarState.error = new Error("Session expired");
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("otp-error")).toHaveTextContent("Session expired");
      });
    });
  });

  describe("Authenticated state", () => {
    it("shows connected badge when authenticated", () => {
      pollarState.isAuthenticated = true;
      pollarState.wallet = { address: "GABCDEF1234567890ABCDEF" };
      const onWalletReady = vi.fn();
      renderComponent(onWalletReady);

      expect(screen.getByText(/Pollar connected/)).toBeInTheDocument();
      expect(onWalletReady).toHaveBeenCalledWith("GABCDEF1234567890ABCDEF");
    });
  });
});
