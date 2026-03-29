import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TranslatePage from "./pages/TranslatePage";
import ApiKeysPage from "./pages/ApiKeysPage";
import HistoryPage from "./pages/HistoryPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TranslatePage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
