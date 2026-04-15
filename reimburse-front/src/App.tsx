import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ApprovalPage } from './pages/ApprovalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReimbursementDetailPage } from './pages/ReimbursementDetailPage';
import { ReimbursementFormPage } from './pages/ReimbursementFormPage';
import { ReimbursementListPage } from './pages/ReimbursementListPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/reimbursements" replace />} />
        <Route path="reimbursements" element={<ReimbursementListPage />} />
        <Route path="reimbursements/new" element={<ReimbursementFormPage />} />
        <Route path="reimbursements/:id" element={<ReimbursementDetailPage />} />
        <Route path="reimbursements/:id/edit" element={<ReimbursementFormPage />} />
        <Route path="approvals" element={<ApprovalPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
