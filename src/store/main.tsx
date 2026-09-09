import { createRoot } from "react-dom/client";
import { Store } from "./app.js";
import "../ui/theme.css";
createRoot(document.getElementById("root")!).render(<Store />);
