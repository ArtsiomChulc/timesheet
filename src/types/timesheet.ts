export type ShiftCode = "В" | "О" | "Б" | "К" | "От";
export type CellValue = number | ShiftCode | "";

export type ScheduleType = "5/2" | "2/2" | "1/3" | "manual";

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  position: string;
  department: string;
  schedule_type: ScheduleType;
  shift_start_date: string | null;
  default_shift_hours: number;
  hourly_rate: number;
  has_itilium: boolean; // <-- новое поле
  is_active: boolean;
}

export interface CreateEmployeeDto {
  full_name: string;
  position: string;
  department: string;
  schedule_type: ScheduleType;
  shift_start_date: string | null;
  default_shift_hours: number;
  hourly_rate: number;
  has_itilium: boolean; // <-- новое поле
}

export type TimesheetRecords = Record<
  string,
  Record<number, CellValue>
>;

export type ItiliumRecords = Record<
  string,
  Record<number, number | "">
>;

export interface DayInfo {
  day: number;
  weekday: string; // 'Пн', 'Вт'...
  isWeekend: boolean;
}
