import { Card } from "@/components/ui/card";
import { Calendar, Award } from "lucide-react";

interface Certification {
  title: string;
  description: string;
  date: string;
}

export function CertificationSection() {
  const certifications: Certification[] = [
    {
      title: "Certified Blockchain Expert",
      description:
        "Advanced certification in blockchain technology and smart contract development",
      date: "Jan 2023",
    },
    {
      title: "Smart Contract Security Professional",
      description:
        "Specialized certification in smart contract security and auditing",
      date: "Mar 2023",
    },
    {
      title: "Ethereum Developer Certification",
      description:
        "Professional certification for Ethereum blockchain development",
      date: "Jun 2023",
    },
    {
      title: "ISO 27001 Compliance",
      description: "Information security management system certification",
      date: "Sep 2023",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Certifications & Achievements</h2>
      <p className="text-sm text-muted-foreground">
        Professional certifications and awards
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {certifications.map((cert, index) => (
          <Card key={index} className="p-4 flex gap-4 items-start">
            <div className="flex-shrink-0 mt-1">
              <Award className="h-5 w-5 text-primary" />{" "}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold">{cert.title}</h3>
              <p className="text-sm text-muted-foreground">
                {cert.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Issued: {cert.date}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
