import { Outlet } from "react-router";
import type { FC } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../PATHS.ts";
import { authStore } from "../../stores/AuthStore.ts";

export const Layout: FC = observer(() => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authStore.logout();
      navigate(PATHS.login);
    } catch (error) {
      console.error("Ошибка при выходе из системы:", error);
    }
  };

  return (
    <>
      <main>
        <div>
          <Outlet />
        </div>
      </main>
      <footer></footer>
    </>
  );
});
