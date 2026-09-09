import { createRoot } from "react-dom/client";
import { Keeper } from "./app.js";
import "../../ui/theme.css";
createRoot(document.getElementById("root")!).render(<Keeper />);
