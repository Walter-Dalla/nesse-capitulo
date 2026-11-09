import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Spinner } from "./components/Layout";
import { Toaster } from "./components/Toast";
import { queryClient } from "./lib/api";
import { useMe } from "./lib/hooks";
import { useLocale } from "./lib/localeBrowser";
import { browserInviteStore, inviteCodeFromPath, pendingInviteRedirect, savePendingInvite } from "./lib/pendingInvite";
import { ShelfPage } from "./pages/Shelf";

// Estante (tela inicial) vai no bundle principal; o resto carrega sob demanda.
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.SearchPage })));
const AddManualPage = lazy(() => import("./pages/AddManual").then((m) => ({ default: m.AddManualPage })));
const BookDetailPage = lazy(() => import("./pages/BookDetail").then((m) => ({ default: m.BookDetailPage })));
const YearsPage = lazy(() => import("./pages/Years").then((m) => ({ default: m.YearsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const FriendsPage = lazy(() => import("./pages/Friends").then((m) => ({ default: m.FriendsPage })));
const FriendDetailPage = lazy(() => import("./pages/FriendDetail").then((m) => ({ default: m.FriendDetailPage })));
const FriendInvitePage = lazy(() => import("./pages/FriendInvite").then((m) => ({ default: m.FriendInvitePage })));

/**
 * Único ponto que faz o link de convite sobreviver ao login: deslogado numa rota de convite,
 * guarda o código; logado com convite guardado, volta para ele (Google e dev terminam em "/").
 */
function RequireAuth() {
  const me = useMe();
  const { pathname } = useLocation();
  if (me.isPending) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!me.data?.user) {
    const code = inviteCodeFromPath(pathname);
    if (code) savePendingInvite(browserInviteStore(), code);
    return <Navigate to="/login" replace />;
  }
  const to = pendingInviteRedirect(browserInviteStore(), pathname);
  if (to) return <Navigate to={to} replace />;
  return <Outlet />;
}

export function App() {
  const locale = useLocale();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter key={locale}>
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
            <Route path="/amigos" element={<FriendsPage />} />
            <Route path="/amigos/:id" element={<FriendDetailPage />} />
            <Route path="/amigos/convite/:code" element={<FriendInvitePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
