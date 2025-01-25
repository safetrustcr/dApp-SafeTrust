"use client";
import AlertCard from "@/components/ui/alertCard";
import { CheckBox, CustomInput } from "@/components/ui/customInput";
import CustomSelect from "@/components/ui/customSelect";
import { BellDotIcon, DollarSign, Timer } from "lucide-react";
import { useState } from "react";

function CreateAlert() {
  const [minimumAmount, setMinimumAmount] = useState(0);
  const [maximumAmount, setMaximumAmount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");

  const options = [
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
    { label: "Option 3", value: "3" },
  ];
  return (
    <div className="flex flex-col dark:bg-black space-y-4 p-8 w-full pt-6">
      <p className="font-bold dark:text-white text-black lg:text-2xl text-base">
        Create Alert
      </p>

      <div className="w-full flex flex-col mt-4">
        <p className="text-sm mb-3 text-black dark:text-white/50 lg:text-base">
          Alert Type
        </p>
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
      <CustomSelect
        options={options}
        value={selectedOption}
        onChange={(value) => setSelectedOption(value.toString())}
        label="Reminder Frequency"
        placeholder="Select an option"
      />
      <div>
        <p>Notification Method</p>
        <CheckBox
          label="Email Notification"
          name="terms"
          inputValue={isChecked}
          handleChange={setIsChecked}
        />
        <CheckBox
          label="Push Notification"
          name="terms"
          inputValue={isChecked}
          handleChange={setIsChecked}
        />
        <CheckBox
          label="SMS Notification"
          name="terms"
          inputValue={isChecked}
          handleChange={setIsChecked}
        />
      </div>
      <CustomInput
        type="textarea"
        label="Additional Notes"
        name="description"
        placeholder="Add any additional notes or instructions...."
        value=""
        onChange={() => {}}
        rows={4}
      />
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
