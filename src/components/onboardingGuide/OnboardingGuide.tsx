import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TableViewIcon from "@mui/icons-material/TableView";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlineSharpIcon from "@mui/icons-material/InfoOutlineSharp";
import { PATHS } from "../../app/PATHS";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const STEPS = [
  {
    step: "Шаг 1",
    title: "Добавьте сотрудников",
    description: (
      <p>
        Укажите ФИО, должность, отдел или бригаду, выберите
        график работы (5/2, 2/2, 1/3 или ручной) и при
        необходимости включите учёт по приложению Итилиум.
        <small
          style={{
            display: "flex",
            padding: "10px",
            alignItems: "center",
            gap: "12px",
            color: "tan",
          }}
        >
          <InfoOutlineSharpIcon />
          Смена может начинаться последний день месяца
        </small>
      </p>
    ),
    icon: (
      <PersonAddAlt1Icon color="primary" fontSize="large" />
    ),
  },
  {
    step: "Шаг 2",
    title: "Заполните смены в табеле",
    description:
      "Нажмите «Заполнить по графику» для автоматической расстановки смен на весь месяц или вносите корректировки вручную: часы (8, 12) и коды (В, О, Б, К).",
    icon: (
      <CalendarMonthIcon color="primary" fontSize="large" />
    ),
  },
  {
    step: "Шаг 3",
    title: "Выгрузите готовый Excel",
    description:
      "Фильтруйте табель по отделу или отдельному работнику и скачивайте оформленный бланк .xlsx с автоматическими формулами подсчёта часов и явок.",
    icon: (
      <TableViewIcon color="primary" fontSize="large" />
    ),
  },
];

export const OnboardingGuide: FC = () => {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      {/* Приветственный баннер */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
          }}
          spacing={2}
        >
          <Box>
            <Chip
              label="Начало работы"
              color="primary"
              size="small"
              sx={{ mb: 1.5, fontWeight: 600 }}
            />
            <Typography variant="h5" gutterBottom>
              Добро пожаловать в табель учёта рабочего
              времени
            </Typography>
            <Typography variant="body1" color="secondary">
              В вашем справочнике пока нет ни одного
              сотрудника. Добавьте первого работника, чтобы
              сформировать календарную сетку и начать учёт.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="medium"
            startIcon={<PersonAddAlt1Icon />}
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(PATHS.addEmployee)}
            sx={{
              whiteSpace: "nowrap",
              px: 3,
              py: 1.25,
              borderRadius: 2,
            }}
          >
            Добавить сотрудника
          </Button>
        </Stack>
      </Paper>

      {/* Карточки с пошаговой инструкцией */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Как пользоваться программой
        </Typography>

        <Grid container spacing={2.5}>
          {STEPS.map((item) => (
            <Grid key={item.step} size={{ xs: 12, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    sx={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    {item.icon}
                    <Chip
                      label={item.step}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </Stack>

                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="secondary"
                  >
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Stack>
  );
};
