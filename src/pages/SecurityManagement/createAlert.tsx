"use client";
import AlertCard from "@/components/ui/alertCard";
import { CheckBox, CustomInput } from "@/components/ui/customInput";
import CustomSelect from "@/components/ui/customSelect";
import { BellDotIcon, DollarSign, Timer } from "lucide-react";
import { useState } from "react";

function CreateAlert() {
  const [formData, setFormData] = useState({
    minimumAmount: 0,
    maximumAmount: 0,
    startDate: "",
    endDate: "",
    selectedOption: "",
    emailCheck: false,
    pushnotificationCheck: false,
    smsCheck: false,
    additionalNotes: "",
  });
  const [errors, setErrors] = useState({
    minimumAmount: "",
    maximumAmount: "",
    startDate: "",
    endDate: "",
    notificationMethods: "",
    emailCheck: "",
    pushnotificationCheck: "",
    smsCheck: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submitAlert = () => {
    setIsSubmitted(true);
    if (
      errors.minimumAmount ||
      errors.maximumAmount ||
      errors.startDate ||
      errors.endDate ||
      (!formData.emailCheck &&
        !formData.pushnotificationCheck &&
        !formData.smsCheck)
    ) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        notificationMethods:
          "At least one notification method must be selected.",
      }));
      return;
    }
    console.log(formData);
    setFormData({
      minimumAmount: 0,
      maximumAmount: 0,
      startDate: "",
      endDate: "",
      selectedOption: "",
      emailCheck: false,
      pushnotificationCheck: false,
      smsCheck: false,
      additionalNotes: "",
    });
    setErrors({
      minimumAmount: "",
      maximumAmount: "",
      startDate: "",
      endDate: "",
      notificationMethods: "",
      emailCheck: "",
      pushnotificationCheck: "",
      smsCheck: "",
    });
    setIsSubmitted(false);
  };

  const options = [
    { label: "Once", value: "Once" },
    { label: "Daily", value: "Daily" },
    { label: "Weekly", value: "Weekly" },
    { label: "Monthly", value: "Monthly" },
  ];
  return (
    <div className="flex flex-col dark:bg-black space-y-4 p-8 w-full ">
      <p className="font-bold dark:text-white text-black lg:text-2xl text-base">
        Create Alert
      </p>

      <div className="w-full flex flex-col mt-2">
        <p className="text-sm mb-3 text-black dark:text-white/50 lg:text-base">
          Alert Type
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-center  w-full">
          {alertCards.map((alertCard, index) => (
            <AlertCard
              icon={alertCard.icon}
              text={alertCard.text}
              key={index}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-3 w-full md:grid-cols-2">
        <CustomInput
          error={errors.minimumAmount}
          showRequired={isSubmitted}
          onChange={(value) => {
            const numValue = Number(value);
            setFormData((prev) => ({
              ...prev,
              minimumAmount: numValue,
            }));
            setErrors((prev) => ({
              ...prev,
              minimumAmount: numValue < 0 ? "Amount cannot be negative" : "",
            }));
          }}
          type="currency"
          required={true}
          name="Minimum_amount"
          placeholder="Minimum amount"
          value={formData.minimumAmount}
          label="Minimum amount"
        />
        <CustomInput
          error={errors.maximumAmount}
          showRequired={isSubmitted}
          onChange={(value) => {
            const numValue = Number(value);
            setFormData((prev) => ({
              ...prev,
              maximumAmount: numValue,
            }));
            setErrors((prev) => ({
              ...prev,
              maximumAmount:
                numValue < formData.minimumAmount
                  ? "Maximum amount must be greater than minimum"
                  : "",
            }));
          }}
          required={true}
          type="currency"
          name="Maximum_amount"
          placeholder="Maximum amount"
          value={formData.maximumAmount}
          label="Maximum amount"
        />
        <CustomInput
          error={errors.startDate}
          showRequired={isSubmitted}
          type="date"
          required={true}
          label="Start Date"
          value={formData.startDate}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              startDate: String(value),
            }));
          }}
        />
        <CustomInput
          error={errors.endDate}
          showRequired={isSubmitted}
          type="date"
          label="End Date"
          value={formData.endDate}
          required={true}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              endDate: String(value),
            }));
            setErrors((prev) => ({
              ...prev,
              endDate:
                formData.startDate &&
                new Date(String(value)) < new Date(formData.startDate)
                  ? "End date must be after start date"
                  : "",
            }));
          }}
        />
      </div>
      <CustomSelect
        options={options}
        required={true}
        showRequired={isSubmitted}
        value={formData.selectedOption}
        onChange={(value) => {
          setFormData((prev) => ({
            ...prev,
            selectedOption: String(value),
          }));
        }}
        label="Reminder Frequency"
        placeholder="Select an option"
      />
      <div className="flex flex-col gap-3 my-5">
        <p>Notification Method</p>
        <CheckBox
          label="Email Notification"
          name="emailCheck"
          inputValue={formData.emailCheck}
          handleChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              emailCheck: value,
            }));
          }}
        />
        <CheckBox
          label="Push Notification"
          name="pushnotificationCheck"
          inputValue={formData.pushnotificationCheck}
          handleChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              pushnotificationCheck: value,
            }));
          }}
        />
        <CheckBox
          label="SMS Notification"
          name="smsCheck"
          inputValue={formData.smsCheck}
          handleChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              smsCheck: value,
            }));
          }}
        />
        {errors.notificationMethods && (
          <p className="text-red-500 text-xs">{errors.notificationMethods}</p>
        )}
      </div>
      <CustomInput
        type="textarea"
        label="Additional Notes"
        name="description"
        placeholder="Add any additional notes or instructions...."
        value={formData.additionalNotes}
        onChange={(value) => {
          setFormData((prev) => ({
            ...prev,
            additionalNotes: String(value),
          }));
        }}
        required={true}
        rows={4}
      />

      <div>
        <button
          onClick={submitAlert}
          className="bg-black dark:bg-white py-2 px-4 rounded-lg text-white dark:text-black "
        >
          Submit
        </button>
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
