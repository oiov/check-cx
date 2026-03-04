import { SettingsClient } from "./client";

const SAFE_ENV_VARS = [
  { key: "CHECK_NODE_ID",                          label: "节点 ID",           description: "当前节点标识，多节点部署时用于选主" },
  { key: "CHECK_POLL_INTERVAL_SECONDS",            label: "轮询间隔",           description: "环境变量中配置的轮询间隔（秒），启动时读取" },
  { key: "CHECK_CONCURRENCY",                      label: "并发数",             description: "环境变量中配置的并发检测上限" },
  { key: "OFFICIAL_STATUS_CHECK_INTERVAL_SECONDS", label: "官方状态轮询间隔",   description: "检查 OpenAI/Anthropic 官方状态的间隔（秒）" },
];

export default function SettingsPage() {
  const envVars = SAFE_ENV_VARS.map((v) => ({
    ...v,
    value: process.env[v.key] ?? "",
  }));

  return <SettingsClient envVars={envVars} />;
}
