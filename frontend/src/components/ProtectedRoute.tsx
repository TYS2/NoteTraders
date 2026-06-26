import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function ProtectedRoute() {
  const { isLoggedIn, setMessage } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn) {
      setMessage("Please sign in first.");
    }
  }, [isLoggedIn, setMessage]);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;