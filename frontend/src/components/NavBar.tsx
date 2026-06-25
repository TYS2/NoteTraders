import type { Page } from "../types";

type NavbarProps = {
  isLoggedIn: boolean;
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
        <button onClick={() => goToProtectedPage("account")}>Account</button>
        <button onClick={() => goToProtectedPage("createListing")}>
          Sell Notes
        </button>

        {isLoggedIn ? (
          <button onClick={handleLogout}>Log Out</button>
        ) : (
          <button onClick={() => setPage("login")}>Log In</button>
        )}
      </div>

      <div className="nav-right">
        <select
          value={academicLevelFilter}
          onChange={(event) => setAcademicLevelFilter(event.target.value)}
        >
          <option value="">Academic Level</option>
          <option>Primary</option>
          <option>Secondary</option>
          <option>JC</option>
          <option>University</option>
        </select>

        <select
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
        >
          <option value="">Subject</option>
          <option>Math</option>
          <option>Science</option>
          <option>Computing</option>
          <option>Chemistry</option>
        </select>

        <select
          value={priceFilter}
          onChange={(event) => setPriceFilter(event.target.value)}
        >
          <option value="">Price</option>
          <option>Free</option>
          <option>Below $5</option>
          <option>$5 - $10</option>
          <option>Above $10</option>
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
    </nav>
  );
}

export default Navbar;