import { useState } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function goToProtectedPage(targetPage: string) {
    if (!isLoggedIn) {
      setPage("login");
    } else {
      setPage(targetPage);
    }
  }

  function handleLogin() {
    setIsLoggedIn(true);
    setPage("home");
  }

  if (page === "login") {
    return (
      <div className="app">
        <header className="top-header">
          <div className="logo-section">
            <img src="/book-logo.png" alt="NoteTrade logo" className="logo" />
            <h1>NoteTrade</h1>
          </div>
        </header>

        <main className="login-page">
          <div className="login-card">
            <h3 className="signup-heading">
              New to NoteTrade? Sign up to discover more notes.
            </h3>

            <div className="form-row">
              <label>Username:</label>
              <input type="text" />
            </div>

            <div className="form-row">
              <label>Password:</label>
              <input type="password" />
            </div>

            <div className="form-row">
              <label>Confirmed Password:</label>
              <input type="password" />
            </div>

            <div className="form-row">
              <span className="optional-text">(optional)</span>
              <label>Email:</label>
              <input type="email" />
            </div>

            <div className="form-row">
              <span className="optional-text">(optional)</span>
              <label>Phone number:</label>
              <input type="text" />
            </div>

            <button className="main-btn">
              Sign Up
            </button>

            <h3 className="login-heading">Already have an account?</h3>

            <div className="form-row">
              <label>Username:</label>
              <input type="text" />
            </div>

            <div className="form-row">
              <label>Password:</label>
              <input type="password" />
            </div>

            <button className="main-btn" onClick={handleLogin}>
              Log In
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="top-header">
        <div className="logo-section">
          <img src="/book-logo.png" alt="NoteTrade logo" className="logo" />
          <h1>NoteTrade</h1>
        </div>
      </header>

      <nav className="navbar">
        <div className="nav-left">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => goToProtectedPage("account")}>Account</button>
        </div>

        <div className="nav-right">
          <select>
            <option>Academic Level</option>
            <option>Primary</option>
            <option>Secondary</option>
            <option>JC</option>
            <option>University</option>
          </select>

          <select>
            <option>Subject</option>
            <option>Math</option>
            <option>Science</option>
            <option>Computing</option>
            <option>Chemistry</option>
          </select>

          <select>
            <option>Price</option>
            <option>Free</option>
            <option>Below $5</option>
            <option>$5 - $10</option>
            <option>Above $10</option>
          </select>

          <div className="search-box">
            <input type="text" placeholder="Search" />
            <button>⌕</button>
          </div>
        </div>
      </nav>

      <main className="homepage">
        <h2>Find the notes you need, at prices you’ll love!</h2>

        <section className="listing-section">
          <div className="listing-card" onClick={() => goToProtectedPage("listing")}>
            <h3>CS1010S Notes</h3>
            <p>Clear summary notes for beginners.</p>
            <p className="price">$5</p>
          </div>

          <div className="listing-card" onClick={() => goToProtectedPage("listing")}>
            <h3>H2 Chemistry Notes</h3>
            <p>Organic chemistry summary notes.</p>
            <p className="price">$8</p>
          </div>

          <div className="listing-card" onClick={() => goToProtectedPage("listing")}>
            <h3>MA1521 Cheat Sheet</h3>
            <p>Useful calculus formulas and examples.</p>
            <p className="price">Free</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;