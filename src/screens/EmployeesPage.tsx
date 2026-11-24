import { type FC, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

import { timesheetStore } from "../stores/TimesheetStore";
import { authStore } from "../stores/AuthStore";
import type {
  Employee,
  ScheduleType,
} from "../types/timesheet";
import { PATHS } from "../app/PATHS";

export const EmployeesPage: FC = observer(() => {
  const navigate = useNavigate();

  // Состояние модального окна редактирования
  const [editingEmp, setEditingEmp] =
    useState<Employee | null>(null);
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [scheduleType, setScheduleType] =
    useState<ScheduleType>("5/2");
  const [shiftStartDate, setShiftStartDate] = useState("");
  const [shiftHours, setShiftHours] = useState<number>(8);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [hasItilium, setHasItilium] =
    useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (
      authStore.user &&
      timesheetStore.allEmployees.length === 0
    ) {
      timesheetStore.loadMonthData();
    }
  }, []);

  if (timesheetStore.isLoading) {
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

  // Если сотрудников ещё вообще нет — возвращаем на главную к инструкции
  if (timesheetStore.allEmployees.length === 0) {
    return <Navigate to={PATHS.home} replace />;
  }

  const openEditDialog = (emp: Employee) => {
    setEditingEmp(emp);
    setFullName(emp.full_name);
    setPosition(emp.position);
    setDepartment(emp.department);
    setScheduleType(emp.schedule_type);
    setShiftStartDate(
      emp.shift_start_date ??
        new Date().toISOString().slice(0, 10),
    );
    setShiftHours(emp.default_shift_hours || 8);
    setHourlyRate(
      emp.hourly_rate ? String(emp.hourly_rate) : "",
    );
    setHasItilium(emp.has_itilium);
  };

  const closeEditDialog = () => {
    setEditingEmp(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEmp || !fullName.trim() || !position.trim())
      return;

    const isCyclic =
      scheduleType === "2/2" || scheduleType === "1/3";
    setIsSaving(true);
    const ok = await timesheetStore.updateEmployee(
      editingEmp.id,
      {
        full_name: fullName.trim(),
        position: position.trim(),
        department: department.trim() || "Основной",
        schedule_type: scheduleType,
        shift_start_date: isCyclic ? shiftStartDate : null,
        default_shift_hours: Number(shiftHours) || 8,
        hourly_rate: Number(hourlyRate) || 0,
        has_itilium: hasItilium,
      },
    );
    setIsSaving(false);

    if (ok) {
      closeEditDialog();
    }
  };

  const isCyclicEdit =
    scheduleType === "2/2" || scheduleType === "1/3";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          <Box>
            <Typography variant="h5">
              Сотрудники (
              {timesheetStore.allEmployees.length})
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Отключённые сотрудники скрываются из табеля,
              но их история за прошлые месяцы сохраняется
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<PersonAddAlt1Icon />}
            onClick={() => navigate(PATHS.addEmployee)}
          >
            Добавить сотрудника
          </Button>
        </Stack>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  ФИО
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Должность
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Отдел / Группа
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  График
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Итилиум
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Статус
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600 }}
                >
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {timesheetStore.allEmployees.map((emp) => (
                <TableRow
                  key={emp.id}
                  sx={{
                    opacity: emp.is_active ? 1 : 0.55,
                    bgcolor: emp.is_active
                      ? "inherit"
                      : "grey.50",
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    {emp.full_name}
                  </TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${emp.schedule_type} (${emp.default_shift_hours}ч)`}
                    />
                  </TableCell>
                  <TableCell>
                    {emp.has_itilium ? (
                      <Chip
                        size="small"
                        color="info"
                        label="Вкл"
                      />
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Нет
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        emp.is_active
                          ? "Отключить (убрать из табеля)"
                          : "Включить обратно в табель"
                      }
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={emp.is_active}
                            onChange={() =>
                              timesheetStore.toggleEmployeeActive(
                                emp.id,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="caption">
                            {emp.is_active
                              ? "Активен"
                              : "Отключён"}
                          </Typography>
                        }
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(emp)}
                      title="Редактировать данные"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* Диалог редактирования сотрудника */}
      <Dialog
        open={Boolean(editingEmp)}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Редактирование сотрудника</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="ФИО"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Должность"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Отдел / Группа"
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
              fullWidth
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                select
                label="График работы"
                value={scheduleType}
                onChange={(e) =>
                  setScheduleType(
                    e.target.value as ScheduleType,
                  )
                }
                fullWidth
              >
                <MenuItem value="5/2">5/2 (Пн–Пт)</MenuItem>
                <MenuItem value="2/2">
                  2/2 (Сменный)
                </MenuItem>
                <MenuItem value="1/3">
                  1/3 (Сутки через трое)
                </MenuItem>
                <MenuItem value="manual">
                  Ручной (свободный)
                </MenuItem>
              </TextField>

              <TextField
                type="number"
                label="Часов в смене"
                value={shiftHours}
                onChange={(e) =>
                  setShiftHours(Number(e.target.value))
                }
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: 24,
                    step: 0.5,
                  },
                }}
                sx={{ minWidth: 150 }}
              />
            </Stack>

            {isCyclicEdit && (
              <TextField
                type="date"
                label="Дата первой рабочей смены"
                value={shiftStartDate}
                onChange={(e) =>
                  setShiftStartDate(e.target.value)
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />
            )}

            <TextField
              type="number"
              label="Часовая ставка"
              value={hourlyRate}
              onChange={(e) =>
                setHourlyRate(e.target.value)
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 0.01,
                },
              }}
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={hasItilium}
                  onChange={(e) =>
                    setHasItilium(e.target.checked)
                  }
                />
              }
              label="Учитывать время по приложению Итилиум"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={closeEditDialog}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={
              isSaving ||
              !fullName.trim() ||
              !position.trim()
            }
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
});
