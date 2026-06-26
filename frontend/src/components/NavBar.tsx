import type { Page } from "../types";
import { SUBJECT_OPTIONS, ACADEMIC_LEVEL_OPTIONS, PRICE_FILTER_OPTIONS } from "../constants";

type NavbarProps = {
  isLoggedIn: boolean;
  page: Page;

  setPage: React.Dispatch<React.SetStateAction<Page>>;
  goToProtectedPage: (targetPage: Page) => void;
  handleLogout: () => void;

  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  academicLevelFilter: string;
  setAcademicLevelFilter: React.Dispatch<React.SetStateAction<string>>;

  subjectFilter: string;
  setSubjectFilter: React.Dispatch<React.SetStateAction<string>>;

  priceFilter: string;
  setPriceFilter: React.Dispatch<React.SetStateAction<string>>;
};

function Navbar({
  isLoggedIn,
  page,
  setPage,
  goToProtectedPage,
  handleLogout,
  searchTerm,
  setSearchTerm,
  academicLevelFilter,
  setAcademicLevelFilter,
  subjectFilter,
  setSubjectFilter,
  priceFilter,
  setPriceFilter,
}: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <button onClick={() => setPage("home")}>Home</button>

        {isLoggedIn ? (
          <>
            <button onClick={() => goToProtectedPage("account")}>Account</button>
            <button onClick={() => goToProtectedPage("createListing")}>
              Sell Notes
            </button>
            <button onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <button onClick={() => setPage("signup")}>Sign Up</button>
            <button onClick={() => setPage("login")}>Sign In</button>
          </>
        )}
      </div>

      {page === "home" && (
        <div className="nav-right">
          <select
            value={academicLevelFilter}
            onChange={(event) => setAcademicLevelFilter(event.target.value)}
          >
            <option value="">Academic Level</option>

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
            <option value="">Subject</option>

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
            <option value="">Price</option>

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

export default Navbar;