import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { Spinner } from "./components/Layout";
import { Toaster } from "./components/Toast";
import { queryClient } from "./lib/api";
import { useMe } from "./lib/hooks";
import { AddManualPage } from "./pages/AddManual";
import { BookDetailPage } from "./pages/BookDetail";
import { LoginPage } from "./pages/Login";
import { ProfilePage } from "./pages/Profile";
import { SearchPage } from "./pages/Search";
import { ShelfPage } from "./pages/Shelf";
import { YearsPage } from "./pages/Years";

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
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
