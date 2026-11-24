import { makeAutoObservable, runInAction } from "mobx";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../supabase/client";
import { timesheetStore } from "./TimesheetStore.ts";

export class AuthStore {
  user: User | null = null;
  session: Session | null = null;
  isAuthChecking = true; // Идёт первичная проверка сессии при загрузке приложения
  isLoading = false; // Идёт процесс входа/регистрации
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.initAuth();
  }

  private async initAuth() {
    try {
      // 1. Получаем текущую сессию при старте (восстанавливает вход после F5)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;

      runInAction(() => {
        this.session = session;
        this.user = session?.user ?? null;
      });
    } catch (err) {
      console.error("Ошибка инициализации сессии:", err);
    } finally {
      runInAction(() => {
        this.isAuthChecking = false;
      });
    }

    // 2. Подписываемся на любые изменения (вход, выход, автообновление токена)
    supabase.auth.onAuthStateChange((_event, session) => {
      runInAction(() => {
        this.session = session;
        this.user = session?.user ?? null;
        this.isAuthChecking = false;
        if (!session) {
          timesheetStore.reset();
        }
      });
    });
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    runInAction(() => {
      this.isLoading = false;
      if (error) {
        this.error = this.mapAuthError(error.message);
      } else {
        this.session = data.session;
        this.user = data.user;
      }
    });

    return !error;
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    runInAction(() => {
      this.isLoading = false;
      if (error) {
        this.error = this.mapAuthError(error.message);
      } else {
        this.session = data.session;
        this.user = data.user;
      }
    });

    return !error;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    runInAction(() => {
      this.session = null;
      this.user = null;
      timesheetStore.reset();
    });
  }

  get isAuthenticated(): boolean {
    return Boolean(this.user && this.session);
  }

  private mapAuthError(message: string): string {
    if (message.includes("Invalid login credentials")) {
      return "Неверный email или пароль";
    }
    if (message.includes("User already registered")) {
      return "Пользователь с таким email уже зарегистрирован";
    }
    if (message.includes("Password should be at least")) {
      return "Пароль должен содержать минимум 6 символов";
    }
    return message;
  }
}

export const authStore = new AuthStore();
