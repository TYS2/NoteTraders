import type { Page } from "../types";
import logo from "../assets/logo.png";

type HeaderProps = {
  setPage: React.Dispatch<React.SetStateAction<Page>>;
};

function Header({ setPage }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="logo-section" onClick={() => setPage("home")}>
        <img src={logo} alt="NoteTraders Logo" className="logo" />
        <h1>NoteTrade</h1>
      </div>
    </header>
  );
}

export default Header;