"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  CheckCircle,
  FileText,
  Menu,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const FileUpload = ({
  allowedTypes,
  maxSizeInMB,
  onFileUpload,
}: {
  allowedTypes: string[];
  maxSizeInMB: number;
  onFileUpload: (file: File) => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension =
      selectedFile.name.split(".").pop()?.toLowerCase() || "";
    const isValidType = allowedTypes.includes(`.${fileExtension}`);
    const isValidSize = selectedFile.size <= maxSizeInMB * 1024 * 1024;

    if (!isValidType) {
      setError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`);
      return;
    }

    if (!isValidSize) {
      setError(`File exceeds ${maxSizeInMB}MB limit`);
      return;
    }

    setFile(selectedFile);
    onFileUpload(selectedFile);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed p-4 text-center rounded-lg ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <Input
          type="file"
          accept={allowedTypes.join(",")}
          onChange={handleFileChange}
          className="hidden"
          id="fileUpload"
        />
        <Label
          htmlFor="fileUpload"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload className="mb-2 text-gray-500 w-8 h-8" />
          <span className="text-sm">Upload Document</span>
        </Label>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {file && (
        <div className="flex items-center justify-between">
          <span className="text-sm truncate mr-2">{file.name}</span>
          <CheckCircle className="text-green-500 w-5 h-5" />
        </div>
      )}
    </div>
  );
};

const VerificationCenter = () => {
  const [verificationData, setVerificationData] = useState({
    documentFile: null as File | null,
    identityDetails: {
      firstName: "",
      lastName: "",
      address: "",
      phoneNumber: "",
      email: "",
    },
    businessDetails: {
      businessName: "",
      taxId: "",
      businessLicense: null as File | null,
    },
    serviceProviderDetails: {
      credentials: null as File | null,
      licenseDetails: "",
      insuranceDetails: "",
      referenceChecks: "",
      qualityMetrics: 0,
    },
  });

  const [activeTab, setActiveTab] = useState("document");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const updateVerificationData = (
    section: keyof typeof verificationData,
    data: Partial<(typeof verificationData)[keyof typeof verificationData]>
  ) => {
    setVerificationData((prev: typeof verificationData) => ({
      ...prev,
      [section]: { ...prev[section], ...data },
    }));
  };

  const tabs = [
    { value: "document", label: "Document", icon: FileText },
    { value: "identity", label: "Identity", icon: User },
    { value: "business", label: "Business", icon: Building2 },
    { value: "service", label: "Service", icon: Shield },
  ];

  return (
    <div className="flex w-full justify-center">
      <Card className="w-11/12 mt-6 shadow-none border-none">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold">Verification Center</h1>
          <div className="hidden md:block" />
          <div className="md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mb-4">
            <div className="space-y-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={activeTab === tab.value ? "default" : "outline"}
                  className="w-full"
                  onClick={() => {
                    setActiveTab(tab.value);
                    setMobileMenuOpen(false);
                  }}
                >
                  <tab.icon className="mr-2" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Tabs
          defaultValue="document"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="hidden md:grid w-full grid-cols-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <tab.icon className="mr-2 w-4 h-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="document">
            <FileUpload
              allowedTypes={[".pdf", ".jpg", ".png"]}
              maxSizeInMB={10}
              onFileUpload={(file: File) =>
                updateVerificationData("documentFile", file)
              }
            />
          </TabsContent>

          <TabsContent value="identity">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={verificationData.identityDetails.firstName}
                    onChange={(e) =>
                      updateVerificationData("identityDetails", {
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={verificationData.identityDetails.lastName}
                    onChange={(e) =>
                      updateVerificationData("identityDetails", {
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={verificationData.identityDetails.address}
                  onChange={(e) =>
                    updateVerificationData("identityDetails", {
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={verificationData.identityDetails.phoneNumber}
                    onChange={(e) =>
                      updateVerificationData("identityDetails", {
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={verificationData.identityDetails.email}
                    onChange={(e) =>
                      updateVerificationData("identityDetails", {
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button className="w-full md:w-auto">Verify Identity</Button>
            </div>
          </TabsContent>

          <TabsContent value="business">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={verificationData.businessDetails.businessName}
                    onChange={(e) =>
                      updateVerificationData("businessDetails", {
                        businessName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Tax ID</Label>
                  <Input
                    value={verificationData.businessDetails.taxId}
                    onChange={(e) =>
                      updateVerificationData("businessDetails", {
                        taxId: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <FileUpload
                allowedTypes={[".pdf", ".jpg", ".png"]}
                maxSizeInMB={10}
                onFileUpload={(file: File) =>
                  updateVerificationData("businessDetails", {
                    businessLicense: file,
                  })
                }
              />
              <Button className="w-full md:w-auto">Verify Business</Button>
            </div>
          </TabsContent>

          <TabsContent value="service">
            <div className="space-y-4">
              <FileUpload
                allowedTypes={[".pdf", ".jpg", ".png"]}
                maxSizeInMB={10}
                onFileUpload={(file: File) =>
                  updateVerificationData("serviceProviderDetails", {
                    credentials: file,
                  })
                }
              />
              <div>
                <Label>License Details</Label>
                <Input
                  value={verificationData.serviceProviderDetails.licenseDetails}
                  onChange={(e) =>
                    updateVerificationData("serviceProviderDetails", {
                      licenseDetails: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Insurance Details</Label>
                <Input
                  value={
                    verificationData.serviceProviderDetails.insuranceDetails
                  }
                  onChange={(e) =>
                    updateVerificationData("serviceProviderDetails", {
                      insuranceDetails: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Reference Checks</Label>
                <Input
                  value={
                    verificationData.serviceProviderDetails.referenceChecks
                  }
                  onChange={(e) =>
                    updateVerificationData("serviceProviderDetails", {
                      referenceChecks: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Quality Metrics (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={verificationData.serviceProviderDetails.qualityMetrics}
                  onChange={(e) =>
                    updateVerificationData("serviceProviderDetails", {
                      qualityMetrics: Number(e.target.value),
                    })
                  }
                />
              </div>
              <Button className="w-full md:w-auto">
                Verify Service Provider
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default VerificationCenter;
