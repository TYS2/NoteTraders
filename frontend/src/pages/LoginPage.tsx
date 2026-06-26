import type { FormEvent } from "react";
import type { LoginForm, Page } from "../types";

type LoginPageProps = {
  message: string;
  loginForm: LoginForm;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  handleLogin: (event: FormEvent) => void;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
};

function LoginPage({
  message,
  loginForm,
  setLoginForm,
  handleLogin,
  setPage,
}: LoginPageProps) {
  return (
    <main className="login-page">
      <div className="login-card">
        <h3 className="login-heading">Sign in to your NoteTrade account</h3>

        {message && <p className="status-message">{message}</p>}

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
            Sign In
          </button>
        </form>

        <p className="auth-switch-text">
          Don&apos;t have an account?{" "}
          <span className="auth-switch-link" onClick={() => setPage("signup")}>
            Sign up
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

export default LoginPage;