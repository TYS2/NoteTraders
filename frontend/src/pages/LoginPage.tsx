import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function LoginPage() {
  const navigate = useNavigate();

  const { message, loginForm, setLoginForm, login } = useAppContext();

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await login();

    if (success) {
      navigate("/");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h3 className="login-heading">Welcome back to NoteTrade!</h3>

        {message && <p className="status-message">{message}</p>}

        <form onSubmit={handleLogin}>
          <div className="form-row">
            <label>Username:</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm({
                  ...loginForm,
                  username: event.target.value,
                })
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
                setLoginForm({
                  ...loginForm,
                  password: event.target.value,
                })
              }
              required
            />
          </div>

          <button className="main-btn" type="submit">
            Sign In
          </button>
        </form>

        <p className="auth-switch-text">
          Do not have an account?{" "}
          <span className="auth-switch-link" onClick={() => navigate("/signup")}>
            Sign up
          </span>{" "}
          here!
        </p>

        <button className="back-btn" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

export default LoginPage;