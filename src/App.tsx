/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MantineProvider, AppShell, Burger, Group, NavLink, Title, Text, createTheme } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { DatesProvider } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

// Set dayjs locale globally
dayjs.locale('ru');
import { 
  IconLayoutDashboard, 
  IconUsers, 
  IconCar, 
  IconUserCog, 
  IconTool, 
  IconReportAnalytics,
  IconArchive
} from '@tabler/icons-react';

import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import CarsPage from './pages/CarsPage';
import EmployeesPage from './pages/EmployeesPage';
import RepairsPage from './pages/RepairsPage';
import ArchivePage from './pages/ArchivePage';
import ReportsPage from './pages/ReportsPage';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
});

function AppContent() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Панель управления', icon: IconLayoutDashboard, path: '/' },
    { label: 'Клиенты', icon: IconUsers, path: '/clients' },
    { label: 'Автомобили', icon: IconCar, path: '/cars' },
    { label: 'Сотрудники', icon: IconUserCog, path: '/employees' },
    { label: 'Ремонт', icon: IconTool, path: '/repairs' },
    { label: 'Архив', icon: IconArchive, path: '/archive' },
    { label: 'Отчеты', icon: IconReportAnalytics, path: '/reports' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <IconTool size={30} color="var(--mantine-color-blue-filled)" />
          <Title order={3}>АСУ «СТО АвтоМастер»</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size="1.2rem" stroke={1.5} />}
            onClick={() => {
              navigate(item.path);
              if (opened) toggle();
            }}
            active={location.pathname === item.path}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/cars" element={<CarsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/repairs" element={<RepairsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <DatesProvider settings={{ locale: 'ru' }}>
          <Notifications />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
