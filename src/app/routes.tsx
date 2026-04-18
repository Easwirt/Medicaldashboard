import { createBrowserRouter } from "react-router";
import { PatientDirectory } from "./components/PatientDirectory";
import { PatientDetail } from "./components/PatientDetail";
import { PatientProvider } from "./components/PatientContext";

const Layout = () => {
  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b border-[#dde3ea] px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <span className="text-[#1e293b]" style={{ fontSize: '1.125rem', fontWeight: 600 }}>MedDash</span>
        <div className="ml-auto flex items-center gap-4 text-[#64748b]">
          <span style={{ fontSize: '0.875rem' }}>Dr. Sarah Mitchell</span>
          <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center" style={{ fontSize: '0.75rem', fontWeight: 600 }}>SM</div>
        </div>
      </header>
      <div className="p-6">
        <outlet-placeholder />
      </div>
    </div>
  );
};

// Using a simple layout approach
import { Outlet } from "react-router";

const Root = () => (
  <PatientProvider>
  <div className="min-h-screen bg-[#f0f4f8]">
    <header className="bg-white border-b border-[#dde3ea] px-6 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <span className="text-[#1e293b]" style={{ fontSize: '1.125rem', fontWeight: 600 }}>MedDash</span>
      <div className="ml-auto flex items-center gap-4 text-[#64748b]">
        <span style={{ fontSize: '0.875rem' }}>Dr. Sarah Mitchell</span>
        <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center" style={{ fontSize: '0.75rem', fontWeight: 600 }}>SM</div>
      </div>
    </header>
    <div className="p-6">
      <Outlet />
    </div>
  </div>
  </PatientProvider>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: PatientDirectory },
      { path: "patient/:id", Component: PatientDetail },
    ],
  },
]);