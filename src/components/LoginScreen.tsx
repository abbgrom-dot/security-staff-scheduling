import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";

// Demo credentials map: email → userId
const DEMO_CREDS: Record<string, number> = {
  "admin@securgroup.ru": 1,
  "orlova@og-center.ru": 2,
  "savin@og-center.ru":  3,
  "karpova@og-sever.ru": 4,
  "ryabov@og-yug.ru":    5,
};

export default function LoginScreen() {
  const { users, orgs, login } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const userId = DEMO_CREDS[email.trim().toLowerCase()];
    const user = users.find(u => u.id === userId);

    if (!user || !user.isActive) {
      setError("Неверный email или пользователь неактивен");
      return;
    }
    if (password.length < 1) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const defaultOrg = user.orgIds[0];
      login(user.id, defaultOrg);
      setLoading(false);
    }, 600);
  };

  const demoUsers = [
    { email: "admin@securgroup.ru",  label: "Суперадмин",           hint: "Все организации" },
    { email: "orlova@og-center.ru",  label: "Директор (ОГ Центр)",   hint: "Только ОГ Центр" },
    { email: "savin@og-center.ru",   label: "Диспетчер (ОГ Центр)",  hint: "Ограниченный доступ" },
    { email: "karpova@og-sever.ru",  label: "Директор (ОГ Север)",   hint: "Только ОГ Север" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="Shield" size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SecureOps</h1>
          <p className="text-sm text-muted-foreground mt-1">Система управления охраной</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-7">
          <h2 className="text-lg font-semibold text-foreground mb-5">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@securgroup.ru"
                autoComplete="email"
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Любой пароль (демо)"
                autoComplete="current-password"
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" /> Вход...</> : "Войти"}
            </button>
          </form>
        </div>

        {/* Demo hint */}
        <div className="mt-4 bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Демо-аккаунты (пароль — любой)</p>
          <div className="space-y-2">
            {demoUsers.map(d => (
              <button
                key={d.email}
                onClick={() => setEmail(d.email)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon name="User" size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                </div>
                <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 hidden group-hover:block shrink-0">{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
