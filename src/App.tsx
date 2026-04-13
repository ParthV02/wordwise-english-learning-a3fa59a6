import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PronunciationPage from "./pages/PronunciationPage";
import DecomposerPage from "./pages/DecomposerPage";
import NewsReaderPage from "./pages/NewsReaderPage";
import WordOfDayPage from "./pages/WordOfDayPage";
import QuizPage from "./pages/QuizPage";
import CategoryExplorerPage from "./pages/CategoryExplorerPage";
import ProgressPage from "./pages/ProgressPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pronunciation" element={<PronunciationPage />} />
            <Route path="/decomposer" element={<DecomposerPage />} />
            <Route path="/news" element={<NewsReaderPage />} />
            <Route path="/word-of-day" element={<WordOfDayPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/categories" element={<CategoryExplorerPage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
