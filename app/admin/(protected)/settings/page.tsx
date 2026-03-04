"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SiteConfigForm } from "@/components/admin/site-config-form";

export default function SettingsPage() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  // 加载配置
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/site-config");
        if (res.ok) {
          const data = await res.json();
          const config: Record<string, string> = {};
          for (const item of data) {
            config[item.key] = item.value || "";
          }
          setFormData(config);
        }
      } catch (error) {
        console.error("加载配置失败", error);
        setMessage("加载配置失败");
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setMessage("");
    setSaved(false);

    try {
      const keysToUpdate = [
        "site.title",
        "site.description",
        "site.logo_url",
        "site.favicon_url",
        "site.github_url",
        "check_poll_interval_seconds",
      ];

      // 逐个更新配置项
      for (const key of keysToUpdate) {
        const res = await fetch("/api/admin/site-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            value: formData[key] || "",
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          setMessage(`更新失败：${error.error}`);
          setLoading(false);
          return;
        }
      }

      setMessage("配置已保存");
      setSaved(true);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("保存失败", error);
      setMessage("保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 页面头 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">系统设置</h1>
        </div>
        <p className="text-muted-foreground">
          配置前台页面和系统参数
        </p>
      </div>

      {/* 前台页面配置 */}
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <h2 className="mb-6 text-lg font-semibold">前台页面配置</h2>

        <SiteConfigForm
          data={formData}
          onChange={(key, value) => setFormData((prev) => ({ ...prev, [key]: value }))}
        />

        {/* GitHub 链接 */}
        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium">GitHub 链接（为空则不显示）</label>
          <input
            type="url"
            placeholder="https://github.com/example/repo"
            value={formData["site.github_url"] || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, "site.github_url": e.target.value }))
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
          />
        </div>
      </div>

      {/* 系统配置 */}
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <h2 className="mb-6 text-lg font-semibold">系统配置</h2>

        <div className="space-y-4">
          {/* 轮询间隔 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">轮询检测间隔（秒）</label>
            <div className="flex gap-2">
              <select
                value={formData["check_poll_interval_seconds"] || "60"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    "check_poll_interval_seconds": e.target.value,
                  }))
                }
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="15">15 秒</option>
                <option value="30">30 秒</option>
                <option value="60">1 分钟</option>
                <option value="300">5 分钟</option>
                <option value="600">10 分钟</option>
                <option value="1800">30 分钟</option>
                <option value="3600">1 小时</option>
              </select>
              <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
                范围：15-3600 秒
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              检测轮询的时间间隔，修改后下一轮检测会立即应用新的间隔设置
            </p>
          </div>
        </div>
      </div>

      {/* 消息和按钮 */}
      <div className="flex items-center justify-between mb-6">
        {message && (
          <div
            className={`text-sm ${saved ? "text-emerald-600" : "text-destructive"}`}
          >
            {message}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="ml-auto inline-flex h-9 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存配置"}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>提示：</strong>修改后会立即生效。轮询间隔的新设置会在下一轮检测时应用。
        </p>
      </div>
    </div>
  );
}
