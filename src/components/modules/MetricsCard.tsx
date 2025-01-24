import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricsData {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
}

const MetricsCard = ({ title, value, description, icon }: MetricsData) => {
  return (
    <Card className="bg-background rounded-lg shadow-lg relative w-64">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-md font-semibold">
          {title}
          <span className="text-gray-400 text-md">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-gray-400 mt-2">{description}</p>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;