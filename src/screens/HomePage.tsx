import { type FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import TableChartIcon from "@mui/icons-material/TableChart";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { timesheetStore } from "../stores/TimesheetStore";
import { authStore } from "../stores/AuthStore";
import { exportTimesheetToExcel } from "../utils/excelExport";
import { OnboardingGuide } from "../components/onboardingGuide/OnboardingGuide";
import { PATHS } from "../app/PATHS";

export const HomePage: FC = observer(() => {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (
      authStore.user &&
      timesheetStore.allEmployees.length === 0
    ) {
      timesheetStore.loadMonthData();
    }
  }, []);

  const {
    allEmployees,
    daysInMonth,
    monthTitle,
    isLoading,
  } = timesheetStore;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Если сотрудников нет — показываем инструкцию
  if (allEmployees.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <OnboardingGuide />
      </Container>
    );
  }

  // Подсчёт общих часов за месяц
  const { totalHours, itiliumHours } = allEmployees.reduce(
    (acc, emp) => {
      const stats = timesheetStore.getEmployeeStats(emp.id);
      acc.totalHours += stats.totalHours;
      if (emp.has_itilium) {
        acc.itiliumHours += stats.itiliumHours;
      }
      return acc;
    },
    { totalHours: 0, itiliumHours: 0 },
  );

  const handleOpenDepartment = (depName: string) => {
    timesheetStore.setDepartmentFilter(depName);
    timesheetStore.setEmployeeFilter("ALL");
    navigate(PATHS.timeSheet);
  };

  const handleQuickExport = async () => {
    if (allEmployees.length === 0) return;

    setIsExporting(true);
    try {
      await exportTimesheetToExcel({
        allEmployees,
        daysInMonth,
        records: timesheetStore.records,
        itiliumRecords: timesheetStore.itiliumRecords,
        monthTitle: timesheetStore.monthTitle,
        monthKey: timesheetStore.monthKey,
      });
    } catch (error) {
      console.error("Ошибка при выгрузке в Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Главный блок: выбор месяца и основные кнопки */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            sx={{
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: {
                xs: "flex-start",
                sm: "center",
              },
            }}
          >
            <Box>
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 700,
                }}
              >
                Табель рабочего времени
              </Typography>

              {/* Переключатель периода */}
              <Stack
                direction="row"
                sx={{ alignItems: "center" }}
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    timesheetStore.changeMonth(-1)
                  }
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="subtitle1"
                  sx={{
                    minWidth: 130,
                    textAlign: "center",
                    fontWeight: 600,
                    padding: "14px",
                  }}
                >
                  {monthTitle}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    timesheetStore.changeMonth(1)
                  }
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>

            <Stack
              direction="row"
              sx={{ flexWrap: "wrap", gap: 2 }}
              useFlexGap
            >
              <Button
                variant="contained"
                startIcon={<TableChartIcon />}
                onClick={() => {
                  timesheetStore.resetFilters();
                  navigate(PATHS.timeSheet);
                }}
              >
                Открыть табель
              </Button>

              <Button
                variant="outlined"
                startIcon={<PersonAddAlt1Icon />}
                onClick={() => navigate(PATHS.addEmployee)}
              >
                + Сотрудник
              </Button>

              <Button
                variant="outlined"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={handleQuickExport}
                disabled={isExporting || totalHours === 0}
              >
                {isExporting ? "Сборка..." : "Excel"}
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* Компактная сводка в одну строку */}
          <Stack
            direction="row"
            spacing={{ xs: 3, sm: 5 }}
            useFlexGap
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Сотрудников
              </Typography>
              <Typography variant="h6">
                {allEmployees.length}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Часов по табелю
              </Typography>
              <Typography variant="h6">
                {totalHours} ч
              </Typography>
            </Box>

            {itiliumHours > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Часов по Итилиум
                </Typography>
                <Typography variant="h6" color="info.main">
                  {Math.round(itiliumHours * 100) / 100} ч
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Быстрый переход по отделам */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Отделы и группы
          </Typography>

          <List disablePadding>
            {timesheetStore.departments.map((dep, idx) => {
              const count = allEmployees.filter(
                (e) => e.department === dep,
              ).length;
              return (
                <ListItem
                  key={dep}
                  divider={
                    idx <
                    timesheetStore.departments.length - 1
                  }
                  disableGutters
                  secondaryAction={
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() =>
                        handleOpenDepartment(dep)
                      }
                    >
                      Открыть
                    </Button>
                  }
                >
                  <ListItemText
                    primary={dep}
                    secondary={`Сотрудников: ${count}`}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      </Stack>
    </Container>
  );
});
