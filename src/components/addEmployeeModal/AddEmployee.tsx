import {
  type FC,
  type SyntheticEvent,
  useState,
} from "react";
import { observer } from "mobx-react-lite";
import { timesheetStore } from "../../stores/TimesheetStore";
import type { ScheduleType } from "../../types/timesheet";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";

// interface AddEmployeeModalProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

const DEFAULT_HOURS_BY_SCHEDULE: Record<
  ScheduleType,
  number
> = {
  "5/2": 8,
  "2/2": 12,
  "1/3": 24,
  manual: 8,
};

export const AddEmployee: FC = observer(() => {
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("Основной");
  const [scheduleType, setScheduleType] =
    useState<ScheduleType>("5/2");
  const [shiftStartDate, setShiftStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [shiftHours, setShiftHours] = useState<number>(8);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    null,
  );
  const [hasItilium, setHasItilium] = useState(true);

  const isCyclicSchedule =
    scheduleType === "2/2" || scheduleType === "1/3";

  const handleScheduleChange = (
    nextSchedule: ScheduleType,
  ) => {
    setScheduleType(nextSchedule);
    setShiftHours(DEFAULT_HOURS_BY_SCHEDULE[nextSchedule]);
  };

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !position.trim()) {
      setFormError("Заполните ФИО и должность");
      return;
    }

    if (isCyclicSchedule && !shiftStartDate) {
      setFormError(
        "Укажите дату первой рабочей смены для расчёта цикла",
      );
      return;
    }

    setIsSubmitting(true);
    const ok = await timesheetStore.addEmployee({
      full_name: fullName,
      position,
      department,
      schedule_type: scheduleType,
      shift_start_date: isCyclicSchedule
        ? shiftStartDate
        : null,
      default_shift_hours: Number(shiftHours) || 8,
      hourly_rate: Number(hourlyRate) || 0,
      has_itilium: hasItilium,
    });
    setIsSubmitting(false);

    if (ok) {
      setFullName("");
      setPosition("");
      setHourlyRate("");
    } else {
      setFormError(
        "Не удалось сохранить сотрудника. Попробуйте ещё раз.",
      );
    }
  };

  return (
    <Container
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Typography
        variant={"h3"}
        sx={{
          margin: "30px",
          textAlign: "center",
        }}
      >
        Новый сотрудник
      </Typography>

      <form onSubmit={handleSubmit}>
        <Container
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <TextField
            label={"Ф.И.О"}
            type="text"
            placeholder="Иванов Иван Иванович"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            label={"Должность"}
            type="text"
            placeholder="Электромонтёр"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            required
          />

          <Autocomplete
            sx={{
              width: "100%",
            }}
            freeSolo
            options={timesheetStore.departments}
            value={department}
            onInputChange={(_event, newInputValue) => {
              setDepartment(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Группа / Отдел / Бригада"
                placeholder="Например: Бригада №1"
              />
            )}
          />

          <FormControl
            fullWidth
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <InputLabel id="demo-simple-select-label">
              График работы
            </InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={scheduleType}
              label="График работы"
              onChange={(e) =>
                handleScheduleChange(
                  e.target.value as ScheduleType,
                )
              }
            >
              <MenuItem value="5/2">5/2 (Пн–Пт)</MenuItem>
              <MenuItem value="2/2">2/2 (Сменный)</MenuItem>
              <MenuItem value="1/3">
                1/3 (Сутки через трое)
              </MenuItem>
              <MenuItem value="manual">
                Ручной (свободный)
              </MenuItem>
            </Select>
            <TextField
              label={"Часов в смене"}
              type="number"
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 24,
                  step: 0.5,
                },
              }}
              value={shiftHours}
              onChange={(e) =>
                setShiftHours(Number(e.target.value))
              }
            />
          </FormControl>

          {isCyclicSchedule && (
            <FormControl>
              <TextField
                label={"Дата первой рабочей смены *"}
                type="date"
                value={shiftStartDate}
                onChange={(e) =>
                  setShiftStartDate(e.target.value)
                }
                required
              />
              <span>
                От этой даты программа автоматически
                рассчитает рабочие и выходные дни в любом
                месяце
              </span>
            </FormControl>
          )}

          <TextField
            label={"Часовая ставка (необязательно)"}
            type="number"
            slotProps={{
              htmlInput: {
                min: 0,
                step: 0.01,
              },
            }}
            placeholder="0.00"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />

          {formError && (
            <Typography variant={"caption"} color={"error"}>
              {formError}
            </Typography>
          )}

          <label>
            <input
              type="checkbox"
              checked={hasItilium}
              onChange={(e) =>
                setHasItilium(e.target.checked)
              }
            />
            <span>
              Учитывать отработанное время по приложению
              Итилиум
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting}
            variant={"contained"}
            fullWidth
            sx={{
              padding: "14px 10px",
            }}
          >
            {isSubmitting ? "Сохранение..." : "Добавить"}
          </Button>
        </Container>
      </form>
    </Container>
  );
});
