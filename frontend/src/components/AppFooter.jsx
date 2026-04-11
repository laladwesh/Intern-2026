export default function AppFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-[#f2f2f2]/95 px-3 py-2 text-center text-[11px] leading-relaxed text-slate-700 backdrop-blur sm:px-4 sm:py-3 sm:text-sm">
      For any issues or technical glitch, please write to{" "}
      <a
        href="mailto:ccd.techsupport@iitg.ac.in"
        className="font-semibold text-[var(--brand)] hover:underline"
      >
        ccd.techsupport@iitg.ac.in
      </a>
      . Designed and Developed by  {" "}
      <a
        href="https://iitg.ac.in/dday/team"
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-[var(--brand)] hover:underline"
      >
         Logistics Support - Techincal Team, CCD, IITG
      </a>
      .
    </footer>
  );
}
