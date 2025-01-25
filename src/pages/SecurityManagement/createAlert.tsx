"use client";
import AlertCard from "@/components/ui/alertCard";
import { CustomInput } from "@/components/ui/customInput";
import { BellDotIcon, DollarSign, Timer } from "lucide-react";
import { useState } from "react";

function CreateAlert() {
  const [minimumAmount, setMinimumAmount] = useState(0);
  const [maximumAmount, setMaximumAmount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  return (
    <div className="flex flex-col space-y-4 p-8 w-full pt-6">
      <p>Create Alert</p>

      <div className="w-full flex flex-col">
        <p className="text-sm mb-3">Alert Type</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full">
          {alertCards.map((alertCard, index) => (
            <AlertCard
              icon={alertCard.icon}
              text={alertCard.text}
              key={index}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 w-full md:grid-cols-2">
        <CustomInput
          onChange={(value) => setMinimumAmount(Number(value))}
          type="currency"
          name="Minimum_amount"
          placeholder="Minimum amnount"
          value={minimumAmount}
          label="Minimum amnount"
        />
        <CustomInput
          onChange={(value) => setMaximumAmount(Number(value))}
          type="currency"
          name="Maximum_amount"
          placeholder="Maximum amnount"
          value={maximumAmount}
          label="Maximum amnount"
        />
        <CustomInput
          type="date"
          label="Start Date"
          value={startDate}
          onChange={(value) => setStartDate(value as string)}
        />
        <CustomInput
          type="date"
          label="End Date"
          value={endDate}
          onChange={(value) => setEndDate(value as string)}
        />
      </div>
    </div>
  );
}

export default CreateAlert;

const alertCards = [
  {
    text: "Deposite Alert",
    icon: <DollarSign className="text-base dark:text-white text-black" />,
  },
  {
    text: "Release TIme",
    icon: <Timer className="text-base dark:text-white text-black" />,
  },
  {
    text: "Custome Reminder",
    icon: <BellDotIcon className="text-base dark:text-white text-black" />,
  },
];
