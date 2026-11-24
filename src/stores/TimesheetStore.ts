import {
  makeAutoObservable,
  runInAction,
  toJS,
} from "mobx";
import { supabase } from "../../supabase/client";
import { authStore } from "./AuthStore";
import type {
  CellValue,
  CreateEmployeeDto,
  DayInfo,
  Employee,
  ItiliumRecords,
  TimesheetRecords,
} from "../types/timesheet";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TimesheetStore {
  // employees: Employee[] = [];
  allEmployees: Employee[] = [];
  records: TimesheetRecords = {};
  itiliumRecords: ItiliumRecords = {};

  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth(); // 0 - 11

  // Фильтры отображения и выгрузки
  selectedDepartment: string = "ALL"; // 'ALL' или название отдела
  selectedEmployeeId: string = "ALL"; // 'ALL' или конкретный UUID сотрудника

  isLoading = false;
  saveStatus: "saved" | "saving" | "unsaved" | "error" =
    "saved";
  private saveTimer: ReturnType<typeof setTimeout> | null =
    null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get geAllEmployees(): Employee[] {
    return this.allEmployees.filter((e) => e.is_active);
  }

  // Ключ месяца для БД: '2026-11'
  get monthKey(): string {
    const m = String(this.selectedMonth + 1).padStart(
      2,
      "0",
    );
    return `${this.selectedYear}-${m}`;
  }

  // Читаемое название месяца: 'Ноябрь 2026'
  get monthTitle(): string {
    const date = new Date(
      this.selectedYear,
      this.selectedMonth,
      1,
    );
    const title = date.toLocaleString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Календарная сетка выбранного месяца
  get daysInMonth(): DayInfo[] {
    const totalDays = new Date(
      this.selectedYear,
      this.selectedMonth + 1,
      0,
    ).getDate();
    return Array.from({ length: totalDays }, (_, idx) => {
      const day = idx + 1;
      const date = new Date(
        this.selectedYear,
        this.selectedMonth,
        day,
      );
      const dayOfWeek = date.getDay();
      return {
        day,
        weekday: WEEKDAYS[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    });
  }

  // Уникальный список всех отделов/групп
  get departments(): string[] {
    const set = new Set(
      this.allEmployees
        .map((e) => e.department)
        .filter(Boolean),
    );
    if (set.size === 0) set.add("Основной");
    return Array.from(set).sort();
  }

  // Сотрудники, подходящие под выбранный отдел (для выпадающего списка выбора одного работника)
  get employeesInSelectedDepartment(): Employee[] {
    if (this.selectedDepartment === "ALL")
      return this.allEmployees;
    return this.allEmployees.filter(
      (e) => e.department === this.selectedDepartment,
    );
  }

  // Итоговый отфильтрованный список сотрудников для таблицы и экспорта в Excel
  get filteredEmployees(): Employee[] {
    return this.allEmployees.filter((emp) => {
      const matchDept =
        this.selectedDepartment === "ALL" ||
        emp.department === this.selectedDepartment;
      const matchEmp =
        this.selectedEmployeeId === "ALL" ||
        emp.id === this.selectedEmployeeId;
      return matchDept && matchEmp;
    });
  }

  // Управление фильтрами
  setDepartmentFilter(department: string) {
    this.selectedDepartment = department;
    // Если выбранный ранее сотрудник не входит в новый отдел — сбрасываем фильтр по человеку
    if (
      this.selectedEmployeeId !== "ALL" &&
      !this.employeesInSelectedDepartment.some(
        (e) => e.id === this.selectedEmployeeId,
      )
    ) {
      this.selectedEmployeeId = "ALL";
    }
  }

  setEmployeeFilter(employeeId: string) {
    this.selectedEmployeeId = employeeId;
  }

  resetFilters() {
    this.selectedDepartment = "ALL";
    this.selectedEmployeeId = "ALL";
  }

  // Переключение месяца
  changeMonth(delta: number) {
    const nextDate = new Date(
      this.selectedYear,
      this.selectedMonth + delta,
      1,
    );
    this.selectedYear = nextDate.getFullYear();
    this.selectedMonth = nextDate.getMonth();
    this.loadMonthData();
  }

  // Загрузка сотрудников и табеля за месяц
  async loadMonthData() {
    if (!authStore.user) return;
    this.isLoading = true;

    try {
      const [empRes, sheetRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*")
          .order("full_name"),
        supabase
          .from("timesheets")
          .select("records")
          .eq("month", this.monthKey)
          .maybeSingle(),
      ]);

      if (empRes.error) throw empRes.error;
      if (sheetRes.error) throw sheetRes.error;

      runInAction(() => {
        this.allEmployees =
          (empRes.data as Employee[]) ?? [];
        const rawRecords = sheetRes.data?.records as
          Record<string, unknown> | undefined;

        if (
          rawRecords &&
          ("timesheet" in rawRecords ||
            "itilium" in rawRecords)
        ) {
          this.records =
            (rawRecords.timesheet as TimesheetRecords) ??
            {};
          this.itiliumRecords =
            (rawRecords.itilium as ItiliumRecords) ?? {};
        } else {
          this.records =
            (rawRecords as TimesheetRecords) ?? {};
          this.itiliumRecords = {};
        }
        this.saveStatus = "saved";
      });
    } catch (err) {
      console.error("Ошибка загрузки табеля:", err);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  updateItiliumCell(
    employeeId: string,
    day: number,
    value: number | "",
  ) {
    if (!this.itiliumRecords[employeeId]) {
      this.itiliumRecords[employeeId] = {};
    }
    this.itiliumRecords[employeeId][day] = value;
    this.scheduleSave();
  }

  // Добавление сотрудника
  async addEmployee(
    dto: CreateEmployeeDto,
  ): Promise<boolean> {
    if (!authStore.user) return false;

    const isCyclic =
      dto.schedule_type === "2/2" ||
      dto.schedule_type === "1/3";

    const { data, error } = await supabase
      .from("employees")
      .insert({
        user_id: authStore.user.id,
        full_name: dto.full_name.trim(),
        position: dto.position.trim(),
        department: dto.department.trim() || "Основной",
        schedule_type: dto.schedule_type,
        shift_start_date:
          isCyclic && dto.shift_start_date
            ? dto.shift_start_date
            : null,
        default_shift_hours: dto.default_shift_hours,
        hourly_rate: dto.hourly_rate,
        has_itilium: dto.has_itilium,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Ошибка создания сотрудника:",
        error.message,
      );
      return false;
    }

    runInAction(() => {
      this.allEmployees.push(data as Employee);
      this.allEmployees.sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      );
    });

    return true;
  }

  // метод редактирования данных сотрудника
  async updateEmployee(
    employeeId: string,
    dto: Partial<CreateEmployeeDto>,
  ): Promise<boolean> {
    const isCyclic =
      dto.schedule_type === "2/2" ||
      dto.schedule_type === "1/3";

    const payload = {
      ...dto,
      shift_start_date:
        isCyclic && dto.shift_start_date
          ? dto.shift_start_date
          : null,
    };

    const { data, error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employeeId)
      .select()
      .single();

    if (error) {
      console.error(
        "Ошибка обновления сотрудника:",
        error.message,
      );
      return false;
    }

    runInAction(() => {
      const idx = this.allEmployees.findIndex(
        (e) => e.id === employeeId,
      );
      if (idx !== -1) {
        this.allEmployees[idx] = data as Employee;
        this.allEmployees.sort((a, b) =>
          a.full_name.localeCompare(b.full_name),
        );
      }
    });

    return true;
  }

  // метод задизейбливания / восстановления сотрудника:
  async toggleEmployeeActive(
    employeeId: string,
  ): Promise<void> {
    const emp = this.allEmployees.find(
      (e) => e.id === employeeId,
    );
    if (!emp) return;

    const nextState = !emp.is_active;
    emp.is_active = nextState; // Мгновенное обновление UI

    const { error } = await supabase
      .from("employees")
      .update({ is_active: nextState })
      .eq("id", employeeId);

    if (error) {
      console.error(
        "Ошибка изменения статуса сотрудника:",
        error.message,
      );
      runInAction(() => {
        emp.is_active = !nextState;
      });
    }
  }

  // --- ЛОГИКА РАСЧЁТА ГРАФИКОВ РАБОТ ---

  // Вычисляет значение ячейки на конкретный день месяца согласно графику сотрудника
  private calculateCellBySchedule(
    emp: Employee,
    dayInfo: DayInfo,
  ): CellValue {
    const hours = Number(emp.default_shift_hours) || 8;

    if (emp.schedule_type === "manual") {
      return "";
    }

    if (emp.schedule_type === "5/2") {
      return dayInfo.isWeekend ? "В" : hours;
    }

    // Для циклических графиков (2/2 и 1/3) нужна дата первой смены
    if (!emp.shift_start_date) {
      return "";
    }

    const [startY, startM, startD] = emp.shift_start_date
      .split("-")
      .map(Number);
    const startUtc = Date.UTC(startY, startM - 1, startD);
    const currentUtc = Date.UTC(
      this.selectedYear,
      this.selectedMonth,
      dayInfo.day,
    );

    // Разница в календарных днях от даты первой смены
    const diffDays = Math.floor(
      (currentUtc - startUtc) / MS_PER_DAY,
    );

    if (emp.schedule_type === "2/2") {
      // Цикл 4 дня: остаток 0 и 1 — рабочие смены, 2 и 3 — выходные
      const cyclePos = ((diffDays % 4) + 4) % 4;
      return cyclePos < 2 ? hours : "В";
    }

    if (emp.schedule_type === "1/3") {
      // Цикл 4 дня: остаток 0 — рабочие сутки, 1, 2, 3 — выходные
      const cyclePos = ((diffDays % 4) + 4) % 4;
      return cyclePos === 0 ? hours : "В";
    }

    return "";
  }

  // Заполнить график для ОДНОГО сотрудника
  // onlyEmpty = true защищает уже проставленные вручную отпуска ('О') или больничные ('Б')
  fillEmployeeSchedule(
    employeeId: string,
    onlyEmpty = false,
  ) {
    const emp = this.allEmployees.find(
      (e) => e.id === employeeId,
    );
    if (!emp || emp.schedule_type === "manual") return;

    if (!this.records[emp.id]) {
      this.records[emp.id] = {};
    }

    for (const dayInfo of this.daysInMonth) {
      const currentVal = this.records[emp.id][dayInfo.day];
      if (
        onlyEmpty &&
        currentVal !== undefined &&
        currentVal !== ""
      ) {
        continue;
      }
      this.records[emp.id][dayInfo.day] =
        this.calculateCellBySchedule(emp, dayInfo);
    }

    this.scheduleSave();
  }

  // Заполнить графики для ВСЕХ текущих отфильтрованных сотрудников (группы или всех)
  fillFilteredGroupSchedule(onlyEmpty = false) {
    for (const emp of this.filteredEmployees) {
      if (emp.schedule_type !== "manual") {
        this.fillEmployeeSchedule(emp.id, onlyEmpty);
      }
    }
  }

  // --- РЕДАКТИРОВАНИЕ И СОХРАНЕНИЕ ---

  updateCell(
    employeeId: string,
    day: number,
    value: CellValue,
  ) {
    if (!this.records[employeeId]) {
      this.records[employeeId] = {};
    }
    this.records[employeeId][day] = value;
    this.scheduleSave();
  }

  private scheduleSave() {
    this.saveStatus = "unsaved";
    if (this.saveTimer) clearTimeout(this.saveTimer);

    this.saveTimer = setTimeout(() => {
      this.saveToDatabase();
    }, 1200);
  }

  async saveToDatabase() {
    if (!authStore.user) return;
    this.saveStatus = "saving";

    const { error } = await supabase
      .from("timesheets")
      .upsert(
        {
          user_id: authStore.user.id,
          month: this.monthKey,
          records: {
            timesheet: toJS(this.records),
            itilium: toJS(this.itiliumRecords),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" },
      );

    runInAction(() => {
      this.saveStatus = error ? "error" : "saved";
      if (error)
        console.error("Ошибка сохранения табеля:", error);
    });
  }

  async toggleEmployeeItilium(employeeId: string) {
    const emp = this.allEmployees.find(
      (e) => e.id === employeeId,
    );
    if (!emp) return;

    const nextValue = !emp.has_itilium;
    emp.has_itilium = nextValue; // Мгновенно обновляем UI

    const { error } = await supabase
      .from("employees")
      .update({ has_itilium: nextValue })
      .eq("id", employeeId);

    if (error) {
      console.error(
        "Ошибка обновления настройки Итилиум:",
        error.message,
      );
      runInAction(() => {
        emp.has_itilium = !nextValue; // Откатываем при ошибке сети
      });
    }
  }

  // Подсчёт итогов по сотруднику
  getEmployeeStats(employeeId: string) {
    const empDays = this.records[employeeId] ?? {};
    const empItilium =
      this.itiliumRecords[employeeId] ?? {};

    let totalHours = 0;
    let workDays = 0;
    let sickDays = 0;
    let vacationDays = 0;
    let itiliumHours = 0;

    for (const val of Object.values(empDays)) {
      if (typeof val === "number" && val > 0) {
        totalHours += val;
        workDays += 1;
      } else if (val === "Б") {
        sickDays += 1;
      } else if (val === "О") {
        vacationDays += 1;
      }
    }

    for (const val of Object.values(empItilium)) {
      if (typeof val === "number" && val > 0) {
        itiliumHours += val;
      }
    }

    // Округляем до 2 знаков на случай дробных часов (например, 7.5 + 1.25)
    itiliumHours = Math.round(itiliumHours * 100) / 100;

    return {
      totalHours,
      workDays,
      sickDays,
      vacationDays,
      itiliumHours,
    };
  }
}

export const timesheetStore = new TimesheetStore();
