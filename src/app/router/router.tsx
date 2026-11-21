import { createBrowserRouter } from "react-router-dom";
import { PATHS } from "../PATHS.ts";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Layout } from "../layout/Layout.tsx";
import { LogIn } from "../../screens/LogIn.tsx";

export const router = createBrowserRouter([
  {
    path: PATHS.login,
    element: <LogIn />,
    errorElement: <div>not found</div>,
  },

  {
    path: "/",
    element: <ProtectedRoute />,
    errorElement: <div>not found</div>,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <div>main</div>,
          },
          {
            path: PATHS.subjects,
            element: <div>not found</div>,
          },
        ],
      },
    ],
  },
]);
