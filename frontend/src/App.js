import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import AppFooter from "./components/AppFooter";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AppRoutes />
      <AppFooter />
    </>
  );
}
