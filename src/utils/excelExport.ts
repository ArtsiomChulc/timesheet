import { saveAs } from "file-saver";
import type {
  DayInfo,
  Employee,
  ItiliumRecords,
  TimesheetRecords,
} from "../types/timesheet";

export interface ExportTimesheetParams {
  employees: Employee[];
  daysInMonth: DayInfo[];
  records: TimesheetRecords;
  itiliumRecords: ItiliumRecords;
  monthTitle: string;
  monthKey: string;
  filterLabel?: string; // Например: "Отдел: Бригада №1" или ФИО сотрудника
}

const THIN_BORDER = {
  top: {
    style: "thin" as const,
    color: { argb: "FFCBD5E1" },
  },
  left: {
    style: "thin" as const,
    color: { argb: "FFCBD5E1" },
  },
  bottom: {
    style: "thin" as const,
    color: { argb: "FFCBD5E1" },
  },
  right: {
    style: "thin" as const,
    color: { argb: "FFCBD5E1" },
  },
};

const GROUP_BOTTOM_BORDER = {
  ...THIN_BORDER,
  bottom: {
    style: "medium" as const,
    color: { argb: "FF64748B" },
  },
};

export async function exportTimesheetToExcel({
  employees,
  daysInMonth,
  records,
  itiliumRecords,
  monthTitle,
  monthKey,
  filterLabel,
}: ExportTimesheetParams): Promise<void> {
  // Динамический импорт, чтобы не утяжелять основной бандл приложения
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Табель", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4 }], // Закрепляем шапку и первые 3 колонки
  });

  const totalDays = daysInMonth.length;
  // Колонки: 1(№), 2(ФИО), 3(Учёт), 4..(3+totalDays)(Дни), 4+totalDays(Часы), 5+totalDays(Явки)
  const hoursColIdx = 4 + totalDays;
  const daysColIdx = 5 + totalDays;

  // 1. Заголовок документа (строка 1)
  sheet.mergeCells(1, 1, 1, daysColIdx);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = filterLabel
    ? `Табель учёта рабочего времени за ${monthTitle} (${filterLabel})`
    : `Табель учёта рабочего времени за ${monthTitle}`;
  titleCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  sheet.getRow(1).height = 28;

  // Пустая строка-отступ (строка 2)
  sheet.getRow(2).height = 10;

  // 2. Двухуровневая шапка таблицы (строки 3 и 4)
  const headerRowTop = sheet.getRow(3);
  const headerRowBottom = sheet.getRow(4);
  headerRowTop.height = 20;
  headerRowBottom.height = 18;

  // Объединяем по вертикали статичные колонки шапки
  const fixedHeaders: { col: number; title: string }[] = [
    { col: 1, title: "№" },
    { col: 2, title: "Сотрудник / Должность" },
    { col: 3, title: "Учёт" },
    { col: hoursColIdx, title: "Часы" },
    { col: daysColIdx, title: "Явки" },
  ];

  for (const fh of fixedHeaders) {
    sheet.mergeCells(3, fh.col, 4, fh.col);
    const cell = sheet.getCell(3, fh.col);
    cell.value = fh.title;
  }

  // Заполняем числа и дни недели в шапке
  daysInMonth.forEach((d, idx) => {
    const col = 4 + idx;
    const topCell = headerRowTop.getCell(col);
    const bottomCell = headerRowBottom.getCell(col);

    topCell.value = d.day;
    bottomCell.value = d.weekday;

    if (d.isWeekend) {
      topCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
      bottomCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
      topCell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFB91C1C" },
      };
      bottomCell.font = {
        name: "Arial",
        size: 9,
        color: { argb: "FFDC2626" },
      };
    }
  });

  // Общее оформление шапки
  for (let r = 3; r <= 4; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= daysColIdx; c++) {
      const cell = row.getCell(c);
      if (!cell.fill) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }
      if (!cell.font) {
        cell.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "FF1E293B" },
        };
      }
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border =
        r === 4 ? GROUP_BOTTOM_BORDER : THIN_BORDER;
    }
  }

  // 3. Строки сотрудников
  let currentRowIdx = 5;
  const firstDayLetter = sheet.getColumn(4).letter;
  const lastDayLetter = sheet.getColumn(
    3 + totalDays,
  ).letter;

  employees.forEach((emp, empIdx) => {
    const showItilium = emp.has_itilium;
    const mainRow = sheet.getRow(currentRowIdx);
    mainRow.height = 24;

    const empRecords = records[emp.id] ?? {};
    let workDaysCount = 0;

    // Заполняем данные основной строки ("Табель")
    mainRow.getCell(1).value = empIdx + 1;
    mainRow.getCell(2).value =
      `${emp.full_name}\n${emp.position} (${emp.department}, ${emp.schedule_type})`;
    mainRow.getCell(3).value = "Табель";

    daysInMonth.forEach((d, dayIdx) => {
      const col = 4 + dayIdx;
      const val = empRecords[d.day] ?? "";
      const cell = mainRow.getCell(col);
      cell.value = val === "" ? null : val;

      if (typeof val === "number" && val > 0) {
        workDaysCount += 1;
      }

      // Цветовое выделение кодов и выходных
      if (val === "О") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDCFCE7" },
        };
      } else if (val === "Б") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      } else if (val === "К") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDBEAFE" },
        };
      } else if (val === "В" || d.isWeekend) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });

    // Формула суммы часов и количество явок
    const mainHoursCell = mainRow.getCell(hoursColIdx);
    mainHoursCell.value = {
      formula: `SUM(${firstDayLetter}${currentRowIdx}:${lastDayLetter}${currentRowIdx})`,
    };
    mainHoursCell.font = {
      name: "Arial",
      size: 10,
      bold: true,
    };
    mainHoursCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };

    const mainDaysCell = mainRow.getCell(daysColIdx);
    mainDaysCell.value = workDaysCount;
    mainDaysCell.font = {
      name: "Arial",
      size: 10,
      bold: true,
    };
    mainDaysCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };

    // Базовое оформление ячеек основной строки
    for (let c = 1; c <= daysColIdx; c++) {
      const cell = mainRow.getCell(c);
      if (!cell.font) {
        cell.font = {
          name: "Arial",
          size: 10,
          color: { argb: "FF0F172A" },
        };
      }
      cell.alignment = {
        vertical: "middle",
        horizontal: c === 2 ? "left" : "center",
        wrapText: c === 2,
      };
      cell.border = showItilium
        ? THIN_BORDER
        : GROUP_BOTTOM_BORDER;
    }

    // Если включён Итилиум — добавляем вторую строку и объединяем ячейки № и ФИО
    if (showItilium) {
      const itiliumRowIdx = currentRowIdx + 1;
      const itiliumRow = sheet.getRow(itiliumRowIdx);
      itiliumRow.height = 20;

      const empItilium = itiliumRecords[emp.id] ?? {};

      // Объединяем по вертикали колонки № (1) и Сотрудник (2)
      sheet.mergeCells(currentRowIdx, 1, itiliumRowIdx, 1);
      sheet.mergeCells(currentRowIdx, 2, itiliumRowIdx, 2);

      itiliumRow.getCell(3).value = "Итилиум";

      daysInMonth.forEach((d, dayIdx) => {
        const col = 4 + dayIdx;
        const itVal = empItilium[d.day];
        const cell = itiliumRow.getCell(col);
        cell.value =
          typeof itVal === "number" ? itVal : null;
      });

      const itHoursCell = itiliumRow.getCell(hoursColIdx);
      itHoursCell.value = {
        formula: `SUM(${firstDayLetter}${itiliumRowIdx}:${lastDayLetter}${itiliumRowIdx})`,
      };

      itiliumRow.getCell(daysColIdx).value = "—";

      // Оформление строки Итилиум (голубоватая подсветка)
      for (let c = 1; c <= daysColIdx; c++) {
        const cell = itiliumRow.getCell(c);
        if (c >= 3) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb:
                c >= hoursColIdx ? "FFE0F2FE" : "FFF0F9FF",
            },
          };
          cell.font = {
            name: "Arial",
            size: 9,
            bold: c === 3 || c === hoursColIdx,
            color: { argb: "FF0369A1" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
        cell.border = GROUP_BOTTOM_BORDER;
      }

      // На объединённых ячейках 1 и 2 ставим жирную нижнюю границу группы
      mainRow.getCell(1).border = GROUP_BOTTOM_BORDER;
      mainRow.getCell(2).border = GROUP_BOTTOM_BORDER;

      currentRowIdx += 2;
    } else {
      currentRowIdx += 1;
    }
  });

  // 4. Блок подписей внизу документа
  const signRowIdx = currentRowIdx + 2;
  sheet.getCell(signRowIdx, 2).value =
    "Ответственный за ведение табеля: ___________________";
  sheet.getCell(signRowIdx, 2).font = {
    name: "Arial",
    size: 10,
  };

  sheet.getCell(signRowIdx + 2, 2).value =
    "Руководитель подразделения: _______________________";
  sheet.getCell(signRowIdx + 2, 2).font = {
    name: "Arial",
    size: 10,
  };

  // 5. Настройка ширины колонок
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 10;
  for (let i = 0; i < totalDays; i++) {
    sheet.getColumn(4 + i).width = 4.5;
  }
  sheet.getColumn(hoursColIdx).width = 9;
  sheet.getColumn(daysColIdx).width = 8;

  // 6. Генерация и скачивание файла
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeSuffix = filterLabel
    ? `_${filterLabel.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")}`
    : "";
  saveAs(blob, `Табель_${monthKey}${safeSuffix}.xlsx`);
}
