import { PlannerClient } from "@/components/planner-client";

export const metadata = {
  title: "城市探索 AI 規劃器｜JoinJoy",
  description: "輸入朋友的時間、預算與喜好，生成可以直接揪團的出遊方案。",
};

export default function PlannerPage() {
  return <PlannerClient />;
}
