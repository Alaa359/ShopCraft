import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';

// Point d'entrée de l'application : navigation + routes
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}