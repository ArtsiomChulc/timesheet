import { createBrowserRouter } from "react-router-dom";
import { PATHS } from "../PATHS.ts";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Layout } from "../layout/Layout.tsx";
import { LogIn } from "../../screens/LogIn.tsx";
import { AddEmployee } from "../../components/addEmployee/AddEmployee.tsx";
import { TimesheetPage } from "../../screens/TimesheetPage.tsx";
import { HomePage } from "../../screens/HomePage.tsx";
import { EmployeesPage } from "../../screens/EmployeesPage.tsx";

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
            element: <HomePage />,
          },
          {
            path: PATHS.addEmployee,
            element: <AddEmployee />,
          },
          {
            path: PATHS.timeSheet,
            element: <TimesheetPage />,
          },
          {
            path: PATHS.employees,
            element: <EmployeesPage />,
          },
        ],
      },
    ],
  },
]);
