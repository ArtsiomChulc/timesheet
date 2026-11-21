import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { observer } from "mobx-react-lite";
import { authStore } from "../stores/AuthStore";

export const ProtectedRoute = observer(() => {
  const location = useLocation();

  // Пока Supabase проверяет токен в localStorage, не делаем редирект
  if (authStore.isAuthChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        Проверка авторизации...
      </div>
    );
  }

  // Если сессии нет — отправляем на страницу входа и запоминаем, откуда пришёл юзер
  if (!authStore.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Если авторизован — рендерим вложенный маршрут
  return <Outlet />;
});
