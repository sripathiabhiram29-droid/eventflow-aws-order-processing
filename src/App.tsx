import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingSkeleton } from "./components/common/Common";
import { AppShell } from "./components/layout/AppShell";
import { EventFlowProvider } from "./hooks/useEventFlow";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const CreateOrderPage = lazy(() =>
  import("./pages/CreateOrderPage").then((module) => ({ default: module.CreateOrderPage })),
);
const OrdersPage = lazy(() =>
  import("./pages/OrdersPage").then((module) => ({ default: module.OrdersPage })),
);
const OrderDetailsPage = lazy(() =>
  import("./pages/OrderDetailsPage").then((module) => ({ default: module.OrderDetailsPage })),
);
const EventsPage = lazy(() =>
  import("./pages/EventsPage").then((module) => ({ default: module.EventsPage })),
);
const ArchitecturePage = lazy(() =>
  import("./pages/ArchitecturePage").then((module) => ({ default: module.ArchitecturePage })),
);
const HealthPage = lazy(() =>
  import("./pages/HealthPage").then((module) => ({ default: module.HealthPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

export function App() {
  return (
    <BrowserRouter>
      <EventFlowProvider>
        <Suspense
          fallback={
            <main className="content">
              <LoadingSkeleton rows={7} />
            </main>
          }
        >
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders/new" element={<CreateOrderPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="architecture" element={<ArchitecturePage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate replace to="/404" />} />
            </Route>
          </Routes>
        </Suspense>
      </EventFlowProvider>
    </BrowserRouter>
  );
}
