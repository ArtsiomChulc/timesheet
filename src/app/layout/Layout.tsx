import { Outlet } from "react-router";
import type { FC } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../PATHS.ts";
import { authStore } from "../../stores/AuthStore.ts";
import { Container } from "@mui/material";
import Header from "../../components/header/Header.tsx";

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
    <main>
      <Header logOut={handleLogout} />
      <Container>
        <Outlet />
      </Container>
      <footer></footer>
    </main>
  );
});
