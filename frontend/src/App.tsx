import NavBar from './components/NavBar';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  );
}
