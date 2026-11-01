import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { Spinner } from "./components/Layout";
import { Toaster } from "./components/Toast";
import { queryClient } from "./lib/api";
import { useMe } from "./lib/hooks";
import { ShelfPage } from "./pages/Shelf";

// Estante (tela inicial) vai no bundle principal; o resto carrega sob demanda.
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.SearchPage })));
const AddManualPage = lazy(() => import("./pages/AddManual").then((m) => ({ default: m.AddManualPage })));
const BookDetailPage = lazy(() => import("./pages/BookDetail").then((m) => ({ default: m.BookDetailPage })));
const YearsPage = lazy(() => import("./pages/Years").then((m) => ({ default: m.YearsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));

function RequireAuth() {
  const me = useMe();
  if (me.isPending) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!me.data?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Spinner /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<ShelfPage />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/adicionar" element={<AddManualPage />} />
            <Route path="/livro/:id" element={<BookDetailPage />} />
            <Route path="/anos" element={<YearsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
