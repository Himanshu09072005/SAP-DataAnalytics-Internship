import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { RouterProvider, useAppNavigation } from "./router/Router";
import MainLayout from "./components/Layout/MainLayout";
import LoadingSpinner from "./components/Common/LoadingSpinner";

// Modular Pages
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Materials from "./pages/Materials/Materials";
import Vendors from "./pages/Vendors/Vendors";
import MaterialVendors from "./pages/MaterialVendors/MaterialVendors";
import PurchaseRequisitions from "./pages/PurchaseRequisitions/PurchaseRequisitions";
import PurchaseOrders from "./pages/PurchaseOrders/PurchaseOrders";
import GoodsReceipts from "./pages/GoodsReceipts/GoodsReceipts";
import Invoices from "./pages/Invoices/Invoices";
import Payments from "./pages/Payments/Payments";
import Inventory from "./pages/Inventory/Inventory";
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";

// Enterprise Stylesheet
import "./styles/erp.css";

function AppContent() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const { currentPath } = useAppNavigation();

  if (loadingAuth) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
        <LoadingSpinner text="Initializing SAP Procurement ERP session..." fullPage />
      </div>
    );
  }

  if (!isAuthenticated || currentPath === "/login") {
    return <Login />;
  }

  // Route switch
  const renderCurrentPage = () => {
    switch (currentPath) {
      case "/dashboard":
        return <Dashboard />;
      case "/materials":
        return <Materials />;
      case "/vendors":
        return <Vendors />;
      case "/material-vendors":
        return <MaterialVendors />;
      case "/purchase-requisitions":
        return <PurchaseRequisitions />;
      case "/purchase-orders":
        return <PurchaseOrders />;
      case "/goods-receipts":
        return <GoodsReceipts />;
      case "/invoices":
        return <Invoices />;
      case "/payments":
        return <Payments />;
      case "/inventory":
        return <Inventory />;
      case "/profile":
        return <Profile />;
      case "/settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <MainLayout>{renderCurrentPage()}</MainLayout>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ToastProvider>
  );
}