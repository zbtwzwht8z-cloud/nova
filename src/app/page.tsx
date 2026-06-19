import TrainerApp from "@/components/TrainerApp";
import { questionMetrics } from "@/lib/question-metrics";

export default function Home() {
  return <TrainerApp questionMetrics={questionMetrics} />;
}
