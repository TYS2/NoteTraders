import type { FormEvent } from "react";
import type { LoginForm, Page, SignupForm } from "../types";

type LoginPageProps = {
  message: string;
  signupForm: SignupForm;
  setSignupForm: React.Dispatch<React.SetStateAction<SignupForm>>;
  loginForm: LoginForm;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  handleSignup: (event: FormEvent) => void;
  handleLogin: (event: FormEvent) => void;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
};

function LoginPage({
  message,
  signupForm,
  setSignupForm,
  loginForm,
  setLoginForm,
  handleSignup,
  handleLogin,
  setPage,
}: LoginPageProps) {
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

        <h3 className="login-heading">Already have an account?</h3>

        <form onSubmit={handleLogin}>
          <div className="form-row">
            <label>Username:</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm({ ...loginForm, username: event.target.value })
              }
              required
            />
          </div>

          <div className="form-row">
            <label>Password:</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm({ ...loginForm, password: event.target.value })
              }
              required
            />
          </div>

          <button className="main-btn" type="submit">
            Log In
          </button>
        </form>

        <button className="back-btn" onClick={() => setPage("home")}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

export default LoginPage;