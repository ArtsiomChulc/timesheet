import {
  type FC,
  Fragment,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { timesheetStore } from "../stores/TimesheetStore";
import { authStore } from "../stores/AuthStore";
import { PATHS } from "../app/PATHS";
import type {
  CellValue,
  ShiftCode,
} from "../types/timesheet";
import { exportTimesheetToExcel } from "../utils/excelExport";
import styles from "./styles/TimesheetPage.module.css";

const SHIFT_CODES: { code: ShiftCode; label: string }[] = [
  { code: "В", label: "Выходной" },
  { code: "О", label: "Отпуск" },
  { code: "Б", label: "Больничный" },
  { code: "К", label: "Командировка" },
];

// Автоперевод латинских клавиш в русские коды смен для быстрого набора
const EN_TO_RU_CODE: Record<string, ShiftCode> = {
  D: "В",
  J: "О",
  ",": "Б",
  R: "К",
};

const handleItiliumInputChange = (
  empId: string,
  day: number,
  rawValue: string,
) => {
  const trimmed = rawValue.trim();
  if (trimmed === "") {
    timesheetStore.updateItiliumCell(empId, day, "");
    return;
  }

  const normalizedNum = Number(trimmed.replace(",", "."));
  if (
    !Number.isNaN(normalizedNum) &&
    normalizedNum >= 0 &&
    normalizedNum <= 24
  ) {
    timesheetStore.updateItiliumCell(
      empId,
      day,
      normalizedNum,
    );
  }
};

export const TimesheetPage: FC = observer(() => {
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);

  const [activeCell, setActiveCell] = useState<{
    empId: string;
    day: number;
  } | null>(null);

  useEffect(() => {
    if (authStore.user) {
      timesheetStore.loadMonthData();
    }
  }, []);

  const handleCellInputChange = (
    empId: string,
    day: number,
    rawValue: string,
  ) => {
    const trimmed = rawValue.trim().toUpperCase();

    if (trimmed === "") {
      timesheetStore.updateCell(empId, day, "");
      return;
    }

    // Проверка на ввод кода смены (в т.ч. в английской раскладке)
    const mappedCode = EN_TO_RU_CODE[trimmed] ?? trimmed;
    if (["В", "О", "Б", "К"].includes(mappedCode)) {
      timesheetStore.updateCell(
        empId,
        day,
        mappedCode as ShiftCode,
      );
      setActiveCell(null);
      return;
    }

    // Проверка на ввод часов (от 0 до 24, допускаем дробные через точку/запятую)
    const normalizedNum = Number(trimmed.replace(",", "."));
    if (
      !Number.isNaN(normalizedNum) &&
      normalizedNum >= 0 &&
      normalizedNum <= 24
    ) {
      timesheetStore.updateCell(empId, day, normalizedNum);
    }
  };

  const handleQuickSelect = (
    empId: string,
    day: number,
    value: CellValue,
  ) => {
    timesheetStore.updateCell(empId, day, value);
    setActiveCell(null);
  };

  const getCellModifierClass = (
    val: CellValue,
    isWeekend: boolean,
  ) => {
    if (val === "В") return styles.cellDayOff;
    if (val === "О") return styles.cellVacation;
    if (val === "Б") return styles.cellSick;
    if (val === "К") return styles.cellTrip;
    if (isWeekend) return styles.cellWeekendBg;
    return "";
  };

  const handleExportExcel = async () => {
    if (filteredEmployees.length === 0) return;

    // Формируем понятную подпись для заголовка и имени файла, если включён фильтр
    let filterLabel: string | undefined;
    if (timesheetStore.selectedEmployeeId !== "ALL") {
      const emp = filteredEmployees[0];
      if (emp) filterLabel = emp.full_name;
    } else if (
      timesheetStore.selectedDepartment !== "ALL"
    ) {
      filterLabel = timesheetStore.selectedDepartment;
    }

    setIsExporting(true);
    try {
      await exportTimesheetToExcel({
        allEmployees: filteredEmployees,
        daysInMonth: timesheetStore.daysInMonth,
        records: timesheetStore.records,
        itiliumRecords: timesheetStore.itiliumRecords,
        monthTitle: timesheetStore.monthTitle,
        monthKey: timesheetStore.monthKey,
        filterLabel,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderSaveStatus = () => {
    switch (timesheetStore.saveStatus) {
      case "saving":
        return (
          <span className={styles.statusSaving}>
            Сохранение...
          </span>
        );
      case "unsaved":
        return (
          <span className={styles.statusUnsaved}>
            Есть изменения
          </span>
        );
      case "error":
        return (
          <span className={styles.statusError}>
            Ошибка сохранения
          </span>
        );
      default:
        return (
          <span className={styles.statusSaved}>
            Все изменения сохранены
          </span>
        );
    }
  };

  const { daysInMonth, filteredEmployees } = timesheetStore;

  return (
    <div className={styles.page}>
      {/* Верхняя панель управления */}
      <header className={styles.toolbar}>
        <div className={styles.monthControl}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => timesheetStore.changeMonth(-1)}
            title="Предыдущий месяц"
          >
            ←
          </button>
          <h1 className={styles.monthTitle}>
            {timesheetStore.monthTitle}
          </h1>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => timesheetStore.changeMonth(1)}
            title="Следующий месяц"
          >
            →
          </button>
        </div>

        <div className={styles.filters}>
          <select
            className={styles.select}
            value={timesheetStore.selectedDepartment}
            onChange={(e) =>
              timesheetStore.setDepartmentFilter(
                e.target.value,
              )
            }
            aria-label="Фильтр по отделу"
          >
            <option value="ALL">Все отделы / группы</option>
            {timesheetStore.departments.map((dep) => (
              <option key={dep} value={dep}>
                Отдел: {dep}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={timesheetStore.selectedEmployeeId}
            onChange={(e) =>
              timesheetStore.setEmployeeFilter(
                e.target.value,
              )
            }
            aria-label="Фильтр по сотруднику"
          >
            <option value="ALL">
              Все сотрудники (
              {
                timesheetStore.employeesInSelectedDepartment
                  .length
              }
              )
            </option>
            {timesheetStore.employeesInSelectedDepartment.map(
              (emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ),
            )}
          </select>

          {(timesheetStore.selectedDepartment !== "ALL" ||
            timesheetStore.selectedEmployeeId !==
              "ALL") && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={timesheetStore.resetFilters}
            >
              Сбросить
            </button>
          )}
        </div>

        <div className={styles.actions}>
          {renderSaveStatus()}

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() =>
              timesheetStore.fillFilteredGroupSchedule(
                false,
              )
            }
            disabled={filteredEmployees.length === 0}
          >
            Заполнить по графику
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(PATHS.addEmployee)}
          >
            + Сотрудник
          </button>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportExcel}
            disabled={
              filteredEmployees.length === 0 || isExporting
            }
          >
            {isExporting
              ? "Формирование..."
              : "Скачать Excel"}
          </button>
        </div>
      </header>

      {/* Легенда кодов */}
      <div className={styles.legend}>
        <span>Быстрый ввод:</span>
        <span>
          <b>8 / 12</b> — часы
        </span>
        <span>
          <b className={styles.badgeOff}>В</b> — выходной
        </span>
        <span>
          <b className={styles.badgeVac}>О</b> — отпуск
        </span>
        <span>
          <b className={styles.badgeSick}>Б</b> — больничный
        </span>
        <span>
          <b className={styles.badgeTrip}>К</b> —
          командировка
        </span>
      </div>

      {/* Сетка табеля */}
      {timesheetStore.isLoading ? (
        <div className={styles.emptyState}>
          Загрузка табеля...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className={styles.emptyState}>
          <p>В выбранной группе пока нет сотрудников.</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(PATHS.addEmployee)}
          >
            Добавить первого сотрудника
          </button>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  className={`${styles.th} ${styles.stickyColIndex}`}
                >
                  №
                </th>
                <th
                  className={`${styles.th} ${styles.stickyColName}`}
                >
                  Сотрудник / График
                </th>
                <th
                  className={`${styles.th} ${styles.stickyColType}`}
                >
                  Учёт
                </th>
                {daysInMonth.map((d) => (
                  <th
                    key={d.day}
                    className={`${styles.th} ${styles.dayCol} ${
                      d.isWeekend
                        ? styles.weekendHeader
                        : ""
                    }`}
                  >
                    <div className={styles.dayNum}>
                      {d.day}
                    </div>
                    <div className={styles.weekday}>
                      {d.weekday}
                    </div>
                  </th>
                ))}
                <th
                  className={`${styles.th} ${styles.totalCol}`}
                >
                  Часы
                </th>
                <th
                  className={`${styles.th} ${styles.totalCol}`}
                >
                  Явки
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((emp, index) => {
                const stats =
                  timesheetStore.getEmployeeStats(emp.id);
                const showItilium = emp.has_itilium;

                return (
                  <Fragment key={emp.id}>
                    {/* СТРОКА 1: Основной табель */}
                    <tr className={styles.trMain}>
                      <td
                        rowSpan={showItilium ? 2 : 1}
                        className={`${styles.td} ${styles.stickyColIndex} ${
                          !showItilium
                            ? styles.groupBorderBottom
                            : ""
                        }`}
                      >
                        {index + 1}
                      </td>

                      <td
                        rowSpan={showItilium ? 2 : 1}
                        className={`${styles.td} ${styles.stickyColName} ${
                          !showItilium
                            ? styles.groupBorderBottom
                            : ""
                        }`}
                      >
                        <div className={styles.empCell}>
                          <div className={styles.empInfo}>
                            <span
                              className={styles.empName}
                            >
                              {emp.full_name}
                            </span>
                            <span
                              className={styles.empMeta}
                            >
                              {emp.position} ·{" "}
                              {emp.department} ·{" "}
                              <b>{emp.schedule_type}</b>
                            </span>
                          </div>

                          <div
                            className={styles.rowControls}
                          >
                            <button
                              type="button"
                              className={`${styles.itiliumToggleBtn} ${
                                showItilium
                                  ? styles.itiliumToggleActive
                                  : ""
                              }`}
                              onClick={() =>
                                timesheetStore.toggleEmployeeItilium(
                                  emp.id,
                                )
                              }
                              title={
                                showItilium
                                  ? "Скрыть строку Итилиум"
                                  : "Добавить строку Итилиум"
                              }
                            >
                              ИТ
                            </button>

                            {emp.schedule_type !==
                              "manual" && (
                              <button
                                type="button"
                                className={
                                  styles.fillRowBtn
                                }
                                onClick={() =>
                                  timesheetStore.fillEmployeeSchedule(
                                    emp.id,
                                    false,
                                  )
                                }
                                title={`Заполнить месяц по графику ${emp.schedule_type}`}
                              >
                                ⚡
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td
                        className={`${styles.td} ${styles.stickyColType} ${
                          !showItilium
                            ? styles.groupBorderBottom
                            : ""
                        }`}
                      >
                        <span className={styles.rowTagMain}>
                          Табель
                        </span>
                      </td>

                      {daysInMonth.map((d) => {
                        const val =
                          timesheetStore.records[emp.id]?.[
                            d.day
                          ] ?? "";
                        const isCellActive =
                          activeCell?.empId === emp.id &&
                          activeCell?.day === d.day;

                        return (
                          <td
                            key={d.day}
                            className={`${styles.td} ${styles.cellTd} ${getCellModifierClass(
                              val,
                              d.isWeekend,
                            )} ${!showItilium ? styles.groupBorderBottom : ""}`}
                          >
                            <input
                              type="text"
                              className={styles.cellInput}
                              value={val}
                              onFocus={() =>
                                setActiveCell({
                                  empId: emp.id,
                                  day: d.day,
                                })
                              }
                              onBlur={() => {
                                setTimeout(
                                  () => setActiveCell(null),
                                  150,
                                );
                              }}
                              onChange={(e) =>
                                handleCellInputChange(
                                  emp.id,
                                  d.day,
                                  e.target.value,
                                )
                              }
                            />

                            {isCellActive && (
                              <div
                                className={styles.popover}
                                onMouseDown={(e) =>
                                  e.preventDefault()
                                }
                              >
                                <button
                                  type="button"
                                  className={styles.popBtn}
                                  onClick={() =>
                                    handleQuickSelect(
                                      emp.id,
                                      d.day,
                                      emp.default_shift_hours ||
                                        8,
                                    )
                                  }
                                >
                                  {emp.default_shift_hours ||
                                    8}
                                  ч
                                </button>
                                {SHIFT_CODES.map((sc) => (
                                  <button
                                    key={sc.code}
                                    type="button"
                                    className={
                                      styles.popBtn
                                    }
                                    title={sc.label}
                                    onClick={() =>
                                      handleQuickSelect(
                                        emp.id,
                                        d.day,
                                        sc.code,
                                      )
                                    }
                                  >
                                    {sc.code}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className={
                                    styles.popClearBtn
                                  }
                                  title="Очистить"
                                  onClick={() =>
                                    handleQuickSelect(
                                      emp.id,
                                      d.day,
                                      "",
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td
                        className={`${styles.td} ${styles.totalCell} ${
                          !showItilium
                            ? styles.groupBorderBottom
                            : ""
                        }`}
                      >
                        {stats.totalHours}
                      </td>
                      <td
                        className={`${styles.td} ${styles.totalCell} ${
                          !showItilium
                            ? styles.groupBorderBottom
                            : ""
                        }`}
                      >
                        {stats.workDays}
                      </td>
                    </tr>

                    {/* СТРОКА 2: Отработанное время по приложению Итилиум (только если включено) */}
                    {showItilium && (
                      <tr className={styles.trItilium}>
                        <td
                          className={`${styles.td} ${styles.stickyColType} ${styles.itiliumSubRow} ${styles.groupBorderBottom}`}
                        >
                          <span
                            className={styles.rowTagItilium}
                          >
                            Итилиум
                          </span>
                        </td>

                        {daysInMonth.map((d) => {
                          const itiliumVal =
                            timesheetStore.itiliumRecords[
                              emp.id
                            ]?.[d.day] ?? "";

                          return (
                            <td
                              key={d.day}
                              className={`${styles.td} ${styles.cellTd} ${styles.itiliumCell} ${styles.groupBorderBottom}`}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="·"
                                className={
                                  styles.itiliumInput
                                }
                                value={itiliumVal}
                                onChange={(e) =>
                                  handleItiliumInputChange(
                                    emp.id,
                                    d.day,
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                          );
                        })}

                        <td
                          className={`${styles.td} ${styles.totalCell} ${styles.itiliumTotalCell} ${styles.groupBorderBottom}`}
                          title="Итого часов по Итилиум"
                        >
                          {stats.itiliumHours}
                        </td>
                        <td
                          className={`${styles.td} ${styles.totalCell} ${styles.itiliumTotalCell} ${styles.groupBorderBottom}`}
                        >
                          —
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
