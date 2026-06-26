import { Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import Navbar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";
import CreateListingPage from "./pages/CreateListingPage";
import ListingPage from "./pages/ListingPage";
import SignUpPage from "./pages/SignUpPage";
import TransactionHistoryPage from "./pages/TransactionHistoryPage";

function App() {
  return (
    <div className="app">
      <Header />
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/sell" element={<CreateListingPage />} />
          <Route path="/listings/:listingId" element={<ListingPage />} />
          <Route path="/transaction-history" element={<TransactionHistoryPage />} />
        </Route>

        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;