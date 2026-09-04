import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Toast from './components/Toast.jsx';
import SupportModals from './components/SupportModals.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ProductsAdmin from './pages/admin/ProductsAdmin.jsx';
import OrdersAdmin from './pages/admin/OrdersAdmin.jsx';

// Point d'entrée de l'application : navigation + routes
export default function App() {
  const location = useLocation();
  // Les pages "compte du site" s'affichent en pleine largeur (centrées),
  // le reste de la boutique reste dans le conteneur classique.
  const isFullPage = ['/account', '/profile', '/settings'].includes(location.pathname);

  return (
    <div className="app">
      <Navbar />
      <Toast />
      <SupportModals />
      <ChatWidget />
      <main className={isFullPage ? 'page-full' : 'container'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminLayout>
                  <ProductsAdmin />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminLayout>
                  <OrdersAdmin />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}