import {
  type FC,
  type SyntheticEvent,
  useState,
} from "react";
import { observer } from "mobx-react-lite";
import { authStore } from "../stores/AuthStore.ts";
import { Navigate, useLocation } from "react-router-dom";
import {
  Button,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { Loading } from "../components/loader/Loading.tsx";

type AuthMode = "signin" | "signup";

export const LogIn: FC = observer(() => {
  const { error, isLoading, isAuthChecking, user } =
    authStore;

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const location = useLocation();

  const fromPage = location.state?.from?.pathname || "/";

  const isSignUp = mode === "signup";

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (isSignUp) {
      await authStore.signUp(email, password);
    } else {
      await authStore.signIn(email, password);
    }
  };

  const toggleMode = () => {
    authStore.error = null;
    setMode((prev) =>
      prev === "signin" ? "signup" : "signin",
    );
  };

  if (isAuthChecking) {
    return <Loading />;
  }

  if (user) {
    return <Navigate to={fromPage} replace />;
  }

  return (
    <Container>
      <form
        onSubmit={handleSubmit}
        style={{ margin: "20% auto" }}
      >
        <Container
          maxWidth={"sm"}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            padding: "20px 10px",
          }}
        >
          <Typography
            variant={"h3"}
            gutterBottom
            sx={{
              textAlign: "center",
              fontFamily: "ui-rounded",
            }}
          >
            {isSignUp ? "Регистрация" : "Вход"}
          </Typography>

          <TextField
            type="email"
            placeholder="Email"
            label={"e-mail"}
            autoComplete="email"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                "& fieldset": {
                  borderColor: "#cbd5e1",
                },
                "&:hover fieldset": {
                  borderColor: "#64748b",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#2563eb",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#64748b",
                "&.Mui-focused": {
                  color: "#2563eb",
                },
              },
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <TextField
            type="password"
            id="outlined-basic"
            label="password"
            variant="outlined"
            autoComplete={
              isSignUp ? "new-password" : "current-password"
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                "& fieldset": {
                  borderColor: "#cbd5e1",
                },
                "&:hover fieldset": {
                  borderColor: "#64748b",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#2563eb",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#64748b",
                "&.Mui-focused": {
                  color: "#2563eb",
                },
              },
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          {error && (
            <Typography variant={"caption"} color={"error"}>
              {error}
            </Typography>
          )}

          <Button
            variant={"contained"}
            type="submit"
            sx={{
              borderRadius: "8px",
              padding: "16px 8px",
            }}
            disabled={isLoading}
          >
            {isLoading
              ? "Загрузка..."
              : isSignUp
                ? "Регистрация"
                : "Вход"}
          </Button>
          <Button
            variant="text"
            onClick={toggleMode}
            disabled={isLoading}
          >
            {isSignUp
              ? "Есть аккаунт? Войдите"
              : "Нет аккаунта? Регистрируйтесь"}
          </Button>
        </Container>
      </form>
    </Container>
  );
});
