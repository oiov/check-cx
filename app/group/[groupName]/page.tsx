import {notFound} from "next/navigation";
import Link from "next/link";
import {Suspense} from "react";
import {ChevronLeft} from "lucide-react";

import {GroupDashboardBootstrap} from "@/components/group-dashboard-bootstrap";
import {getAvailableGroups} from "@/lib/core/group-data";
import {getGroupInfo} from "@/lib/database/group-info";


interface GroupPageProps {
  params: Promise<{ groupName: string }>;
}

// 生成页面元数据
export async function generateMetadata({ params }: GroupPageProps) {
  const { groupName } = await params;
  const decodedGroupName = decodeURIComponent(groupName);

  const info = await getGroupInfo(decodedGroupName);
  const title = info?.display_name || decodedGroupName;
  return {
    title,
    description: info?.description || `查看 ${decodedGroupName} 分组下的模型健康状态`,
  };
}

export default function GroupPage({ params }: GroupPageProps) {
  return (
    <div className="min-h-screen py-8 md:py-16">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:gap-8 sm:px-6">
        {/* 返回首页链接 */}
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回首页
        </Link>

        <Suspense fallback={null}>
          <GroupContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function GroupContent({ params }: GroupPageProps) {
  const { groupName } = await params;
  const decodedGroupName = decodeURIComponent(groupName);

  const availableGroups = await getAvailableGroups();
  if (!availableGroups.includes(decodedGroupName)) {
    notFound();
  }

  return <GroupDashboardBootstrap groupName={decodedGroupName} />;
}
