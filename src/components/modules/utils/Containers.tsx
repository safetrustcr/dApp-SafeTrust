"use client";

interface ContainerHelpCenterProps {
  children: React.ReactNode;
}

export const ContainerHelpCenter = ({ children }: ContainerHelpCenterProps) => {
  return <div className="flex p-5">{children}</div>;
};
