import { useLocation, useNavigate } from "react-router-dom";
import {
  ACADEMIC_LEVEL_OPTIONS,
  PRICE_FILTER_OPTIONS,
  SUBJECT_OPTIONS,
} from "../constants";
import { useAppContext } from "../context/AppContext";

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isLoggedIn,
    logout,
    searchTerm,
    setSearchTerm,
    academicLevelFilter,
    setAcademicLevelFilter,
    subjectFilter,
    setSubjectFilter,
    priceFilter,
    setPriceFilter,
    clearMessage,
  } = useAppContext();

  const showSearchAndFilters = location.pathname === "/";

  function goTo(path: string) {
    clearMessage();
    navigate(path);
  }

  function handleLogoutClick() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <button onClick={() => goTo("/")}>Home</button>

        {isLoggedIn ? (
          <>
            <button onClick={() => goTo("/account")}>Account</button>

            <button onClick={() => goTo("/sell")}>Sell Notes</button>

            <button onClick={handleLogoutClick}>Log Out</button>
          </>
        ) : (
          <>
            <button onClick={() => goTo("/signup")}>Sign Up</button>

            <button onClick={() => goTo("/login")}>Sign In</button>
          </>
        )}
      </div>

      {showSearchAndFilters && (
        <div className="nav-right">
          <select
            value={academicLevelFilter}
            onChange={(event) => setAcademicLevelFilter(event.target.value)}
          >
            <option value="">All Levels</option>

            {ACADEMIC_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="">All Subjects</option>

            {SUBJECT_OPTIONS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value)}
          >
            <option value="">All Prices</option>

            {PRICE_FILTER_OPTIONS.map((priceOption) => (
              <option key={priceOption} value={priceOption}>
                {priceOption}
              </option>
            ))}
          </select>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <button type="button">⌕</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavBar;