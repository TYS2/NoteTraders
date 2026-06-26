import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function Header() {
  return (
    <header className="top-header">
      <Link to="/" className="logo-section">
        <img src={logo} alt="NoteTraders Logo" className="logo" />
        <h1>NoteTrade</h1>
      </Link>
    </header>
  );
}

export default Header;