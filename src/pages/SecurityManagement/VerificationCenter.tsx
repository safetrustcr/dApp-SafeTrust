"use client";
import React, { useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Building2,
  Shield,
  User,
  Menu,
  X,
} from "lucide-react";

const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"Pending" | "Verified" | "Rejected">(
    "Pending"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setStatus("Pending");
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center">
        <FileText className="mr-2 w-5 h-5 md:w-6 md:h-6" /> Document Upload
      </h2>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 md:p-6 rounded-lg text-center">
        <Upload className="mx-auto mb-4 text-gray-500 w-8 h-8 md:w-12 md:h-12" />
        <input
          type="file"
          accept=".pdf,.jpg,.png"
          onChange={handleFileUpload}
          className="hidden"
          id="documentUpload"
        />
        <label
          htmlFor="documentUpload"
          className="cursor-pointer text-blue-600 hover:underline text-sm md:text-base"
        >
          Click to upload or drag and drop files
        </label>
      </div>
      {file && (
        <div className="mt-4 flex items-center text-sm md:text-base">
          <span>{file.name}</span>
          {status === "Verified" ? (
            <CheckCircle className="text-green-500 ml-2 w-4 h-4 md:w-5 md:h-5" />
          ) : (
            <XCircle className="text-red-500 ml-2 w-4 h-4 md:w-5 md:h-5" />
          )}
        </div>
      )}
    </section>
  );
};

const IdentityVerification = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Pending" | "Verified" | "Rejected">(
    "Pending"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Verified");
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center">
        <User className="mr-2 w-5 h-5 md:w-6 md:h-6" /> Identity Verification
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border rounded text-sm md:text-base"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
        >
          Verify Identity
        </button>
      </form>
    </section>
  );
};

const BusinessVerification = () => {
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [businessAddress, setBusinessAddress] = useState("");
  const [corporateStructure, setCorporateStructure] = useState("");
  const [ownershipDetails, setOwnershipDetails] = useState("");
  const [status, setStatus] = useState<"Pending" | "Verified" | "Rejected">(
    "Pending"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBusinessLicense(files[0]);
      setStatus("Pending");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Verified");
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center">
        <Building2 className="mr-2 w-5 h-5 md:w-6 md:h-6" /> Business
        Verification
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Tax ID
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full p-2 border rounded text-sm md:text-base"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
        >
          Verify Business
        </button>
      </form>
    </section>
  );
};

const ServiceProvider = () => {
  const [credentials, setCredentials] = useState<File | null>(null);
  const [licenseDetails, setLicenseDetails] = useState("");
  const [insuranceDetails, setInsuranceDetails] = useState("");
  const [referenceChecks, setReferenceChecks] = useState("");
  const [serviceHistory, setServiceHistory] = useState<string[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState(0);
  const [complianceStatus, setComplianceStatus] = useState(false);
  const [status, setStatus] = useState<"Pending" | "Verified" | "Rejected">(
    "Pending"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCredentials(files[0]);
      setStatus("Pending");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Verified");
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg dark:shadow-2xl">
      <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center">
        <Shield className="mr-2 w-5 h-5 md:w-6 md:h-6" /> Service Provider
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Credentials
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 md:p-6 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">
            <Upload className="mx-auto mb-4 text-gray-500 w-8 h-8 md:w-12 md:h-12" />
            <input
              type="file"
              accept=".pdf,.jpg,.png"
              onChange={handleFileUpload}
              className="hidden"
              id="credentials"
            />
            <label
              htmlFor="credentials"
              className="cursor-pointer text-blue-600 hover:underline text-sm md:text-base"
            >
              Click to upload or drag and drop files
            </label>
          </div>
          {credentials && (
            <div className="mt-4 flex items-center shadow-sm p-2 rounded text-sm md:text-base">
              <span>{credentials.name}</span>
              {status === "Verified" ? (
                <CheckCircle className="text-green-500 ml-2 w-4 h-4 md:w-5 md:h-5" />
              ) : (
                <XCircle className="text-red-500 ml-2 w-4 h-4 md:w-5 md:h-5" />
              )}
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            License Details
          </label>
          <input
            type="text"
            value={licenseDetails}
            onChange={(e) => setLicenseDetails(e.target.value)}
            className="w-full p-2 border rounded shadow-sm focus:shadow-md transition-shadow text-sm md:text-base"
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Insurance Details
          </label>
          <input
            type="text"
            value={insuranceDetails}
            onChange={(e) => setInsuranceDetails(e.target.value)}
            className="w-full p-2 border rounded shadow-sm focus:shadow-md transition-shadow text-sm md:text-base"
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Reference Checks
          </label>
          <textarea
            value={referenceChecks}
            onChange={(e) => setReferenceChecks(e.target.value)}
            className="w-full p-2 border rounded shadow-sm focus:shadow-md transition-shadow text-sm md:text-base"
            rows={3}
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Service History
          </label>
          <textarea
            value={serviceHistory.join("\n")}
            onChange={(e) => setServiceHistory(e.target.value.split("\n"))}
            className="w-full p-2 border rounded shadow-sm focus:shadow-md transition-shadow text-sm md:text-base"
            rows={3}
            placeholder="Enter service history, one entry per line"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
              Quality Metrics (0-100)
            </label>
            <input
              type="number"
              value={qualityMetrics}
              onChange={(e) => setQualityMetrics(Number(e.target.value))}
              className="w-full p-2 border rounded shadow-sm focus:shadow-md transition-shadow text-sm md:text-base"
              min="0"
              max="100"
              required
            />
          </div>
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              checked={complianceStatus}
              onChange={(e) => setComplianceStatus(e.target.checked)}
              className="mr-2 shadow-sm"
              id="complianceStatus"
            />
            <label
              htmlFor="complianceStatus"
              className="text-sm md:text-base text-gray-600 dark:text-gray-300"
            >
              Compliance Verified
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-shadow text-sm md:text-base"
        >
          Verify Service Provider
        </button>
      </form>
    </section>
  );
};

const VerificationCenter = () => {
  const [activeSection, setActiveSection] = useState("Document Upload");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "Document Upload":
        return <DocumentUpload />;
      case "Identity Verification":
        return <IdentityVerification />;
      case "Business Verification":
        return <BusinessVerification />;
      case "Service Provider":
        return <ServiceProvider />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[1100px] min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-xl md:text-2xl font-bold">Verification Center</h1>
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden bg-white dark:bg-gray-800 shadow-sm">
          {[
            "Document Upload",
            "Identity Verification",
            "Business Verification",
            "Service Provider",
          ].map((section) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-4 text-left ${
                activeSection === section
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {section}
            </button>
          ))}
        </nav>
      )}

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-4 p-4 bg-white dark:bg-gray-800 shadow-sm">
        {[
          "Document Upload",
          "Identity Verification",
          "Business Verification",
          "Service Provider",
        ].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded ${
              activeSection === section
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {section}
          </button>
        ))}
      </nav>

      <main className="p-4 md:p-6">{renderActiveSection()}</main>
    </div>
  );
};

export default VerificationCenter;
