import type { FormEvent } from "react";
import type { Page, SignupForm } from "../types";

type SignUpPageProps = {
  message: string;
  signupForm: SignupForm;
  setSignupForm: React.Dispatch<React.SetStateAction<SignupForm>>;
  handleSignup: (event: FormEvent) => void;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
};

function SignUpPage({
  message,
  signupForm,
  setSignupForm,
  handleSignup,
  setPage,
}: SignUpPageProps) {
  return (
    <main className="login-page">
      <div className="login-card">
        <h3 className="signup-heading">
          New to NoteTrade? Sign up to discover more notes.
        </h3>

        {message && <p className="status-message">{message}</p>}

        <form onSubmit={handleSignup}>
          <div className="form-row">
            <label>Username:</label>
            <input
              type="text"
              value={signupForm.username}
              onChange={(event) =>
                setSignupForm({ ...signupForm, username: event.target.value })
              }
              required
            />
          </div>

          <div className="form-row password-row">
            <label>Password:</label>
            <div className="password-input-group">
              <input
                type="password"
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm({ ...signupForm, password: event.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <label>Confirm Password:</label>
            <input
              type="password"
              value={signupForm.confirmPassword}
              onChange={(event) =>
                setSignupForm({
                  ...signupForm,
                  confirmPassword: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-row">
            <label>Email:</label>
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm({ ...signupForm, email: event.target.value })
              }
              required
            />
          </div>

          <div className="form-row">
            <label>Phone:</label>
            <input
              type="text"
              value={signupForm.phoneNumber}
              onChange={(event) =>
                setSignupForm({
                  ...signupForm,
                  phoneNumber: event.target.value,
                })
              }
              required
            />
          </div>

          <button className="main-btn" type="submit">
            Sign Up
          </button>
        </form>

        <p className="auth-switch-text">
        Already have an account?{" "}
        <span className="auth-switch-link" onClick={() => setPage("login")}>
            Sign in 
        </span>{" "}
        here!
        </p>

        <button className="back-btn" onClick={() => setPage("home")}>
        Back to Home
        </button>
      </div>
    </main>
  );
}

export default SignUpPage;