import { JSX } from "react";

type Props = {
  icon: JSX.Element;
  text: string;
};

function AlertCard({ icon, text }: Props) {
  return (
    <div className="w-full items-center justify-center ">
      <div className="rounded-xl border bg-card p-6 w-full dark:bg-white/15 items-center justify-center">
        <div className="w-full flex flex-col justify-center gap-4 items-center">
          <p className="text-sm text-center font-semibold dark:text-white text-black">
            {icon}
          </p>
          <p className="text-xs text-center text-black dark:text-white text-muted-foreground">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AlertCard;
