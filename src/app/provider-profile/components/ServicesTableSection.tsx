"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Service {
  name: string;
  description: string;
  price: string;
  availability: boolean;
}

export function ServiceTable() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Define the services with types
  const services: Service[] = [
    {
      name: "Smart Contract Development",
      description: "Custom smart contract development and deployment",
      price: "$2,000 - 5,000",
      availability: true,
    },
    {
      name: "Security Audit",
      description: "Comprehensive security analysis of smart contracts",
      price: "$1,500 - 3,000",
      availability: true,
    },
    {
      name: "Contract Upgrade",
      description: "Upgrade existing smart contracts with new features",
      price: "$1,000 - 2,500",
      availability: true,
    },
    {
      name: "Consultation",
      description: "Expert consultation on blockchain solutions",
      price: "$200 - 500/hr",
      availability: false,
    },
  ];

  if (!mounted) {
    return (
      <Card className=" py-8 md:px-6 px-3">
        <h2 className="text-lg font-semibold">Available Services</h2>
        <p className="text-sm text-muted-foreground pb-6">
          Services offered by BlockTech Solutions
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">
                Service Name
              </TableHead>
              <TableHead className="text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="text-muted-foreground">Price</TableHead>
              <TableHead className="text-muted-foreground">
                Availability
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service, index) => (
              <TableRow key={index} className="border-border py-4">
                <TableCell className="text-foreground">
                  {service.name}
                </TableCell>
                <TableCell className="text-foreground">
                  {service.description}
                </TableCell>
                <TableCell className="text-foreground">
                  {service.price}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      service.availability
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    } rounded-full py-1 px-3`}
                  >
                    {service.availability ? "Available" : "Unavailable"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <Card className="py-8 md:px-6 px-3">
      <h2 className="text-lg font-semibold ">Available Services</h2>
      <p className="text-sm text-muted-foreground mt-0 pb-6">
        Services offered by BlockTech Solutions
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground">
              Service Name
            </TableHead>
            <TableHead className="text-muted-foreground">Description</TableHead>
            <TableHead className="text-muted-foreground">Price</TableHead>
            <TableHead className="text-muted-foreground">
              Availability
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service, index) => (
            <TableRow
              key={index}
              className={`transition-colors py-4 ${
                currentTheme === "dark" ? "hover:bg-muted/50" : "hover:bg-muted"
              }`}
            >
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>{service.price}</TableCell>
              <TableCell>
                <Badge
                  variant={service.availability ? "default" : "secondary"}
                  className={`${
                    service.availability
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  } rounded-full py-1 px-3`}
                >
                  {service.availability ? "Available" : "Unavailable"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
