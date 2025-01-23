import React from "react";

export default function VerificationCenter() {
  return (
    <main className=" w-[1110px] container px-5">
      <h1 className="my-5 font-bold">Verification Center</h1>
      <div className="py-5">
        <div className="w-full border h-[30px] flex items-center gap-4 rounded-md p-5">
          <span>icon</span>
          <input
            className="w-full h-full p-5"
            type="search"
            placeholder="Search for verification requirements"
          />
        </div>
        <ul className="flex flex-row justify-start items-center gap-5 w-full my-5 py-5">
          <li>Requirements</li>
          <li>Documents</li>
          <li>Status</li>
          <li>Support</li>
        </ul>
        <div className="w-full h-[130px] border rounded-lg flex justify-center items-center mb-10">
          <div className="w-[95%] py-[20px]">
            <h3 className="font-semibold">Documment upload</h3>
            <p className="my-2 text-[14px]">
              Upload and manage your verication documant securely
            </p>
            <button className="text-[12px]">
              Explore <span></span>
            </button>
          </div>
        </div>
        <div className="w-full h-[130px] border rounded-lg flex justify-center items-center mb-10">
          <div className="w-[95%] py-[20px]">
            <h3 className="font-semibold">Identity verification</h3>
            <p className="my-2 text-[14px]">
              Verify your personal identity and contact information
            </p>
            <button className="text-[12px]">
              Explore <span></span>
            </button>
          </div>
        </div>
        <div className="w-full h-[130px] border rounded-lg flex justify-center items-center mb-10">
          <div className="w-[95%] py-[20px]">
            <h3 className="font-semibold">Business verification</h3>
            <p className="my-2 text-[14px]">
              Validate your business credentials and legal information
            </p>
            <button className="text-[12px]">
              Explore <span></span>
            </button>
          </div>
        </div>
        <div className="w-full h-[130px] border rounded-lg flex justify-center items-center mb-10">
          <div className="w-[95%] py-[20px]">
            <h3 className="font-semibold">Service provider</h3>
            <p className="my-2 text-[14px]">
              Complete your service provider verication requirements
            </p>
            <button className="text-[12px]">
              Explore <span></span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
