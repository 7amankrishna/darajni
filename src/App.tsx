import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import WhatsAppFloat from "./components/WhatsAppFloat";
import { AuthProvider } from "./context/AuthContext";
import { CatalogProvider } from "./context/CatalogContext";
import { ReviewProvider } from "./context/ReviewContext";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import LegalPage from "./pages/LegalPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductPage from "./pages/ProductPage";
import UserDashboard from "./pages/UserDashboard";

function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      window.setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 50);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash, pathname]);

  return null;
}

function SiteLayout() {
  return (
    <>
      <RouteEffects />
      <Navbar />
      <Outlet />
      <Footer />
      <WhatsAppFloat />
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <CatalogProvider>
            <ReviewProvider>
              <Routes>
                <Route element={<SiteLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="design/:slug" element={<ProductPage />} />
                  <Route path="login" element={<AuthPage />} />
                  <Route
                    path="dashboard"
                    element={
                      <ProtectedRoute>
                        <UserDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="privacy" element={<LegalPage type="privacy" />} />
                  <Route path="terms" element={<LegalPage type="terms" />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </ReviewProvider>
          </CatalogProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
