import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import AuthGate from "./components/AuthGate";

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" richColors theme="dark" />
      <AuthGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </div>
  );
}

export default App;
