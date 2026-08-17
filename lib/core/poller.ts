import { getPollerTimer, setPollerTimer } from "./global-state";
import { startOfficialStatusPoller } from "./official-status-poller";
import { ensurePollerLeadership } from "./poller-leadership";
import { getPollingIntervalMs } from "./polling-config";
import { runPollExecution } from "./poll-execution";

function shouldAutoStartPoller(): boolean {
  return process.env.VERCEL !== "1";
}

async function tick(): Promise<void> {
  await runPollExecution({
    forceRefreshConfigs: true,
    source: "background",
  });
}

if (shouldAutoStartPoller() && !getPollerTimer()) {
  const scheduleNext = () => {
    const timer = setTimeout(() => {
      tick()
        .catch((error) => console.error("[check-cx] 定时检测失败", error))
        .finally(scheduleNext);
    }, getPollingIntervalMs());
    setPollerTimer(timer);
  };

  console.log("[check-cx] 初始化后台轮询器，首次检测立即执行");
  ensurePollerLeadership().catch((error) => {
    console.error("[check-cx] 初始化主节点选举失败", error);
  });
  tick()
    .catch((error) => console.error("[check-cx] 启动首轮检测失败", error))
    .finally(scheduleNext);
  startOfficialStatusPoller();
}
